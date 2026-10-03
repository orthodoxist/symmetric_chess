const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Element{
  constructor(){this.children=[];this.value='';this.disabled=false;this.open=false;this.classList={toggle(){},add(){},remove(){}};}
  append(child){this.children.push(child);}
  replaceChildren(){this.children=[];}
  setAttribute(){}
  addEventListener(){}
  showModal(){this.open=true;}
  close(){this.open=false;}
}
function setup(){
  const elements=new Map(),timers=[],intervals=[],requests=[];
  const element=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
  element('#game-mode').value='ai';element('#human-color').value='white';element('#ai-level').value='medium';element('#time-control').value='15';
  const context=vm.createContext({console,Date,Map,Set,Math,window:{matchMedia:()=>({matches:false})},
    document:{querySelector:element,createElement:()=>new Element(),addEventListener(){}},confirm:()=>true,
    setTimeout:fn=>{timers.push(fn);},setInterval:fn=>{intervals.push(fn);},
    Chess10AI:{chooseAction:async(state,options)=>new Promise(resolve=>requests.push({state,options,resolve}))}});
  vm.runInContext(fs.readFileSync('engine.js','utf8'),context);
  vm.runInContext(fs.readFileSync('material.js','utf8'),context);
  vm.runInContext(fs.readFileSync('app.js','utf8'),context);
  return {element,timers,intervals,requests,run:code=>vm.runInContext(code,context),
    click:(r,c)=>element('#board').children[r*10+c].onclick(),
    async flush(){for(let i=0;i<8;i++)await Promise.resolve();}};
}
(async()=>{
  let h=setup();assert.equal(h.element('#score-white').textContent,'100 / 100');assert.equal(h.element('#score-black').textContent,'100 / 100');assert.equal(h.element('#setup-screen').hidden,false);assert.equal(h.element('#match-screen').hidden,true);assert.equal(h.element('#restart').hidden,true);h.click(8,0);assert.equal(h.run('selected'),null);
  h.element('#start').onclick();assert.equal(h.element('#setup-screen').hidden,true);assert.equal(h.element('#match-screen').hidden,false);assert.equal(h.element('#restart').hidden,false);h.click(8,0);h.click(7,0);assert.equal(h.run('game.turn'),'black');
  h.timers.shift()();assert.equal(h.requests.length,1);assert.equal(h.run('aiThinking'),true);
  h.click(1,0);assert.equal(h.run('selected'),null); // Human cannot play the computer's pieces.
  h.requests[0].resolve({from:[1,0],to:[2,0]});await h.flush();assert.equal(h.run('game.history.length'),2);assert.equal(h.run('game.turn'),'white');assert.equal(h.run('aiThinking'),false);
  assert.equal(h.element('#game-mode').disabled,true);
  h.click(8,1);h.click(7,1);while(!h.requests[1]&&h.timers.length)h.timers.shift()();
  h.element('#restart').onclick();assert.ok(h.requests[1].options.shouldCancel());h.requests[1].resolve({from:[1,1],to:[2,1]});await h.flush();assert.equal(h.run('game.history.length'),0);assert.equal(h.run('game.clock.started'),false);assert.equal(h.element('#setup-screen').hidden,false);assert.equal(h.element('#match-screen').hidden,true);
  h=setup();h.element('#human-color').value='black';h.element('#human-color').onchange();h.element('#start').onclick();h.timers.shift()();assert.equal(h.requests[0].state.turn,'white');h.requests[0].resolve({from:[8,0],to:[7,0]});await h.flush();assert.equal(h.run('game.turn'),'black');
  h=setup();h.element('#game-mode').value='local';h.element('#game-mode').onchange();h.element('#start').onclick();h.click(8,0);h.click(7,0);h.click(1,0);h.click(2,0);assert.equal(h.requests.length,0);assert.equal(h.run('game.history.length'),2);
  h=setup();h.element('#human-color').value='black';h.element('#start').onclick();h.timers.shift()();h.run('game.clock.remaining.white=0');h.intervals[0]();h.requests[0].resolve({from:[8,0],to:[7,0]});await h.flush();assert.equal(h.run('game.winner'),'black');assert.equal(h.run('game.history.length'),0);
  h=setup();h.element('#human-color').value='black';h.run("game.board=Array.from({length:10},()=>Array(10).fill(null));game.board[9][9]={type:'K',color:'white'};game.board[0][0]={type:'K',color:'black'};game.board[1][4]={type:'P',color:'white',moved:true};game.captured.white=[{type:'Q',color:'white'}]");
  h.element('#start').onclick();h.timers.shift()();h.requests[0].resolve({from:[1,4],to:[0,4],promotion:'Q'});await h.flush();assert.equal(h.run('game.board[0][4].type'),'Q');assert.equal(h.element('#promotion').open,false);assert.equal(h.run('game.turn'),'black');
  h=setup();h.element('#time-control').value='30';h.element('#time-control').onchange();assert.equal(h.run('game.clock.remaining.white'),1800000);assert.equal(h.run('game.clock.started'),false);assert.equal(h.element('#match-screen').hidden,true);
  h.element('#start').onclick();assert.equal(h.run('game.clock.remaining.black'),1800000);assert.equal(h.element('#setup-screen').hidden,true);h.element('#restart').onclick();h.element('#time-control').value='45';h.element('#time-control').onchange();h.element('#start').onclick();assert.equal(h.run('game.clock.remaining.white'),2700000);assert.equal(h.element('#match-screen').hidden,false);
  h=setup();h.element('#human-color').value='black';h.element('#ai-level').value='expert';h.element('#start').onclick();h.timers.shift()();
  assert.equal(h.requests[0].options.level,'expert');assert.equal(h.requests[0].options.budgetMs,10000);
  h=setup();h.element('#human-color').value='black';h.element('#ai-level').value='expert';h.element('#start').onclick();h.run('game.clock.remaining.white=500');h.timers.shift()();
  assert.ok(h.requests[0].options.budgetMs<=400);
  // Real animation lifecycle: input waits, restart cancels, stale completion is ignored.
  const animations=[];
  Element.prototype.getBoundingClientRect=function(){return {left:0,top:0,width:50,height:50};};
  Element.prototype.querySelector=function(){return this.children.find(c=>c.className?.startsWith('piece'));};
  Element.prototype.animate=function(frames,options){let finish,reject;const animation={frames,options,finished:new Promise((a,b)=>{finish=a;reject=b;}),finish:()=>finish(),cancel:()=>reject(new Error('cancelled'))};animations.push(animation);return animation;};
  h=setup();h.element('#game-mode').value='local';h.element('#start').onclick();
  for(const square of h.element('#board').children){square.classList.add=()=>{};square.classList.remove=()=>{};}
  // Every subsequent render creates new squares, so provide class methods globally.
  h.click(8,0);h.click(7,0);assert.equal(h.run('moving'),true);assert.equal(animations.at(-1).options.duration,360);
  h.click(1,0);h.click(2,0);assert.equal(h.run('game.history.length'),1);
  animations.at(-1).finish();await h.flush();assert.equal(h.run('moving'),false);
  h.click(1,0);h.click(2,0);assert.equal(h.run('game.history.length'),2);
  h.element('#restart').onclick();await h.flush();assert.equal(h.run('moving'),false);assert.equal(h.run('game.history.length'),0);
  console.log('Passed: setup/match screens, start gate, time selection, return to setup, human/computer turn ownership, automatic replies, settings locks, restart cancellation, computer first move, local mode, timeout during thinking, automatic computer promotion.');
})().catch(error=>{console.error(error);process.exitCode=1;});
