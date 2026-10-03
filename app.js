const symbols={R:'♜',N:'♞',B:'♝',Q:'♛',K:'♚',P:'♟'};
const names={R:'룩',N:'나이트',B:'비숍',Q:'퀸',K:'킹',P:'폰'};
const colorName=c=>c==='white'?'백':'흑';
const notation=(r,c)=>String.fromCharCode(97+c)+(10-r);
let game=Chess10.createGame(),selected=null;
const board=document.querySelector('#board'),dialog=document.querySelector('#promotion');
const timeControl=document.querySelector('#time-control'),startButton=document.querySelector('#start');
const gameMode=document.querySelector('#game-mode'),humanColor=document.querySelector('#human-color'),aiLevel=document.querySelector('#ai-level'),aiStatus=document.querySelector('#ai-status');
let aiThinking=false,aiRun=0,aiError=false;
const computerTurn=()=>gameMode.value==='ai'&&game.turn!==humanColor.value;
function cancelAI(){aiRun++;aiThinking=false;aiError=false;}
async function playComputer(){
  if(aiThinking||aiError||!computerTurn()||!game.clock.started||game.winner||game.draw||game.pending)return;
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
      if(!Chess10.move(game,...action.from,...action.to))throw new Error('Computer returned an illegal move.');
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
  board.replaceChildren();
  game.board.forEach((row,r)=>row.forEach((p,c)=>{
    const button=document.createElement('button');
    const key=[r,c].join(','),win=winningSquares.has(key),loss=losingSquares.has(key);
    button.className='square'+((r+c)%2?' dark':'')+(win?' win-threat':'')+(loss?' loss-threat':'')+(selected?.[0]===r&&selected?.[1]===c?' selected':'')+(available.some(([a,b])=>a===r&&b===c)?' possible':'');
    button.setAttribute('aria-label',notation(r,c)+(p?' '+colorName(p.color)+' '+names[p.type]:' 빈칸')+(win?' · 승리 가능한 기물':'')+(loss?' · 패배 위험 칸':''));
    if(p){const span=document.createElement('span');span.className='piece '+p.color;span.textContent=symbols[p.type];button.append(span);}
    button.onclick=()=>{
      syncClock();
      if(!game.clock.started||game.winner||game.draw||game.pending||computerTurn())return;
      if(selected?.[0]===r&&selected?.[1]===c)selected=null;
      else if(selected&&Chess10.move(game,...selected,r,c))selected=null;
      else selected=p?.color===game.turn?[r,c]:null;
      render();
    };
    board.append(button);
  }));
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
  for(const entry of game.history){const li=document.createElement('li');li.textContent=`${colorName(entry.color)} ${names[entry.type]} ${notation(...entry.from)} → ${notation(...entry.to)}${entry.capture?' · '+names[entry.capture]+' 포획':''}${entry.promotion?' · '+names[entry.promotion]+' 프로모션':''}`;history.append(li);}
  history.scrollTop=history.scrollHeight;
  if(game.pending&&!computerTurn()){const choices=document.querySelector('#choices');choices.replaceChildren();for(const type of game.pending.choices){const b=document.createElement('button');b.textContent=symbols[type];b.setAttribute('aria-label',names[type]+'로 프로모션');b.onclick=()=>{syncClock();if(game.winner||game.draw||computerTurn())return;Chess10.promote(game,type);dialog.close();render();};choices.append(b);}if(!dialog.open)dialog.showModal();}
  if(!aiThinking&&!aiError&&computerTurn()&&game.clock.started&&!game.winner&&!game.draw&&!game.pending)setTimeout(playComputer,120);
}
dialog.addEventListener('cancel',e=>e.preventDefault());
document.querySelector('#restart').onclick=()=>{if(game.clock.started&&!game.winner&&!game.draw&&!confirm('현재 게임을 끝내고 새 게임을 시작할까요?'))return;cancelAI();game=Chess10.createGame(Number(timeControl.value));selected=null;dialog.close();render();};
timeControl.onchange=()=>{if(game.clock.started)return;game=Chess10.createGame(Number(timeControl.value));selected=null;render();};
startButton.onclick=()=>{if(game.clock.started)return;Chess10.startClock(game);render();};
gameMode.onchange=()=>{if(!game.clock.started){cancelAI();selected=null;render();}};
humanColor.onchange=()=>{if(!game.clock.started){cancelAI();selected=null;render();}};
aiLevel.onchange=()=>{if(!game.clock.started){cancelAI();render();}};
setInterval(syncClock,100);
document.addEventListener('visibilitychange',syncClock);
render();
