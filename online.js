(function(root){
  const rules=typeof module!=='undefined'?require('./engine.js'):root.Chess10;
  const PROTOCOL='symmetric-chess-v5-stalemate-draw';
  function pack(game){
    return {...game,repetitions:[...game.repetitions],history:game.history.map(({captureBadge,valueBubbleUntil,...entry})=>entry)};
  }
  function unpack(data){return {...data,repetitions:new Map(data.repetitions),clock:{...data.clock,remaining:{...data.clock.remaining},last:Date.now()}};}
  const validSquare=p=>Array.isArray(p)&&p.length===2&&p.every(n=>Number.isInteger(n)&&n>=0&&n<10);
  class Session{
    constructor({Peer,host=false,color='white',minutes=15,token,onState=()=>{},onStatus=()=>{},onRoom=()=>{},onChat=()=>{},now=Date.now}){
      Object.assign(this,{host,color,minutes,token,onState,onStatus,onRoom,onChat,now});
      this.game=rules.createGame(minutes);this.revision=0;this.ready=false;this.closed=false;this.busy=false;
      this.peer=new Peer({debug:0});
      this.peer.on('open',id=>{if(host)this.onRoom(id);else if(this.room)this.connect();});
      this.peer.on('connection',conn=>{if(this.host)this.accept(conn);else conn.close();});
      this.peer.on('error',error=>{this.onStatus('연결 오류: '+(error.type==='peer-unavailable'?'방을 찾을 수 없습니다. 방장이 접속 중인지 확인해주세요.':'네트워크 연결을 확인하고 다시 시도해주세요.'));});
      this.peer.on('disconnected',()=>{if(!this.closed){this.onStatus('연결 서버에 다시 접속 중입니다…');try{this.peer.reconnect();}catch{}}});
      this.timer=setInterval(()=>this.tick(),250);
    }
    join(room){this.room=room;if(this.peer.open)this.connect();}
    connect(){
      if(this.closed||this.conn?.open)return;
      this.onStatus('상대방과 연결 중입니다…');
      this.bind(this.peer.connect(this.room,{reliable:true,serialization:'binary',metadata:{protocol:PROTOCOL,token:this.token}}));
    }
    accept(conn){
      const m=conn.metadata;
      if(m?.protocol!==PROTOCOL||typeof m.token!=='string'||m.token.length>100||!m.token||this.guestToken&&m.token!==this.guestToken||this.conn?.open){
        conn.on('open',()=>{conn.send({kind:'reject',message:'이미 상대가 입장했거나 버전이 다른 방입니다.'});setTimeout(()=>conn.close(),100);});return;
      }
      this.guestToken=m.token;this.bind(conn);
    }
    bind(conn){
      this.conn=conn;
      conn.on('open',()=>{
        if(this.closed||this.conn!==conn)return;
        this.ready=true;this.onStatus('상대방이 연결되었습니다.');
        if(this.host){if(!this.game.clock.started)rules.startClock(this.game,this.now());this.broadcast();this.onState(this.game,true);}
      });
      conn.on('data',message=>{if(this.conn!==conn||this.closed)return;this.receive(message);});
      conn.on('close',()=>{
        if(this.conn!==conn||this.closed)return;
        this.ready=false;this.busy=false;this.onStatus('상대와 연결이 끊겼습니다. 시계는 계속 진행됩니다.');
        if(!this.host)setTimeout(()=>{if(!this.closed&&!this.ready)this.connect();},3000);
      });
      conn.on('error',error=>{console.error('Chess data connection error',error);this.onStatus(error.type==='message-too-big'?'대국 데이터 전송 크기 오류입니다. 두 플레이어 모두 최신 화면으로 다시 접속해주세요.':'대국 연결에 문제가 있습니다. 네트워크를 확인해주세요.');});
    }
    broadcast(){
      if(this.conn?.open)this.conn.send({kind:'state',protocol:PROTOCOL,revision:this.revision,color:this.color==='white'?'black':'white',minutes:this.minutes,game:pack(this.game),chat:this.chatLog()});
    }
    receive(message){
      if(!message||typeof message!=='object')return;
      if(this.host){
        if(message.kind==='chat'&&message.protocol===PROTOCOL){this.receiveChat(message.text,this.color==='white'?'black':'white');return;}
        if(message.kind==='action')this.apply(message.action,this.color==='white'?'black':'white',message.revision);
        else if(message.kind==='sync')this.broadcast();
        return;
      }
      if(message.kind==='chat-log'&&message.protocol===PROTOCOL){this.acceptChatLog(message.messages);return;}
      if(message.kind==='clock'&&message.protocol===PROTOCOL){
        if(message.revision!==this.revision){if(this.conn?.open)this.conn.send({kind:'sync'});return;}
        if(message.remaining&&Number.isFinite(message.remaining.white)&&Number.isFinite(message.remaining.black)){
          this.game.clock.remaining={white:Math.max(0,message.remaining.white),black:Math.max(0,message.remaining.black)};this.game.clock.last=this.now();this.onState(this.game,false);
        }return;
      }
      if(message.kind==='reject'){this.onStatus(message.message);this.close();return;}
      if(message.kind!=='state'||message.protocol!==PROTOCOL||!Number.isInteger(message.revision)||message.revision<this.revision)return;
      if(!message.game||!Array.isArray(message.game.board)||message.game.board.length!==10||!Array.isArray(message.game.repetitions))return;
      if(message.chat)this.acceptChatLog(message.chat);
      const changed=!this.game.clock.started||message.revision!==this.revision||message.game.winner!==this.game.winner||message.game.draw!==this.game.draw;
      const oldHistory=this.game.history;
      const state=unpack(message.game);
      // Preserve local bubble expiry and animation state across clock snapshots.
      state.history.forEach((entry,i)=>{if(i<oldHistory.length){entry.captureBadge=oldHistory[i].captureBadge;entry.valueBubbleUntil=oldHistory[i].valueBubbleUntil;}});
      Object.assign(this.game,state);this.color=message.color;this.minutes=message.minutes;this.revision=message.revision;this.busy=false;this.ready=true;
      this.onState(this.game,changed);
    }
    chatLog(){return this.messages||[];}
    receiveChat(text,color){
      if(typeof text!=='string'||text.length>200||!text.trim())return false;
      const now=this.now();this.chatTimes=this.chatTimes||{};
      if(this.chatTimes[color]!==undefined&&now-this.chatTimes[color]<500)return false;
      this.chatTimes[color]=now;
      this.messages=[...this.chatLog(),{color,text:text.trim()}].slice(-100);
      this.onChat(this.messages);
      if(this.conn?.open)this.conn.send({kind:'chat-log',protocol:PROTOCOL,messages:this.messages});
      return true;
    }
    sendChat(text){
      if(this.closed||!this.ready||!this.conn?.open||typeof text!=='string'||text.length>200||!text.trim())return false;
      if(this.host)return this.receiveChat(text,this.color);
      const now=this.now();if(this.lastChatSent!==undefined&&now-this.lastChatSent<500)return false;
      this.lastChatSent=now;this.conn.send({kind:'chat',protocol:PROTOCOL,text:text.trim()});return true;
    }
    acceptChatLog(messages){
      if(!Array.isArray(messages)||messages.length>100||!messages.every(m=>m&&['white','black'].includes(m.color)&&typeof m.text==='string'&&m.text.length<=200))return;
      this.messages=messages;this.onChat(messages);
    }

    action(action){
      if(!this.ready||this.busy||this.game.turn!==this.color||this.game.winner||this.game.draw)return false;
      if(this.host)return this.apply(action,this.color,this.revision);
      this.busy=true;this.conn.send({kind:'action',revision:this.revision,action});return true;
    }
    apply(action,color,revision){
      rules.tickClock(this.game,this.now());
      let accepted=false;
      if(revision===this.revision&&color===this.game.turn&&!this.game.winner&&!this.game.draw&&action){
        if(action.kind==='move'&&validSquare(action.from)&&validSquare(action.to))accepted=rules.move(this.game,...action.from,...action.to);
        else if(action.kind==='promote'&&typeof action.type==='string')accepted=rules.promote(this.game,action.type);
        else if(action.kind==='resign'){this.game.winner=color==='white'?'black':'white';this.game.winReason='resign';this.game.pending=null;accepted=true;}
      }
      if(accepted)this.revision++;
      this.broadcast();this.onState(this.game,accepted||Boolean(this.game.winner));return accepted;
    }
    tick(){
      if(this.closed)return;
      if(this.host){const ended=rules.tickClock(this.game,this.now());if(ended){this.revision++;this.broadcast();this.onState(this.game,true);}else if(this.conn?.open)this.conn.send({kind:'clock',protocol:PROTOCOL,revision:this.revision,remaining:{...this.game.clock.remaining}});}
      // Guest clocks are for display only. Only the host adjudicates timeout.
      else if(this.game.clock.started&&!this.game.winner&&!this.game.draw){const now=this.now(),elapsed=Math.max(0,now-this.game.clock.last);this.game.clock.last=now;this.game.clock.remaining[this.game.turn]=Math.max(0,this.game.clock.remaining[this.game.turn]-elapsed);}
    }
    close(){this.closed=true;this.ready=false;this.busy=false;clearInterval(this.timer);this.conn?.close();this.peer.destroy();}
  }
  let loading;
  function loadPeer(){
    if(root.Peer)return Promise.resolve(root.Peer);
    if(!loading)loading=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js';
      script.onload=()=>root.Peer?resolve(root.Peer):reject(Error('연결 라이브러리를 불러오지 못했습니다.'));
      script.onerror=()=>{loading=null;reject(Error('연결 서비스를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.'));};document.head.append(script);
    });return loading;
  }
  const api={Session,loadPeer,pack,unpack};if(typeof module!=='undefined')module.exports=api;else root.Chess10Online=api;
})(globalThis);
