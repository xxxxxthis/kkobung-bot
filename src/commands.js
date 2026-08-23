export const COMMANDS = [

  { name: "일일퀘스트", description: "오늘의 일일 퀘스트 확인" },
  { name: "퀘스트보상", description: "완료한 퀘스트 보상 수령" },
  { name: "내역", description: "최근 경제 거래내역 확인" },
  { name: "칭호", description: "칭호 확인/장착",
    options: [{ name:"아이디", description:"장착할 칭호 ID", type:3, required:false }] },
  { name: "랜덤박스", description: "보유 랜덤박스를 엽니다",
    options: [{ name:"종류", description:"박스 종류", type:3, required:true,
      choices:[{name:"일반",value:"box_normal"},{name:"고급",value:"box_rare"}] }] },
  { name: "봇상태", description: "PEPE 봇 시스템 상태 확인" },

  { name: "명령어", description: "꼬붕봇 전체 명령어를 확인합니다" },
  { name: "핑", description: "꼬붕봇 상태 확인" },

  { name: "출석", description: "하루 1회 출석하고 꼬붕코인을 받습니다" },
  {
    name: "잔액",
    description: "꼬붕코인 잔액 확인",
    options: [{ name: "유저", description: "확인할 유저", type: 6, required: false }]
  },
  {
    name: "송금",
    description: "다른 유저에게 꼬붕코인을 보냅니다",
    options: [
      { name: "유저", description: "받을 유저", type: 6, required: true },
      { name: "금액", description: "보낼 금액", type: 4, required: true, min_value: 1 }
    ]
  },
  { name: "랭킹", description: "꼬붕코인 TOP 10" },

  {
    name: "코인플립",
    description: "꼬붕코인을 걸고 동전 던지기",
    options: [
      { name: "금액", description: "베팅 금액", type: 4, required: true, min_value: 1 },
      {
        name: "선택", description: "앞 또는 뒤", type: 3, required: true,
        choices: [{ name: "앞", value: "front" }, { name: "뒤", value: "back" }]
      }
    ]
  },
  {
    name: "슬롯",
    description: "꼬붕코인을 걸고 슬롯 돌리기",
    options: [{ name: "금액", description: "베팅 금액", type: 4, required: true, min_value: 1 }]
  },

  { name: "주사위", description: "1~100 주사위를 굴립니다" },
  {
    name: "가위바위보",
    description: "꼬붕봇과 가위바위보",
    options: [{
      name: "선택", description: "가위/바위/보", type: 3, required: true,
      choices: [
        { name: "가위", value: "scissors" },
        { name: "바위", value: "rock" },
        { name: "보", value: "paper" }
      ]
    }]
  },
  {
    name: "골라줘",
    description: "선택지 중 하나를 골라줍니다",
    options: [{ name: "선택지", description: "예: 치킨,피자,햄버거", type: 3, required: true }]
  },
  { name: "운세", description: "오늘의 병맛 운세" },
  { name: "전투력", description: "오늘의 전투력 측정" },
  {
    name: "궁합",
    description: "상대와 궁합을 측정합니다",
    options: [{ name: "상대", description: "궁합을 볼 상대", type: 6, required: true }]
  },

  {
    name: "팀짜기",
    description: "이름들을 랜덤으로 두 팀으로 나눕니다",
    options: [{ name: "멤버", description: "예: 철수,영희,민수,지수", type: 3, required: true }]
  },
  { name: "내전", description: "버튼으로 참가하는 내전 모집을 엽니다" },
  {
    name: "투표",
    description: "간단한 찬반 투표를 만듭니다",
    options: [{ name: "질문", description: "투표 질문", type: 3, required: true }]
  },

  { name: "상점", description: "꼬붕봇 상점을 봅니다" },
  {
    name: "구매",
    description: "상점 아이템을 구매합니다",
    options: [{ name: "아이템", description: "아이템 ID", type: 3, required: true }]
  },
  {
    name: "인벤토리",
    description: "보유 아이템을 확인합니다",
    options: [{ name: "유저", description: "확인할 유저", type: 6, required: false }]
  },
  { name: "업적", description: "내 업적을 확인합니다" },

  {
    name: "프로필",
    description: "꼬붕봇 프로필 확인",
    options: [{ name: "유저", description: "확인할 유저", type: 6, required: false }]
  },

  {
    name: "코인지급",
    description: "관리자 전용: 유저에게 코인을 지급합니다",
    options: [
      { name: "유저", description: "대상 유저", type: 6, required: true },
      { name: "금액", description: "지급 금액", type: 4, required: true, min_value: 1 }
    ]
  },
  {
    name: "코인회수",
    description: "관리자 전용: 유저의 코인을 회수합니다",
    options: [
      { name: "유저", description: "대상 유저", type: 6, required: true },
      { name: "금액", description: "회수 금액", type: 4, required: true, min_value: 1 }
    ]
  },
  {
    name: "경고",
    description: "관리자 전용: 유저에게 경고를 부여합니다",
    options: [
      { name: "유저", description: "경고할 유저", type: 6, required: true },
      { name: "사유", description: "경고 사유", type: 3, required: true }
    ]
  },
  {
    name: "경고조회",
    description: "유저의 경고를 조회합니다",
    options: [{ name: "유저", description: "조회할 유저", type: 6, required: true }]
  }
];