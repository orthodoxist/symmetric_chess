function pieceImage(type,color){
  const img=document.createElement('img');img.className='piece '+color;img.src=Chess10Pieces.url(type,color);
  img.alt='';img.setAttribute('aria-hidden','true');img.draggable=false;return img;
}
const names={R:'룩',N:'나이트',B:'비숍',Q:'퀸',K:'킹',P:'폰'};
const colorName=c=>c==='white'?'백':'흑';
const difficultyName=()=>({easy:'쉬움',medium:'보통',hard:'어려움'}[aiLevel.value]);
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
function closeOnline(){panelPage='overview';chatMessages=[];chatUnread=0;document.querySelector('#chat-input').value='';onlineRun++;onlineSession?.close();onlineSession=null;onlineConnecting=false;onlineMessage='';document.querySelector('#invite-link').value='';}
function sendOnline(action){
  if(!ownOnlineTurn())return false;
  onlineSending=true;try{return onlineSession.action(action);}finally{onlineSending=false;}
}
function promotePiece(type){return onlineMode()?sendOnline({kind:'promote',type}):Chess10.promote(game,type);}
async function openOnline(host){
  if(game.clock.started||onlineConnecting)return;
  const input=document.querySelector('#room-code').value.trim();let room=input;
  if(!host){try{if(input.includes('://'))room=new URL(input).searchParams.get('room')||'';}catch{}if(!/^[a-zA-Z0-9_-]{8,100}$/.test(room)){onlineMessage='초대 링크를 입력해주세요.';render();return;}}
  closeOnline();cancelAI();cancelMovement();const run=onlineRun;
  onlineConnecting=true;onlineMessage='연결 서비스를 준비 중입니다…';render();
  try{
    const Peer=await Chess10Online.loadPeer();if(run!==onlineRun)return;
    let token=crypto.randomUUID();
    if(!host){try{const key='chess-room-'+room;token=sessionStorage.getItem(key)||token;sessionStorage.setItem(key,token);}catch{}}
    onlineSession=new Chess10Online.Session({Peer,host,color:humanColor.value,minutes:Number(timeControl.value),token,
      onChat:messages=>{if(run!==onlineRun)return;const previous=chatMessages.length;chatMessages=messages;if((panelPage!=='chat'||boardFocus&&!infoOpen)&&messages.length>previous&&messages.at(-1)?.color!==onlineSession?.color)chatUnread++;renderChat();},
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
  const elapsed=Math.max(0,Math.floor((Number(timeControl.value)*120000-game.clock.remaining.white-game.clock.remaining.black)/1000));
  document.querySelector('#total-time').textContent=String(Math.floor(elapsed/3600)).padStart(2,'0')+':'+String(Math.floor(elapsed/60)%60).padStart(2,'0')+':'+String(elapsed%60).padStart(2,'0');
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
let highlightGame=null,lastHighlights={winning:[],losing:[]};
function boardHighlights(){
  if(highlightGame!==game){highlightGame=game;lastHighlights={winning:[],losing:[]};}
  const ended=Boolean(game.winner||game.draw);
  const view=ended?{...game,winner:null,draw:null,pending:null}:game;
  const winning=new Set(),losing=new Set();
  const add=threat=>{winning.add(threat.from.join(','));losing.add(threat.to.join(','));};
  const threats=Chess10.winningThreats(view);
  for(const threat of [...threats.white,...threats.black])add(threat);
  // Inspect each actual king destination, including captures and opened lines.
  const kings=[];
  view.board.forEach((row,r)=>row.forEach((p,c)=>{if(p?.color===view.turn&&p.type==='K')kings.push([r,c]);}));
  if(kings.length===1&&!view.pending){
    const [r,c]=kings[0],opponent=view.turn==='white'?'black':'white';
    for(const [a,b] of Chess10.pseudoMoves(view,r,c)){
      const next=Chess10.copyGame(view);
      if(!Chess10.move(next,r,c,a,b,false))continue;
      const attackers=Chess10.winningThreats(next)[opponent].filter(t=>t.reason==='lastKing');
      if(attackers.length){losing.add([a,b].join(','));for(const threat of attackers)winning.add(threat.from.join(','));}
    }
  }
  if(ended){
    for(const key of lastHighlights.winning)winning.add(key);
    for(const key of lastHighlights.losing)losing.add(key);
    if(game.winReason==='promotion'){const move=game.history.at(-1);if(move){winning.add(move.from.join(','));losing.add(move.to.join(','));}}
  }else lastHighlights={winning:[...winning],losing:[...losing]};
  return {winning,losing};
}

let chatMessages=[],chatUnread=0,panelPage='overview';
function renderChat(){
  const section=document.querySelector('#match-chat'),list=document.querySelector('#chat-messages');
  if(!onlineMode())panelPage='overview';
  section.hidden=panelPage!=='chat';
  document.querySelector('#match-overview').hidden=panelPage!=='overview';
  document.querySelector('#chat-tab').hidden=!onlineMode();
  document.querySelector('#overview-tab').setAttribute('aria-selected',String(panelPage==='overview'));
  document.querySelector('#chat-tab').setAttribute('aria-selected',String(panelPage==='chat'));
  document.querySelector('#chat-tab').textContent='2 · 대국 채팅'+(chatUnread?' ('+chatUnread+')':'');
  document.querySelector('#match-info').classList.toggle('has-chat',onlineMode());
  list.replaceChildren();
  for(const message of chatMessages){const li=document.createElement('li');li.textContent=colorName(message.color)+(message.color===onlineSession?.color?' (나)':'')+': '+message.text;list.append(li);}
  list.scrollTop=list.scrollHeight;
  const connected=Boolean(onlineSession?.ready&&onlineSession.conn?.open&&!onlineSession.closed);
  document.querySelector('#chat-input').disabled=!connected;document.querySelector('#chat-send').disabled=!connected;
  document.querySelector('#chat-status').textContent=connected?'Enter 또는 보내기로 전송합니다.':'상대와 연결되면 채팅할 수 있습니다.';
  document.querySelector('#info-tab-label').textContent=infoOpen?'정보 닫기':'대국 정보';
  const badge=document.querySelector('#chat-badge');badge.hidden=!boardFocus||infoOpen||!chatUnread;badge.textContent=String(chatUnread);
  document.querySelector('#info-tab').setAttribute('aria-label',(infoOpen?'정보 닫기':'대국 정보')+(chatUnread?' · 새 채팅 '+chatUnread+'개':''));
}

let boardFocus=false,infoOpen=false;
function render(){
  if(!game.clock.started){boardFocus=false;infoOpen=false;}
  document.querySelector('main').classList.toggle('board-focus',boardFocus);
  document.querySelector('main').classList.toggle('info-open',boardFocus&&infoOpen);
  const focusButton=document.querySelector('#board-focus'),infoTab=document.querySelector('#info-tab');
  focusButton.hidden=!game.clock.started;focusButton.textContent=boardFocus?'기본 화면으로':'체스판 크게 보기';focusButton.setAttribute('aria-pressed',String(boardFocus));
  infoTab.hidden=!boardFocus;document.querySelector('#info-tab-label').textContent=infoOpen?'정보 닫기':'대국 정보';infoTab.setAttribute('aria-expanded',String(infoOpen));
  document.querySelector('#match-info').hidden=boardFocus&&!infoOpen;
  document.querySelector('#setup-screen').hidden=game.clock.started;
  document.querySelector('#match-screen').hidden=!game.clock.started;
  document.querySelector('#restart').hidden=!game.clock.started;
  document.querySelector('#match-summary').textContent=(onlineMode()?'온라인 대결':gameMode.value==='ai'?'컴퓨터 대결 · '+difficultyName():'혼자 연습')+' · 각 '+timeControl.value+'분 + 0초';
  const available=selected?Chess10.moves(game,...selected):[];
  const {winning:winningSquares,losing:losingSquares}=boardHighlights();
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
  document.querySelector('#status').textContent=game.winner?colorName(game.winner)+' 승리! · '+(victoryNames[game.winReason]||'승리')+(gameMode.value==='ai'?' · 컴퓨터 난이도: '+difficultyName():''):game.draw?'무승부 · '+(game.draw==='repetition'?'3회 반복':'30수 규칙'):!game.clock.started?'시간을 선택하고 대국을 시작하세요':game.pending?colorName(game.turn)+' · 프로모션 선택':colorName(game.turn)+'의 차례';
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
  renderChat();

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
document.querySelector('#copy-invite').onclick=async()=>{const link=document.querySelector('#invite-link');if(!link.value)return;try{await navigator.clipboard.writeText(link.value);document.querySelector('#online-status').textContent='초대 링크를 복사했습니다.';}catch{link.select();document.querySelector('#online-status').textContent='선택된 링크를 복사해주세요.';}};
if(typeof location!=='undefined'){const room=new URL(location.href).searchParams.get('room');if(room){gameMode.value='online';document.querySelector('#room-code').value=room;render();}}

document.querySelector('#board-focus').onclick=()=>{cancelMovement();boardFocus=!boardFocus;infoOpen=false;render();};
document.querySelector('#info-tab').onclick=()=>{infoOpen=!infoOpen;if(infoOpen&&panelPage==='chat')chatUnread=0;render();};
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&boardFocus&&infoOpen){infoOpen=false;render();}});

document.querySelector('#chat-form').onsubmit=event=>{event.preventDefault();const input=document.querySelector('#chat-input');if(onlineSession?.sendChat(input.value)){input.value='';renderChat();}else document.querySelector('#chat-status').textContent='전송하지 못했습니다. 연결을 확인하고 잠시 후 다시 보내주세요.';};
document.querySelector('#rules-toggle').onclick=()=>{const rules=document.querySelector('#game-rules');rules.hidden=!rules.hidden;document.querySelector('#rules-toggle').setAttribute('aria-expanded',String(!rules.hidden));};

document.querySelector('#overview-tab').onclick=()=>{panelPage='overview';renderChat();};
document.querySelector('#chat-tab').onclick=()=>{panelPage='chat';chatUnread=0;renderChat();};
