# Stotoon

스토툰 서비스 소개 및 베타 신청 홈페이지.

## 실행
Node.js 24 이상.
```sh
npm ci
npm run build
npm start
```
http://localhost:5176/homepage/ 에서 확인합니다. 기본 preview 모드에서는 가상 정보만 사용하며 외부 메일은 발송하지 않습니다.
```sh
npm test
```

## 구성
apps/homepage: 소개·신청·완료·개인정보 화면.
server/src: 신청 검증, SQLite 저장, 운영자 알림.
deploy/beta: Cloudflare Workers/D1 설정 및 마이그레이션.
tools: 공개 파일 구성 및 로컬 운영 명령.

로그인과 만화 제작 엔진은 포함하지 않습니다. 이미지는 기능 설명용 구성 예시입니다.

## 운영 준비
Cloudflare D1 생성 후 wrangler.jsonc의 database_id를 입력하고 마이그레이션을 적용합니다. Resend 발신 도메인을 인증합니다. RESEND_API_KEY는 Wrangler secret으로 저장하고 Git에 넣지 않습니다.
운영 주체·연락처·개인정보 문안·실제 영상·이미지 권리를 확정합니다. 실제 저장·중복 차단·메일 수신·정기 파기를 검수한 후 BETA_OPEN=1, PRIVACY_APPROVED=1로 전환합니다.

기본 빌드는 검색 제외입니다. BETA_SITE_URL(HTTPS 기본 주소), BETA_VIDEO_URL(YouTube), BETA_ART_CREDIT를 설정하고 BETA_INDEXABLE=1로 빌드하면 검색 메타·사이트맵을 생성합니다. 검색 제외는 접근 통제가 아닙니다.

로컬 관리: node tools/beta-admin.mjs stats 또는 list 또는 maintenance.
CSV: node tools/beta-admin.mjs csv 출력경로.
삭제: node tools/beta-admin.mjs delete 접수ID로 대상 확인 후 --apply.
데이터와 CSV는 Git에서 제외합니다. 별도 사본도 보관 기간에 맞춰 관리합니다.
수집 후1년 또는 베타 종료일 중 이른 시각에 파기하며 서버/cron 실행이 필요합니다. 메일 API 접수는 실제 수신 완료가 아닙니다. review 상태의 알림은 제공자 로그를 확인해야 합니다.
공개 전 트래픽 제한·개인정보 고지·관리 권한 및 무료 플랜 한도를 확인하세요.

## 배포된 검토 사이트

https://stotoon-beta.fttracker.workers.dev/homepage/

Workers + D1의 검토용 접수 모드입니다. 실제 모집과 알림 발송은 운영 정보·메일 설정 확정 후 활성화합니다. GitHub에 push하는 것만으로 자동 배포되지는 않습니다.

수동 배포는 `BETA_SITE_URL=https://stotoon-beta.fttracker.workers.dev` 환경 변수를 지정한 뒤 다음 순서로 실행합니다.

```sh
npm run build
npx wrangler@4 d1 migrations apply stotoon-beta --remote --config deploy/beta/wrangler.jsonc
npx wrangler@4 deploy --config deploy/beta/wrangler.jsonc
```

배포 인증에는 account:read, user:read, workers:write, workers_scripts:write, d1:write 권한을 사용합니다. OAuth 인증정보와 메일 키는 저장소에 넣지 않습니다.
