const symbols={R:'♜',N:'♞',B:'♝',Q:'♛',K:'♚',P:'♟'};
const names={R:'룩',N:'나이트',B:'비숍',Q:'퀸',K:'킹',P:'폰'};
const colorName=c=>c==='white'?'백':'흑';
const notation=(r,c)=>String.fromCharCode(97+c)+(10-r);
let game=Chess10.createGame(),selected=null;
const board=document.querySelector('#board'),dialog=document.querySelector('#promotion');
const timeControl=document.querySelector('#time-control'),startButton=document.querySelector('#start');
const gameMode=document.querySelector('#game-mode'),humanColor=document.querySelector('#human-color'),aiLevel=document.querySelector('#ai-level'),aiStatus=document.querySelector('#ai-status');
let aiThinking=false,aiRun=0,aiError=false;
let animatedGame=null,animatedCount=0,moving=false,movement=null,movementRun=0;
function cancelMovement(){movementRun++;movement?.cancel();movement=null;moving=false;}
function animateLastMove(entry){
  if(!entry||typeof board.getBoundingClientRect!=='function'||typeof board.children[0]?.querySelector!=='function')return;
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const from=board.children[entry.from[0]*10+entry.from[1]],to=board.children[entry.to[0]*10+entry.to[1]],piece=to.querySelector('.piece');
  if(!piece?.animate)return;
  const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();
  if(!a.width||!b.width)return;
  piece.textContent=symbols[entry.type];
  moving=true;const run=++movementRun;
  to.classList.add('moving-square');
  movement=piece.animate([{transform:'translate('+((a.left+a.width/2)-(b.left+b.width/2))+'px,'+((a.top+a.height/2)-(b.top+b.height/2))+'px)'},{transform:'translate(0,0)'}],{duration:360,easing:'cubic-bezier(.25,.7,.3,1)'});
  movement.finished.then(()=>{if(run!==movementRun)return;moving=false;movement=null;to.classList.remove('moving-square');render();}).catch(()=>{});
}
let reviewQueue=Promise.resolve();
const reviewPositions=new WeakMap();
function performMove(state,r,c,a,b){
  const before=Chess10.copyGame(state);
  if(!Chess10.move(state,r,c,a,b))return false;
  if(before)reviewPositions.set(state.history.at(-1),before);
  return true;
}
function queueReview(){
  if(typeof Chess10Review==='undefined'||moving||game.pending)return;
  const state=game,entry=state.history.at(-1),before=entry&&reviewPositions.get(entry);
  if(!before||entry.reviewRequested)return;
  entry.reviewRequested=true;const after=Chess10.copyGame(state);
  reviewQueue=reviewQueue.catch(()=>{}).then(async()=>{
    if(state!==game)return;
    const annotation=await Chess10Review.reviewMove(before,entry,after,{shouldCancel:()=>state!==game});
    if(state!==game||!annotation)return;
    entry.annotation=annotation;
    if(state.history.at(-1)===entry)entry.bubbleUntil=Date.now()+2000;
    if(!moving)render();
    setTimeout(()=>{if(state===game&&!moving)render();},2100);
  }).catch(error=>console.error('Move review:',error));
}
const computerTurn=()=>gameMode.value==='ai'&&game.turn!==humanColor.value;
function cancelAI(){aiRun++;aiThinking=false;aiError=false;}
async function playComputer(){
  if(moving||aiThinking||aiError||!computerTurn()||!game.clock.started||game.winner||game.draw||game.pending)return;
  const run=++aiRun,state=game;
  aiThinking=true;selected=null;render();
  try{
    const action=await Chess10AI.chooseAction(state,{level:aiLevel.value,budgetMs:Math.max(50,Math.min({easy:250,medium:900,hard:2000,expert:10000}[aiLevel.value],state.clock.remaining[state.turn]-100)),shouldCancel:()=>run!==aiRun||state!==game||Boolean(game.winner||game.draw)});
    if(run!==aiRun||state!==game)return;
    syncClock();if(game.winner||game.draw)return;
    if(!action){
      if(Chess10.isCheckmate(game)||Chess10.isStalemate(game)){
        game.winReason=Chess10.isCheckmate(game)?'checkmate':'stalemate';game.winner=humanColor.value;
      }else throw new Error('Computer returned no move.');
    }else{
      if(!performMove(game,...action.from,...action.to))throw new Error('Computer returned an illegal move.');
      if(game.pending&&!Chess10.promote(game,action.promotion))throw new Error('Computer returned an illegal promotion.');
    }
  }catch(error){
    if(run===aiRun){aiError=true;console.error(error);}
  }finally{
    if(run===aiRun){aiThinking=false;render();}
  }
}
function renderClocks(){
  for(const color of ['white','black']){
    const seconds=Math.ceil(game.clock.remaining[color]/1000);
    document.querySelector('#time-'+color).textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
    document.querySelector('#clock-'+color).classList.toggle('active',game.clock.started&&!game.winner&&!game.draw&&game.turn===color);
  }
}
function syncClock(){
  if(Chess10.tickClock(game)){selected=null;dialog.close();render();}
  renderClocks();
}
for(let i=0;i<10;i++){
  const rank=document.createElement('span');rank.textContent=10-i;document.querySelector('#ranks').append(rank);
  const file=document.createElement('span');file.textContent=String.fromCharCode(97+i);document.querySelector('#files').append(file);
}
function render(){
  document.querySelector('#setup-screen').hidden=game.clock.started;
  document.querySelector('#match-screen').hidden=!game.clock.started;
  document.querySelector('#restart').hidden=!game.clock.started;
  document.querySelector('#match-summary').textContent=(gameMode.value==='ai'?'컴퓨터 대결':'두 사람 대결')+' · 각 '+timeControl.value+'분 + 0초';
  const available=selected?Chess10.moves(game,...selected):[];
  const threats=Chess10.winningThreats(game);
  const winningSquares=new Set(),losingSquares=new Set();
  for(const threat of [...threats.white,...threats.black]){
    winningSquares.add(threat.from.join(','));
    losingSquares.add(threat.to.join(','));
  }
  const unsafe=Chess10.unsafeKingMoves(game);
  for(const square of [...unsafe.white,...unsafe.black])losingSquares.add(square.join(','));
  const lastMove=game.history.at(-1);
  const valueBubbles=new Map();
  if(typeof Chess10Material!=='undefined'){
    const totals=Chess10Material.scores(game);
    for(const color of ['white','black'])document.querySelector('#score-'+color).textContent=totals[color]+' / 100';
    const before=lastMove&&reviewPositions.get(lastMove);
    if(before&&!game.pending&&!moving&&!lastMove.valueThreats){
      lastMove.valueThreats=Chess10Material.newThreats(before,game);
      lastMove.valueBubbleUntil=Date.now()+2000;
      if(lastMove.valueThreats.length){const state=game;setTimeout(()=>{if(state===game&&!moving)render();},2100);}
    }
    if(!moving&&lastMove?.valueBubbleUntil>Date.now())for(const threat of lastMove.valueThreats||[]){
      for(const [square,mark] of [[threat.from,'!'],[threat.to,'?']]){
        const key=square.join(','),previous=valueBubbles.get(key)||'';
        if(!previous.includes(mark))valueBubbles.set(key,previous+mark);
      }
    }
  }
  const shouldAnimate=animatedGame===game&&game.history.length>animatedCount;
  animatedGame=game;animatedCount=game.history.length;
  board.replaceChildren();
  game.board.forEach((row,r)=>row.forEach((p,c)=>{
    const button=document.createElement('button');
    const key=[r,c].join(','),win=winningSquares.has(key),loss=losingSquares.has(key);
    button.className='square'+((r+c)%2?' dark':'')+(win?' win-threat':'')+(loss?' loss-threat':'')+(lastMove?.from[0]===r&&lastMove?.from[1]===c?' last-from':'')+(lastMove?.to[0]===r&&lastMove?.to[1]===c?' last-to':'')+(selected?.[0]===r&&selected?.[1]===c?' selected':'')+(available.some(([a,b])=>a===r&&b===c)?' possible':'');
    button.setAttribute('aria-label',notation(r,c)+(p?' '+colorName(p.color)+' '+names[p.type]:' 빈칸')+(win?' · 승리 가능한 기물':'')+(loss?' · 패배 위험 칸':''));
    if(p){const span=document.createElement('span');span.className='piece '+p.color;span.textContent=symbols[p.type];button.append(span);}
    const threatMark=valueBubbles.get(key);
    const annotation=threatMark?{mark:threatMark,reason:threatMark==='!'?'더 낮은 점수의 기물이 더 높은 점수의 적 기물을 포획할 수 있습니다.':threatMark==='?'?'더 낮은 점수의 적 기물에게 포획될 수 있습니다.':'더 높은 점수의 적을 공격하면서 더 낮은 점수의 적에게 공격받습니다.'}:lastMove?.annotation;
    if(threatMark||annotation&&lastMove.bubbleUntil>Date.now()&&lastMove.to[0]===r&&lastMove.to[1]===c&&!moving){
      const bubble=document.createElement('span');bubble.className='move-comment '+(annotation.mark.includes('?')?'mistake':'good');
      bubble.textContent=lastMove.annotation.mark;bubble.title=annotation.reason;
      bubble.setAttribute('aria-label',lastMove.annotation.mark+' '+lastMove.annotation.reason);button.append(bubble);
    }
    button.onclick=()=>{
      syncClock();
      if(moving||!game.clock.started||game.winner||game.draw||game.pending||computerTurn())return;
      if(selected?.[0]===r&&selected?.[1]===c)selected=null;
      else if(selected&&performMove(game,...selected,r,c))selected=null;
      else selected=p?.color===game.turn?[r,c]:null;
      render();
    };
    board.append(button);
  }));
  if(shouldAnimate)animateLastMove(lastMove);
  const victoryNames={checkmate:'체크메이트 승리',stalemate:'스테일메이트 승리',promotion:'프로모션 승리',timeout:'시간승',kingCapture:'킹 포획 승리'};
  document.querySelector('#status').textContent=game.winner?colorName(game.winner)+' 승리! · '+(victoryNames[game.winReason]||'승리'):game.draw?'무승부 · '+(game.draw==='repetition'?'3회 반복':'30수 규칙'):!game.clock.started?'시간을 선택하고 대국을 시작하세요':game.pending?colorName(game.turn)+' · 프로모션 선택':colorName(game.turn)+'의 차례';
  timeControl.disabled=game.clock.started;
  startButton.disabled=game.clock.started;
  gameMode.disabled=game.clock.started;
  humanColor.disabled=game.clock.started||gameMode.value==='local';
  aiLevel.disabled=game.clock.started||gameMode.value==='local';
  aiStatus.textContent=gameMode.value==='local'?'한 기기에서 두 사람이 번갈아 플레이하세요.':aiError?'컴퓨터 계산에 문제가 발생했습니다. 새 게임으로 다시 시작해주세요.':aiThinking?'컴퓨터가 생각 중입니다…':game.winner||game.draw?'대국이 종료되었습니다.':'내 진영: '+colorName(humanColor.value)+' · 컴퓨터: '+colorName(humanColor.value==='white'?'black':'white');
  renderClocks();

  document.querySelector('#king-count').textContent=['white','black'].map(color=>colorName(color)+' 킹 '+game.board.flat().filter(p=>p?.color===color&&p.type==='K').length+'/2').join(' · ');
  for(const color of ['white','black'])document.querySelector('#captured-'+color).textContent=game.captured[color].map(p=>symbols[p.type]).join(' ')||'—';
  const history=document.querySelector('#history');history.replaceChildren();
  for(const entry of game.history){const li=document.createElement('li');li.textContent=`${colorName(entry.color)} ${names[entry.type]} ${notation(...entry.from)} → ${notation(...entry.to)}${entry.capture?' · '+names[entry.capture]+' 포획':''}${entry.promotion?' · '+names[entry.promotion]+' 프로모션':''}${entry.annotation?' '+entry.annotation.mark:''}`;if(entry.annotation)li.title=entry.annotation.reason;history.append(li);}
  history.scrollTop=history.scrollHeight;
  queueReview();
  if(!moving&&game.pending&&!computerTurn()){const choices=document.querySelector('#choices');choices.replaceChildren();for(const type of game.pending.choices){const b=document.createElement('button');b.textContent=symbols[type];b.setAttribute('aria-label',names[type]+'로 프로모션');b.onclick=()=>{syncClock();if(game.winner||game.draw||computerTurn())return;Chess10.promote(game,type);dialog.close();render();};choices.append(b);}if(!dialog.open)dialog.showModal();}
  if(!moving&&!aiThinking&&!aiError&&computerTurn()&&game.clock.started&&!game.winner&&!game.draw&&!game.pending)setTimeout(playComputer,120);
}
dialog.addEventListener('cancel',e=>e.preventDefault());
document.querySelector('#restart').onclick=()=>{if(game.clock.started&&!game.winner&&!game.draw&&!confirm('현재 게임을 끝내고 새 게임을 시작할까요?'))return;cancelAI();cancelMovement();game=Chess10.createGame(Number(timeControl.value));selected=null;dialog.close();render();};
timeControl.onchange=()=>{if(game.clock.started)return;game=Chess10.createGame(Number(timeControl.value));selected=null;render();};
startButton.onclick=()=>{if(game.clock.started)return;Chess10.startClock(game);render();};
gameMode.onchange=()=>{if(!game.clock.started){cancelAI();selected=null;render();}};
humanColor.onchange=()=>{if(!game.clock.started){cancelAI();selected=null;render();}};
aiLevel.onchange=()=>{if(!game.clock.started){cancelAI();render();}};
setInterval(syncClock,100);
document.addEventListener('visibilitychange',syncClock);
document.addEventListener('contextmenu',event=>{
  if(!selected)return;
  event.preventDefault();
  selected=null;
  render();
});
render();
