export const COMMANDS = [
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
  {
    name: "프로필",
    description: "꼬붕봇 프로필 확인",
    options: [{ name: "유저", description: "확인할 유저", type: 6, required: false }]
  }
];