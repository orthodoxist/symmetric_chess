const assert=require('node:assert/strict'),E=require('./engine.js'),S=require('./series.js');
const opposite=c=>c==='white'?'black':'white';
function finish(game,score,used){const first=S.color(game.series);game.winner=score===0?null:score>0?first:opposite(first);game.draw=score===0?'repetition':null;for(let i=0;i<2;i++)game.clock.remaining[i===0?first:opposite(first)]=game.series.minutes*60000-used[i];assert(S.record(game));assert.equal(S.record(game),false);}
for(const firstColor of ['white','black'])for(const a of [-1,0,1])for(const b of [-1,0,1]){
 let game=E.createGame(5);game.series=S.create(firstColor,5);assert.equal(S.next(game,E),null);E.startClock(game,0);finish(game,a,[10500,10500]);
 const old=game;game=S.next(game,E);assert(game);assert.equal(S.color(game.series),opposite(firstColor));assert.equal(game.history.length,0);assert.equal(game.clock.remaining.white,300000);assert.equal(game.clock.started,false);assert.equal(old.series.rounds.length,1);
 E.startClock(game,0);finish(game,b,[10500,10500]);const result=S.result(game.series);assert.equal(result.winner,a+b>0?0:a+b<0?1:null);assert.equal(S.next(game,E),null);
}
for(const [used,winner,reason,seconds] of [
 [[[1001,1000],[1001,1000]],null,'equal',[2,2]],
 [[[1499,1501],[1499,1501]],0,'time',[2,3]],
 [[[1900,1500],[1100,1500]],null,'equal',[3,3]],
 [[[2500,1000],[2500,1000]],1,'time',[5,2]],
]){
 let game=E.createGame(5);game.series=S.create('black',5);E.startClock(game,0);finish(game,1,used[0]);game=S.next(game,E);E.startClock(game,0);finish(game,-1,used[1]);assert.deepEqual(S.result(game.series),{winner,reason,seconds});
}
// A score advantage wins even when that player has used more time.
const series=S.create('white',60);series.rounds=[{score:1,used:[900000,1]},{score:0,used:[900000,1]}];assert.equal(S.result(series).winner,0);
// Online host authority: both players must be ready, colors swap once, then reconnect and final results agree.
const {EventEmitter}=require('node:events'),{Session}=require('./online.js');
class Peer extends EventEmitter{constructor(){super();this.open=true;}destroy(){}}
let now=1000;const host=new Session({Peer,host:true,color:'black',minutes:5,twoGames:true,now:()=>now}),guest=new Session({Peer,token:'series-test',now:()=>now});
try{
 host.ready=true;host.conn={open:true,send:m=>guest.receive(JSON.parse(JSON.stringify(m))),close(){}};guest.conn={open:true,send:m=>host.receive(JSON.parse(JSON.stringify(m))),close(){}};
 E.startClock(host.game,now);host.broadcast();assert.equal(guest.color,'white');assert.equal(guest.game.series.round,1);
 assert.equal(host.action({kind:'next-round'}),false);host.game.winner='black';host.game.winReason='kingCapture';host.game.clock.remaining.black=298500;host.game.clock.remaining.white=298499;host.broadcast();host.onState(host.game,true);
 assert.equal(host.game.series.rounds.length,1);assert(host.action({kind:'next-round'}));assert.equal(host.game.series.round,1);assert.equal(guest.game.series.ready[0],true);
 assert(guest.action({kind:'next-round'}));assert.equal(host.game.series.round,2);assert.equal(host.color,'white');assert.equal(guest.color,'black');assert.equal(host.game.clock.started,true);assert.equal(guest.game.clock.remaining.white,300000);assert.equal(guest.busy,false);
 host.game.draw='repetition';host.game.clock.remaining.white=298500;host.game.clock.remaining.black=298499;host.broadcast();assert.equal(S.result(host.game.series).winner,0);assert.deepEqual(S.result(host.game.series),S.result(guest.game.series));assert.equal(host.action({kind:'next-round'}),false);
 // A rejoining guest restores series results and the swapped side.
 const rejoin=new Session({Peer,token:'series-test'});try{host.conn.send=m=>rejoin.receive(JSON.parse(JSON.stringify(m)));host.broadcast();assert.equal(rejoin.color,'black');assert.deepEqual(S.result(rejoin.game.series),S.result(host.game.series));}finally{rejoin.close();}
}finally{host.close();guest.conn=null;guest.close();}
console.log('Passed: all nine outcomes with either starting side, sum-before-rounding time decisions, equal-second draws, result priority, fresh second game, online readiness/color swaps/result sync/rejoin.');
