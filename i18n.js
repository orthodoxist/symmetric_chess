(function(root){
  const en={
    '대칭 체스':'Symmetric Chess','두 킹을 모두 잡아 완성하는 승리':'Capture both kings to win',
    '대국 설정':'Game setup','대국 방식':'Game mode','혼자 연습':'Practice','컴퓨터와 대결':'Play the computer','사람과 대결':'Play a human','온라인 대결':'Human','컴퓨터 대결':'Computer',
    '내 진영':'Your side','백 · 선공':'White · moves first','흑 · 후공':'Black · moves second','컴퓨터 난이도':'Computer difficulty',
    '쉬움 · 최대 3초':'Easy · up to 3 seconds','보통 · 최대 6초':'Normal · up to 6 seconds','어려움 · 최대 10초':'Hard · up to 10 seconds',
    '쉬움':'Easy','보통':'Normal','어려움':'Hard','플레이어별 제한시간':'Time per player',
    '5분':'5 min','15분':'15 min','30분':'30 min','45분':'45 min','60분':'60 min',
    '추가 시간은 없습니다. 0초가 되면 시간패합니다.':'No increment. You lose when your time runs out.',
    '방장은 진영과 제한시간을 선택하고 방을 만드세요. 상대는 초대 링크로 입장합니다.':'Choose your side and time limit, then create a room. Your opponent joins using the invite link.',
    '방 만들기':'Create room','초대 링크':'Invite link','방을 만들면 표시됩니다':'Appears after you create a room','초대 링크 복사':'Copy invite link','상대가 보낸 링크 입력':'Paste your opponent’s invite link','방 입장':'Join room','대국 시작':'Start game','게임 규칙':'Game rules',
    '시작 배치는 R N B Q K K Q B N R 입니다.':'The starting back rank is R N B Q K K Q B N R.',
    '상대 킹 2개를 모두 포획하면 승리합니다.':'Capture both of your opponent’s kings to win.',
    '폰은 첫 이동에 1·2·3칸 전진을 선택할 수 있습니다.':'A pawn may advance 1, 2, or 3 squares on its first move.',
    '캐슬링과 앙파상은 없습니다.':'There is no castling or en passant.',
    '프로모션은 포획된 자신의 비폰 기물만 선택할 수 있습니다. 포획된 킹도 선택 가능합니다.':'A pawn can promote only to one of your captured non-pawn pieces, including a captured king.',
    '프로모션 시 자신의 비폰 기물이 모두 살아 있으면 승리합니다.':'You win by promoting a pawn if all of your non-pawn pieces are still on the board.',
    '다음 상대 수에 마지막 킹이 포획되거나 상대가 프로모션으로 승리할 수 있는 이동은 금지되며, 가능한 수가 없으면 마지막 킹이 공격받는 경우 체크메이트, 그 외에는 스테일메이트 패배입니다.':'A move is illegal if it allows your opponent to capture your last king or win by promotion on their next move. If you have no legal moves, you lose by checkmate when your last king is under attack, or by stalemate otherwise.',
    '같은 차례와 기물 배치가 5회 반복되면 무승부입니다.':'The game is drawn when the same position occurs five times with the same side to move.',
    '폰 이동이나 포획 없이 양쪽이 각각 50수(총 100회 행마)를 진행하면 무승부입니다.':'The game is drawn after each player makes 50 moves (100 plies in total) without a pawn move or capture.',
    '보드 회전':'Rotate board','크게 보기':'Expand board','작게 보기':'Shrink board','홈 화면':'Home','대국 정보':'Game info','정보 닫기':'Close info','대국 현황':'Overview','채팅':'Chat','대국 채팅':'Game chat','대국 시간':'Clocks','남은 시간':'Time remaining','총 대국시간':'Elapsed time','기물 점수':'Material score','이동 기록':'Move history','포획된 기물':'Captured pieces','백이 잃은 기물':'White’s lost pieces','흑이 잃은 기물':'Black’s lost pieces',
    '백':'White','흑':'Black','룩':'Rook','나이트':'Knight','비숍':'Bishop','퀸':'Queen','킹':'King','폰':'Pawn',
    '돌아올 기물을 선택하세요':'Choose a piece to bring back','포획된 자신의 비폰 기물 중 하나로 프로모션합니다.':'Promote to one of your captured non-pawn pieces.',
    '10×10 체스판':'10×10 chessboard','대국 정보 페이지':'Game information tabs','채팅 기록':'Chat history','상대에게 보낼 메시지':'Message to your opponent','메시지 입력 (최대 200자)':'Message (up to 200 characters)','보내기':'Send',
    '컴퓨터와 대결할 수 있습니다.':'You can play against the computer.','초대 링크를 입력해주세요.':'Please enter an invite link.','연결 서비스를 준비 중입니다…':'Preparing the connection…','초대 링크를 상대에게 보내주세요. 입장하면 대국이 시작됩니다.':'Send the invite link to your opponent. The game starts when they join.',
    'Enter 또는 보내기로 전송합니다.':'Press Enter or Send to send a message.','상대와 연결되면 채팅할 수 있습니다.':'Chat becomes available when your opponent connects.',' (나)':' (you)',' · 새 채팅 ':' · New messages: ','개':'',
    ' 빈칸':' empty square',' · 승리 가능한 기물':' · winning threat',' · 패배 위험 칸':' · danger square',
    '포획 후 상대가 다음 수에 잡을 수 있는 아군 기물이 없거나, 잡힌 적 기물보다 낮은 점수의 아군 기물만 잡을 수 있습니다.':'After this capture, your opponent cannot capture any of your pieces on the next move, or can capture only pieces worth less than the piece you captured.',
    '체크메이트':'checkmate','스테일메이트':'stalemate','프로모션':'promotion','시간':'timeout','킹 포획':'king capture','기권':'resignation','승리':'wins','패배':'loses','무승부 · ':'Draw · ','5회 반복':'fivefold repetition','50수 규칙':'50-move rule','시간을 선택하고 대국을 시작하세요':'Choose a time limit and start the game',' · 프로모션 선택':' · choose a promotion',' · 기록 보기':' · reviewing history',' · 컴퓨터 난이도: ':' · Computer difficulty: ',
    '내 진영: ':'Your side: ',' · 컴퓨터: ':' · Computer: ','상대방의 연결을 기다립니다.':'Waiting for your opponent to connect.','한 기기에서 두 사람이 번갈아 플레이하세요.':'Take turns playing on this device.','컴퓨터 계산에 문제가 발생했습니다. 새 게임으로 다시 시작해주세요.':'The computer encountered an error. Return home and start a new game.','컴퓨터가 생각 중입니다…':'The computer is thinking…','대국이 종료되었습니다.':'The game has ended.',
    '현재 게임을 끝내고 홈 화면으로 이동할까요?':'End the current game and return home?','초대 링크를 복사했습니다.':'Invite link copied.','선택된 링크를 복사해주세요.':'Please copy the selected link.','전송하지 못했습니다. 연결을 확인하고 잠시 후 다시 보내주세요.':'Could not send. Check your connection and try again shortly.',
    '연결 오류: ':'Connection error: ','방을 찾을 수 없습니다. 방장이 접속 중인지 확인해주세요.':'Room not found. Check that the host is online.','네트워크 연결을 확인하고 다시 시도해주세요.':'Check your network connection and try again.','연결 서버에 다시 접속 중입니다…':'Reconnecting to the connection server…','상대방과 연결 중입니다…':'Connecting to your opponent…','이미 상대가 입장했거나 버전이 다른 방입니다.':'This room already has an opponent or uses a different game version.','상대방이 연결되었습니다.':'Your opponent has connected.','상대와 연결이 끊겼습니다. 시계는 계속 진행됩니다.':'Your opponent disconnected. The clocks keep running.','대국 데이터 전송 크기 오류입니다. 두 플레이어 모두 최신 화면으로 다시 접속해주세요.':'Game data is too large to send. Both players should reload the latest version.','대국 연결에 문제가 있습니다. 네트워크를 확인해주세요.':'There is a problem with the game connection. Check your network.','연결 라이브러리를 불러오지 못했습니다.':'Could not load the connection library.','연결 서비스를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.':'Could not load the connection service. Check your internet connection.'
  };
  Object.assign(en,{'결과 공유':'Share result','이미지 생성 중…':'Creating image…','대국 결과 이미지':'Game result image','공유하기':'Share','이미지 저장':'Save image','텍스트 저장':'Save text','닫기':'Close','이미지를 생성하지 못했습니다. 다시 시도해주세요.':'Could not create the image. Please try again.','공유를 지원하지 않아 이미지를 저장했습니다. SNS에 첨부해주세요.':'Image saved because file sharing is not supported. Attach it to your social post.','공유하지 못했습니다. 이미지 저장 버튼으로 저장해주세요.':'Could not share. Use Save image instead.'});
  Object.assign(en,{'경기 구성':'Match format','진영을 바꿔 두 판을 진행합니다. 종합 무승부이면 누적 사용시간을 1초 단위로 비교하며, 같으면 최종 무승부입니다.':'Play two games with swapped sides. Tied results are decided by total time used in whole seconds; equal times remain a draw.','두 번째 판 시작':'Start second game','상대의 준비를 기다립니다.':'Waiting for your opponent to be ready.','무승부':'Draw','최종 무승부':'Match drawn','최종 승리':'Match won','최종 패배':'Match lost','두 판의 결과로 판정':'Decided by game results','누적 사용시간으로 판정':'Decided by total time used','누적 사용시간도 동일':'Total time used is also equal','나':'You','상대':'Opponent'});
  let language='en';try{language=localStorage.getItem('chess-language')==='ko'?'ko':'en';}catch{}
  const t=text=>language==='en'?(en[text]??text):text;
  function message(text){if(language!=='en')return text;if(en[text])return en[text];const prefix='연결 오류: ';return text.startsWith(prefix)?t(prefix)+t(text.slice(prefix.length)):text;}
  const originals=[];
  function init(){
    if(!document.createTreeWalker)return;
    const walker=document.createTreeWalker(document.body,4);let node;
    while((node=walker.nextNode())){const text=node.nodeValue.trim();if(en[text])originals.push({node,text,before:node.nodeValue.match(/^\s*/)[0],after:node.nodeValue.match(/\s*$/)[0]});}
    for(const element of document.querySelectorAll('[aria-label],[placeholder]'))for(const attr of ['aria-label','placeholder']){const text=element.getAttribute(attr);if(en[text])originals.push({element,attr,text});}
    apply();
  }
  function apply(){document.documentElement?.setAttribute('lang',language);for(const item of originals){if(item.node)item.node.nodeValue=item.before+t(item.text)+item.after;else item.element.setAttribute(item.attr,t(item.text));}for(const code of ['en','ko'])document.querySelector('#language-'+code)?.setAttribute('aria-pressed',String(language===code));}
  function set(code){language=code==='en'?'en':'ko';try{localStorage.setItem('chess-language',language);}catch{}apply();}
  root.Chess10I18n={t,message,init,set,get language(){return language;}};
})(typeof globalThis!=='undefined'?globalThis:window);
