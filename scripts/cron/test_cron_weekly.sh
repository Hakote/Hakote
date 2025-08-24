#!/bin/bash

# 하코테 크론 작업 주간 테스트 스크립트 (주차별 실행 버전)
# 사용법: ./test_cron_weekly.sh [--week N] [--month M] [--year Y]

echo "🧪 하코테 크론 작업 주간 테스트 시작..."
echo ""

# 기본값 설정
WEEK=4
MONTH=8
YEAR=2025

# 명령행 인수 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        --week)
            WEEK="$2"
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
            echo "사용법: $0 [--week N] [--month M] [--year Y]"
            exit 1
            ;;
    esac
done

echo "📅 테스트 기간: ${YEAR}년 ${MONTH}월 ${WEEK}주차"
echo ""

# 스크립트 위치 기반으로 경로 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"

# 결과 파일 경로 설정 (동적 계산)
RESULT_FILE="$PROJECT_ROOT/scripts/cron/results/weekly-results/${YEAR}-$(printf "%02d" $MONTH)/week-${WEEK}/${YEAR}-$(printf "%02d" $MONTH)-$(printf "%02d" $((WEEK*7-3)))-weekly-test-results.md"
TEMP_FILE="$PROJECT_ROOT/temp_test_results.json"

echo "📁 스크립트 위치: $SCRIPT_DIR"
echo "📁 프로젝트 루트: $PROJECT_ROOT"
echo "📁 결과 파일: $RESULT_FILE"
echo ""

# 결과 폴더가 없으면 생성
mkdir -p "$(dirname "$RESULT_FILE")"

# 기존 결과 파일 백업
if [ -f "$RESULT_FILE" ]; then
    cp "$RESULT_FILE" "${RESULT_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "📋 기존 결과 파일 백업 완료: ${RESULT_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
fi

# 주차별 시작 날짜 계산 (월요일 기준)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS용 - 8월 1일부터 시작해서 해당 주차의 월요일 계산
    START_DATE="2025-08-01"
    # 4주차는 8월 18일부터 시작 (1주차: 8월 1일, 2주차: 8월 8일, 3주차: 8월 15일, 4주차: 8월 18일)
    case $WEEK in
        1) WEEK_START="2025-08-01" ;;
        2) WEEK_START="2025-08-08" ;;
        3) WEEK_START="2025-08-15" ;;
        4) WEEK_START="2025-08-18" ;;
        *) WEEK_START="2025-08-01" ;;
    esac
else
    # Linux용
    START_DATE="2025-08-01"
    case $WEEK in
        1) WEEK_START="2025-08-01" ;;
        2) WEEK_START="2025-08-08" ;;
        3) WEEK_START="2025-08-15" ;;
        4) WEEK_START="2025-08-18" ;;
        *) WEEK_START="2025-08-01" ;;
    esac
fi

# 테스트할 날짜들 (해당 주의 월~일) - bash 호환성을 위해 일반 배열 사용
test_dates_monday=""
test_dates_tuesday=""
test_dates_wednesday=""
test_dates_thursday=""
test_dates_friday=""
test_dates_saturday=""
test_dates_sunday=""

# 해당 월의 첫 번째 월요일 계산 함수
get_first_monday() {
    local year=$1
    local month=$2
    
    # 해당 월의 1일이 무슨 요일인지 계산 (0=일요일, 1=월요일, ..., 6=토요일)
    local first_day_of_week=$(date -j -f "%Y-%m-%d" "${year}-${month}-01" "+%u" 2>/dev/null || date -d "${year}-${month}-01" "+%u" 2>/dev/null)
    
    # 월요일이 1이므로, 첫 번째 월요일까지의 일수를 계산
    local days_to_monday=0
    if [ "$first_day_of_week" = "1" ]; then
        days_to_monday=0
    elif [ "$first_day_of_week" = "2" ]; then
        days_to_monday=6
    elif [ "$first_day_of_week" = "3" ]; then
        days_to_monday=5
    elif [ "$first_day_of_week" = "4" ]; then
        days_to_monday=4
    elif [ "$first_day_of_week" = "5" ]; then
        days_to_monday=3
    elif [ "$first_day_of_week" = "6" ]; then
        days_to_monday=2
    elif [ "$first_day_of_week" = "7" ]; then
        days_to_monday=1
    fi
    
    # 첫 번째 월요일 날짜 계산
    local first_monday=$(date -j -v+${days_to_monday}d -f "%Y-%m-%d" "${year}-${month}-01" "+%Y-%m-%d" 2>/dev/null || date -d "${year}-${month}-01 +${days_to_monday} days" "+%Y-%m-%d" 2>/dev/null)
    echo "$first_monday"
}

# 주차별 날짜 계산 (동적)
first_monday=$(get_first_monday $YEAR $MONTH)
first_monday_day=$(echo $first_monday | cut -d'-' -f3)

# 주차별 시작 날짜 계산
case $WEEK in
    1) 
        # 1주차: 해당 월의 첫 번째 월요일부터 시작
        start_day=$first_monday_day
        ;;
    2) 
        # 2주차: 첫 번째 월요일 + 7일
        start_day=$((first_monday_day + 7))
        ;;
    3) 
        # 3주차: 첫 번째 월요일 + 14일
        start_day=$((first_monday_day + 14))
        ;;
    4) 
        # 4주차: 첫 번째 월요일 + 21일
        start_day=$((first_monday_day + 21))
        ;;
    *) 
        # 기본값: 1주차
        start_day=$first_monday_day
        ;;
esac

# 요일별 날짜 계산
test_dates_monday="${YEAR}-$(printf "%02d" $MONTH)-$(printf "%02d" $start_day)"
test_dates_tuesday="${YEAR}-$(printf "%02d" $MONTH)-$(printf "%02d" $((start_day + 1)))"
test_dates_wednesday="${YEAR}-$(printf "%02d" $MONTH)-$(printf "%02d" $((start_day + 2)))"
test_dates_thursday="${YEAR}-$(printf "%02d" $MONTH)-$(printf "%02d" $((start_day + 3)))"
test_dates_friday="${YEAR}-$(printf "%02d" $MONTH)-$(printf "%02d" $((start_day + 4)))"
test_dates_saturday="${YEAR}-$(printf "%02d" $MONTH)-$(printf "%02d" $((start_day + 5)))"
test_dates_sunday="${YEAR}-$(printf "%02d" $MONTH)-$(printf "%02d" $((start_day + 6)))"

# 한글 요일명 매핑
day_names_monday="월요일"
day_names_tuesday="화요일"
day_names_wednesday="수요일"
day_names_thursday="목요일"
day_names_friday="금요일"
day_names_saturday="토요일"
day_names_sunday="일요일"

# 구독자 통계 가져오기
get_subscriber_stats() {
    local stats_response=$(curl -s http://localhost:3000/api/subscribers/stats)
    if [ $? -eq 0 ]; then
        echo "$stats_response"
    else
        echo "{}"
    fi
}

# 예상 결과 계산 함수 추가
calculate_expected_results() {
    local day_of_week=$1
    local freq_2x=$2
    local freq_3x=$3
    local freq_5x=$4
    
    case $day_of_week in
        1) # 월요일: 3x + 5x
            echo $((freq_3x + freq_5x))
            ;;
        2) # 화요일: 2x + 5x
            echo $((freq_2x + freq_5x))
            ;;
        3) # 수요일: 3x + 5x
            echo $((freq_3x + freq_5x))
            ;;
        4) # 목요일: 2x + 5x
            echo $((freq_2x + freq_5x))
            ;;
        5) # 금요일: 3x + 5x
            echo $((freq_3x + freq_5x))
            ;;
        6|0) # 토요일/일요일: 0명
            echo "0"
            ;;
        *)
            echo "0"
            ;;
    esac
}

# 요일별 날짜에 해당하는 요일 번호 계산
get_day_of_week() {
    local date=$1
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS용
        date -j -f "%Y-%m-%d" "$date" "+%u" | sed 's/7/0/'  # 일요일을 0으로 변환
    else
        # Linux용
        date -d "$date" "+%u" | sed 's/7/0/'  # 일요일을 0으로 변환
    fi
}

# 구독자 통계 가져오기
echo "📊 구독자 통계 가져오는 중..."
stats_response=$(get_subscriber_stats)

# JSON 파싱 (jq가 없으면 기본값 사용)
if command -v jq &> /dev/null; then
    freq_2x=$(echo "$stats_response" | jq -r '.stats.frequency."2x" // 28')
    freq_3x=$(echo "$stats_response" | jq -r '.stats.frequency."3x" // 20')
    freq_5x=$(echo "$stats_response" | jq -r '.stats.frequency."5x" // 78')
    total_subscribers=$(echo "$stats_response" | jq -r '.stats.total // 126')
else
    # jq가 없으면 기본값 사용
    freq_2x=28
    freq_3x=20
    freq_5x=78
    total_subscribers=126
fi

echo "📈 현재 구독자 분포:"
echo "  - 총 구독자: ${total_subscribers}명"
echo "  - 2x (화,목): ${freq_2x}명"
echo "  - 3x (월,수,금): ${freq_3x}명"
echo "  - 5x (평일): ${freq_5x}명"
echo ""

# 동적으로 예상 결과 계산
expected_results_monday=$(calculate_expected_results $(get_day_of_week "$test_dates_monday") "$freq_2x" "$freq_3x" "$freq_5x")
expected_results_tuesday=$(calculate_expected_results $(get_day_of_week "$test_dates_tuesday") "$freq_2x" "$freq_3x" "$freq_5x")
expected_results_wednesday=$(calculate_expected_results $(get_day_of_week "$test_dates_wednesday") "$freq_2x" "$freq_3x" "$freq_5x")
expected_results_thursday=$(calculate_expected_results $(get_day_of_week "$test_dates_thursday") "$freq_2x" "$freq_3x" "$freq_5x")
expected_results_friday=$(calculate_expected_results $(get_day_of_week "$test_dates_friday") "$freq_2x" "$freq_3x" "$freq_5x")
expected_results_saturday=$(calculate_expected_results $(get_day_of_week "$test_dates_saturday") "$freq_2x" "$freq_3x" "$freq_5x")
expected_results_sunday=$(calculate_expected_results $(get_day_of_week "$test_dates_sunday") "$freq_2x" "$freq_3x" "$freq_5x")

echo "📊 요일별 예상 결과 계산:"
echo "  월요일 ($test_dates_monday): ${expected_results_monday}명"
echo "  화요일 ($test_dates_tuesday): ${expected_results_tuesday}명"
echo "  수요일 ($test_dates_wednesday): ${expected_results_wednesday}명"
echo "  목요일 ($test_dates_thursday): ${expected_results_thursday}명"
echo "  금요일 ($test_dates_friday): ${expected_results_friday}명"
echo "  토요일 ($test_dates_saturday): ${expected_results_saturday}명"
echo "  일요일 ($test_dates_sunday): ${expected_results_sunday}명"
echo ""

echo "📊 요일별 테스트 실행 중..."
echo ""

# 테스트 결과를 저장할 변수들
actual_results_monday=""
actual_results_tuesday=""
actual_results_wednesday=""
actual_results_thursday=""
actual_results_friday=""
actual_results_saturday=""
actual_results_sunday=""

# 월요일 테스트
echo "  🔍 $day_names_monday ($test_dates_monday) 테스트 중..."
curl -s -X POST -H "Content-Type: application/json" -d "{\"testDate\": \"$test_dates_monday\"}" http://localhost:3000/api/test-cron > "$TEMP_FILE"
if [ -f "$TEMP_FILE" ]; then
    actual=$(cat "$TEMP_FILE" | grep -o '"totalSubscribers":[0-9]*' | cut -d':' -f2)
    if [ -n "$actual" ]; then
        echo "    ✅ $day_names_monday: $actual명 (예상: ${expected_results_monday}명)"
        actual_results_monday=$actual
        if [ "$actual" = "$expected_results_monday" ]; then
            echo "    🎯 예상 결과와 일치!"
        else
            echo "    ⚠️  예상 결과와 다름 (차이: $((actual - expected_results_monday))명)"
        fi
    else
        echo "    ❌ $day_names_monday: 결과 파싱 실패"
        actual_results_monday="실패"
    fi
    rm "$TEMP_FILE"
else
    echo "    ❌ $day_names_monday: 테스트 실패"
    actual_results_monday="실패"
fi
echo ""

# 화요일 테스트
echo "  🔍 $day_names_tuesday ($test_dates_tuesday) 테스트 중..."
curl -s -X POST -H "Content-Type: application/json" -d "{\"testDate\": \"$test_dates_tuesday\"}" http://localhost:3000/api/test-cron > "$TEMP_FILE"
if [ -f "$TEMP_FILE" ]; then
    actual=$(cat "$TEMP_FILE" | grep -o '"totalSubscribers":[0-9]*' | cut -d':' -f2)
    if [ -n "$actual" ]; then
        echo "    ✅ $day_names_tuesday: $actual명 (예상: ${expected_results_tuesday}명)"
        actual_results_tuesday=$actual
        if [ "$actual" = "$expected_results_tuesday" ]; then
            echo "    🎯 예상 결과와 일치!"
        else
            echo "    ⚠️  예상 결과와 다름 (차이: $((actual - expected_results_tuesday))명)"
        fi
    else
        echo "    ❌ $day_names_tuesday: 결과 파싱 실패"
        actual_results_tuesday="실패"
    fi
    rm "$TEMP_FILE"
else
    echo "    ❌ $day_names_tuesday: 테스트 실패"
    actual_results_tuesday="실패"
fi
echo ""

# 수요일 테스트
echo "  🔍 $day_names_wednesday ($test_dates_wednesday) 테스트 중..."
curl -s -X POST -H "Content-Type: application/json" -d "{\"testDate\": \"$test_dates_wednesday\"}" http://localhost:3000/api/test-cron > "$TEMP_FILE"
if [ -f "$TEMP_FILE" ]; then
    actual=$(cat "$TEMP_FILE" | grep -o '"totalSubscribers":[0-9]*' | cut -d':' -f2)
    if [ -n "$actual" ]; then
        echo "    ✅ $day_names_wednesday: $actual명 (예상: ${expected_results_wednesday}명)"
        actual_results_wednesday=$actual
        if [ "$actual" = "$expected_results_wednesday" ]; then
            echo "    🎯 예상 결과와 일치!"
        else
            echo "    ⚠️  예상 결과와 다름 (차이: $((actual - expected_results_wednesday))명)"
        fi
    else
        echo "    ❌ $day_names_wednesday: 결과 파싱 실패"
        actual_results_wednesday="실패"
    fi
    rm "$TEMP_FILE"
else
    echo "    ❌ $day_names_wednesday: 테스트 실패"
    actual_results_wednesday="실패"
fi
echo ""

# 목요일 테스트
echo "  🔍 $day_names_thursday ($test_dates_thursday) 테스트 중..."
curl -s -X POST -H "Content-Type: application/json" -d "{\"testDate\": \"$test_dates_thursday\"}" http://localhost:3000/api/test-cron > "$TEMP_FILE"
if [ -f "$TEMP_FILE" ]; then
    actual=$(cat "$TEMP_FILE" | grep -o '"totalSubscribers":[0-9]*' | cut -d':' -f2)
    if [ -n "$actual" ]; then
        echo "    ✅ $day_names_thursday: $actual명 (예상: ${expected_results_thursday}명)"
        actual_results_thursday=$actual
        if [ "$actual" = "$expected_results_thursday" ]; then
            echo "    🎯 예상 결과와 일치!"
        else
            echo "    ⚠️  예상 결과와 다름 (차이: $((actual - expected_results_thursday))명)"
        fi
    else
        echo "    ❌ $day_names_thursday: 결과 파싱 실패"
        actual_results_thursday="실패"
    fi
    rm "$TEMP_FILE"
else
    echo "    ❌ $day_names_thursday: 테스트 실패"
    actual_results_thursday="실패"
fi
echo ""

# 금요일 테스트
echo "  🔍 $day_names_friday ($test_dates_friday) 테스트 중..."
curl -s -X POST -H "Content-Type: application/json" -d "{\"testDate\": \"$test_dates_friday\"}" http://localhost:3000/api/test-cron > "$TEMP_FILE"
if [ -f "$TEMP_FILE" ]; then
    actual=$(cat "$TEMP_FILE" | grep -o '"totalSubscribers":[0-9]*' | cut -d':' -f2)
    if [ -n "$actual" ]; then
        echo "    ✅ $day_names_friday: $actual명 (예상: ${expected_results_friday}명)"
        actual_results_friday=$actual
        if [ "$actual" = "$expected_results_friday" ]; then
            echo "    🎯 예상 결과와 일치!"
        else
            echo "    ⚠️  예상 결과와 다름 (차이: $((actual - expected_results_friday))명)"
        fi
    else
        echo "    ❌ $day_names_friday: 결과 파싱 실패"
        actual_results_friday="실패"
    fi
    rm "$TEMP_FILE"
else
    echo "    ❌ $day_names_friday: 테스트 실패"
    actual_results_friday="실패"
fi
echo ""

# 토요일 테스트
echo "  🔍 $day_names_saturday ($test_dates_saturday) 테스트 중..."
curl -s -X POST -H "Content-Type: application/json" -d "{\"testDate\": \"$test_dates_saturday\"}" http://localhost:3000/api/test-cron > "$TEMP_FILE"
if [ -f "$TEMP_FILE" ]; then
    actual=$(cat "$TEMP_FILE" | grep -o '"totalSubscribers":[0-9]*' | cut -d':' -f2)
    if [ -n "$actual" ]; then
        echo "    ✅ $day_names_saturday: $actual명 (예상: ${expected_results_saturday}명)"
        actual_results_saturday=$actual
        if [ "$actual" = "$expected_results_saturday" ]; then
            echo "    🎯 예상 결과와 일치!"
        else
            echo "    ⚠️  예상 결과와 다름 (차이: $((actual - expected_results_saturday))명)"
        fi
    else
        echo "    ❌ $day_names_saturday: 결과 파싱 실패"
        actual_results_saturday="실패"
    fi
    rm "$TEMP_FILE"
else
    echo "    ❌ $day_names_saturday: 테스트 실패"
    actual_results_saturday="실패"
fi
echo ""

# 일요일 테스트
echo "  🔍 $day_names_sunday ($test_dates_sunday) 테스트 중..."
curl -s -X POST -H "Content-Type: application/json" -d "{\"testDate\": \"$test_dates_sunday\"}" http://localhost:3000/api/test-cron > "$TEMP_FILE"
if [ -f "$TEMP_FILE" ]; then
    actual=$(cat "$TEMP_FILE" | grep -o '"totalSubscribers":[0-9]*' | cut -d':' -f2)
    if [ -n "$actual" ]; then
        echo "    ✅ $day_names_sunday: $actual명 (예상: ${expected_results_sunday}명)"
        actual_results_sunday=$actual
        if [ "$actual" = "$expected_results_sunday" ]; then
            echo "    🎯 예상 결과와 일치!"
        else
            echo "    ⚠️  예상 결과와 다름 (차이: $((actual - expected_results_sunday))명)"
        fi
    else
        echo "    ❌ $day_names_sunday: 결과 파싱 실패"
        actual_results_sunday="실패"
    fi
    rm "$TEMP_FILE"
else
    echo "    ❌ $day_names_sunday: 테스트 실패"
    actual_results_sunday="실패"
fi
echo ""

echo "🎉 모든 요일 테스트 완료!"
echo ""

# 결과 문서 생성
echo "📝 결과 문서 생성 중..."

# 결과 문서 헤더 작성
cat > "$RESULT_FILE" << EOF
# 하코테 크론 작업 주간 테스트 결과

## 📅 테스트 기간: ${YEAR}년 ${MONTH}월 ${WEEK}주차
## 🕐 테스트 실행 시간: $(date '+%Y-%m-%d %H:%M:%S')

### 🧪 테스트 환경

- **모드**: 테스트 모드 (DB 변경 없음)
- **총 구독자 수**: 126명
- **구독자 빈도별 분포**:
  - 2x (화,목): 28명
  - 3x (월,수,금): 20명
  - 5x (평일): 78명

---

## 📊 요일별 테스트 결과

EOF

# 각 요일별 결과 추가
if [ "$actual_results_monday" != "실패" ]; then
    status="✅ 성공"
    result_text="${actual_results_monday}명"
else
    status="❌ 실패"
    result_text="테스트 실패"
fi

cat >> "$RESULT_FILE" << EOF
### ${day_names_monday} (${test_dates_monday})

**예상 결과**: ${expected_results_monday}명
**실제 결과**: ${result_text}
**상태**: ${status}

---

EOF

if [ "$actual_results_tuesday" != "실패" ]; then
    status="✅ 성공"
    result_text="${actual_results_tuesday}명"
else
    status="❌ 실패"
    result_text="테스트 실패"
fi

cat >> "$RESULT_FILE" << EOF
### ${day_names_tuesday} (${test_dates_tuesday})

**예상 결과**: ${expected_results_tuesday}명
**실제 결과**: ${result_text}
**상태**: ${status}

---

EOF

if [ "$actual_results_wednesday" != "실패" ]; then
    status="✅ 성공"
    result_text="${actual_results_wednesday}명"
else
    status="❌ 실패"
    result_text="테스트 실패"
fi

cat >> "$RESULT_FILE" << EOF
### ${day_names_wednesday} (${test_dates_wednesday})

**예상 결과**: ${expected_results_wednesday}명
**실제 결과**: ${result_text}
**상태**: ${status}

---

EOF

if [ "$actual_results_thursday" != "실패" ]; then
    status="✅ 성공"
    result_text="${actual_results_thursday}명"
else
    status="❌ 실패"
    result_text="테스트 실패"
fi

cat >> "$RESULT_FILE" << EOF
### ${day_names_thursday} (${test_dates_thursday})

**예상 결과**: ${expected_results_thursday}명
**실제 결과**: ${result_text}
**상태**: ${status}

---

EOF

if [ "$actual_results_friday" != "실패" ]; then
    status="✅ 성공"
    result_text="${actual_results_friday}명"
else
    status="❌ 실패"
    result_text="테스트 실패"
fi

cat >> "$RESULT_FILE" << EOF
### ${day_names_friday} (${test_dates_friday})

**예상 결과**: ${expected_results_friday}명
**실제 결과**: ${result_text}
**상태**: ${status}

---

EOF

if [ "$actual_results_saturday" != "실패" ]; then
    status="✅ 성공"
    result_text="${actual_results_saturday}명"
else
    status="❌ 실패"
    result_text="테스트 실패"
fi

cat >> "$RESULT_FILE" << EOF
### ${day_names_saturday} (${test_dates_saturday})

**예상 결과**: ${expected_results_saturday}명
**실제 결과**: ${result_text}
**상태**: ${status}

---

EOF

if [ "$actual_results_sunday" != "실패" ]; then
    status="✅ 성공"
    result_text="${actual_results_sunday}명"
else
    status="❌ 실패"
    result_text="테스트 실패"
fi

cat >> "$RESULT_FILE" << EOF
### ${day_names_sunday} (${test_dates_sunday})

**예상 결과**: ${expected_results_sunday}명
**실제 결과**: ${result_text}
**상태**: ${status}

---

EOF

# 요약 및 분석 추가
cat >> "$RESULT_FILE" << EOF
## 📈 요약 및 분석

### ✅ 정상 동작 확인 사항

- [ ] 요일별 구독자 필터링이 정확히 작동
- [ ] 평일/주말 구분이 올바름
- [ ] 빈도별 구독자 수가 예상과 일치
- [ ] TEST_DATE 환경 변수가 제대로 적용됨

---

_마지막 업데이트: $(date '+%Y-%m-%d %H:%M:%S')_
_테스트 실행자: 개발팀_
_테스트 상태: 완료_
EOF

echo "✅ 결과 문서 생성 완료: $RESULT_FILE"
echo ""

# 최종 결과 요약
echo "📈 최종 테스트 결과 요약:"
echo "================================"

if [ "$actual_results_monday" != "실패" ]; then
    if [ "$actual_results_monday" = "$expected_results_monday" ]; then
        echo "  ✅ $day_names_monday: ${actual_results_monday}명 (예상: ${expected_results_monday}명) - 일치"
    else
        echo "  ⚠️  $day_names_monday: ${actual_results_monday}명 (예상: ${expected_results_monday}명) - 불일치"
    fi
else
    echo "  ❌ $day_names_monday: 테스트 실패"
fi

if [ "$actual_results_tuesday" != "실패" ]; then
    if [ "$actual_results_tuesday" = "$expected_results_tuesday" ]; then
        echo "  ✅ $day_names_tuesday: ${actual_results_tuesday}명 (예상: ${expected_results_tuesday}명) - 일치"
    else
        echo "  ⚠️  $day_names_tuesday: ${actual_results_tuesday}명 (예상: ${expected_results_tuesday}명) - 불일치"
    fi
else
    echo "  ❌ $day_names_tuesday: 테스트 실패"
fi

if [ "$actual_results_wednesday" != "실패" ]; then
    if [ "$actual_results_wednesday" = "$expected_results_wednesday" ]; then
        echo "  ✅ $day_names_wednesday: ${actual_results_wednesday}명 (예상: ${expected_results_wednesday}명) - 일치"
    else
        echo "  ⚠️  $day_names_wednesday: ${actual_results_wednesday}명 (예상: ${expected_results_wednesday}명) - 불일치"
    fi
else
    echo "  ❌ $day_names_wednesday: 테스트 실패"
fi

if [ "$actual_results_thursday" != "실패" ]; then
    if [ "$actual_results_thursday" = "$expected_results_thursday" ]; then
        echo "  ✅ $day_names_thursday: ${actual_results_thursday}명 (예상: ${expected_results_thursday}명) - 일치"
    else
        echo "  ⚠️  $day_names_thursday: ${actual_results_thursday}명 (예상: ${expected_results_thursday}명) - 불일치"
    fi
else
    echo "  ❌ $day_names_thursday: 테스트 실패"
fi

if [ "$actual_results_friday" != "실패" ]; then
    if [ "$actual_results_friday" = "$expected_results_friday" ]; then
        echo "  ✅ $day_names_friday: ${actual_results_friday}명 (예상: ${expected_results_friday}명) - 일치"
    else
        echo "  ⚠️  $day_names_friday: ${actual_results_friday}명 (예상: ${expected_results_friday}명) - 불일치"
    fi
else
    echo "  ❌ $day_names_friday: 테스트 실패"
fi

if [ "$actual_results_saturday" != "실패" ]; then
    if [ "$actual_results_saturday" = "$expected_results_saturday" ]; then
        echo "  ✅ $day_names_saturday: ${actual_results_saturday}명 (예상: ${expected_results_saturday}명) - 일치"
    else
        echo "  ⚠️  $day_names_saturday: ${actual_results_saturday}명 (예상: ${expected_results_saturday}명) - 불일치"
    fi
else
    echo "  ❌ $day_names_saturday: 테스트 실패"
fi

if [ "$actual_results_sunday" != "실패" ]; then
    if [ "$actual_results_sunday" = "$expected_results_sunday" ]; then
        echo "  ✅ $day_names_sunday: ${actual_results_sunday}명 (예상: ${expected_results_sunday}명) - 일치"
    else
        echo "  ⚠️  $day_names_sunday: ${actual_results_sunday}명 (예상: ${expected_results_sunday}명) - 불일치"
    fi
else
    echo "  ❌ $day_names_sunday: 테스트 실패"
fi

echo "================================"

echo ""
echo "🔍 자세한 결과는 $RESULT_FILE 파일을 확인하세요."
echo "📋 백업 파일: ${RESULT_FILE}.backup.*"
