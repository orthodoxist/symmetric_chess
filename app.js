function pieceImage(type,color){
  const img=document.createElement('img');img.className='piece '+color;img.src=Chess10Pieces.url(type,color);
  img.alt='';img.setAttribute('aria-hidden','true');img.draggable=false;return img;
}
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
  piece.src=Chess10Pieces.url(entry.type,entry.color);
  moving=true;const run=++movementRun;
  to.classList.add('moving-square');
  movement=piece.animate([{transform:'translate('+((a.left+a.width/2)-(b.left+b.width/2))+'px,'+((a.top+a.height/2)-(b.top+b.height/2))+'px)'},{transform:'translate(0,0)'}],{duration:360,easing:'cubic-bezier(.25,.7,.3,1)'});
  movement.finished.then(()=>{if(run!==movementRun)return;moving=false;movement=null;to.classList.remove('moving-square');render();}).catch(()=>{});
}
let onlineSession=null,onlineSending=false,onlineRun=0,onlineMessage='',onlineConnecting=false;
const onlineMode=()=>gameMode.value==='online';
const ownOnlineTurn=()=>onlineSession?.ready&&!onlineSession.busy&&game.turn===onlineSession.color;
function closeOnline(){onlineRun++;onlineSession?.close();onlineSession=null;onlineConnecting=false;onlineMessage='';document.querySelector('#invite-link').value='';}
function sendOnline(action){
  if(!ownOnlineTurn())return false;
  onlineSending=true;try{return onlineSession.action(action);}finally{onlineSending=false;}
}
function promotePiece(type){return onlineMode()?sendOnline({kind:'promote',type}):Chess10.promote(game,type);}
async function openOnline(host){
  if(game.clock.started||onlineConnecting)return;
  const input=document.querySelector('#room-code').value.trim();let room=input;
  if(!host){try{if(input.includes('://'))room=new URL(input).searchParams.get('room')||'';}catch{}if(!/^[a-zA-Z0-9_-]{8,100}$/.test(room)){onlineMessage='초대 링크 또는 방 코드를 입력해주세요.';render();return;}}
  closeOnline();cancelAI();cancelMovement();const run=onlineRun;
  onlineConnecting=true;onlineMessage='연결 서비스를 준비 중입니다…';render();
  try{
    const Peer=await Chess10Online.loadPeer();if(run!==onlineRun)return;
    let token=crypto.randomUUID();
    if(!host){try{const key='chess-room-'+room;token=sessionStorage.getItem(key)||token;sessionStorage.setItem(key,token);}catch{}}
    onlineSession=new Chess10Online.Session({Peer,host,color:humanColor.value,minutes:Number(timeControl.value),token,
      onRoom:id=>{if(run!==onlineRun)return;const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('room',id);document.querySelector('#invite-link').value=url.href;onlineMessage='초대 링크를 상대에게 보내주세요. 입장하면 대국이 시작됩니다.';render();},
      onStatus:message=>{if(run!==onlineRun)return;onlineMessage=message;document.querySelector('#online-status').textContent=message;if(!moving)render();},
      onState:(state,changed)=>{if(run!==onlineRun)return;game=state;timeControl.value=String(onlineSession.minutes);humanColor.value=onlineSession.color;if(changed){selected=null;if(!game.pending&&dialog.open)dialog.close();if(!onlineSending){cancelMovement();render();}}else renderClocks();}
    });
    game=onlineSession.game;animatedGame=game;animatedCount=0;onlineConnecting=false;
    if(!host)onlineSession.join(room);render();
  }catch(error){if(run===onlineRun){onlineConnecting=false;onlineMessage=error.message;render();}}
}
function performMove(state,r,c,a,b){if(onlineMode()){if(!Chess10.moves(state,r,c).some(([x,y])=>x===a&&y===b))return false;return sendOnline({kind:'move',from:[r,c],to:[a,b]});}return Chess10.move(state,r,c,a,b);}
const computerTurn=()=>gameMode.value==='ai'&&game.turn!==humanColor.value;
function cancelAI(){aiRun++;aiThinking=false;aiError=false;}
async function playComputer(){
  if(moving||aiThinking||aiError||!computerTurn()||!game.clock.started||game.winner||game.draw||game.pending)return;
  const run=++aiRun,state=game;
  aiThinking=true;selected=null;render();
  try{
    const action=await Chess10AI.chooseAction(state,{level:aiLevel.value,budgetMs:Math.max(50,Math.min({easy:3000,medium:6000,hard:10000}[aiLevel.value],state.clock.remaining[state.turn]-100)),shouldCancel:()=>run!==aiRun||state!==game||Boolean(game.winner||game.draw)});
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
  if(onlineMode()){renderClocks();return;}
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
  document.querySelector('#match-summary').textContent=(onlineMode()?'온라인 대결':gameMode.value==='ai'?'컴퓨터 대결':'혼자 연습')+' · 각 '+timeControl.value+'분 + 0초';
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

    if(lastMove&&!game.pending&&!moving&&lastMove.captureBadge===undefined){
      lastMove.captureBadge=Chess10Material.goodCapture(game,lastMove);
      lastMove.valueBubbleUntil=Date.now()+2000;
      if(lastMove.captureBadge){const state=game;setTimeout(()=>{if(state===game&&!moving)render();},2100);}
    }
    if(!moving&&lastMove?.captureBadge&&lastMove.valueBubbleUntil>Date.now())valueBubbles.set(lastMove.to.join(','),'!');
  }
  const shouldAnimate=animatedGame===game&&game.history.length>animatedCount;
  animatedGame=game;animatedCount=game.history.length;
  board.replaceChildren();
  game.board.forEach((row,r)=>row.forEach((p,c)=>{
    const button=document.createElement('button');
    const key=[r,c].join(','),win=winningSquares.has(key),loss=losingSquares.has(key);
    button.className='square'+((r+c)%2?' dark':'')+(win?' win-threat':'')+(loss?' loss-threat':'')+(lastMove?.from[0]===r&&lastMove?.from[1]===c?' last-from':'')+(lastMove?.to[0]===r&&lastMove?.to[1]===c?' last-to':'')+(selected?.[0]===r&&selected?.[1]===c?' selected':'')+(available.some(([a,b])=>a===r&&b===c)?' possible':'');
    button.setAttribute('aria-label',notation(r,c)+(p?' '+colorName(p.color)+' '+names[p.type]:' 빈칸')+(win?' · 승리 가능한 기물':'')+(loss?' · 패배 위험 칸':''));
    if(p)button.append(pieceImage(p.type,p.color));
    const threatMark=valueBubbles.get(key);
    if(threatMark){
      const reason='포획 후 상대가 다음 수에 잡을 수 있는 아군 기물이 없거나, 잡힌 적 기물보다 낮은 점수의 아군 기물만 잡을 수 있습니다.';
      const bubble=document.createElement('span');bubble.className='move-comment good';
      bubble.textContent=threatMark;bubble.title=reason;
      bubble.setAttribute('aria-label',threatMark+' '+reason);button.append(bubble);
    }
    button.onclick=()=>{
      syncClock();
      if(moving||!game.clock.started||game.winner||game.draw||game.pending||computerTurn()||onlineMode()&&!ownOnlineTurn())return;
      if(selected?.[0]===r&&selected?.[1]===c)selected=null;
      else if(selected&&performMove(game,...selected,r,c))selected=null;
      else selected=p?.color===game.turn?[r,c]:null;
      render();
    };
    board.append(button);
  }));
  if(shouldAnimate)animateLastMove(lastMove);
  const victoryNames={checkmate:'체크메이트 승리',stalemate:'스테일메이트 승리',promotion:'프로모션 승리',timeout:'시간승',kingCapture:'킹 포획 승리',resign:'기권승'};
  document.querySelector('#status').textContent=game.winner?colorName(game.winner)+' 승리! · '+(victoryNames[game.winReason]||'승리'):game.draw?'무승부 · '+(game.draw==='repetition'?'3회 반복':'30수 규칙'):!game.clock.started?'시간을 선택하고 대국을 시작하세요':game.pending?colorName(game.turn)+' · 프로모션 선택':colorName(game.turn)+'의 차례';
  document.querySelector('#online-controls').hidden=!onlineMode();
  document.querySelector('#online-status').textContent=onlineMessage;
  document.querySelector('#create-room').disabled=onlineConnecting||Boolean(onlineSession);
  document.querySelector('#join-room').disabled=onlineConnecting||Boolean(onlineSession);
  startButton.hidden=onlineMode();
  timeControl.disabled=game.clock.started||Boolean(onlineSession);
  startButton.disabled=game.clock.started;
  gameMode.disabled=game.clock.started;
  humanColor.disabled=game.clock.started||gameMode.value==='local';
  aiLevel.disabled=game.clock.started||gameMode.value!=='ai';
  aiStatus.textContent=onlineMode()?(onlineSession?.ready?'내 진영: '+colorName(onlineSession.color)+' · '+onlineMessage:onlineMessage||'상대방의 연결을 기다립니다.'):gameMode.value==='local'?'한 기기에서 두 사람이 번갈아 플레이하세요.':aiError?'컴퓨터 계산에 문제가 발생했습니다. 새 게임으로 다시 시작해주세요.':aiThinking?'컴퓨터가 생각 중입니다…':game.winner||game.draw?'대국이 종료되었습니다.':'내 진영: '+colorName(humanColor.value)+' · 컴퓨터: '+colorName(humanColor.value==='white'?'black':'white');
  renderClocks();

  document.querySelector('#king-count').textContent=['white','black'].map(color=>colorName(color)+' 킹 '+game.board.flat().filter(p=>p?.color===color&&p.type==='K').length+'/2').join(' · ');
  for(const color of ['white','black']){
    const captured=document.querySelector('#captured-'+color);captured.replaceChildren();
    if(!game.captured[color].length)captured.textContent='—';
    for(const p of game.captured[color]){const img=pieceImage(p.type,p.color);img.alt=colorName(p.color)+' '+names[p.type];img.setAttribute('aria-hidden','false');img.title=img.alt;captured.append(img);}
  }
  const history=document.querySelector('#history');history.replaceChildren();
  for(const entry of game.history){const li=document.createElement('li');li.textContent=`${colorName(entry.color)} ${names[entry.type]} ${notation(...entry.from)} → ${notation(...entry.to)}${entry.capture?' · '+names[entry.capture]+' 포획':''}${entry.promotion?' · '+names[entry.promotion]+' 프로모션':''}`;history.append(li);}
  history.scrollTop=history.scrollHeight;
  if(!moving&&game.pending&&!computerTurn()&&(!onlineMode()||ownOnlineTurn())){const choices=document.querySelector('#choices');choices.replaceChildren();for(const type of game.pending.choices){const b=document.createElement('button');b.append(pieceImage(type,game.pending.color));b.setAttribute('aria-label',names[type]+'로 프로모션');b.onclick=()=>{syncClock();if(game.winner||game.draw||computerTurn()||onlineMode()&&!ownOnlineTurn())return;promotePiece(type);dialog.close();render();};choices.append(b);}if(!dialog.open)dialog.showModal();}
  if(!moving&&!aiThinking&&!aiError&&computerTurn()&&game.clock.started&&!game.winner&&!game.draw&&!game.pending)setTimeout(playComputer,120);
}
dialog.addEventListener('cancel',e=>e.preventDefault());
document.querySelector('#restart').onclick=()=>{if(game.clock.started&&!game.winner&&!game.draw&&!confirm('현재 게임을 끝내고 새 게임을 시작할까요?'))return;cancelAI();cancelMovement();closeOnline();game=Chess10.createGame(Number(timeControl.value));selected=null;dialog.close();render();};
timeControl.onchange=()=>{if(game.clock.started)return;game=Chess10.createGame(Number(timeControl.value));selected=null;render();};
startButton.onclick=()=>{if(game.clock.started||onlineMode())return;Chess10.startClock(game);render();};
gameMode.onchange=()=>{if(!game.clock.started){cancelAI();closeOnline();game=Chess10.createGame(Number(timeControl.value));selected=null;render();}};
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

document.querySelector('#create-room').onclick=()=>openOnline(true);
document.querySelector('#join-room').onclick=()=>openOnline(false);
document.querySelector('#leave-room').onclick=()=>{if(game.clock.started)return;closeOnline();game=Chess10.createGame(Number(timeControl.value));selected=null;render();};
document.querySelector('#copy-invite').onclick=async()=>{const link=document.querySelector('#invite-link');if(!link.value)return;try{await navigator.clipboard.writeText(link.value);document.querySelector('#online-status').textContent='초대 링크를 복사했습니다.';}catch{link.select();document.querySelector('#online-status').textContent='선택된 링크를 복사해주세요.';}};
if(typeof location!=='undefined'){const room=new URL(location.href).searchParams.get('room');if(room){gameMode.value='online';document.querySelector('#room-code').value=room;render();}}
