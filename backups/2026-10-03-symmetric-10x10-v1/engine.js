/* Shared rules for the browser and the rule verification script. */
(function (root) {
  const order = ['R','N','B','Q','K','K','Q','B','N','R'];
  function positionKey(game) {
    return JSON.stringify([game.turn,game.board, ...['white','black'].map(color=>
      game.captured[color].filter(p=>p.type!=='P').map(p=>p.type).sort())]);
  }
  const createGame = (minutes=15) => {
    const game = {
    board: Array.from({length:10}, (_,r) => Array.from({length:10}, (_,c) =>
      r===0 || r===9 ? {type:order[c],color:r===0?'black':'white'} :
      r===1 || r===8 ? {type:'P',color:r===1?'black':'white',moved:false} : null)),
    turn:'white', captured:{white:[],black:[]}, winner:null, draw:null, pending:null, history:[], quietPlies:0, repetitions:new Map(),
    clock:{remaining:{white:minutes*60000,black:minutes*60000},started:false,last:null}, winReason:null
    };
    game.repetitions.set(positionKey(game),1);
    return game;
  };
  function startClock(game,now=Date.now()) {
    if(game.clock.started||game.winner||game.draw) return false;
    game.clock.started=true;game.clock.last=now;return true;
  }
  function tickClock(game,now=Date.now()) {
    if(!game.clock.started||game.winner||game.draw) return false;
    const elapsed=Math.max(0,now-game.clock.last);
    game.clock.last=Math.max(now,game.clock.last);
    game.clock.remaining[game.turn]=Math.max(0,game.clock.remaining[game.turn]-elapsed);
    if(game.clock.remaining[game.turn]===0){
      game.winner=game.turn==='white'?'black':'white';game.winReason='timeout';game.pending=null;return true;
    }
    return false;
  }
  function moves(game,r,c) {
    const p=game.board[r]?.[c];
    if (!p || game.winner || game.draw || game.pending || p.color!==game.turn) return [];
    const result=[], inside=(a,b)=>a>=0&&a<10&&b>=0&&b<10;
    function add(a,b) {
      if (!inside(a,b)) return false;
      const target=game.board[a][b];
      if (target?.color===p.color) return false;
      result.push([a,b]); return !target;
    }
    if(p.type==='P') {
      const direction=p.color==='white'?-1:1;
      const a=r+direction;
      const limit=!p.moved&&r===(p.color==='white'?8:1)?3:1;
      for(let step=1;step<=limit;step++){
        const next=r+direction*step;
        if(!inside(next,c)||game.board[next][c]) break;
        result.push([next,c]);
      }
      for(const b of [c-1,c+1]) if(inside(a,b)&&game.board[a][b]&&game.board[a][b].color!==p.color) result.push([a,b]);
    } else if(p.type==='N') {
      for(const [a,b] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) add(r+a,c+b);
    } else {
      const straight=[[1,0],[-1,0],[0,1],[0,-1]], diagonal=[[1,1],[1,-1],[-1,1],[-1,-1]];
      const dirs=p.type==='R'?straight:p.type==='B'?diagonal:[...straight,...diagonal];
      for(const [a,b] of dirs) for(let step=1;step<=(p.type==='K'?1:9);step++) if(!add(r+a*step,c+b*step)) break;
    }
    return result;
  }
  function finish(game) {
    game.turn=game.turn==='white'?'black':'white';
    const key=positionKey(game), count=(game.repetitions.get(key)||0)+1;
    game.repetitions.set(key,count);
    if(count>=3) game.draw='repetition';
    else if(game.quietPlies>=60) game.draw='thirtyMoves';
  }
  function move(game,r,c,a,b) {
    if(!moves(game,r,c).some(([x,y])=>x===a&&y===b)) return false;
    const p=game.board[r][c],target=game.board[a][b];
    game.quietPlies=p.type==='P'||target?0:game.quietPlies+1;
    if(target) game.captured[target.color].push({...target});
    game.board[a][b]=p; game.board[r][c]=null;
    if(p.type==='P') p.moved=true;
    game.history.push({color:p.color,type:p.type,from:[r,c],to:[a,b],capture:target?.type||null});
    if(target?.type==='K'&&!game.board.some(row=>row.some(q=>q?.color===target.color&&q.type==='K'))) game.winner=p.color;
    if(!game.winner&&p.type==='P'&&(a===0||a===9)) {
      const choices=game.captured[p.color].filter(q=>q.type!=='P');
      if(!choices.length) game.winner=p.color;
      else game.pending={r:a,c:b,color:p.color,choices:[...new Set(choices.map(q=>q.type))]};
    }
    if(!game.pending&&!game.winner) finish(game);
    return true;
  }
  function promote(game,type) {
    const p=game.pending;
    if(game.winner||game.draw||!p||!p.choices.includes(type)) return false;
    const i=game.captured[p.color].findIndex(q=>q.type===type);
    game.captured[p.color].splice(i,1);
    game.board[p.r][p.c]={type,color:p.color};
    game.history[game.history.length-1].promotion=type;
    game.pending=null; finish(game); return true;
  }
  const api={createGame,moves,move,promote,positionKey,startClock,tickClock};
  if(typeof module!=='undefined') module.exports=api; else root.Chess10=api;
})(globalThis);
