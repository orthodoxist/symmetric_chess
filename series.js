(function(root){
  const opposite=color=>color==='white'?'black':'white';
  function create(firstColor,minutes){return {firstColor,minutes,round:1,rounds:[],ready:[false,false]};}
  function color(series,player=0){const first=series.round===1?series.firstColor:opposite(series.firstColor);return player===0?first:opposite(first);}
  function record(game){
    const series=game.series;if(!series||!game.clock.started||!game.winner&&!game.draw||series.rounds.length>=series.round)return false;
    const first=color(series),initial=series.minutes*60000;
    series.rounds.push({firstColor:first,score:game.draw?0:game.winner===first?1:-1,used:[first,opposite(first)].map(c=>Math.max(0,initial-game.clock.remaining[c]))});
    return true;
  }
  function result(series){
    if(!series||series.rounds.length!==2)return null;
    const score=series.rounds.reduce((n,r)=>n+r.score,0);
    const seconds=[0,1].map(i=>Math.floor(series.rounds.reduce((n,r)=>n+r.used[i],0)/1000));
    if(score)return {winner:score>0?0:1,reason:'results',seconds};
    if(seconds[0]!==seconds[1])return {winner:seconds[0]<seconds[1]?0:1,reason:'time',seconds};
    return {winner:null,reason:'equal',seconds};
  }
  function next(game,rules){
    const series=game.series;if(!series||series.round!==1||series.rounds.length!==1||!game.winner&&!game.draw)return null;
    series.round=2;series.ready=[false,false];const nextGame=rules.createGame(series.minutes);nextGame.series=series;return nextGame;
  }
  const api={create,color,record,result,next};if(typeof module!=='undefined')module.exports=api;else root.Chess10Series=api;
})(globalThis);
