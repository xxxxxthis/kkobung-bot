# 꼬붕봇 v1

Discord + Cloudflare Workers + D1 기반 소규모 지인방 올인원 봇.

## 들어간 기능

- /핑
- /출석
- /잔액
- /송금
- /랭킹
- /코인플립
- /슬롯
- /주사위
- /골라줘
- /운세
- /전투력
- /궁합
- /팀짜기
- /내전 (버튼 참가/취소/팀배정/마감)
- /투표 (버튼 찬성/반대)
- /프로필

## 1. D1 migration

Cloudflare D1 → kkobung-db → Console 에서 `migration-v1.sql` 전체 실행.

기존 `users`, `warnings` 테이블은 그대로 사용합니다.

## 2. Cloudflare Binding 확인

Worker → Settings → Bindings 에 아래가 반드시 있어야 합니다.

- Variable name: `DB`
- D1 database: `kkobung-db`

GitHub 배포 후에도 이 Binding이 남아있는지 한 번 확인하세요.

## 3. Variables / Secrets

- DISCORD_APPLICATION_ID
- DISCORD_PUBLIC_KEY
- DISCORD_TOKEN
- DISCORD_GUILD_ID
- SETUP_SECRET

`DISCORD_TOKEN`, `SETUP_SECRET`은 Secret 권장.

## 4. GitHub 업로드

기존 저장소 파일을 이 프로젝트 파일들로 교체하고 Commit.

Cloudflare가 자동 배포합니다.

## 5. 명령어 등록

배포 성공 후 Windows CMD:

curl -X POST "https://kkobung-bot.geguri-kim.workers.dev/register" -H "Authorization: Bearer 여기에_SETUP_SECRET"

성공하면 Discord 서버에서 `/` 입력 시 명령어가 보입니다.

## 6. 중요

- 실제 돈이 아닌 서버 내부 가상 포인트용입니다.
- Bot Token은 GitHub에 올리지 마세요.
- `/내전`, `/투표` 상태는 D1에 저장됩니다.