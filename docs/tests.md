## 테스트 구성 및 시나리오 설명

이 문서는 `src/lib/__tests__/`(Vitest)와 `tests/e2e/`(Playwright) 내 테스트의 목적, 시나리오, 격리 전략(실 DB/실 메일 전송 차단), 날짜 고정 정책(TEST_DATE), 그리고 실행 방법을 일관된 기준으로 설명합니다.

### 공통 정책

- **실제 DB 수정 차단**: Supabase 호출은 전역 인메모리 mock으로 대체하여 `select/eq/in/order/single/insert/update` 등을 가짜로 처리합니다.
- **실제 이메일 전송 차단**:
  - 코드 레벨: `NODE_ENV !== 'production'`인 경우 `sendEmail`이 항상 `sendTestEmail`로 우회합니다.
  - 테스트 레벨: `@/lib/sendMail`을 mock하여 호출/파라미터만 검증합니다.
- **TEST_DATE 정책**: 날짜/요일 의존 로직을 결정적으로 검증하기 위해 전역 환경변수 `TEST_DATE`를 사용합니다.
  - 기본값: `2025-09-14`
  - 특정 요일/케이스가 필요한 경우 테스트 내부에서 일시적으로 `TEST_DATE`를 변경 후 복원합니다.

> 왜 과거 날짜(예: 2024-01-15)를 쓰나요?
>
> - 요일 기반 분기(월/화/…/일)를 확정적으로 검증하기 위해 의도적으로 **요일이 명확한 날짜**를 사용합니다. 서비스 시작일과 무관하게, 로직은 “요일 매핑이 올바른가”를 검증하는 것이 목적입니다.
> - 또한, `TEST_DATE`는 실제 운영 시간/데이터와 독립적으로 로직을 검증하기 위한 스위치이므로, 과거/미래 어느 날짜든 요일이 분명하면 테스트로 충분한 의미가 있습니다.

---

### 파일별 테스트 목적과 시나리오

#### 1) `date.test.ts`

- 목적: KST 기준 날짜/요일 유틸 검증
- 시나리오:
  - `nowKST`: `TEST_DATE`와 일치하는 날짜를 반환
  - `todayKSTDateOnly`: 0시로 절삭된 동일 날짜 반환
  - `isWeekdayKST`: 평일/주말 판정 (월~금/토·일)
  - `yyyyMmDdKST`: `YYYY-MM-DD` 포맷 문자열 반환
  - `getDateHash`: `YYYYMMDD` 정수 해시 반환
- 날짜: 기본 `2025-09-14`, 케이스별로 `2024-01-15`(월), `2024-01-20`(토) 등 요일이 명확한 날짜로 변경

#### 2) `validation.test.ts`

- 목적: 구독 입력 검증
- 시나리오:
  - `isValidEmail`: 유효/무효 이메일 패턴 검증
  - `validateSubscribeRequest`: 이메일/빈도(2x/3x/5x)/동의 필수 검증, 복수 오류 메시지 확인

#### 3) `utils.test.ts`

- 목적: 유틸리티 함수 검증
- 시나리오:
  - `cn`: 클래스명 병합(조건부/공백/혼합 타입) 동작 검증

#### 4) `rateLimit.test.ts`

- 목적: 레이트 리밋 동작 검증
- 시나리오:
  - `rateLimit.check(identifier, limit, windowMs)`: 파라미터 허용, 다른 IP/윈도/제한값별 동작 확인

#### 5) `cron-core.test.ts`

- 목적: 크론 핵심 로직 검증(실 DB/메일 없이)
- 격리: `supabaseAdmin` 전역 mock, `sendMail` mock
- 시나리오:
  - 주말 미발송: 토/일에는 집계가 0으로 종료
  - 평일 필터링: 빈도(2x/3x/5x)와 요일 매핑에 따라 대상 계산, 테스트 모드에서 전송 집계
  - 이미 전송(alreadySent): 기존 `deliveries.status = sent`면 중복 전송 없이 성공/alreadySent 증가
  - 문제 리스트 없음: 해당 구독 실패로 집계
  - 알 수 없는 빈도: 경고 로그 후 제외

#### 6) `cron.test.ts`

- 목적: 크론 관련 날짜/빈도 로직의 단일 함수 수준 검증(간단 버전)
- 시나리오:
  - `TEST_DATE`에 따른 요일/포맷/평일 판정
  - 간단한 목록에 대한 빈도-요일 필터링 확인(시뮬레이션)

#### 7) `sendMail.test.ts`

- 목적: 메일 전송 인터페이스의 테스트 모드 동작 검증
- 시나리오:
  - `sendTestEmail`: 다양한 파라미터로 성공 반환(실 전송 없음) 및 예상 형태 확인
  - `sendEmail`: 함수 존재/파라미터 허용 (실제 환경에서는 비프로덕션 가드에 의해 `sendTestEmail` 우회)

#### 8) `test-cron.test.ts`

- 목적: 관리자 전용 테스트 엔드포인트(`/api/test-cron`)의 안전장치 검증
- 시나리오:
  - `GET`: 정상 응답 구조 확인
  - `POST`: `NODE_ENV = production`에서 403 반환(개발 모드 전용 보호장치). 테스트 내에서 일시적으로 `NODE_ENV`를 조정 후 즉시 복원합니다.

#### 9) `api-subscribe.test.ts`

- 목적: `/api/subscribe` 통합 테스트(격리된 Supabase mock)
- 시나리오:
  - 유효 입력: 200, `subscribers/subscriptions/subscription_progress` 생성 확인(멱등)
  - 중복 요청: 200 유지, 레코드 중복 생성 없음(멱등 보장)
  - 무효 입력: 문제 리스트 누락/미등록 리스트 → 400
  - 레이트 리밋: 429 (각 테스트 시작 시 스토어 초기화)
  - XSS 유사 입력: `problem_list_name`에 스크립트 문자열 → 400

#### 10) `api-unsubscribe.test.ts`

- 목적: `/api/unsubscribe` 통합 테스트(격리된 Supabase mock)
- 시나리오:
  - `subscription_id`로 해지: 200, 해당 구독만 비활성화
  - `token`으로 해지: 200, 해당 유저의 모든 구독 비활성화 시도 로그 확인
  - 잘못된 `subscription_id`: 404
  - 파라미터 누락: 400

#### 11) `scripts/test/perf-smoke.test.ts`

- 목적: 성능 스모크 테스트 — 핵심 경로(메일 선정·전송 시뮬레이션)가 대량(200건)에서도 정상 동작하는지 빠르게 확인
- 구성:
  - 전역 인메모리 DB(mock)로 `subscriptions` 200건, `problems` 100건 구성
  - 테스트 모드(`isTestMode: true`)에서 메일 전송은 `sendTestEmail`로만 시뮬레이션(실 전송 없음)
  - 배치 지연 제거: `process.env.CRON_BATCH_DELAY_MS = "0"` 설정
  - 타이머: `vi.useFakeTimers()` 및 `vi.runAllTimersAsync()`로 지연을 즉시 소모
- 검증:
  - 요약: `totalSubscribers = 200`, `successCount = 200`, `failureCount = 0`
  - 총 시간(ms) 상한(환경 독립적 느슨한 기준) 충족
- 실행(부분 실행 예):
  ```bash
  pnpm vitest run scripts/test/perf-smoke.test.ts --reporter=basic
  ```

#### 12) `tests/e2e/subscribe-flow.spec.ts`

- 목적: 랜딩 → 구독 모달 → 입력/동의/제출 → 성공 UI까지 실제 브라우저 상호작용으로 검증
- 격리: 네트워크 인터셉트로 `/api/problem-lists`, `/api/subscribe`를 모킹 (실 DB/메일 호출 없음)
- 셀렉터 전략: 접근성 우선(`getByRole`, `aria-label`) + 모달 스코프 한정(`getByRole('dialog', { name: '이메일로 문제 받기' })`)
- 시나리오:
  - 랜딩에서 메인 영역의 ‘구독하기’ 버튼 클릭(헤더/메인 중복 라벨 충돌 회피)
  - 모달 내 문제 리스트 기본값 로드 확인(모킹 응답 기준)
  - 이메일 입력, 빈도(‘주 5회’) 선택, 동의 체크박스 체크(`#consent`)
  - 제출 버튼 활성화 대기 후 클릭 → ‘구독이 완료되었습니다’ 가시성 확인

#### 13) `tests/e2e/today-page.spec.ts`

- 목적: `/today` 페이지의 초기 문제 표시 및 ‘다른 문제 보기’ 상호작용 검증
- 격리: 네트워크 인터셉트로 `/api/problems`를 모킹
- 시나리오:
  - `/today` 진입 시 카드 헤딩 존재 확인
  - ‘다른 문제 보기’ 클릭 후 타이틀 변경(랜덤 특성상 달라지기만 하면 통과)

---

## 커버리지 관점

- `lib/date.ts`, `lib/utils.ts`, `lib/validation.ts`는 100% 커버리지
- `lib/cron/core.ts`는 Statements ~58%, Branch ~71% (주요 경로 보강 완료)
- 필요 시 delivery 상태 전이(queued→failed), progress insert/update 분기, 배치/지연 로깅 등 추가 보강으로 라인 65~70%까지 향상 가능

## 실행 방법

### Vitest

```bash
pnpm vitest run --coverage --reporter=basic
```

### Playwright (E2E)

```bash
# 헤드리스 기본 실행
pnpm test:e2e --reporter=list

# UI 모드(테스트 목록/트레이스 시각화)
pnpm test:e2e:ui

# 실브라우저(디버깅)
pnpm test:e2e:headed
```

## 요약

- 모든 테스트는 **실제 DB 수정/실제 메일 전송 없이** 동작합니다.
- `TEST_DATE`를 통해 날짜/요일 의존 로직을 결정적으로 검증하며, 과거의 특정 날짜를 사용하는 것은 **요일 기반 분기를 확정적으로 재현하기 위한 선택**입니다. 서비스 시작일과 무관하게 로직의 정확성을 담보합니다.
- 최소 스코프 달성: 구독/해지 API 통합(정상/에러/중복/XSS/레이트리밋) + 성능 스모크(200건) + E2E(UI) 2건(/, /today) 완료.

## 부록: 품질/안전성 보장 근거

- DB/메일 사이드이펙트 차단: 코드 가드(`sendEmail` 비프로덕션 우회) + 테스트 레벨 모킹(네트워크 인터셉트, Supabase 인메모리)
- 날짜 결정성: `TEST_DATE`로 요일/포맷/빈도 로직을 결정적으로 재현, `vi.useFakeTimers()`로 지연 제어
- 관찰 가능성: Playwright trace/video/screenshot on failure 설정으로 실패 시 분석 용이
- 유지보수성: 접근성 중심 셀렉터, 모달 스코프 한정, 네트워크 모킹으로 UI/네트워크 변동에 강건
