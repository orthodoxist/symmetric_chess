(function(root){
  const ai=typeof module!=='undefined'?require('./ai.js'):root.Chess10AI;
  const rules=typeof module!=='undefined'?require('./engine.js'):root.Chess10;
  const key=a=>a.from+':'+a.to+':'+(a.promotion||'');
  function classify({best,played,before,depth,tactical,forcedDefense=false}){
    if(depth<2||![best,played,before].every(Number.isFinite))return null;
    const loss=Math.max(0,best-played),winning=played>=1000000;
    if(played<=-1000000&&best>-1000000)return {mark:'??',reason:'피할 수 있었던 강제 패배를 허용했습니다.'};
    if(loss>=300)return {mark:'??',reason:'더 좋은 수와 비교해 큰 손해를 보는 수입니다.'};
    if(loss>=150)return {mark:'?',reason:'더 좋은 수와 비교해 유리함을 놓치거나 손해를 보는 수입니다.'};
    if(winning&&loss<40)return {mark:'!!',reason:'수읽기에서 강제 승리를 확인했습니다.'};
    if(loss<40&&(tactical&&played-before>=100||forcedDefense))return {mark:'!',reason:forcedDefense?'즉시 패배 위협을 막는 중요한 방어입니다.':'후속 수까지 고려했을 때 전술적 이득을 얻습니다.'};
    return null;
  }
  async function reviewMove(before,entry,after,{budgetMs=1200,shouldCancel=()=>false}={}){
    if(shouldCancel())return null;
    if(after.winner===entry.color)return {mark:'!',reason:'승리를 결정한 수입니다.'};
    const playedAction={from:entry.from,to:entry.to,...(entry.promotion?{promotion:entry.promotion}:{})};
    let completed=null;
    await ai.chooseAction(before,{level:'expert',budgetMs,shouldCancel,exactRoot:true,onIteration:result=>{completed=result;}});
    if(shouldCancel()||!completed?.scores)return null;
    const actual=completed.scores.find(s=>key(s.action)===key(playedAction));
    if(!actual)return null;
    const enemy=entry.color==='white'?'black':'white';
    const forcedDefense=rules.winningThreats(before)[enemy].length>0;
    return classify({best:completed.score,played:actual.score,before:ai.evaluate(before,entry.color),depth:completed.depth,tactical:Boolean(entry.capture||entry.promotion),forcedDefense});
  }
  const api={reviewMove,classify};if(typeof module!=='undefined')module.exports=api;else root.Chess10Review=api;
})(globalThis);
