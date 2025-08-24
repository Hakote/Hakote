#!/bin/bash

# 하코테 크론 작업 일일 테스트 스크립트
# 사용법: ./test_cron_daily.sh [--date YYYY-MM-DD] [--days N]

echo "🧪 하코테 크론 작업 일일 테스트 시작..."
echo ""

# 기본값 설정
TEST_DATE=$(date +%Y-%m-%d)  # 오늘 날짜
DAYS=1

# 명령행 인수 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        --date)
            TEST_DATE="$2"
            shift 2
            ;;
        --days)
            DAYS="$2"
            shift 2
            ;;
        *)
            echo "❌ 알 수 없는 옵션: $1"
            echo "사용법: $0 [--date YYYY-MM-DD] [--days N]"
            echo "  --date: 테스트할 날짜 (기본값: 오늘)"
            echo "  --days: 연속 테스트할 일수 (기본값: 1)"
            exit 1
            ;;
    esac
done

echo "📅 테스트 날짜: $TEST_DATE"
echo "📊 연속 테스트 일수: $DAYS"
echo ""

# 스크립트 위치 기반으로 경로 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"

# 결과 파일 경로 설정
YEAR=$(echo $TEST_DATE | cut -d'-' -f1)
MONTH=$(echo $TEST_DATE | cut -d'-' -f2)
DAY=$(echo $TEST_DATE | cut -d'-' -f3)
RESULT_FILE="$PROJECT_ROOT/scripts/cron/results/daily-results/${YEAR}-${MONTH}/${YEAR}-${MONTH}-${DAY}-daily-test-results.md"
TEMP_FILE="$PROJECT_ROOT/temp_daily_test_results.json"

echo "📁 스크립트 위치: $SCRIPT_DIR"
echo "📁 프로젝트 루트: $PROJECT_ROOT"
echo "📁 결과 파일: $RESULT_FILE"
echo ""

# 결과 폴더가 없으면 생성
mkdir -p "$(dirname "$RESULT_FILE")"

# 기존 결과 파일 백업 (있는 경우)
if [ -f "$RESULT_FILE" ]; then
    backup_file="${RESULT_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$RESULT_FILE" "$backup_file"
    echo "📋 기존 결과 파일 백업: $backup_file"
fi

# 테스트 실행 함수
run_daily_test() {
    local test_date=$1
    local test_number=$2
    
    echo "🔄 테스트 $test_number/$DAYS 실행 중... ($test_date)"
    echo "⏰ 실행 시간: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    # API 호출
    echo "📡 API 호출 중..."
    response=$(curl -s -w "\n%{http_code}" -X POST \
        "http://localhost:3000/api/test-cron" \
        -H "Content-Type: application/json" \
        -d "{\"testDate\": \"$test_date\"}" \
        --max-time 60)
    
    # 응답 분리 (macOS 호환)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    echo "📊 HTTP 응답 코드: $http_code"
    
    if [ "$http_code" -eq 200 ]; then
        echo "✅ 테스트 성공!"
        
        # JSON 응답을 결과 파일에 저장
        echo "$body" > "$TEMP_FILE"
        
        # 결과 파싱
        success_count=$(echo "$body" | jq -r '.summary.successCount // 0' 2>/dev/null || echo "0")
        failure_count=$(echo "$body" | jq -r '.summary.failureCount // 0' 2>/dev/null || echo "0")
        total_subscribers=$(echo "$body" | jq -r '.summary.totalSubscribers // 0' 2>/dev/null || echo "0")
        day_of_week=$(echo "$body" | jq -r '.summary.dayOfWeek // "unknown"' 2>/dev/null || echo "unknown")
        
        echo "📈 테스트 결과:"
        echo "  - 총 구독자: ${total_subscribers}명"
        echo "  - 성공: ${success_count}명"
        echo "  - 실패: ${failure_count}명"
        echo "  - 요일: ${day_of_week}"
        echo ""
        
        # 결과를 마크다운 파일에 추가
        {
            echo "# 하코테 일일 크론 테스트 결과"
            echo ""
            echo "## 테스트 정보"
            echo "- **테스트 날짜**: $test_date"
            echo "- **실행 시간**: $(date '+%Y-%m-%d %H:%M:%S')"
            echo "- **요일**: $day_of_week"
            echo "- **테스트 번호**: $test_number/$DAYS"
            echo ""
            echo "## 결과 요약"
            echo "- **총 구독자**: ${total_subscribers}명"
            echo "- **성공**: ${success_count}명"
            echo "- **실패**: ${failure_count}명"
            echo "- **성공률**: $([ "$total_subscribers" -gt 0 ] && echo "$(($success_count * 100 / $total_subscribers))%" || echo "0%")"
            echo ""
            echo "## 상세 결과"
            echo '```json'
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
            echo '```'
            echo ""
            echo "---"
            echo ""
        } >> "$RESULT_FILE"
        
    else
        echo "❌ 테스트 실패 (HTTP $http_code)"
        echo "📄 응답 내용: $body"
        echo ""
        
        # 실패 결과도 기록
        {
            echo "# 하코테 일일 크론 테스트 결과"
            echo ""
            echo "## 테스트 정보"
            echo "- **테스트 날짜**: $test_date"
            echo "- **실행 시간**: $(date '+%Y-%m-%d %H:%M:%S')"
            echo "- **테스트 번호**: $test_number/$DAYS"
            echo "- **상태**: ❌ 실패"
            echo ""
            echo "## 오류 정보"
            echo "- **HTTP 코드**: $http_code"
            echo "- **오류 내용**: $body"
            echo ""
            echo "---"
            echo ""
        } >> "$RESULT_FILE"
    fi
}

# 메인 테스트 실행
echo "🚀 일일 테스트 시작..."
echo ""

# 기존 결과 파일 백업 (있는 경우)
if [ -f "$RESULT_FILE" ]; then
    backup_file="${RESULT_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$RESULT_FILE" "$backup_file"
    echo "📋 기존 결과 파일 백업: $backup_file"
fi

# 결과 파일 초기화
{
    echo "# 하코테 일일 크론 테스트 결과"
    echo ""
    echo "## 테스트 개요"
    echo "- **시작 날짜**: $TEST_DATE"
    echo "- **테스트 일수**: $DAYS"
    echo "- **생성 시간**: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo "---"
    echo ""
} > "$RESULT_FILE"

# 연속 테스트 실행
for i in $(seq 1 $DAYS); do
    # 날짜 계산 (첫 번째는 원래 날짜, 이후는 +1일씩)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS용
        if [ $i -eq 1 ]; then
            current_date="$TEST_DATE"
        else
            current_date=$(date -j -v+$((i-1))d -f "%Y-%m-%d" "$TEST_DATE" +"%Y-%m-%d" 2>/dev/null || date -d "$TEST_DATE + $((i-1)) days" +"%Y-%m-%d")
        fi
    else
        # Linux용
        if [ $i -eq 1 ]; then
            current_date="$TEST_DATE"
        else
            current_date=$(date -d "$TEST_DATE + $((i-1)) days" +"%Y-%m-%d")
        fi
    fi
    
    run_daily_test "$current_date" "$i"
    
    # 마지막 테스트가 아니면 잠시 대기
    if [ $i -lt $DAYS ]; then
        echo "⏳ 다음 테스트까지 5초 대기..."
        sleep 5
        echo ""
    fi
done

# 임시 파일 정리
if [ -f "$TEMP_FILE" ]; then
    rm "$TEMP_FILE"
fi

echo "🎉 일일 테스트 완료!"
echo "📁 결과 파일: $RESULT_FILE"
echo ""
echo "📊 최종 요약:"
echo "  - 테스트 날짜: $TEST_DATE"
echo "  - 테스트 일수: $DAYS"
echo "  - 결과 파일: $RESULT_FILE"
echo ""
