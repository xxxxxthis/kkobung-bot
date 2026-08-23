# 꼬붕봇 v2

## 새 기능
- 연속 출석 / 출석 보너스
- 상점 / 구매 / 인벤토리
- 업적
- 가위바위보
- 관리자 코인지급 / 코인회수
- 경고 / 경고조회
- 프로필 강화

## 적용 순서
1. D1 Console에서 `migration-v2.sql`을 위에서부터 실행
2. GitHub 저장소 파일을 이 버전으로 교체
3. Cloudflare 자동 배포 성공 확인
4. `DB -> kkobung-db` binding 유지 확인
5. `/register` 다시 호출해서 새 명령어 등록

## 주의
`ALTER TABLE users ADD COLUMN streak ...`는 한 번만 실행하세요.
이미 실행했다면 해당 줄은 다시 실행하지 마세요.