const assert=require('node:assert/strict'),{EventEmitter}=require('node:events'),E=require('./engine.js'),{Session,pack,unpack}=require('./online.js');
class Peer extends EventEmitter{constructor(){super();this.open=true;}destroy(){}reconnect(){}}
let now=1000;const host=new Session({Peer,host:true,color:'white',minutes:15,now:()=>now});
const guest=new Session({Peer,token:'test'});const sent=[];host.conn={open:true,send:m=>{sent.push(JSON.parse(JSON.stringify(m)));guest.receive(JSON.parse(JSON.stringify(m)));},close(){}};
host.ready=true;E.startClock(host.game,now);host.broadcast();assert.equal(guest.color,'black');assert.equal(guest.game.clock.started,true);assert.ok(guest.game.repetitions instanceof Map);
assert.equal(host.apply({kind:'move',from:[8,0],to:[5,0]},'black',0),false);
assert.equal(host.apply({kind:'move',from:[8,0],to:[4,0]},'white',0),false);
assert.equal(host.apply({kind:'move',from:[8,0],to:[5,0]},'white',0),false);assert.equal(host.apply({kind:'move',from:[8,0],to:[6,0]},'white',0),false);assert.equal(host.apply({kind:'move',from:[8,0],to:[7,0]},'white',0),true);assert.equal(guest.game.turn,'black');assert.equal(guest.game.board[7][0].color,'white');
assert.equal(host.apply({kind:'move',from:[1,0],to:[2,0]},'black',0),false);
assert.equal(host.apply({kind:'move',from:[1,0],to:[2,0]},'black',1),true);assert.equal(guest.game.history.length,2);assert.equal(host.apply({kind:'move',from:[NaN,0],to:[2,0]},'white',2),false);
assert.equal(host.apply({kind:'promote',type:'Q'},'white',2),false);
const frozen=JSON.stringify(pack(host.game));assert.equal(JSON.stringify(pack(unpack(pack(host.game)))).includes('repetitions'),true);assert.ok(frozen);
host.game.board=Array.from({length:10},()=>Array(10).fill(null));host.game.turn='white';host.game.board[9][4]={type:'K',color:'white'};host.game.board[0][4]={type:'K',color:'black'};host.game.board[0][5]={type:'K',color:'black'};host.game.board[1][0]={type:'P',color:'white',moved:true};host.game.captured.white=[{type:'Q',color:'white'}];host.game.winner=null;
assert.ok(host.apply({kind:'move',from:[1,0],to:[0,0]},'white',2));assert.ok(guest.game.pending);assert.equal(host.apply({kind:'promote',type:'N'},'white',3),false);assert.ok(host.apply({kind:'promote',type:'Q'},'white',3));assert.equal(guest.game.board[0][0].type,'Q');
now+=900001;host.tick();assert.equal(host.game.winner,'white');assert.equal(guest.game.winReason,'timeout');
const intruder=new EventEmitter();intruder.metadata={protocol:'symmetric-chess-v6-checkmate-promotion',token:'intruder'};intruder.send=m=>{assert.equal(m.kind,'reject');};intruder.close=()=>{};host.guestToken='original';host.accept(intruder);intruder.emit('open');
// Binary serialization lets PeerJS chunk snapshots beyond its JSON channel limit.
guest.conn=null;guest.room='test-room';guest.peer.connect=(room,options)=>{assert.equal(options.serialization,'binary');assert.equal(options.reliable,true);return new EventEmitter();};guest.connect();
host.close();guest.conn=null;guest.close();console.log('Passed: host authority, colors, synchronized states, turn/revision/legality rejection, promotion, timeout and extra-player rejection.');
// Host validation rejects final-rank entry without a captured non-pawn, including captures.
for(const color of ['white','black']){
  const session=new Session({Peer,host:true,color});try{
    const state=session.game;state.board=Array.from({length:10},()=>Array(10).fill(null));state.board[9][4]={type:'K',color:'white'};state.board[9][5]={type:'K',color:'white'};state.board[0][4]={type:'K',color:'black'};state.board[0][5]={type:'K',color:'black'};state.turn=color;
    const row=color==='white'?1:8,end=color==='white'?0:9;state.board[row][0]={type:'P',color};state.board[end][1]={type:'N',color:color==='white'?'black':'white'};
    const original=JSON.stringify(pack(state));assert.equal(session.apply({kind:'move',from:[row,0],to:[end,0]},color,0),false);assert.equal(session.apply({kind:'move',from:[row,0],to:[end,1]},color,0),false);assert.equal(JSON.stringify(pack(state)),original);
    state.captured[color]=[{type:'B',color}];assert(session.apply({kind:'move',from:[row,0],to:[end,1]},color,0));assert.equal(state.winner,null);assert(state.pending);assert(session.apply({kind:'promote',type:'B'},color,1));assert.equal(state.winner,null);
  }finally{session.close();}
}
console.log('Passed: online host rejects blocked promotion advances/captures for both colors and permits captured-piece promotion.');
