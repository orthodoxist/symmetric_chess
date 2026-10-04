const assert=require('node:assert/strict'),{EventEmitter}=require('node:events'),{Session}=require('./online.js');
class Peer extends EventEmitter{destroy(){}}
let now=0;const host=new Session({Peer,host:true,color:'white',now:()=>now}),guest=new Session({Peer,now:()=>now});
host.ready=guest.ready=true;guest.color='black';host.conn={open:true,send:m=>guest.receive(JSON.parse(JSON.stringify(m))),close(){}};guest.conn={open:true,send:m=>host.receive(JSON.parse(JSON.stringify(m))),close(){}};
try{
 assert(host.sendChat(' 안녕하세요 '));assert.equal(guest.messages[0].text,'안녕하세요');assert(guest.sendChat('<b>반갑습니다</b>'));assert.equal(host.messages[1].color,'black');assert.deepEqual(host.messages,guest.messages);assert.equal(host.revision,0);assert.equal(host.game.turn,'white');
 assert.equal(host.sendChat(''),false);assert.equal(host.sendChat('x'.repeat(201)),false);assert.equal(host.sendChat('too soon'),false);host.receive({kind:'chat',protocol:'invalid',text:'wrong version'});assert.equal(host.messages.length,2);
 for(let i=0;i<110;i++){now+=501;assert(host.sendChat('message '+i));}assert.equal(host.messages.length,100);assert.deepEqual(host.messages,guest.messages);
 guest.messages=[];host.broadcast();assert.deepEqual(host.messages,guest.messages);guest.ready=false;assert.equal(guest.sendChat('offline'),false);
 console.log('Passed: bidirectional chat, sender identity, whitespace/length/rate validation, protocol guard, bounded log, reconnect sync and unchanged game state.');
}finally{host.close();guest.close();}
