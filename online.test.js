const assert=require('node:assert/strict'),{EventEmitter}=require('node:events'),E=require('./engine.js'),{Session,pack,unpack}=require('./online.js');
class Peer extends EventEmitter{constructor(){super();this.open=true;}destroy(){}reconnect(){}}
let now=1000;const host=new Session({Peer,host:true,color:'white',minutes:15,now:()=>now});
const guest=new Session({Peer,token:'test'});const sent=[];host.conn={open:true,send:m=>{sent.push(JSON.parse(JSON.stringify(m)));guest.receive(JSON.parse(JSON.stringify(m)));},close(){}};
host.ready=true;E.startClock(host.game,now);host.broadcast();assert.equal(guest.color,'black');assert.equal(guest.game.clock.started,true);assert.ok(guest.game.repetitions instanceof Map);
assert.equal(host.apply({kind:'move',from:[8,0],to:[5,0]},'black',0),false);
assert.equal(host.apply({kind:'move',from:[8,0],to:[4,0]},'white',0),false);
assert.equal(host.apply({kind:'move',from:[8,0],to:[5,0]},'white',0),true);assert.equal(guest.game.turn,'black');assert.equal(guest.game.board[5][0].color,'white');
assert.equal(host.apply({kind:'move',from:[1,0],to:[2,0]},'black',0),false);
assert.equal(host.apply({kind:'move',from:[1,0],to:[2,0]},'black',1),true);assert.equal(guest.game.history.length,2);assert.equal(host.apply({kind:'move',from:[NaN,0],to:[2,0]},'white',2),false);
assert.equal(host.apply({kind:'promote',type:'Q'},'white',2),false);
const frozen=JSON.stringify(pack(host.game));assert.equal(JSON.stringify(pack(unpack(pack(host.game)))).includes('repetitions'),true);assert.ok(frozen);
host.game.board=Array.from({length:10},()=>Array(10).fill(null));host.game.turn='white';host.game.board[9][4]={type:'K',color:'white'};host.game.board[0][4]={type:'K',color:'black'};host.game.board[0][5]={type:'K',color:'black'};host.game.board[1][0]={type:'P',color:'white',moved:true};host.game.captured.white=[{type:'Q',color:'white'}];host.game.winner=null;
assert.ok(host.apply({kind:'move',from:[1,0],to:[0,0]},'white',2));assert.ok(guest.game.pending);assert.equal(host.apply({kind:'promote',type:'N'},'white',3),false);assert.ok(host.apply({kind:'promote',type:'Q'},'white',3));assert.equal(guest.game.board[0][0].type,'Q');
now+=900001;host.tick();assert.equal(host.game.winner,'white');assert.equal(guest.game.winReason,'timeout');
const intruder=new EventEmitter();intruder.metadata={protocol:'symmetric-chess-v1-classic',token:'intruder'};intruder.send=m=>{assert.equal(m.kind,'reject');};intruder.close=()=>{};host.guestToken='original';host.accept(intruder);intruder.emit('open');
host.close();guest.close();console.log('Passed: host authority, colors, synchronized states, turn/revision/legality rejection, promotion, timeout and extra-player rejection.');