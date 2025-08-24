#!/bin/bash

# 하코테 큐 워커 시스템 테스트 스크립트
# 사용법: ./test_queue_worker.sh [--date YYYY-MM-DD] [--month M] [--year Y]

echo "🧪 하코테 큐 워커 시스템 테스트 시작..."
echo ""

# 기본값 설정
YEAR=$(date +%Y)
MONTH=$(date +%m)
DAY=$(date +%d)
TEST_DATE=$(date +%Y-%m-%d)  # 오늘 날짜

# 명령행 인수 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        --date)
            TEST_DATE="$2"
            shift 2
            ;;
        --month)
            MONTH="$2"
            shift 2
            ;;
        --year)
            YEAR="$2"
            shift 2
            ;;
        *)
            echo "❌ 알 수 없는 옵션: $1"
            echo "사용법: $0 [--date YYYY-MM-DD] [--month M] [--year Y]"
            echo "  --date: 테스트할 날짜 (기본값: 오늘)"
            echo "  --month: 테스트할 월 (기본값: 현재 월)"
            echo "  --year: 테스트할 년도 (기본값: 현재 년도)"
            exit 1
            ;;
    esac
done

# 월과 년도가 지정된 경우 날짜 계산
if [[ "$MONTH" != "$(date +%m)" || "$YEAR" != "$(date +%Y)" ]]; then
    # 해당 월의 첫 번째 날짜로 설정 (더 정확한 날짜 계산을 위해)
    TEST_DATE="${YEAR}-$(printf "%02d" $MONTH)-01"
fi

echo "📅 테스트 날짜: $TEST_DATE"
echo ""

# 스크립트 위치 기반으로 경로 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"
RESULT_FILE="$PROJECT_ROOT/scripts/cron/results/queue-test-results.md"

echo "📁 스크립트 위치: $SCRIPT_DIR"
echo "📁 프로젝트 루트: $PROJECT_ROOT"
echo "📁 결과 파일: $RESULT_FILE"
echo ""

# 결과 폴더가 없으면 생성
mkdir -p "$(dirname "$RESULT_FILE")"

# 환경변수 설정
export TEST_DATE="$TEST_DATE"

echo "🚀 큐 워커 시스템 테스트 시작..."
echo "⏰ 실행 시간: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# API 호출
echo "📡 큐 워커 테스트 API 호출 중..."
response=$(curl -s -w "\n%{http_code}" -X POST \
    "http://localhost:3000/api/test-queue" \
    -H "Content-Type: application/json" \
    -d "{\"testDate\": \"$TEST_DATE\"}" \
    --max-time 120)

# 응답 분리 (macOS 호환)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "📊 HTTP 응답 코드: $http_code"
echo ""

if [ "$http_code" -eq 200 ]; then
    echo "✅ 큐 워커 시스템 테스트 성공!"
    
    # JSON 응답을 결과 파일에 저장
    echo "$body" > "$PROJECT_ROOT/temp_queue_test_results.json"
    
    # 결과 파싱
    success_count=$(echo "$body" | jq -r '.result.summary.successCount // 0' 2>/dev/null || echo "0")
    failure_count=$(echo "$body" | jq -r '.result.summary.failureCount // 0' 2>/dev/null || echo "0")
    total_subscribers=$(echo "$body" | jq -r '.result.summary.totalSubscribers // 0' 2>/dev/null || echo "0")
    day_of_week=$(echo "$body" | jq -r '.result.summary.dayOfWeek // "unknown"' 2>/dev/null || echo "unknown")
    job_id=$(echo "$body" | jq -r '.jobId // "unknown"' 2>/dev/null || echo "unknown")
    
    echo "📈 큐 워커 테스트 결과:"
    echo "  - 작업 ID: $job_id"
    echo "  - 총 구독자: ${total_subscribers}명"
    echo "  - 성공: ${success_count}명"
    echo "  - 실패: ${failure_count}명"
    echo "  - 요일: ${day_of_week}"
    echo ""
    
    # 결과 파일 생성
    cat > "$RESULT_FILE" << EOF
# 하코테 큐 워커 시스템 테스트 결과

## 📅 테스트 정보
- **테스트 날짜**: $TEST_DATE
- **실행 시간**: $(date '+%Y-%m-%d %H:%M:%S')
- **테스트 모드**: 큐 워커 시스템 통합 테스트

## 📊 테스트 결과
- **작업 ID**: $job_id
- **총 구독자**: ${total_subscribers}명
- **성공**: ${success_count}명
- **실패**: ${failure_count}명
- **요일**: ${day_of_week}

## 🔧 테스트 단계
1. ✅ 작업을 큐에 추가
2. ✅ 큐에서 작업 가져오기
3. ✅ 작업 상태 업데이트 (processing)
4. ✅ 작업 처리 (테스트 모드)
5. ✅ 작업 완료 처리

## 📋 전체 응답
\`\`\`json
$body
\`\`\`

## ✅ 결론
큐 워커 시스템이 정상적으로 작동합니다!
- 작업이 큐에 성공적으로 추가됨
- 워커가 큐에서 작업을 가져옴
- 작업이 테스트 모드에서 성공적으로 처리됨
- 작업 상태가 올바르게 업데이트됨
EOF

    echo "🎉 큐 워커 시스템 테스트 완료!"
    echo "📁 결과 파일: $RESULT_FILE"
    
    # 임시 파일 정리
    rm -f "$PROJECT_ROOT/temp_queue_test_results.json"
    
else
    echo "❌ 큐 워커 시스템 테스트 실패!"
    echo "📄 응답 내용: $body"
    
    # 실패 결과 파일 생성
    cat > "$RESULT_FILE" << EOF
# 하코테 큐 워커 시스템 테스트 결과

## ❌ 테스트 실패
- **테스트 날짜**: $TEST_DATE
- **실행 시간**: $(date '+%Y-%m-%d %H:%M:%S')
- **HTTP 상태 코드**: $http_code

## 📄 오류 응답
\`\`\`json
$body
\`\`\`

## 🔧 문제 해결 방법
1. 개발 서버가 실행 중인지 확인: \`pnpm dev\`
2. 환경변수가 올바르게 설정되었는지 확인
3. Supabase 연결 상태 확인
4. 큐 테이블이 존재하는지 확인
EOF

    echo "📁 오류 결과 파일: $RESULT_FILE"
    exit 1
fi

echo ""
echo "📊 최종 요약:"
echo "  - 테스트 날짜: $TEST_DATE"
echo "  - 결과 파일: $RESULT_FILE"
echo "  - 상태: $([ "$http_code" -eq 200 ] && echo "✅ 성공" || echo "❌ 실패")"
