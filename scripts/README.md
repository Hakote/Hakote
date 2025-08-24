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
    ├── test_queue_worker.sh (큐 워커 시스템 테스트)
    └── results/ (테스트 결과 파일들)
        ├── daily-results/
        ├── weekly-results/
        │   └── YYYY-MM/
        │       ├── week-1/
        │       ├── week-2/
        │       ├── week-3/
        │       ├── week-4/
        │       └── monthly-test-summary.md
        └── queue-test-results.md
```

## 🚀 사용법

### 📧 크론 작업 테스트

#### 1. 일일 테스트

```bash
# 특정 날짜 테스트
./scripts/cron/test_cron_daily.sh --date 2025-08-25

# 기본값 (오늘 날짜)
./scripts/cron/test_cron_daily.sh
```

#### 2. 주간 테스트

```bash
# 특정 월의 특정 주차 테스트
./scripts/cron/test_cron_weekly.sh --month 8 --week 4 --year 2025

# 기본값 (8월 4주차)
./scripts/cron/test_cron_weekly.sh
```

#### 3. 월간 테스트

```bash
# 특정 월의 모든 주차 테스트
./scripts/cron/test_all_weeks.sh --month 9 --year 2025

# 기본값 (9월)
./scripts/cron/test_all_weeks.sh
```

#### 4. 큐 워커 시스템 테스트

```bash
# 특정 날짜 테스트
./scripts/cron/test_queue_worker.sh --date 2025-08-25

# 월과 년도로 테스트
./scripts/cron/test_queue_worker.sh --month 8 --year 2025

# 기본값 (오늘 날짜)
./scripts/cron/test_queue_worker.sh
```

### 📊 테스트 결과

테스트 결과는 `scripts/cron/results/` 폴더에 저장됩니다:

- **일일 결과**: `daily-results/YYYY-MM-DD-daily-test-results.md`
- **주간 결과**: `weekly-results/YYYY-MM/week-N/YYYY-MM-DD-weekly-test-results.md`
- **월간 요약**: `weekly-results/YYYY-MM/monthly-test-summary.md`
- **큐 워커 결과**: `queue-test-results.md`

## 🧪 테스트 내용

### 구독자 필터링 로직 검증

- **빈도별 구독자 분류**:
  - `2x`: 화요일, 목요일만 받는 구독자
  - `3x`: 월요일, 수요일, 금요일만 받는 구독자
  - `5x`: 평일(월~금) 모두 받는 구독자

### 요일별 예상 결과

- **월요일**: 3x + 5x 구독자
- **화요일**: 2x + 5x 구독자
- **수요일**: 3x + 5x 구독자
- **목요일**: 2x + 5x 구독자
- **금요일**: 3x + 5x 구독자
- **토요일**: 0명 (주말)
- **일요일**: 0명 (주말)

### 핵심 검증 사항

1. **정확한 필터링**: 각 요일에 맞는 구독자만 선택되는지
2. **주말 처리**: 토요일, 일요일에는 0명이 나오는지
3. **날짜 모킹**: `TEST_DATE` 환경변수가 제대로 적용되는지
4. **예상 vs 실제**: 계산된 예상값과 실제 API 결과가 일치하는지

## ⚙️ 환경 설정

테스트 실행 전 다음 환경변수를 설정하세요:

```bash
# .env.local (선택사항 - 기본값으로 사용)
TEST_DATE=2025-08-25  # 테스트할 날짜
CRON_SECRET=your_cron_secret
WORKER_SECRET=your_worker_secret
RESEND_API_KEY=your_resend_api_key
```

## ⚠️ 중요한 주의사항

### 📅 날짜 모킹의 한계

- **현재 데이터 사용**: 테스트 날짜가 서비스 시작일(2024년) 이전이어도 **현재 구독자 데이터**를 사용합니다
- **과거 데이터 없음**: 실제 과거 시점의 구독자 수나 분포는 반영되지 않습니다
- **로직 검증 목적**: 날짜 모킹은 **비즈니스 로직 검증**이 목적이며, 실제 과거 상황 재현이 아닙니다

### 🧪 테스트 시나리오 예시

```bash
# 2023년 날짜로 테스트해도 현재 구독자 데이터 사용
./scripts/cron/test_cron_weekly.sh --month 3 --year 2023

# 결과: 2023년 3월이 아닌 현재 구독자 분포로 계산
# - 2x (화,목): 27명 (현재 데이터)
# - 3x (월,수,금): 20명 (현재 데이터)
# - 5x (평일): 80명 (현재 데이터)
```

### 📊 데이터 소스

- **구독자 데이터**: 현재 활성화된 구독자만 사용 (`is_active = true`)
- **문제 데이터**: 현재 활성화된 문제만 사용 (`active = true`)
- **빈도별 분포**: 실시간 계산 (테스트 시점 기준)

## 📝 테스트 모드

- **테스트 모드**: 실제 이메일 전송 없이 로직만 테스트
- **DB 변경 없음**: 테스트 중 데이터베이스가 변경되지 않음
- **성능 측정**: 처리 시간, 속도 등 상세한 성능 정보 제공
- **날짜 모킹**: `TEST_DATE` 환경변수로 원하는 날짜 테스트 가능

## 📈 성능 지표

테스트 결과에서 확인할 수 있는 성능 정보:

- **총 처리 시간**: 전체 실행 시간
- **구독자당 평균 처리 시간**: 개별 구독자 처리 속도
- **처리 속도**: 초당 처리 가능한 구독자 수
- **성공/실패율**: 이메일 전송 성공률

## 🔧 주요 개선사항

### 동적 날짜 계산

- 해당 월의 첫 번째 월요일을 자동으로 계산
- 정확한 주차별 날짜 범위 계산
- 유연한 매개변수: `--month`, `--week`, `--year` 옵션

### 일관된 API 통신

- 모든 테스트 스크립트가 요청 본문에 `testDate` 포함
- 환경변수와 요청 본문 모두 지원
- 크로스 플랫폼 지원 (macOS, Linux)

### 큐 워커 시스템 통합

- 작업 큐에 추가 → 처리 → 완료 전체 플로우 테스트
- 작업 상태 업데이트 검증
- 테스트 모드에서 안전한 실행

## 🎯 사용 예시

```bash
# 8월 4주차 테스트 (월요일~일요일)
./scripts/cron/test_cron_weekly.sh --month 8 --week 4

# 9월 전체 주차 테스트
./scripts/cron/test_all_weeks.sh --month 9

# 특정 날짜 큐 워커 테스트
./scripts/cron/test_queue_worker.sh --date 2025-08-25

# 일일 테스트 (평일)
./scripts/cron/test_cron_daily.sh --date 2025-08-25
```
