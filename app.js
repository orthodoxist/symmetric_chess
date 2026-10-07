const t=typeof Chess10I18n==='undefined'?text=>text:Chess10I18n.t;
if(typeof Chess10I18n!=='undefined')Chess10I18n.init();
function pieceImage(type,color){
  const img=document.createElement('img');img.className='piece '+color;img.src=Chess10Pieces.url(type,color);
  img.alt='';img.setAttribute('aria-hidden','true');img.draggable=false;return img;
}
const names=new Proxy({R:'룩',N:'나이트',B:'비숍',Q:'퀸',K:'킹',P:'폰'},{get:(object,key)=>t(object[key])});
const colorName=c=>c==='white'?t('백'):t('흑');
const difficultyName=()=>({easy:t('쉬움'),medium:t('보통'),hard:t('어려움')}[aiLevel.value]);
const notation=(r,c)=>String.fromCharCode(97+c)+(10-r);
let game=Chess10.createGame(Number(document.querySelector('#time-control').value)),selected=null;
let sharingResult=false,boardFlipped=false;
const squareIndex=(r,c)=>boardFlipped?99-(r*10+c):r*10+c;
const board=document.querySelector('#board'),dialog=document.querySelector('#promotion');
const timeControl=document.querySelector('#time-control'),startButton=document.querySelector('#start');
const gameMode=document.querySelector('#game-mode'),humanColor=document.querySelector('#human-color'),aiLevel=document.querySelector('#ai-level'),aiStatus=document.querySelector('#ai-status');
let aiThinking=false,aiRun=0,aiError=false;
let animatedGame=null,animatedCount=0,moving=false,movement=null,movementRun=0;
function cancelMovement(){movementRun++;movement?.cancel();movement=null;moving=false;}
function animateLastMove(entry){
  if(!entry||typeof board.getBoundingClientRect!=='function'||typeof board.children[0]?.querySelector!=='function')return;
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const from=board.children[squareIndex(...entry.from)],to=board.children[squareIndex(...entry.to)],piece=to.querySelector('.piece');
  if(!piece?.animate)return;
  const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();
  if(!a.width||!b.width)return;
  piece.src=Chess10Pieces.url(entry.type,entry.color);
  moving=true;const run=++movementRun;
  to.classList.add('moving-square');
  movement=piece.animate([{transform:'translate('+((a.left+a.width/2)-(b.left+b.width/2))+'px,'+((a.top+a.height/2)-(b.top+b.height/2))+'px)'},{transform:'translate(0,0)'}],{duration:500,easing:'cubic-bezier(.25,.7,.3,1)'});
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
      onStatus:message=>{if(run!==onlineRun)return;onlineMessage=message;document.querySelector('#online-status').textContent=typeof Chess10I18n==='undefined'?message:Chess10I18n.message(message);if(!moving)render();},
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
        if(Chess10.isCheckmate(game)){game.winReason='checkmate';game.winner=humanColor.value;}else game.draw='stalemate';
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
  document.querySelector('#chat-tab').textContent=t('채팅')+(chatUnread?' ('+chatUnread+')':'');
  document.querySelector('#match-info').classList.toggle('has-chat',onlineMode());
  list.replaceChildren();
  for(const message of chatMessages){const li=document.createElement('li');li.textContent=colorName(message.color)+(message.color===onlineSession?.color?t(' (나)'):'')+': '+message.text;list.append(li);}
  list.scrollTop=list.scrollHeight;
  const connected=Boolean(onlineSession?.ready&&onlineSession.conn?.open&&!onlineSession.closed);
  document.querySelector('#chat-input').disabled=!connected;document.querySelector('#chat-send').disabled=!connected;
  document.querySelector('#chat-status').textContent=connected?t('Enter 또는 보내기로 전송합니다.'):t('상대와 연결되면 채팅할 수 있습니다.');
  document.querySelector('#info-tab-label').textContent=infoOpen?t('정보 닫기'):t('대국 정보');
  const badge=document.querySelector('#chat-badge');badge.hidden=!boardFocus||infoOpen||!chatUnread;badge.textContent=String(chatUnread);
  document.querySelector('#info-tab').setAttribute('aria-label',(infoOpen?t('정보 닫기'):t('대국 정보'))+(chatUnread?t(' · 새 채팅 ')+chatUnread+t('개'):''));
}

let boardFocus=false,infoOpen=false;
let reviewOwner=null,reviewIndex=null,reviewKey='',reviewPositions=[];
function reviewState(){
  if(reviewOwner!==game){reviewOwner=game;reviewIndex=null;reviewKey='';reviewPositions=[];}
  if(reviewIndex===null)return game;
  const key=JSON.stringify(game.history.map(({from,to,promotion})=>({from,to,promotion})));
  if(key!==reviewKey){
    const replay=Chess10.createGame(Number(timeControl.value));replay.clock.started=true;
    reviewPositions=[Chess10.copyGame(replay)];
    for(const entry of game.history){replay.winner=null;replay.draw=null;Chess10.move(replay,...entry.from,...entry.to,false);if(entry.promotion)Chess10.promote(replay,entry.promotion,false);reviewPositions.push(Chess10.copyGame(replay));}
    reviewKey=key;
  }
  reviewIndex=Math.min(reviewIndex,game.history.length);
  return reviewPositions[reviewIndex];
}
function turnLabel(state){
  const mine=onlineMode()?onlineSession?.color:humanColor.value;
  return typeof Chess10I18n!=='undefined'&&Chess10I18n.language==='en'?colorName(state.turn)+' to move':colorName(state.turn)+'의 차례';
}

function render(){
  const flipButton=document.querySelector('#board-flip');
  flipButton.hidden=!game.clock.started;flipButton.textContent=t('보드 회전');flipButton.title=t('보드 회전');flipButton.setAttribute('aria-label',t('보드 회전'));flipButton.setAttribute('aria-pressed',String(boardFlipped));
  for(let i=0;i<10;i++){
    document.querySelector('#ranks').children[i].textContent=boardFlipped?i+1:10-i;
    document.querySelector('#files').children[i].textContent=String.fromCharCode(97+(boardFlipped?9-i:i));
  }
  const shareButton=document.querySelector('#share-result');
  if(shareButton){shareButton.hidden=!game.clock.started;shareButton.disabled=sharingResult||!game.winner&&!game.draw;shareButton.textContent=t(sharingResult?'이미지 생성 중…':'결과 공유');}
  const languageControls=document.querySelector('.language-controls');
  if(languageControls)languageControls.hidden=game.clock.started;
  const view=reviewState(),reviewing=reviewIndex!==null;
  if(!game.clock.started){boardFocus=false;infoOpen=false;}
  document.querySelector('main').classList.toggle('board-focus',boardFocus);
  document.querySelector('main').classList.toggle('info-open',boardFocus&&infoOpen);
  const focusButton=document.querySelector('#board-focus'),infoTab=document.querySelector('#info-tab');
  focusButton.hidden=!game.clock.started;focusButton.textContent=boardFocus?t('작게 보기'):t('크게 보기');focusButton.setAttribute('aria-pressed',String(boardFocus));
  infoTab.hidden=!boardFocus;document.querySelector('#info-tab-label').textContent=infoOpen?t('정보 닫기'):t('대국 정보');infoTab.setAttribute('aria-expanded',String(infoOpen));
  document.querySelector('#match-info').hidden=boardFocus&&!infoOpen;
  document.querySelector('#setup-screen').hidden=game.clock.started;
  document.querySelector('#match-screen').hidden=!game.clock.started;
  document.querySelector('#restart').hidden=!game.clock.started;
  const english=typeof Chess10I18n!=='undefined'&&Chess10I18n.language==='en';
  document.querySelector('#match-summary').textContent=(onlineMode()?(english?t('온라인 대결'):'사람과 대결'):gameMode.value==='ai'?(english?t('컴퓨터 대결'):'컴퓨터와 대결')+' · '+difficultyName():t('혼자 연습'))+(english?' · '+timeControl.value+' min':' · '+timeControl.value+'분');
  const available=!reviewing&&selected?Chess10.moves(game,...selected):[];
  const savedHighlights=[highlightGame,lastHighlights];
  const liveGame=game;let colors;
  if(reviewing){game=view;try{colors=boardHighlights();}finally{game=liveGame;[highlightGame,lastHighlights]=savedHighlights;}}else colors=boardHighlights();
  const {winning:winningSquares,losing:losingSquares}=colors;
  const lastMove=view.history.at(-1);
  const valueBubbles=new Map();
  if(typeof Chess10Material!=='undefined'){
    const totals=Chess10Material.scores(view);
    for(const color of ['white','black'])document.querySelector('#score-'+color).textContent=totals[color]+' / 100';

    if(!reviewing&&lastMove&&!game.pending&&!moving&&lastMove.captureBadge===undefined){
      lastMove.captureBadge=Chess10Material.goodCapture(game,lastMove);
      lastMove.valueBubbleUntil=Date.now()+2000;
      if(lastMove.captureBadge){const state=game;setTimeout(()=>{if(state===game&&!moving)render();},2100);}
    }
    if(!reviewing&&!moving&&lastMove?.captureBadge&&lastMove.valueBubbleUntil>Date.now())valueBubbles.set(lastMove.to.join(','),'!');
  }
  const shouldAnimate=!reviewing&&animatedGame===game&&game.history.length>animatedCount;
  animatedGame=game;animatedCount=game.history.length;
  board.replaceChildren();
  view.board.forEach((row,r)=>row.forEach((p,c)=>{
    const button=document.createElement('button');
    const key=[r,c].join(','),win=winningSquares.has(key),loss=losingSquares.has(key);
    button.className='square'+((r+c)%2?' dark':'')+(win?' win-threat':'')+(loss?' loss-threat':'')+(lastMove?.from[0]===r&&lastMove?.from[1]===c?' last-from':'')+(lastMove?.to[0]===r&&lastMove?.to[1]===c?' last-to':'')+(selected?.[0]===r&&selected?.[1]===c?' selected':'')+(available.some(([a,b])=>a===r&&b===c)?' possible':'');
    button.setAttribute('aria-label',notation(r,c)+(p?' '+colorName(p.color)+' '+names[p.type]:t(' 빈칸'))+(win?t(' · 승리 가능한 기물'):'')+(loss?t(' · 패배 위험 칸'):''));
    if(p)button.append(pieceImage(p.type,p.color));
    const threatMark=valueBubbles.get(key);
    if(threatMark){
      const reason=t('포획 후 상대가 다음 수에 잡을 수 있는 아군 기물이 없거나, 잡힌 적 기물보다 낮은 점수의 아군 기물만 잡을 수 있습니다.');
      const bubble=document.createElement('span');bubble.className='move-comment good';
      bubble.textContent=threatMark;bubble.title=reason;
      bubble.setAttribute('aria-label',threatMark+' '+reason);button.append(bubble);
    }
    button.onclick=()=>{
      syncClock();
      if(reviewIndex!==null||moving||!game.clock.started||game.winner||game.draw||game.pending||computerTurn()||onlineMode()&&!ownOnlineTurn())return;
      if(selected?.[0]===r&&selected?.[1]===c)selected=null;
      else if(selected&&performMove(game,...selected,r,c))selected=null;
      else selected=p?.color===game.turn?[r,c]:null;
      render();
    };
    board.append(button);
  }));
  if(boardFlipped){const squares=Array.from(board.children).reverse();board.replaceChildren();for(const square of squares)board.append(square);}
  if(shouldAnimate)animateLastMove(lastMove);
  const victoryNames={checkmate:t('체크메이트'),stalemate:t('스테일메이트'),promotion:t('프로모션'),timeout:t('시간'),kingCapture:t('킹 포획'),resign:t('기권')};
  const resultColor=gameMode.value==='local'?game.winner:onlineMode()?onlineSession?.color:humanColor.value;
  const outcome=resultColor===game.winner;
  const resultLabel=typeof Chess10I18n!=='undefined'&&Chess10I18n.language==='en'?colorName(resultColor)+' '+(outcome?'wins':'loses')+' by '+(victoryNames[game.winReason]||'king capture'):colorName(resultColor)+' '+(victoryNames[game.winReason]||'')+' '+(outcome?t('승리'):t('패배'));
  document.querySelector('#status').textContent=game.winner?resultLabel+(gameMode.value==='ai'?t(' · 컴퓨터 난이도: ')+difficultyName():''):game.draw?t('무승부 · ')+t({repetition:'5회 반복',fiftyMoves:'50수 규칙',stalemate:'스테일메이트'}[game.draw]):!game.clock.started?t('시간을 선택하고 대국을 시작하세요'):game.pending?colorName(game.turn)+t(' · 프로모션 선택'):turnLabel(game);
  const positionNumber=reviewing?reviewIndex:game.history.length;

  if(reviewing)document.querySelector('#status').textContent=turnLabel(view);
  if(game.clock.started)document.querySelector('#status').textContent+=(english?' · Ply '+positionNumber:' · '+positionNumber+'수')+(reviewing?t(' · 기록 보기'):'');
  document.querySelector('#online-controls').hidden=!onlineMode();
  document.querySelector('#online-status').textContent=typeof Chess10I18n==='undefined'?onlineMessage:Chess10I18n.message(onlineMessage);
  document.querySelector('#create-room').disabled=onlineConnecting||Boolean(onlineSession);
  document.querySelector('#join-room').disabled=onlineConnecting||Boolean(onlineSession);
  startButton.hidden=onlineMode();
  timeControl.disabled=game.clock.started||Boolean(onlineSession);
  startButton.disabled=game.clock.started;
  gameMode.disabled=game.clock.started;
  humanColor.disabled=game.clock.started||gameMode.value==='local';
  aiLevel.disabled=game.clock.started||gameMode.value!=='ai';
  const onlineText=typeof Chess10I18n==='undefined'?onlineMessage:Chess10I18n.message(onlineMessage);
  aiStatus.textContent=onlineMode()?(onlineSession?.ready?t('내 진영: ')+colorName(onlineSession.color)+' · '+onlineText:onlineText||t('상대방의 연결을 기다립니다.')):gameMode.value==='local'?t('한 기기에서 두 사람이 번갈아 플레이하세요.'):aiError?t('컴퓨터 계산에 문제가 발생했습니다. 새 게임으로 다시 시작해주세요.'):aiThinking?t('컴퓨터가 생각 중입니다…'):game.winner||game.draw?t('대국이 종료되었습니다.'):t('내 진영: ')+colorName(humanColor.value)+t(' · 컴퓨터: ')+colorName(humanColor.value==='white'?'black':'white');
  renderClocks();
  renderChat();

  document.querySelector('#king-count').textContent=['white','black'].map(color=>colorName(color)+' '+t('킹')+' '+view.board.flat().filter(p=>p?.color===color&&p.type==='K').length+'/2').join(' · ');
  for(const color of ['white','black']){
    const captured=document.querySelector('#captured-'+color);captured.replaceChildren();
    if(!view.captured[color].length)captured.textContent='—';
    for(const p of view.captured[color]){const img=pieceImage(p.type,p.color);img.alt=colorName(p.color)+' '+names[p.type];img.setAttribute('aria-hidden','false');img.title=img.alt;captured.append(img);}
  }
  const history=document.querySelector('#history');history.replaceChildren();
  for(const entry of game.history){const li=document.createElement('li');const english=typeof Chess10I18n!=='undefined'&&Chess10I18n.language==='en';li.textContent=`${colorName(entry.color)} ${names[entry.type]} ${notation(...entry.from)} → ${notation(...entry.to)}${entry.capture?' · '+(english?'captures '+names[entry.capture]:names[entry.capture]+' 포획'):''}${entry.promotion?' · '+(english?'promotes to '+names[entry.promotion]:names[entry.promotion]+' 프로모션'):''}`;history.append(li);}
  history.scrollTop=history.scrollHeight;
  if(!reviewing&&!moving&&game.pending&&!computerTurn()&&(!onlineMode()||ownOnlineTurn())){const choices=document.querySelector('#choices');choices.replaceChildren();for(const type of game.pending.choices){const b=document.createElement('button');b.append(pieceImage(type,game.pending.color));b.setAttribute('aria-label',typeof Chess10I18n!=='undefined'&&Chess10I18n.language==='en'?'Promote to '+names[type]:names[type]+'로 프로모션');b.onclick=()=>{syncClock();if(game.winner||game.draw||computerTurn()||onlineMode()&&!ownOnlineTurn())return;promotePiece(type);dialog.close();render();};choices.append(b);}if(!dialog.open)dialog.showModal();}
  if(!moving&&!aiThinking&&!aiError&&computerTurn()&&game.clock.started&&!game.winner&&!game.draw&&!game.pending)setTimeout(playComputer,120);
}
dialog.addEventListener('cancel',e=>e.preventDefault());
document.querySelector('#restart').onclick=()=>{if(game.clock.started&&!confirm(t('현재 게임을 끝내고 홈 화면으로 이동할까요?')))return;cancelAI();cancelMovement();closeOnline();game=Chess10.createGame(Number(timeControl.value));selected=null;dialog.close();render();};
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
document.querySelector('#copy-invite').onclick=async()=>{const link=document.querySelector('#invite-link');if(!link.value)return;try{await navigator.clipboard.writeText(link.value);document.querySelector('#online-status').textContent=t('초대 링크를 복사했습니다.');}catch{link.select();document.querySelector('#online-status').textContent=t('선택된 링크를 복사해주세요.');}};
if(typeof location!=='undefined'){const room=new URL(location.href).searchParams.get('room');if(room){gameMode.value='online';document.querySelector('#room-code').value=room;render();}}

document.querySelector('#board-flip').onclick=()=>{cancelMovement();boardFlipped=!boardFlipped;render();};
document.querySelector('#board-focus').onclick=()=>{cancelMovement();boardFocus=!boardFocus;infoOpen=false;render();};
let infoDrag=null,infoDragMoved=false,infoPosition=null;
const infoControl=document.querySelector('#info-tab');
function placeInfoControl(){
  if(!infoPosition||!infoControl.getBoundingClientRect)return;
  const rect=infoControl.getBoundingClientRect();
  infoPosition.x=Math.max(8,Math.min(infoPosition.x,window.innerWidth-rect.width-8));
  infoPosition.y=Math.max(8,Math.min(infoPosition.y,window.innerHeight-rect.height-8));
  Object.assign(infoControl.style,{position:'fixed',left:infoPosition.x+'px',top:infoPosition.y+'px',right:'auto',bottom:'auto',transform:'none',margin:'0'});
}
infoControl.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.target.closest?.('.chat-badge'))return;
  const rect=infoControl.getBoundingClientRect();infoDragMoved=false;
  infoDrag={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top};
  infoControl.setPointerCapture(event.pointerId);
});
infoControl.addEventListener('pointermove',event=>{
  if(!infoDrag||event.pointerId!==infoDrag.id)return;
  const dx=event.clientX-infoDrag.x,dy=event.clientY-infoDrag.y;
  if(!infoDragMoved&&Math.hypot(dx,dy)<8)return;
  infoDragMoved=true;infoPosition={x:infoDrag.left+dx,y:infoDrag.top+dy};placeInfoControl();
});
for(const name of ['pointerup','pointercancel'])infoControl.addEventListener(name,event=>{
  if(infoDrag?.id!==event.pointerId)return;
  infoDrag=null;if(infoControl.hasPointerCapture(event.pointerId))infoControl.releasePointerCapture(event.pointerId);
  if(name==='pointercancel')infoDragMoved=false;
});
window.addEventListener?.('resize',placeInfoControl);
infoControl.onclick=()=>{if(infoDragMoved){infoDragMoved=false;return;}infoOpen=!infoOpen;if(infoOpen&&panelPage==='chat')chatUnread=0;render();};
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&boardFocus&&infoOpen){infoOpen=false;render();}});

document.querySelector('#chat-form').onsubmit=event=>{event.preventDefault();const input=document.querySelector('#chat-input');if(onlineSession?.sendChat(input.value)){input.value='';renderChat();}else document.querySelector('#chat-status').textContent=t('전송하지 못했습니다. 연결을 확인하고 잠시 후 다시 보내주세요.');};
document.querySelector('#rules-toggle').onclick=()=>{const rules=document.querySelector('#game-rules');rules.hidden=!rules.hidden;document.querySelector('#rules-toggle').setAttribute('aria-expanded',String(!rules.hidden));};

document.querySelector('#overview-tab').onclick=()=>{panelPage='overview';renderChat();};
document.querySelector('#chat-tab').onclick=()=>{panelPage='chat';chatUnread=0;renderChat();};

if(typeof ResizeObserver!=='undefined'){
  const sizePanel=()=>{const height=board.getBoundingClientRect().height;if(height>0)document.querySelector('#match-info').style.setProperty('--board-height',height+'px');};
  new ResizeObserver(sizePanel).observe(board);
}

let navigationApproved=false;
const activeMatch=()=>game.clock.started;
document.addEventListener('keydown',event=>{
  const reloadKey=event.key==='F5'||(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='r';
  if(!reloadKey||!activeMatch()||event.defaultPrevented)return;
  event.preventDefault();
  if(confirm(t('현재 게임을 끝내고 홈 화면으로 이동할까요?'))){navigationApproved=true;location.reload();}
});
window.addEventListener?.('beforeunload',event=>{
  if(!activeMatch()||navigationApproved)return;
  event.preventDefault();event.returnValue='';
});
document.addEventListener('keydown',event=>{
  if(!(event.ctrlKey||event.metaKey)||event.altKey||!['z','y'].includes(event.key.toLowerCase())||!game.clock.started)return;
  const target=event.target;if(target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName))return;
  event.preventDefault();reviewState();cancelMovement();selected=null;dialog.close();
  if(event.key.toLowerCase()==='z')reviewIndex=Math.max(0,(reviewIndex===null?game.history.length:reviewIndex)-1);
  else if(reviewIndex!==null){reviewIndex++;if(reviewIndex>=game.history.length)reviewIndex=null;}
  render();
});
for(const code of ['en','ko'])document.querySelector('#language-'+code).onclick=()=>{if(typeof Chess10I18n!=='undefined'){Chess10I18n.set(code);render();}};

let resultBlob=null,resultImageURL=null,resultText='';
const resultFileName=()=> 'symmetric-chess-result.png';
function resultSnapshot(){
  const value=id=>document.querySelector(id).textContent;
  return {
    title:t('대칭 체스'),status:value('#status'),kings:value('#king-count'),summary:value('#match-summary'),
    times:[value('#time-white'),value('#time-black')],elapsed:value('#total-time'),scores:[value('#score-white'),value('#score-black')],
    flipped:boardFlipped,
    squares:Array.from(board.children,square=>({background:getComputedStyle(square).backgroundColor,src:square.querySelector('img.piece')?.src||null})),
    captured:['white','black'].map(color=>game.captured[color].map(piece=>({src:Chess10Pieces.url(piece.type,piece.color)}))),
    history:Array.from(document.querySelector('#history').children,item=>item.textContent),
    settings:t('대국 설정')+': '+value('#match-summary')+(gameMode.value==='local'?'':'\n'+t('내 진영')+': '+colorName(onlineMode()?onlineSession.color:humanColor.value)),
    capturedNames:['white','black'].map(color=>game.captured[color].map(piece=>names[piece.type]).join(', ')||'—'),
    labels:{overview:t('대국 현황'),remaining:t('남은 시간'),elapsed:t('총 대국시간'),score:t('기물 점수'),captured:t('포획된 기물'),history:t('이동 기록'),sides:[t('백'),t('흑')]}
  };
}
document.querySelector('#share-result').onclick=async()=>{
  if(!game.winner&&!game.draw||sharingResult)return;
  sharingResult=true;const savedReview=reviewIndex,savedSelection=selected;
  try{
    cancelMovement();reviewIndex=null;selected=null;render();
    const snapshot=resultSnapshot();
    resultText=[snapshot.title,snapshot.status,snapshot.kings,'',snapshot.settings,'',snapshot.labels.remaining,...snapshot.labels.sides.map((side,i)=>side+': '+snapshot.times[i]),snapshot.labels.elapsed+': '+snapshot.elapsed,'',snapshot.labels.score,...snapshot.labels.sides.map((side,i)=>side+': '+snapshot.scores[i]),'',snapshot.labels.captured,...snapshot.labels.sides.map((side,i)=>side+': '+snapshot.capturedNames[i]),'',snapshot.labels.history,...snapshot.history.map((entry,i)=>(i+1)+'. '+entry),'','https://orthodoxist.github.io/symmetric_chess/'].join('\r\n');
    // Restore the viewer immediately; capture always represents the final live position.
    reviewIndex=savedReview;selected=savedSelection;render();
    resultBlob=await Chess10Share.capture(snapshot);
    if(resultImageURL)URL.revokeObjectURL(resultImageURL);
    resultImageURL=URL.createObjectURL(resultBlob);document.querySelector('#result-image').src=resultImageURL;
    document.querySelector('#share-status').textContent='';document.querySelector('#share-preview').showModal();
  }catch(error){console.error(error);alert(t('이미지를 생성하지 못했습니다. 다시 시도해주세요.'));}
  finally{reviewIndex=savedReview;selected=savedSelection;sharingResult=false;render();}
};
document.querySelector('#close-share').onclick=()=>document.querySelector('#share-preview').close();
document.querySelector('#save-image').onclick=()=>{if(resultBlob)Chess10Share.save(resultBlob,resultFileName());};
document.querySelector('#save-text').onclick=()=>{if(resultText)Chess10Share.save(new Blob(['\uFEFF',resultText],{type:'text/plain;charset=utf-8'}),'symmetric-chess-result.txt');};
document.querySelector('#share-image').onclick=async()=>{
  if(!resultBlob)return;
  const status=document.querySelector('#share-status');
  const file=new File([resultBlob],resultFileName(),{type:'image/png'});
  if(!navigator.share||!navigator.canShare?.({files:[file]})){
    Chess10Share.save(resultBlob,resultFileName());status.textContent=t('공유를 지원하지 않아 이미지를 저장했습니다. SNS에 첨부해주세요.');return;
  }
  try{await navigator.share({files:[file],title:t('대칭 체스')});status.textContent='';}
  catch(error){if(error.name!=='AbortError')status.textContent=t('공유하지 못했습니다. 이미지 저장 버튼으로 저장해주세요.');}
};
