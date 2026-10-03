const assert=require('node:assert/strict');
const rules=require('./engine.js');
const {chooseAction}=require('./ai.js');
function empty(){const g=rules.createGame();g.board=Array.from({length:10},()=>Array(10).fill(null));g.board[9][9]={type:'K',color:'white'};g.board[0][0]={type:'K',color:'black'};return g;}
function play(g,action){
  assert.ok(action);assert.ok(rules.moves(g,...action.from).some(p=>p.join(',')===action.to.join(',')));
  assert.ok(rules.move(g,...action.from,...action.to));
  if(g.pending)assert.ok(rules.promote(g,action.promotion));
}
(async()=>{
  for(const level of ['easy','medium','hard']){
    const g=rules.createGame(),before=JSON.stringify({board:g.board,history:g.history,captured:g.captured,turn:g.turn,repetitions:[...g.repetitions]});
    const action=await chooseAction(g,{level,budgetMs:100,random:()=>0});
    assert.equal(JSON.stringify({board:g.board,history:g.history,captured:g.captured,turn:g.turn,repetitions:[...g.repetitions]}),before);play(g,action);
  }
  let g=empty();g.board[1][4]={type:'P',color:'white',moved:true};
  const winning=await chooseAction(g,{level:'hard',budgetMs:500});play(g,winning);assert.equal(g.winner,'white');assert.equal(g.winReason,'promotion');
  g=empty();g.turn='black';g.board[8][4]={type:'P',color:'black',moved:true};
  play(g,await chooseAction(g,{level:'medium',budgetMs:500}));assert.equal(g.winner,'black');assert.equal(g.winReason,'promotion');
  g=empty();g.board[1][4]={type:'P',color:'white',moved:true};g.captured.white=[{type:'Q',color:'white'}];
  play(g,await chooseAction(g,{level:'easy',random:()=>0}));assert.equal(g.board[0][4].type,'Q');assert.equal(g.pending,null);assert.equal(g.turn,'black');
  // AI must defend against a promotion victory, rather than play elsewhere.
  g=empty();g.board[8][4]={type:'P',color:'black',moved:true};g.board[9][0]={type:'R',color:'white'};
  play(g,await chooseAction(g,{level:'medium',budgetMs:150}));assert.equal(rules.winningThreats(g).black.length,0);
  g=empty();g.board[9][9]=null;g.board[2][0]={type:'K',color:'white'};g.board[1][3]={type:'Q',color:'white'};
  play(g,await chooseAction(g,{level:'hard',budgetMs:3000}));assert.equal(g.winner,'white');assert.ok(['checkmate','stalemate'].includes(g.winReason));
  g=rules.createGame();assert.equal(await chooseAction(g,{shouldCancel:()=>true}),null);
  g.winner='white';assert.equal(await chooseAction(g),null);
  g=rules.createGame();let yielded=false;setTimeout(()=>{yielded=true;},0);
  await chooseAction(g,{level:'medium',budgetMs:60});assert.ok(yielded);
  for(let ply=0;ply<20&&!g.winner&&!g.draw;ply++)play(g,await chooseAction(g,{level:'easy',random:()=>0}));
  assert.ok(g.history.length>=1);
  console.log('Passed: all difficulties, legal moves for both colors, immediate wins, automatic promotion, forced defense, mate selection, cancellation, terminal state, cooperative yielding, AI self-play.');
})().catch(error=>{console.error(error);process.exitCode=1;});
