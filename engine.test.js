const assert=require('node:assert/strict');
const {createGame,moves,move,promote}=require('./engine.js');
function empty(){const g=createGame();g.board=Array.from({length:10},()=>Array(10).fill(null));g.board[9][4]={type:'K',color:'white'};g.board[0][4]={type:'K',color:'black'};g.board[0][5]={type:'K',color:'black'};return g;}
let g=createGame();assert.equal(g.board.flat().filter(Boolean).length,40);assert.deepEqual(g.board[9].map(p=>p.type),['R','N','B','Q','K','K','Q','B','N','R']);assert.deepEqual(moves(g,8,0),[[7,0]]);assert.equal(move(g,8,0,4,0),false);
g=empty();g.board[1][0]={type:'P',color:'white'};g.captured.white=[{type:'Q',color:'white'},{type:'P',color:'white'}];assert.ok(move(g,1,0,0,0));assert.deepEqual(g.pending.choices,['Q']);assert.equal(move(g,0,4,1,4),false);assert.equal(promote(g,'R'),false);assert.ok(promote(g,'Q'));assert.equal(g.board[0][0].type,'Q');assert.equal(g.captured.white.length,1);assert.equal(g.turn,'black');
g=empty();g.board[1][0]={type:'P',color:'white'};g.captured.white=[{type:'P',color:'white'}];assert.equal(move(g,1,0,0,0),false);assert.equal(g.winner,null);
g=empty();g.board[1][4]={type:'R',color:'white'};move(g,1,4,0,4);assert.equal(g.winner,null);assert.equal(g.captured.black[0].type,'K');g.turn='white';assert.equal(move(g,0,4,0,5),false);assert.equal(g.winner,null);assert.equal(g.board[0][5].type,'K');assert.equal(move(g,0,4,0,5,false),false);
g=empty();g.board[1][0]={type:'P',color:'white'};g.captured.white=[{type:'K',color:'white'}];move(g,1,0,0,0);promote(g,'K');assert.equal(g.board[0][0].type,'K');assert.equal(g.captured.white.length,0);
g=empty();g.board[8][4]={type:'R',color:'black'};assert.ok(move(g,9,4,8,4));assert.equal(g.captured.black[0].type,'R');
g=empty();g.board[5][5]={type:'R',color:'white'};g.board[4][5]={type:'P',color:'white'};assert.ok(!moves(g,5,5).some(([r,c])=>r===3&&c===5));
console.log('Passed: setup, pawn movement, promotion choices, blocked final-rank entry, first-king capture, king revival, last-king capture forbidden, blocked sliding moves.');
g=createGame();
for(let cycle=0;cycle<4;cycle++) {
  assert.ok(move(g,9,1,7,2));assert.ok(move(g,0,1,2,2));
  assert.ok(move(g,7,2,9,1));assert.ok(move(g,2,2,0,1));
  assert.equal(g.draw,cycle<3?null:'repetition');
}
assert.equal(move(g,8,0,7,0),false);
g=empty();g.quietPlies=98;assert.ok(move(g,9,4,9,3));assert.equal(g.draw,null);
assert.ok(move(g,0,4,1,4));assert.equal(g.draw,'fiftyMoves');
g=empty();g.quietPlies=99;g.board[8][0]={type:'P',color:'white'};move(g,8,0,7,0);assert.equal(g.quietPlies,0);assert.equal(g.draw,null);
g=empty();g.quietPlies=99;g.board[8][4]={type:'R',color:'black'};move(g,9,4,8,4);assert.equal(g.quietPlies,0);assert.equal(g.draw,null);
const {positionKey}=require('./engine.js');
g=empty();const key=positionKey(g);g.captured.white.push({type:'Q',color:'white'});assert.notEqual(positionKey(g),key);
g=empty();g.board=Array.from({length:10},()=>Array(10).fill(null));g.board[0][0]={type:'P',color:'white'};assert.deepEqual(moves(g,0,0),[]);assert.equal(g.draw,null);
g=empty();g.board[0][5]=null;g.board[1][4]={type:'R',color:'white'};g.quietPlies=99;assert.equal(move(g,1,4,0,4),false);assert.equal(g.winner,null);assert.equal(g.draw,null);
console.log('Passed: fivefold repetition, draw move lock, 100-ply boundary, pawn/capture resets, promotion inventory identity, draw precedence, victory precedence.');
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
for(const color of ['white','black']){
  const start=color==='white'?8:1,dir=color==='white'?-1:1;
  for(const moved of [false,true]){
    g=createGame();g.turn=color;g.board[start][3].moved=moved;
    assert.deepEqual(moves(g,start,3),[[start+dir,3]]);
    for(const distance of [2,3])assert.equal(move(g,start,3,start+dir*distance,3),false);
    assert.ok(move(g,start,3,start+dir,3));g.turn=color;assert.deepEqual(moves(g,start+dir,3),[[start+2*dir,3]]);
  }
  for(const blocker of ['white','black']){
    g=createGame();g.turn=color;g.board[start+dir][3]={type:'N',color:blocker};assert.deepEqual(moves(g,start,3),[]);
  }
  g=createGame();g.turn=color;g.board[start+dir][4]={type:'N',color:color==='white'?'black':'white'};assert.ok(move(g,start,3,start+dir,4));g.turn=color;assert.deepEqual(moves(g,start+dir,4),[[start+2*dir,4]]);
}
g=createGame();const movedKey=positionKey(g);g.board[8][3].moved=true;assert.equal(positionKey(g),movedKey);
console.log('Passed: both colors advance exactly one square on every move, blocked advances, unchanged diagonal captures, legacy moved flags do not affect repetition.');
const knightOffsets=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
for(const color of ['white','black']){
  g=empty();g.turn=color;g.board[5][5]={type:'N',color};
  assert.deepEqual(moves(g,5,5).map(p=>p.join(',')).sort(),knightOffsets.map(([r,c])=>[5+r,5+c].join(',')).sort());
  for(const [dr,dc] of knightOffsets){
    g=empty();g.turn=color;g.board[5][5]={type:'N',color};
    // Surround the knight: both short and long moves must still jump.
    for(let r=4;r<=6;r++)for(let c=4;c<=6;c++)if(r!==5||c!==5)g.board[r][c]={type:'P',color};
    g.board[5+dr][5+dc]={type:'B',color:color==='white'?'black':'white'};
    assert.ok(move(g,5,5,5+dr,5+dc));assert.equal(g.captured[color==='white'?'black':'white'][0].type,'B');
    g=empty();g.turn=color;g.board[5][5]={type:'N',color};g.board[5+dr][5+dc]={type:'P',color};
    assert.equal(move(g,5,5,5+dr,5+dc),false);
  }
}
g=empty();g.board[0][0]={type:'N',color:'white'};assert.deepEqual(moves(g,0,0),[[1,2],[2,1]]);
g=empty();g.board[5][5]={type:'N',color:'white'};assert.equal(move(g,5,5,7,7),false);assert.equal(move(g,5,5,8,8),false);
g=empty();g.board[1][0]={type:'P',color:'white'};g.captured.white=[{type:'N',color:'white'}];move(g,1,0,0,0);promote(g,'N');g.turn='white';assert.ok(moves(g,0,0).some(([r,c])=>r===2&&c===1));
const baseline=require('./backups/2026-10-03-symmetric-10x10-v1/engine.js');
const baselineGame=baseline.createGame();baselineGame.board=Array.from({length:10},()=>Array(10).fill(null));baselineGame.board[5][5]={type:'N',color:'white'};assert.equal(baseline.moves(baselineGame,5,5).length,8);
console.log('Passed: 8 knight destinations, both colors, jumps, captures, friendly destination exclusion, board edges, illegal diagonals, promoted knight, preserved baseline.');
function bishopGame(color='white'){
  const state=createGame();state.board=Array.from({length:10},()=>Array(10).fill(null));state.turn=color;state.board[5][5]={type:'B',color};return state;
}
for(const color of ['white','black'])for(const [dr,dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]){
  g=bishopGame(color);const enemy=color==='white'?'black':'white';
  assert.ok(moves(g,5,5).some(([r,c])=>r===5+dr*3&&c===5+dc*3));
  assert.equal(move(g,5,5,5,7),false);
  g.board[5+dr*2][5+dc*2]={type:'P',color};
  assert.ok(!moves(g,5,5).some(([r,c])=>r===5+dr*2&&c===5+dc*2));
  assert.ok(!moves(g,5,5).some(([r,c])=>r===5+dr*3&&c===5+dc*3));
  g.board[5+dr*2][5+dc*2]={type:'R',color:enemy};
  assert.ok(move(g,5,5,5+dr*2,5+dc*2));assert.equal(g.captured[enemy][0].type,'R');
}
g=createGame();assert.deepEqual(moves(g,9,2),[]);
const originalBishop=baseline.createGame();originalBishop.board=Array.from({length:10},()=>Array(10).fill(null));originalBishop.board[5][5]={type:'B',color:'white'};assert.ok(baseline.moves(originalBishop,5,5).some(([r,c])=>r===4&&c===4));
console.log('Passed: diagonal bishops, blockers, captures, both colors and starting position.');
const {winningThreats}=require('./engine.js');
g=empty();g.board[1][4]={type:'R',color:'white'};assert.deepEqual(winningThreats(g).white,[]);
g.board[0][5]=null;const before=JSON.stringify(g.board);assert.ok(winningThreats(g).white.some(t=>t.reason==='lastKing'));assert.equal(JSON.stringify(g.board),before);assert.equal(g.turn,'white');
g.turn='black';assert.ok(winningThreats(g).white.some(t=>t.reason==='lastKing'));
g.board[0][4]=null;assert.deepEqual(winningThreats(g).white,[]);
for(const color of ['white','black']){
  g=empty();g.turn=color;const r=color==='white'?1:8,a=color==='white'?0:9,opponent=color==='white'?'black':'white';g.board[r][0]={type:'P',color};
  for(const captured of [[],[{type:'P',color}]]){
    g.captured[color]=captured;g.board[a][1]={type:'R',color:opponent};const before=JSON.stringify(g.board);
    assert.deepEqual(moves(g,r,0),[]);assert.equal(move(g,r,0,a,0),false);assert.equal(move(g,r,0,a,1),false);assert.equal(JSON.stringify(g.board),before);assert.equal(g.winner,null);assert.deepEqual(winningThreats(g)[color],[]);
  }
  g.captured[color]=[{type:'N',color}];assert.ok(moves(g,r,0).some(p=>p[0]===a&&p[1]===0));assert.ok(moves(g,r,0).some(p=>p[0]===a&&p[1]===1));assert.ok(move(g,r,0,a,1));assert.ok(g.pending);assert.ok(promote(g,'N'));assert.equal(g.board[a][1].type,'N');assert.equal(g.winner,null);
}
g=empty();g.board[0][5]=null;g.board[2][2]={type:'B',color:'white'};assert.ok(winningThreats(g).white.some(t=>t.reason==='lastKing'));g.board[1][3]={type:'N',color:'white'};assert.deepEqual(winningThreats(g).white,[]);
g=empty();g.board[0][5]=null;g.board[2][5]={type:'N',color:'white'};assert.ok(winningThreats(g).white.some(t=>t.reason==='lastKing'));
g.pending={r:0,c:0,color:'white',choices:['N']};assert.deepEqual(winningThreats(g),{white:[],black:[]});g.pending=null;g.draw='repetition';assert.deepEqual(winningThreats(g),{white:[],black:[]});
console.log('Passed: last-king warnings, two-king exclusion, either turn, promotion eligibility, blocked advances, capture promotion, modified bishop/knight threats, terminal and pending suppression.');
const {unsafeKingMoves}=require('./engine.js');
function loneKingGame(){const state=createGame();state.board=Array.from({length:10},()=>Array(10).fill(null));state.board[5][5]={type:'K',color:'white'};state.board[0][0]={type:'K',color:'black'};return state;}
g=loneKingGame();g.board[5][0]={type:'R',color:'black'};
const stateBefore=JSON.stringify({board:g.board,captured:g.captured,history:g.history,turn:g.turn,quiet:g.quietPlies,repetitions:[...g.repetitions]});
assert.ok(unsafeKingMoves(g).white.some(([r,c])=>r===5&&c===6)); // Moving away opens the line through the old king square.
assert.ok(!unsafeKingMoves(g).white.some(([r,c])=>r===4&&c===5));
assert.equal(JSON.stringify({board:g.board,captured:g.captured,history:g.history,turn:g.turn,quiet:g.quietPlies,repetitions:[...g.repetitions]}),stateBefore);
g.board[9][9]={type:'K',color:'white'};assert.deepEqual(unsafeKingMoves(g).white,[]);
g=loneKingGame();g.board[1][1]={type:'B',color:'black'};
assert.ok(unsafeKingMoves(g).white.some(([r,c])=>r===6&&c===6));
g.board[3][3]={type:'P',color:'white'};assert.ok(!unsafeKingMoves(g).white.some(([r,c])=>r===6&&c===6));
g=loneKingGame();g.board[4][5]={type:'R',color:'black'};assert.ok(!unsafeKingMoves(g).white.some(([r,c])=>r===4&&c===5)); // Captured attacker disappears.
g=loneKingGame();g.board[2][5]={type:'N',color:'black'};assert.ok(unsafeKingMoves(g).white.some(([r,c])=>r===4&&c===6));
g=loneKingGame();g.board[3][4]={type:'P',color:'black',moved:true};assert.ok(unsafeKingMoves(g).white.some(([r,c])=>r===4&&c===5));assert.ok(!unsafeKingMoves(g).white.some(([r,c])=>r===4&&c===4));
g=loneKingGame();g.board[0][0]=null;g.board[4][5]={type:'K',color:'black'};g.board[4][0]={type:'R',color:'black'};assert.ok(!unsafeKingMoves(g).white.some(([r,c])=>r===4&&c===5)); // Last enemy king cannot be directly captured.
g=loneKingGame();g.board[5][0]={type:'R',color:'black'};g.quietPlies=99;assert.deepEqual(unsafeKingMoves(g).white,[]); // Draw ends game before a reply.
g=loneKingGame();g.board[5][0]={type:'R',color:'black'};g.turn='black';assert.deepEqual(unsafeKingMoves(g).white,[]);
g.board[0][0]=null;g.board[5][5]=null;g.board[5][5]={type:'K',color:'black'};g.board[5][0]={type:'R',color:'white'};g.board[9][9]={type:'K',color:'white'};assert.ok(unsafeKingMoves(g).black.length>0);
g.winner='black';assert.deepEqual(unsafeKingMoves(g),{white:[],black:[]});
console.log('Passed: unsafe lone-king destinations, opened rook lines, cannon screen changes, captured attackers, extended knights, pawn attacks, two-king exclusion, game-ending moves, non-mutating simulation.');
// Screenshot regression: black king e10, white pawn f9, black queen g10.
g=createGame();g.turn='black';g.board[0][5]=null;g.board[1][5]={type:'P',color:'white',moved:true};g.board[8][4]=null;g.board[7][5]={type:'P',color:'black',moved:true};
const screenshotThreats=winningThreats(g);
assert.deepEqual(screenshotThreats.white,[]);
assert.ok(!screenshotThreats.white.some(t=>t.reason==='promotion'));

assert.ok(!unsafeKingMoves(g).black.some(p=>p.join(',')==='0,5'));
assert.ok(!unsafeKingMoves(g).black.some(p=>p.join(',')==='0,6'));
console.log('Passed: screenshot separates safe f10 and occupied g10 from threatened e10.');
const {isCheckmate}=require('./engine.js');
function matePosition(){const state=createGame();state.board=Array.from({length:10},()=>Array(10).fill(null));state.turn='black';state.board[0][0]={type:'K',color:'black'};state.board[9][9]={type:'K',color:'white'};state.board[0][9]={type:'R',color:'white'};state.board[1][9]={type:'R',color:'white'};return state;}
g=matePosition();assert.ok(isCheckmate(g));
g.board[1][9]=null;assert.equal(isCheckmate(g),false); // King escape.
g=matePosition();g.board[9][0]={type:'K',color:'black'};assert.equal(isCheckmate(g),false);
g=matePosition();g.board[2][8]={type:'N',color:'black'};assert.equal(isCheckmate(g),false); // Capture checking rook.
g=matePosition();g.board[2][5]={type:'R',color:'black'};assert.equal(isCheckmate(g),false); // Interpose.
g=matePosition();g.board[8][4]={type:'P',color:'black',moved:true};g.captured.black=[{type:'K',color:'black'}];assert.equal(isCheckmate(g),false); // Revive second king.
g=matePosition();g.board[8][4]={type:'P',color:'black',moved:true};assert.equal(isCheckmate(g),true); // A pawn without a captured non-pawn cannot escape via promotion.
g=matePosition();g.board[0][9]=null;g.board[0][1]={type:'P',color:'black'};g.board[1][0]={type:'P',color:'black'};g.board[1][1]={type:'P',color:'black'};assert.equal(isCheckmate(g),false); // No check, no mate.
g=matePosition();g.turn='white';g.board[1][9]=null;g.board[1][8]={type:'R',color:'white'};assert.ok(move(g,1,8,1,9));assert.equal(g.winner,'white');assert.equal(g.winReason,'checkmate');assert.equal(move(g,0,0,1,0),false);
const mateTime={...g.clock.remaining};startClock(g,0);tickClock(g,1000);assert.deepEqual(g.clock.remaining,mateTime);
g=matePosition();const mateBefore=JSON.stringify({board:g.board,history:g.history,captured:g.captured,repetitions:[...g.repetitions]});isCheckmate(g);assert.equal(JSON.stringify({board:g.board,history:g.history,captured:g.captured,repetitions:[...g.repetitions]}),mateBefore);
console.log('Passed: automatic last-king checkmate, escape/capture/block defenses, second king and promotion defenses, no stalemate mate, move lock, frozen clock, non-mutating search.');
const {isStalemate}=require('./engine.js');
g=createGame();assert.equal(isStalemate(g),false);
g=createGame();g.board=Array.from({length:10},()=>Array(10).fill(null));g.board[9][5]={type:'P',color:'black',moved:true};g.board[0][0]={type:'K',color:'white'};g.board[8][8]={type:'N',color:'white'};g.turn='white';
assert.ok(move(g,8,8,6,7));assert.equal(g.winner,null);assert.equal(g.draw,'stalemate');assert.equal(move(g,5,5,5,6),false);
const staleClock={...g.clock.remaining};tickClock(g,9999999);assert.deepEqual(g.clock.remaining,staleClock);
g=createGame();g.board=Array.from({length:10},()=>Array(10).fill(null));g.board[0][5]={type:'P',color:'white',moved:true};g.board[0][0]={type:'K',color:'black'};g.turn='white';assert.ok(isStalemate(g));assert.equal(isCheckmate(g),false);
g.board[5][5]={type:'B',color:'white'};assert.equal(isStalemate(g),false);
g.pending={r:0,c:0,color:'white',choices:['N']};assert.equal(isStalemate(g),false);
console.log('Passed: automatic stalemate draw, both colors detection, cannon mobility, pending promotion exclusion, terminal move lock and clock stop.');
// New legality: no move may leave a one-move king capture or promotion defeat.
g=loneKingGame();g.board[5][0]={type:'R',color:'black'};
assert.ok(!moves(g,5,5).some(([r,c])=>r===5&&c===6));assert.equal(move(g,5,5,5,6),false);
assert.ok(move(g,5,5,4,5)); // Safe escape still allowed.
g=loneKingGame();g.board[5][0]={type:'R',color:'black'};g.board[7][7]={type:'N',color:'white'};assert.equal(move(g,7,7,4,5),false); // Moving another piece cannot ignore king threat.
g=loneKingGame();g.board[5][0]={type:'R',color:'black'};g.board[6][3]={type:'R',color:'white'};assert.ok(move(g,6,3,5,3)); // Block saves last king.
function promotionThreatPosition(){const state=createGame();state.board=Array.from({length:10},()=>Array(10).fill(null));state.board[0][0]={type:'K',color:'white'};state.board[5][5]={type:'K',color:'black'};state.board[8][5]={type:'P',color:'black',moved:true};return state;}
g=promotionThreatPosition();assert.ok(moves(g,0,0).length>0);assert.ok(move(g,0,0,1,0));assert.equal(isStalemate(g),false);assert.equal(isCheckmate(g),false);
g=promotionThreatPosition();g.board[9][0]={type:'R',color:'white'};assert.ok(moves(g,9,0).some(([r,c])=>r===9&&c===5));assert.ok(moves(g,9,0).some(([r,c])=>r===9&&c===4));assert.ok(move(g,9,0,9,5)); // Forward blockade prevents promotion.
g=promotionThreatPosition();g.board[8][0]={type:'R',color:'white'};assert.ok(move(g,8,0,8,5)); // Capture removes promotion threat.
g=promotionThreatPosition();g.captured.black=[{type:'N',color:'black'}];assert.ok(moves(g,0,0).length>0); // Ordinary promotion is not an instant defeat.
g=promotionThreatPosition();g.turn='black';g.board[8][5]=null;g.board[7][5]={type:'P',color:'black',moved:true};assert.ok(move(g,7,5,8,5));assert.equal(g.winner,null);assert.equal(g.draw,null);
g=loneKingGame();g.board[5][0]={type:'R',color:'black'};g.board[1][8]={type:'P',color:'white',moved:true};g.captured.white=[{type:'K',color:'white'},{type:'Q',color:'white'}];
assert.ok(move(g,1,8,0,8));assert.deepEqual(g.pending.choices,['K']);assert.equal(promote(g,'Q'),false);assert.ok(promote(g,'K'));
g=empty();g.board[1][0]={type:'P',color:'white',moved:true};assert.equal(move(g,1,0,0,0),false);assert.equal(g.winner,null);assert.equal(g.winReason,null);
g=promotionThreatPosition();const legalBefore=JSON.stringify({board:g.board,history:g.history,repetitions:[...g.repetitions]});moves(g,0,0);assert.equal(JSON.stringify({board:g.board,history:g.history,repetitions:[...g.repetitions]}),legalBefore);
console.log('Passed: illegal king exposure, mandatory defense with all pieces, no promotion victory threats, pawn capture/block defenses, legal promotion choices, blocked promotion without captured pieces, victory reasons, non-mutating legality.');


for(const color of ['white','black']){
  g=empty();g.turn=color;g.board[5][5]={type:'N',color};
  for(const [dr,dc] of [[-3,-2],[-3,2],[-2,-3],[-2,3],[2,-3],[2,3],[3,-2],[3,2]])assert.equal(move(g,5,5,5+dr,5+dc),false);
}
