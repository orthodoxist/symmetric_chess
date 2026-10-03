(function(root){
  const rules=typeof module!=='undefined'?require('./engine.js'):root.Chess10;
  const values={P:100,N:600,B:450,R:600,Q:1000,K:850};
  const WIN=1000000;
  const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
  function evaluate(game,color){
    if(game.winner)return game.winner===color?WIN:-WIN;
    if(game.draw)return 0;
    let score=0;
    for(let r=0;r<10;r++)for(let c=0;c<10;c++){
      const p=game.board[r][c];if(!p)continue;
      const center=9-Math.abs(4.5-r)-Math.abs(4.5-c);
      let value=values[p.type];
      if(p.type==='P'){
        const progress=p.color==='white'?8-r:r-1;
        value+=Math.max(0,progress)*18;
        if(!game.captured[p.color].some(q=>q.type!=='P'))value+=Math.max(0,progress)*12;
      }else if(p.type==='N')value+=center*8;
      else if(p.type==='K')value-=center*4;
      score+=p.color===color?value:-value;
    }
    return score;
  }
  function applyAction(game,action){
    const next=rules.copyGame(game),color=game.turn;
    if(!rules.move(next,...action.from,...action.to,false))return null;
    if(next.pending){
      if(!action.promotion||!rules.promote(next,action.promotion,false))return null;
    }else if(action.promotion)return null;
    if(!next.winner&&!next.draw&&rules.winningThreats(next)[color==='white'?'black':'white'].length)return null;
    return next;
  }
  async function chooseAction(game,{level='medium',budgetMs,random=Math.random,shouldCancel=()=>false}={}){
    if(game.winner||game.draw||game.pending)return null;
    const settings={easy:{depth:1,budget:250,width:8},medium:{depth:2,budget:900,width:12},hard:{depth:3,budget:2000,width:18}};
    const config=settings[level]||settings.medium;
    const deadline=Date.now()+(budgetMs??config.budget),STOP=Symbol('stop');
    const color=game.turn;
    const check=()=>{if(shouldCancel()||Date.now()>=deadline)throw STOP;};
    async function actions(state,limit=Infinity,allowInitial=false){
      const list=[];
      for(let r=0;r<10;r++){
        if(!allowInitial)check();
        for(let c=0;c<10;c++){
          const p=state.board[r][c];if(p?.color!==state.turn)continue;
          for(const to of rules.moves(state,r,c)){
            const base={from:[r,c],to};
            const trial=rules.copyGame(state);rules.move(trial,r,c,...to,false);
            const choices=trial.pending?trial.pending.choices:[null];
            for(const promotion of choices){
              const action=promotion?{...base,promotion}:base;
              const child=applyAction(state,action);if(!child)continue;
              list.push({action,child,order:evaluate(child,state.turn)});
            }
          }
        }
        await pause();
        if(shouldCancel())throw STOP;
      }
      list.sort((a,b)=>b.order-a.order);
      return list.slice(0,limit);
    }
    async function search(state,depth,alpha,beta){
      check();
      if(state.winner)return state.winner===color?WIN+depth:-WIN-depth;
      if(state.draw)return 0;
      if(depth===0){
        // Detect a win even at the search horizon, using the current legal rules.
        if(rules.isCheckmate(state)||rules.isStalemate(state))return state.turn===color?-WIN:WIN;
        return evaluate(state,color);
      }
      const candidates=await actions(state,config.width);
      if(!candidates.length)return state.turn===color?-WIN-depth:WIN+depth;
      const maximize=state.turn===color;let best=maximize?-Infinity:Infinity;
      for(const {child} of candidates){
        const value=await search(child,depth-1,alpha,beta);
        best=maximize?Math.max(best,value):Math.min(best,value);
        if(maximize)alpha=Math.max(alpha,best);else beta=Math.min(beta,best);
        if(beta<=alpha)break;
        await pause();
      }
      return best;
    }
    try{
      // Always obtain a legal fallback; initial generation yields to the UI too.
      const candidates=await actions(game,Infinity,true);
      if(!candidates.length)return null;
      let best=candidates[0].action;
      for(const candidate of candidates)if(candidate.child.winner===color)return candidate.action;
      if(level==='easy'){
        const top=candidates.filter(c=>c.order>=candidates[0].order-90).slice(0,5);
        return top[Math.min(top.length-1,Math.floor(random()*top.length))].action;
      }
      for(let depth=1;depth<=config.depth;depth++){
        let iterationBest=best,score=-Infinity;
        try{
          for(const candidate of candidates){
            const value=await search(candidate.child,depth-1,-Infinity,Infinity);
            if(value>score){score=value;iterationBest=candidate.action;}
            await pause();
          }
          best=iterationBest;
          if(score>=WIN)break;
        }catch(error){if(error!==STOP)throw error;break;}
      }
      return shouldCancel()?null:best;
    }catch(error){if(error===STOP)return null;throw error;}
  }
  const api={chooseAction,applyAction,evaluate};
  if(typeof module!=='undefined')module.exports=api;else root.Chess10AI=api;
})(globalThis);
