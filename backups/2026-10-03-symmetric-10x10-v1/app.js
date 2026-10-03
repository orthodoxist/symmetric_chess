const symbols={R:'♜',N:'♞',B:'♝',Q:'♛',K:'♚',P:'♟'};
const names={R:'룩',N:'나이트',B:'비숍',Q:'퀸',K:'킹',P:'폰'};
const colorName=c=>c==='white'?'백':'흑';
const notation=(r,c)=>String.fromCharCode(97+c)+(10-r);
let game=Chess10.createGame(),selected=null;
const board=document.querySelector('#board'),dialog=document.querySelector('#promotion');
const timeControl=document.querySelector('#time-control'),startButton=document.querySelector('#start');
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
  const available=selected?Chess10.moves(game,...selected):[];
  board.replaceChildren();
  game.board.forEach((row,r)=>row.forEach((p,c)=>{
    const button=document.createElement('button');
    button.className='square'+((r+c)%2?' dark':'')+(selected?.[0]===r&&selected?.[1]===c?' selected':'')+(available.some(([a,b])=>a===r&&b===c)?' possible':'');
    button.setAttribute('aria-label',notation(r,c)+(p?' '+colorName(p.color)+' '+names[p.type]:' 빈칸'));
    if(p){const span=document.createElement('span');span.className='piece '+p.color;span.textContent=symbols[p.type];button.append(span);}
    button.onclick=()=>{syncClock();if(!game.clock.started||game.winner||game.draw||game.pending)return;if(selected&&Chess10.move(game,...selected,r,c))selected=null;else selected=p?.color===game.turn?[r,c]:null;render();};
    board.append(button);
  }));
  document.querySelector('#status').textContent=game.winner?colorName(game.winner)+' 승리!'+(game.winReason==='timeout'?' · '+colorName(game.turn)+' 시간패':''):game.draw?'무승부 · '+(game.draw==='repetition'?'3회 반복':'30수 규칙'):!game.clock.started?'시간을 선택하고 대국을 시작하세요':game.pending?colorName(game.turn)+' · 프로모션 선택':colorName(game.turn)+'의 차례';
  timeControl.disabled=game.clock.started;
  startButton.disabled=game.clock.started;
  renderClocks();
  document.querySelector('#king-count').textContent=['white','black'].map(color=>colorName(color)+' 킹 '+game.board.flat().filter(p=>p?.color===color&&p.type==='K').length+'/2').join(' · ');
  for(const color of ['white','black'])document.querySelector('#captured-'+color).textContent=game.captured[color].map(p=>symbols[p.type]).join(' ')||'—';
  const history=document.querySelector('#history');history.replaceChildren();
  for(const entry of game.history){const li=document.createElement('li');li.textContent=`${colorName(entry.color)} ${names[entry.type]} ${notation(...entry.from)} → ${notation(...entry.to)}${entry.capture?' · '+names[entry.capture]+' 포획':''}${entry.promotion?' · '+names[entry.promotion]+' 프로모션':''}`;history.append(li);}
  history.scrollTop=history.scrollHeight;
  if(game.pending){const choices=document.querySelector('#choices');choices.replaceChildren();for(const type of game.pending.choices){const b=document.createElement('button');b.textContent=symbols[type];b.setAttribute('aria-label',names[type]+'로 프로모션');b.onclick=()=>{syncClock();if(game.winner||game.draw)return;Chess10.promote(game,type);dialog.close();render();};choices.append(b);}if(!dialog.open)dialog.showModal();}
}
dialog.addEventListener('cancel',e=>e.preventDefault());
document.querySelector('#restart').onclick=()=>{if(game.clock.started&&!game.winner&&!game.draw&&!confirm('현재 게임을 끝내고 새 게임을 시작할까요?'))return;game=Chess10.createGame(Number(timeControl.value));selected=null;dialog.close();render();};
timeControl.onchange=()=>{if(game.clock.started)return;game=Chess10.createGame(Number(timeControl.value));selected=null;render();};
startButton.onclick=()=>{Chess10.startClock(game);render();};
setInterval(syncClock,100);
document.addEventListener('visibilitychange',syncClock);
render();
