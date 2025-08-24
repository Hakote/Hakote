# 📁 Scripts 폴더

이 폴더는 하코테 프로젝트의 다양한 스크립트들을 포함합니다.

## 📂 폴더 구조

```
scripts/
├── README.md (이 파일)
└── cron/
    ├── test_cron_daily.sh (일일 크론 테스트)
    ├── test_cron_weekly.sh (주간 크론 테스트)
    ├── test_all_weeks.sh (월간 크론 테스트)
    └── results/ (테스트 결과 파일들)
        ├── daily-results/
        ├── weekly-results/
        └── monthly-summary.md
```

## 🚀 사용법

### 📧 크론 작업 테스트

#### 1. 일일 테스트

```bash
# 특정 날짜 1일 테스트
pnpm test:cron:daily --date 2025-08-25 --days 1

# 특정 날짜부터 7일 연속 테스트
pnpm test:cron:daily --date 2025-08-25 --days 7
```

#### 2. 주간 테스트

```bash
# 특정 주 테스트
pnpm test:cron:weekly --date 2025-08-25 --days 7
```

#### 3. 월간 테스트

```bash
# 특정 월의 모든 주 테스트
pnpm test:cron:monthly --date 2025-09-01
```

### 📊 테스트 결과

테스트 결과는 `scripts/cron/results/` 폴더에 저장됩니다:

- **일일 결과**: `daily-results/YYYY-MM/YYYY-MM-DD-daily-test-results.md`
- **주간 결과**: `weekly-results/YYYY-MM/YYYY-MM-DD-weekly-test-results.md`
- **월간 요약**: `monthly-summary.md`

## ⚙️ 환경 설정

테스트 실행 전 다음 환경변수를 설정하세요:

```bash
# .env.local
TEST_DATE=2025-08-25  # 테스트할 날짜
CRON_SECRET=your_cron_secret
WORKER_SECRET=your_worker_secret
RESEND_API_KEY=your_resend_api_key
```

## 📝 테스트 모드

- **테스트 모드**: 실제 이메일 전송 없이 로직만 테스트
- **DB 변경 없음**: 테스트 중 데이터베이스가 변경되지 않음
- **성능 측정**: 처리 시간, 속도 등 상세한 성능 정보 제공

## 📈 성능 지표

테스트 결과에서 확인할 수 있는 성능 정보:

- **총 처리 시간**: 전체 실행 시간
- **구독자당 평균 처리 시간**: 개별 구독자 처리 속도
- **처리 속도**: 초당 처리 가능한 구독자 수
- **성공/실패율**: 이메일 전송 성공률
