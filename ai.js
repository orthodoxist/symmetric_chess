(function(root){
const rules=typeof module!=='undefined'?require('./engine.js'):root.Chess10;
const values={P:100,N:650,B:360,R:560,Q:1050,K:800},WIN=1000000;
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
function evaluate(g,color){
 if(g.winner)return g.winner===color?WIN:-WIN;if(g.draw)return 0;
 let score=0;const attacks={white:new Map(),black:new Map()},kings={white:[],black:[]};
 for(let r=0;r<10;r++)for(let c=0;c<10;c++){
  const p=g.board[r][c];if(!p)continue;let v=values[p.type];const center=9-Math.abs(4.5-r)-Math.abs(4.5-c);
  if(p.type==='P'){
   const progress=Math.max(0,p.color==='white'?8-r:r-1),instant=!g.captured[p.color].some(q=>q.type!=='P');
   v+=progress*12+progress*progress*(instant?6:2);
   for(const dc of [-1,1]){const a=r+(p.color==='white'?-1:1),b=c+dc;if(a>=0&&a<10&&b>=0&&b<10)attacks[p.color].set(a*10+b,100);}
  }else{
   const targets=rules.pseudoMoves({...g,turn:p.color},r,c);v+=targets.length*(p.type==='N'?5:2);
   for(const [a,b] of targets){const key=a*10+b;attacks[p.color].set(key,Math.min(attacks[p.color].get(key)??Infinity,values[p.type]));}
   if(p.type==='N')v+=center*9;if(p.type==='B')v+=center*3;
   if(p.type==='K'){kings[p.color].push([r,c]);v-=center*4;}
  }
  score+=p.color===color?v:-v;
 }
 for(let r=0;r<10;r++)for(let c=0;c<10;c++){
  const p=g.board[r][c];if(!p||p.type==='K')continue;const enemy=p.color==='white'?'black':'white',attacker=attacks[enemy].get(r*10+c);
  if(attacker!==undefined)score+=(p.color===color?-1:1)*Math.max(20,(values[p.type]-attacker)*0.2);
 }
 for(const side of ['white','black'])if(kings[side].length===1){
  const [r,c]=kings[side][0],enemy=side==='white'?'black':'white';
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const a=r+dr,b=c+dc;if(a>=0&&a<10&&b>=0&&b<10&&attacks[enemy].has(a*10+b))score+=side===color?-35:35;}
 }
 return score;
}
function applyAction(g,a){
 const next=rules.copyGame(g),color=g.turn;
 if(!rules.move(next,...a.from,...a.to,false))return null;
 if(next.pending){if(!a.promotion||!rules.promote(next,a.promotion,false))return null;}else if(a.promotion)return null;
 if(!next.winner&&!next.draw&&rules.winningThreats(next)[color==='white'?'black':'white'].length)return null;
 // Terminal engine positions retain the mover; search alternates perspective.
 if(next.winner)next.turn=color==='white'?'black':'white';
 return next;
}
async function chooseAction(game,{level='medium',budgetMs,random=Math.random,shouldCancel=()=>false,onIteration=()=>{}}={}){
 if(game.winner||game.draw||game.pending)return null;
 const settings={easy:{depth:1,budget:250,width:8},medium:{depth:2,budget:900,width:12},hard:{depth:3,budget:2000,width:18},expert:{depth:12,budget:10000,width:Infinity}};
 const config=settings[level]||settings.medium,advanced=level==='expert',deadline=Date.now()+(budgetMs??config.budget),STOP=Symbol('stop'),table=new Map();
 let lastYield=Date.now(),nodes=0;
 const check=()=>{if(shouldCancel()||Date.now()>=deadline)throw STOP;};
 async function cooperate(fallback=false){if(Date.now()-lastYield>=8){await pause();lastYield=Date.now();}if(shouldCancel())throw STOP;if(!fallback)check();}
 const actionKey=a=>a.from+':'+a.to+':'+(a.promotion||'');
 // Repetition history and quiet counter affect future draws, so belong in keys.
 const stateKey=s=>rules.positionKey(s)+'|'+s.quietPlies+'|'+JSON.stringify([...s.repetitions].sort((a,b)=>a[0].localeCompare(b[0])));
 async function actions(s,fallback=false,preferred=null){
  const list=[];
  for(let r=0;r<10;r++)for(let c=0;c<10;c++){
   if(s.board[r][c]?.color!==s.turn)continue;
   for(const to of rules.pseudoMoves(s,r,c)){
    const base={from:[r,c],to},trial=rules.copyGame(s);rules.move(trial,r,c,...to,false);
    for(const promotion of trial.pending?trial.pending.choices:[null]){
     const action=promotion?{...base,promotion}:base,child=applyAction(s,action);if(!child)continue;
     const target=s.board[to[0]][to[1]],piece=s.board[r][c];let order=evaluate(child,s.turn);
     if(target)order+=values[target.type]*8-values[piece.type];if(promotion)order+=values[promotion]*8;
     if(child.winner===s.turn)order+=WIN*2;if(preferred===actionKey(action))order+=WIN*4;
     list.push({action,child,order,tactical:Boolean(target||promotion||child.winner)});
    }
    await cooperate(fallback);
   }
   await cooperate(fallback);
  }
  list.sort((a,b)=>b.order-a.order);return list;
 }
 async function quiescence(s,alpha,beta,left){
  check();nodes++;if(s.winner)return s.winner===s.turn?WIN:-WIN;if(s.draw)return 0;
  const enemy=s.turn==='white'?'black':'white',forced=rules.winningThreats(s)[enemy].length>0,candidates=await actions(s);
  if(!candidates.length)return -WIN;const stand=evaluate(s,s.turn);if(left===0)return stand;
  if(!forced){if(stand>=beta)return stand;alpha=Math.max(alpha,stand);}let best=forced?-Infinity:stand;
  // Quiet king escapes and promotion blocks remain mandatory under threats.
  for(const {child,tactical} of candidates){if(!forced&&!tactical)continue;const value=-(await quiescence(child,-beta,-alpha,left-1));best=Math.max(best,value);alpha=Math.max(alpha,value);if(alpha>=beta)break;await cooperate();}
  return best;
 }
 async function search(s,depth,alpha,beta){
  check();nodes++;if(s.winner)return s.winner===s.turn?WIN+depth:-WIN-depth;if(s.draw)return 0;
  if(depth===0){if(advanced)return quiescence(s,alpha,beta,4);if(rules.isCheckmate(s)||rules.isStalemate(s))return -WIN;return evaluate(s,s.turn);}
  const key=stateKey(s),entry=table.get(key),initialAlpha=alpha,initialBeta=beta;
  if(entry?.depth>=depth){if(entry.flag==='exact')return entry.value;if(entry.flag==='lower')alpha=Math.max(alpha,entry.value);if(entry.flag==='upper')beta=Math.min(beta,entry.value);if(alpha>=beta)return entry.value;}
  const candidates=(await actions(s,false,entry?.best)).slice(0,config.width);if(!candidates.length)return -WIN-depth;
  let best=-Infinity,bestAction=null;
  for(const {action,child} of candidates){const value=-(await search(child,depth-1,-beta,-alpha));if(value>best){best=value;bestAction=actionKey(action);}alpha=Math.max(alpha,value);if(alpha>=beta)break;await cooperate();}
  if(table.size<20000)table.set(key,{depth,value:best,best:bestAction,flag:best<=initialAlpha?'upper':best>=initialBeta?'lower':'exact'});return best;
 }
 try{
  // Always complete legal fallback generation while yielding and cancelling.
  const candidates=await actions(game,true);if(!candidates.length)return null;let best=candidates[0].action;
  for(const c of candidates)if(c.child.winner===game.turn)return c.action;
  if(level==='easy'){const top=candidates.slice(0,5);return top[Math.min(top.length-1,Math.floor(random()*top.length))].action;}
  for(let depth=1;depth<=config.depth;depth++){
   let nextBest=best,score=-Infinity;candidates.sort((a,b)=>(actionKey(b.action)===actionKey(best))-(actionKey(a.action)===actionKey(best))||b.order-a.order);
   try{
    for(const c of candidates){const value=-(await search(c.child,depth-1,-Infinity,-score));if(value>score){score=value;nextBest=c.action;}await cooperate();}
    best=nextBest;onIteration({depth,nodes,score});if(score>=WIN)break;
   }catch(e){if(e!==STOP)throw e;break;}
  }
  return shouldCancel()?null:best;
 }catch(e){if(e===STOP)return null;throw e;}
}
const api={chooseAction,applyAction,evaluate};if(typeof module!=='undefined')module.exports=api;else root.Chess10AI=api;
})(globalThis);