# 꼬붕봇 - Discord × Cloudflare Workers 최소 검증판

이 프로젝트는 Discord 공식 `discord-interactions` 패키지의 `verifyKey()`로
Interactions Endpoint 서명을 검증하는 최소 버전입니다.

## 필요한 Cloudflare 변수

기존 `kkobung-bot` Worker의 Settings → Variables and Secrets에 아래 값이 있어야 합니다.

- `DISCORD_PUBLIC_KEY` : Discord Developer Portal → General Information → Public Key
- `DISCORD_APPLICATION_ID` : 이후 명령어 등록용
- `DISCORD_TOKEN` : 이후 명령어 등록용 (Secret 권장)
- `DISCORD_GUILD_ID` : 이후 서버 전용 명령어 등록용
- `SETUP_SECRET` : 이후 등록 엔드포인트 보호용 (Secret 권장)

현재 검증 단계에서는 `DISCORD_PUBLIC_KEY`만 실제 코드가 사용합니다.

## GitHub 업로드

1. GitHub에서 새 저장소를 만듭니다. 이름은 `kkobung-bot` 권장.
2. 이 프로젝트 폴더 안의 파일들을 저장소 루트에 업로드합니다.
3. Cloudflare → Workers & Pages → `kkobung-bot` → Settings → Builds.
4. Git Repository → Connect → 방금 만든 GitHub 저장소 선택.
5. 배포 명령은 기본값 또는 `npx wrangler deploy`를 사용합니다.
6. 배포가 끝나면 기존 workers.dev 주소의 `/` 접속 시 `꼬붕봇 살아있음 🤖`가 보여야 합니다.
7. Discord Developer Portal → General Information → Interactions Endpoint URL:
   `https://<네-worker>.workers.dev/discord`
8. Save Changes가 성공하면 서명 검증 통과입니다.

## 주의

- Bot Token은 절대 GitHub에 올리지 마세요.
- `.env`, `.dev.vars`는 `.gitignore`에 포함되어 있습니다.
- 이 최소 버전이 성공한 다음 D1/코인/출석/내전/투표 등의 기능을 합치는 게 안전합니다.

- deploy trigger
