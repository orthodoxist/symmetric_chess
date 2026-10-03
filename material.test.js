const assert=require('node:assert/strict'),E=require('./engine.js'),M=require('./material.js');
let g=E.createGame();assert.deepEqual(M.scores(g),{white:100,black:100});
g.board[0][1]=null;assert.equal(M.scores(g).black,90);g.board[0][4]=null;assert.equal(M.scores(g).black,90);
g=E.createGame();g.captured.white.push(g.board[9][3]);g.board[9][3]=null;g.board[8][0]=null;g.board[1][0]={type:'P',color:'white',moved:true};g.board[0][0]=null;
assert.equal(M.scores(g).white,84);assert.ok(E.move(g,1,0,0,0));assert.ok(E.promote(g,'Q'));assert.equal(M.scores(g).white,98);
function empty(){const s=E.createGame();s.board=Array.from({length:10},()=>Array(10).fill(null));s.board[9][0]={type:'K',color:'white'};s.board[9][1]={type:'K',color:'white'};s.board[0][8]={type:'K',color:'black'};s.board[0][9]={type:'K',color:'black'};return s;}
g=empty();g.board[5][5]={type:'N',color:'white'};g.board[2][3]={type:'R',color:'black'};
assert.ok(M.captureThreats(g).some(t=>t.from.join()==='5,5'&&t.to.join()==='2,3'));
g.board[2][3]={type:'N',color:'black'};assert.ok(M.captureThreats(g).some(t=>t.from.join()==='5,5'));
g.turn='black';assert.ok(M.captureThreats(g).every(t=>g.board[t.from[0]][t.from[1]].color==='black'));
g=empty();g.board[5][5]={type:'B',color:'white'};g.board[2][2]={type:'Q',color:'black'};g.board[4][4]={type:'P',color:'white'};assert.ok(!M.captureThreats(g).some(t=>t.from.join()==='5,5'));g.board[4][4]=null;assert.ok(M.captureThreats(g).some(t=>t.from.join()==='5,5'));
g.board[9][1]=null;g.board[9][9]={type:'R',color:'black'};assert.ok(!M.captureThreats(g).some(t=>t.from.join()==='5,5'&&t.to.join()==='2,2'));
g.winner='black';assert.deepEqual(M.captureThreats(g),[]);
console.log('Passed: material totals, promotion, all capture values, next side only, blockers and legal defenses.');

// Rook takes a knight: any equal/higher allied loss suppresses !.
g=empty();g.board[5][5]={type:'R',color:'white'};g.board[5][7]={type:'N',color:'black'};assert.ok(E.move(g,5,5,5,7));const entry=g.history.at(-1);assert.equal(M.goodCapture(g,entry),true);
g.board[5][9]={type:'R',color:'black'};assert.equal(M.goodCapture(g,entry),true); // Rook A (9) can be lost, less than captured knight (10).
g.board[3][9]={type:'N',color:'white'};assert.equal(M.goodCapture(g,entry),false); // Other allied knight (10) can be captured.
g.board[3][9]={type:'B',color:'white'};assert.equal(M.goodCapture(g,entry),true);
g.board[3][9]={type:'Q',color:'white'};assert.equal(M.goodCapture(g,entry),false);
assert.equal(M.goodCapture(g,{...entry,capture:null}),false);
g.board[3][9]=null;g.board[7][9]={type:'K',color:'white'};assert.equal(M.goodCapture(g,entry),false);
