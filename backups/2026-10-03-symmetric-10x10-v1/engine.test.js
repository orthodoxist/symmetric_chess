const assert=require('node:assert/strict');
const {createGame,moves,move,promote}=require('./engine.js');
function empty(){const g=createGame();g.board=Array.from({length:10},()=>Array(10).fill(null));g.board[9][4]={type:'K',color:'white'};g.board[0][4]={type:'K',color:'black'};g.board[0][5]={type:'K',color:'black'};return g;}
let g=createGame();assert.equal(g.board.flat().filter(Boolean).length,40);assert.deepEqual(g.board[9].map(p=>p.type),['R','N','B','Q','K','K','Q','B','N','R']);assert.deepEqual(moves(g,8,0),[[7,0],[6,0],[5,0]]);assert.equal(move(g,8,0,4,0),false);
g=empty();g.board[1][0]={type:'P',color:'white'};g.captured.white=[{type:'Q',color:'white'},{type:'P',color:'white'}];assert.ok(move(g,1,0,0,0));assert.deepEqual(g.pending.choices,['Q']);assert.equal(move(g,0,4,1,4),false);assert.equal(promote(g,'R'),false);assert.ok(promote(g,'Q'));assert.equal(g.board[0][0].type,'Q');assert.equal(g.captured.white.length,1);assert.equal(g.turn,'black');
g=empty();g.board[1][0]={type:'P',color:'white'};g.captured.white=[{type:'P',color:'white'}];move(g,1,0,0,0);assert.equal(g.winner,'white');
g=empty();g.board[1][4]={type:'R',color:'white'};move(g,1,4,0,4);assert.equal(g.winner,null);assert.equal(g.captured.black[0].type,'K');g.turn='white';move(g,0,4,0,5);assert.equal(g.winner,'white');
g=empty();g.board[1][0]={type:'P',color:'white'};g.captured.white=[{type:'K',color:'white'}];move(g,1,0,0,0);promote(g,'K');assert.equal(g.board[0][0].type,'K');assert.equal(g.captured.white.length,0);
g=empty();g.board[8][4]={type:'R',color:'black'};assert.ok(move(g,9,4,8,4));assert.equal(g.captured.black[0].type,'R');
g=empty();g.board[5][5]={type:'B',color:'white'};g.board[4][4]={type:'P',color:'white'};assert.ok(!moves(g,5,5).some(([r,c])=>r===3&&c===3));
console.log('Passed: setup, pawn movement, promotion choices, instant victory, two-king capture, king revival, unrestricted king capture, blocked sliding moves.');
g=createGame();
for(let cycle=0;cycle<2;cycle++) {
  assert.ok(move(g,9,1,7,2));assert.ok(move(g,0,1,2,2));
  assert.ok(move(g,7,2,9,1));assert.ok(move(g,2,2,0,1));
  assert.equal(g.draw,cycle===0?null:'repetition');
}
assert.equal(move(g,8,0,7,0),false);
g=empty();g.quietPlies=58;assert.ok(move(g,9,4,9,3));assert.equal(g.draw,null);
assert.ok(move(g,0,4,1,4));assert.equal(g.draw,'thirtyMoves');
g=empty();g.quietPlies=59;g.board[8][0]={type:'P',color:'white'};move(g,8,0,7,0);assert.equal(g.quietPlies,0);assert.equal(g.draw,null);
g=empty();g.quietPlies=59;g.board[8][4]={type:'R',color:'black'};move(g,9,4,8,4);assert.equal(g.quietPlies,0);assert.equal(g.draw,null);
const {positionKey}=require('./engine.js');
g=empty();const key=positionKey(g);g.captured.white.push({type:'Q',color:'white'});assert.notEqual(positionKey(g),key);
g=empty();g.board=Array.from({length:10},()=>Array(10).fill(null));g.board[0][0]={type:'P',color:'white'};assert.deepEqual(moves(g,0,0),[]);assert.equal(g.draw,null);
g=empty();g.board[0][5]=null;g.board[1][4]={type:'R',color:'white'};g.quietPlies=59;move(g,1,4,0,4);assert.equal(g.winner,'white');assert.equal(g.draw,null);
console.log('Passed: threefold repetition, draw move lock, 60-ply boundary, pawn/capture resets, promotion inventory identity, no stalemate draw, victory precedence.');
const {startClock,tickClock}=require('./engine.js');
for(const minutes of [15,30,45]){
  g=createGame(minutes);assert.equal(g.clock.remaining.white,minutes*60000);assert.equal(g.clock.remaining.black,minutes*60000);
  tickClock(g,1000);assert.equal(g.clock.remaining.white,minutes*60000);
  assert.ok(startClock(g,1000));assert.equal(startClock(g,2000),false);
  tickClock(g,2000);assert.equal(g.clock.remaining.white,minutes*60000-1000);assert.equal(g.clock.remaining.black,minutes*60000);
  move(g,8,0,7,0);tickClock(g,3500);assert.equal(g.clock.remaining.black,minutes*60000-1500);assert.equal(g.clock.remaining.white,minutes*60000-1000);
  tickClock(g,1000+minutes*60000+10000);assert.equal(g.clock.remaining.black,0);assert.equal(g.winner,'white');assert.equal(g.winReason,'timeout');assert.equal(move(g,1,0,2,0),false);
  const stopped={...g.clock.remaining};tickClock(g,99999999);assert.deepEqual(g.clock.remaining,stopped);
}
g=empty();g.board[1][0]={type:'P',color:'white'};g.captured.white=[{type:'Q',color:'white'}];startClock(g,0);tickClock(g,100);move(g,1,0,0,0);assert.ok(g.pending);tickClock(g,900000);assert.equal(g.winner,'black');assert.equal(g.pending,null);assert.equal(promote(g,'Q'),false);
g=createGame();startClock(g,0);tickClock(g,899999);assert.equal(g.winner,null);tickClock(g,900000);assert.equal(g.winner,'black');
g=createGame();startClock(g,0);g.draw='repetition';tickClock(g,1000000);assert.equal(g.winner,null);assert.equal(g.clock.remaining.white,900000);
console.log('Passed: 15/30/45-minute clocks, start gate, turn switching without increment, timeout boundary, stopped clocks, promotion timeout, draw clock stop.');
for(const color of ['white','black']) for(const distance of [1,2,3]){
  g=createGame();g.turn=color;const start=color==='white'?8:1,dir=color==='white'?-1:1;
  assert.ok(move(g,start,3,start+dir*distance,3));assert.equal(g.board[start+dir*distance][3].moved,true);
  g.turn=color;assert.deepEqual(moves(g,start+dir*distance,3),[[start+dir*(distance+1),3]]);
}
for(const color of ['white','black']) for(const block of [1,2,3]){
  g=createGame();g.turn=color;const start=color==='white'?8:1,dir=color==='white'?-1:1;
  g.board[start+dir*block][3]={type:'N',color:color==='white'?'black':'white'};
  assert.deepEqual(moves(g,start,3),Array.from({length:block-1},(_,i)=>[start+dir*(i+1),3]));
  assert.equal(move(g,start,3,start+dir*block,3),false);
}
g=createGame();g.board[7][4]={type:'N',color:'black'};assert.ok(move(g,8,3,7,4));assert.equal(g.board[7][4].moved,true);g.turn='white';assert.deepEqual(moves(g,7,4),[[6,4]]);
g=createGame();g.board[8][3].moved=true;assert.deepEqual(moves(g,8,3),[[7,3]]);
const movedKey=positionKey(g);g.board[8][3].moved=false;assert.notEqual(positionKey(g),movedKey);
console.log('Passed: both colors first 1/2/3-square advances, one-square later moves, all path blockers, first capture consumes privilege, pawn rights in repetition key.');
