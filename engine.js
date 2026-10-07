/* Shared rules for the browser and the rule verification script. */
(function (root) {
  const order = ['R','N','B','Q','K','K','Q','B','N','R'];
  function positionKey(game) {
    return JSON.stringify([game.turn,game.board.map(row=>row.map(p=>p?.type==='P'?{type:p.type,color:p.color}:p)), ...['white','black'].map(color=>
      game.captured[color].filter(p=>p.type!=='P').map(p=>p.type).sort())]);
  }
  const createGame = (minutes=15) => {
    const game = {
    board: Array.from({length:10}, (_,r) => Array.from({length:10}, (_,c) =>
      r===0 || r===9 ? {type:order[c],color:r===0?'black':'white'} :
      r===1 || r===8 ? {type:'P',color:r===1?'black':'white'} : null)),
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
  function pseudoMoves(game,r,c) {
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
      if(inside(a,c)&&!game.board[a][c])result.push([a,c]);
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
  function safeAfterMove(state,color){
    if(state.winner)return state.winner===color;
    if(state.draw)return true;
    return winningThreats(state)[color==='white'?'black':'white'].length===0;
  }
  function promotionChoices(game){
    if(!game.pending)return [];
    return game.pending.choices.filter(type=>{
      const next=copyGame(game),color=game.pending.color;
      promote(next,type,false);
      return safeAfterMove(next,color);
    });
  }
  function moves(game,r,c){
    return pseudoMoves(game,r,c).filter(([a,b])=>{
      const next=copyGame(game),color=game.turn;
      move(next,r,c,a,b,false);
      return next.pending?promotionChoices(next).length>0:safeAfterMove(next,color);
    });
  }
  function finish(game,adjudicate=true) {
    game.turn=game.turn==='white'?'black':'white';
    const key=positionKey(game), count=(game.repetitions.get(key)||0)+1;
    game.repetitions.set(key,count);
    if(adjudicate&&isCheckmate(game)){
      game.winner=game.turn==='white'?'black':'white';game.winReason='checkmate';
    }
    else if(adjudicate&&isStalemate(game)){
      game.draw='stalemate';
    }
    else if(count>=5) game.draw='repetition';
    else if(game.quietPlies>=100) game.draw='fiftyMoves';
  }
  function move(game,r,c,a,b,adjudicate=true) {
    if(!(adjudicate?moves:pseudoMoves)(game,r,c).some(([x,y])=>x===a&&y===b)) return false;
    const p=game.board[r][c],target=game.board[a][b];
    game.quietPlies=p.type==='P'||target?0:game.quietPlies+1;
    if(target) game.captured[target.color].push({...target});
    game.board[a][b]=p; game.board[r][c]=null;

    game.history.push({color:p.color,type:p.type,from:[r,c],to:[a,b],capture:target?.type||null});
    if(target?.type==='K'&&!game.board.some(row=>row.some(q=>q?.color===target.color&&q.type==='K'))){game.winner=p.color;game.winReason='kingCapture';}
    if(!game.winner&&p.type==='P'&&(a===0||a===9)) {
      const choices=game.captured[p.color].filter(q=>q.type!=='P');
      if(!choices.length){game.winner=p.color;game.winReason='promotion';}
      else game.pending={r:a,c:b,color:p.color,choices:[...new Set(choices.map(q=>q.type))]};
    }
    if(adjudicate&&game.pending)game.pending.choices=promotionChoices(game);
    if(!game.pending&&!game.winner) finish(game,adjudicate);
    return true;
  }
  function promote(game,type,adjudicate=true) {
    const p=game.pending;
    if(game.winner||game.draw||!p||!p.choices.includes(type)) return false;
    if(adjudicate&&!promotionChoices(game).includes(type))return false;
    const i=game.captured[p.color].findIndex(q=>q.type===type);
    game.captured[p.color].splice(i,1);
    game.board[p.r][p.c]={type,color:p.color};
    game.history[game.history.length-1].promotion=type;
    game.pending=null; finish(game,adjudicate); return true;
  }
  function winningThreats(game) {
    const threats={white:[],black:[]};
    if(game.winner||game.draw||game.pending) return threats;
    const kings={white:0,black:0};
    for(const row of game.board)for(const p of row)if(p?.type==='K')kings[p.color]++;
    for(const color of ['white','black']){
      const opponent=color==='white'?'black':'white';
      const view={...game,turn:color};
      const promotionWins=!game.captured[color].some(p=>p.type!=='P');
      game.board.forEach((row,r)=>row.forEach((p,c)=>{
        if(p?.color!==color) return;
        for(const [a,b] of pseudoMoves(view,r,c)){
          const target=game.board[a][b];
          if(kings[opponent]===1&&target?.color===opponent&&target.type==='K')
            threats[color].push({reason:'lastKing',from:[r,c],to:[a,b]});
          else if(promotionWins&&p.type==='P'&&(a===0||a===9))
            threats[color].push({reason:'promotion',from:[r,c],to:[a,b]});
        }
      }));
    }
    return threats;
  }
  function unsafeKingMoves(game) {
    const result={white:[],black:[]};
    if(game.winner||game.draw||game.pending) return result;
    for(const color of [game.turn]){
      const kings=[];
      game.board.forEach((row,r)=>row.forEach((p,c)=>{if(p?.color===color&&p.type==='K')kings.push([r,c]);}));
      if(kings.length!==1)continue;
      const [r,c]=kings[0],opponent=color==='white'?'black':'white';
      for(const [a,b] of pseudoMoves({...game,turn:color},r,c)){
        // Simulate the actual move so captured attackers, changed cannon screens,
        // newly opened lines, and immediate game endings are all reflected.
        const next={...game,turn:color,
          board:game.board.map(row=>row.map(p=>p?{...p}:null)),
          captured:{white:[...game.captured.white],black:[...game.captured.black]},
          history:[...game.history],repetitions:new Map(game.repetitions)};
        move(next,r,c,a,b,false);
        if(winningThreats(next)[opponent].some(t=>t.reason==='lastKing'))result[color].push([a,b]);
      }
    }
    return result;
  }
  function copyGame(game){
    return {...game,board:game.board.map(row=>row.map(p=>p?{...p}:null)),
      captured:{white:[...game.captured.white],black:[...game.captured.black]},
      history:game.history.map(entry=>({...entry})),repetitions:new Map(game.repetitions)};
  }
  function isCheckmate(game){
    if(game.winner||game.draw||game.pending)return false;
    const opponent=game.turn==='white'?'black':'white';
    return winningThreats(game)[opponent].some(t=>t.reason==='lastKing')&&!hasLegalMoves(game);
  }
  function hasLegalMoves(game){
    for(let r=0;r<10;r++)for(let c=0;c<10;c++)if(moves(game,r,c).length)return true;
    return false;
  }
  function isStalemate(game){
    if(game.winner||game.draw||game.pending)return false;
    const opponent=game.turn==='white'?'black':'white';
    return !winningThreats(game)[opponent].some(t=>t.reason==='lastKing')&&!hasLegalMoves(game);
  }
  const api={createGame,moves,move,promote,positionKey,startClock,tickClock,winningThreats,unsafeKingMoves,isCheckmate,isStalemate,pseudoMoves,copyGame};
  if(typeof module!=='undefined') module.exports=api; else root.Chess10=api;
})(globalThis);
