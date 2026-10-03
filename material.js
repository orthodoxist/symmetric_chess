(function(root){
  const rules=typeof module!=='undefined'?require('./engine.js'):root.Chess10;
  const points={P:2,N:10,B:5,R:9,Q:16};
  function scores(game){
    const result={white:0,black:0};
    for(const row of game.board)for(const piece of row)if(piece)result[piece.color]+=points[piece.type]||0;
    return result;
  }
  function captureThreats(game){
    if(game.winner||game.draw||game.pending)return [];
    const result=[];
    for(let r=0;r<10;r++)for(let c=0;c<10;c++){
      const piece=game.board[r][c];if(!piece||piece.color!==game.turn)continue;
      const view={...game,turn:piece.color};
      const targets=rules.pseudoMoves(view,r,c).filter(([a,b])=>{
        const target=game.board[a][b];
        return target&&target.color!==piece.color;
      });
      if(!targets.length)continue;
      const legal=new Set(rules.moves(view,r,c).map(p=>p.join(',')));
      for(const to of targets)if(legal.has(to.join(',')))result.push({from:[r,c],to});
    }
    return result;
  }
  function goodCapture(game,entry){
    const capturedValue=points[entry?.capture];
    if(!capturedValue||game.pending||game.winner||game.draw)return false;
    const piece=game.board[entry.to[0]]?.[entry.to[1]];
    if(!piece||piece.color!==entry.color||game.turn===entry.color)return false;
    return !captureThreats(game).some(t=>{
      const target=game.board[t.to[0]][t.to[1]];
      return target.type==='K'||points[target.type]>=capturedValue;
    });
  }
  const api={points,scores,captureThreats,goodCapture};
  if(typeof module!=='undefined')module.exports=api;else root.Chess10Material=api;
})(globalThis);
