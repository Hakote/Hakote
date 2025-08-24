#!/bin/bash

# 하코테 크론 작업 전체 주차 자동 테스트 스크립트
# 사용법: ./test_all_weeks.sh [--month M] [--year Y]

echo "🚀 하코테 크론 작업 전체 주차 자동 테스트 시작!"
echo ""

# 기본값 설정
MONTH=8
YEAR=2025

# 명령행 인수 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
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
            echo "사용법: $0 [--month M] [--year Y]"
            exit 1
            ;;
    esac
done

echo "📅 테스트 기간: ${YEAR}년 ${MONTH}월 (1~4주차)"
echo ""

# 스크립트 위치 기반으로 경로 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../" && pwd)"
WEEKLY_SCRIPT="$SCRIPT_DIR/test_cron_weekly.sh"

# 결과 요약 파일
SUMMARY_FILE="$PROJECT_ROOT/scripts/cron/results/weekly-results/${YEAR}-$(printf "%02d" $MONTH)/monthly-test-summary.md"

echo "📁 스크립트 위치: $SCRIPT_DIR"
echo "📁 프로젝트 루트: $PROJECT_ROOT"
echo "📁 요약 파일: $SUMMARY_FILE"
echo ""

# 결과 폴더 생성
mkdir -p "$(dirname "$SUMMARY_FILE")"

# 전체 결과를 저장할 배열
declare -A week_results
declare -A week_status

echo "🔄 각 주차별 테스트 실행 중..."
echo ""

# 1~4주차 순차 실행
for week in {1..4}; do
    echo "📊 ${week}주차 테스트 시작..."
    echo "================================"
    
    # 개별 주차 테스트 실행
    if "$WEEKLY_SCRIPT" --week "$week" --month "$MONTH" --year "$YEAR"; then
        week_status[$week]="✅ 성공"
        echo "✅ ${week}주차 테스트 완료!"
    else
        week_status[$week]="❌ 실패"
        echo "❌ ${week}주차 테스트 실패!"
    fi
    
    echo ""
    
    # 결과 파일에서 성공/실패 통계 추출
    result_file="$PROJECT_ROOT/scripts/cron/results/weekly-results/${YEAR}-$(printf "%02d" $MONTH)/week-${week}/${YEAR}-$(printf "%02d" $MONTH)-$(printf "%02d" $((week*7-3)))-weekly-test-results.md"
    
    if [ -f "$result_file" ]; then
        # 성공한 테스트 수 계산
        success_count=$(grep -c "✅ 성공" "$result_file" 2>/dev/null || echo "0")
        total_count=$(grep -c "### " "$result_file" 2>/dev/null || echo "0")
        
        week_results[$week]="$success_count/$total_count"
    else
        week_results[$week]="0/0"
    fi
done

echo "🎉 모든 주차 테스트 완료!"
echo ""

# 월간 요약 생성
echo "📝 월간 테스트 요약 생성 중..."

cat > "$SUMMARY_FILE" << EOF
# 하코테 크론 작업 월간 테스트 요약

## 📅 ${YEAR}년 ${MONTH}월 테스트 요약
## 🕐 생성 시간: $(date '+%Y-%m-%d %H:%M:%S')

### 📊 전체 통계

- **테스트 기간**: ${YEAR}년 ${MONTH}월 1일 ~ ${MONTH}월 말일
- **총 주차 수**: 4주차
- **테스트 실행 시간**: $(date '+%Y-%m-%d %H:%M:%S')

---

## 🗓️ 주차별 성공률

| 주차 | 상태 | 성공률 | 비고 |
|------|------|--------|------|
EOF

for week in {1..4}; do
    status=${week_status[$week]}
    result=${week_results[$week]}
    
    case $week in
        1) week_range="1일~7일" ;;
        2) week_range="8일~14일" ;;
        3) week_range="15일~21일" ;;
        4) week_range="22일~28일" ;;
    esac
    
    echo "| ${week}주차 (${week_range}) | ${status} | ${result} | - |" >> "$SUMMARY_FILE"
done

cat >> "$SUMMARY_FILE" << EOF

---

## 📈 요약 및 분석

### ✅ 정상 동작 확인 사항

- [ ] 요일별 구독자 필터링이 정확히 작동
- [ ] 평일/주말 구분이 올바름
- [ ] 빈도별 구독자 수가 예상과 일치
- [ ] TEST_DATE 환경 변수가 제대로 적용됨

---

## 🚀 다음 단계

1. **월간 테스트 결과 검토** 및 문제점 식별
2. **자동화 개선** 및 스케줄링
3. **결과 대시보드** 구축 고려

---

_마지막 업데이트: $(date '+%Y-%m-%d %H:%M:%S')_
_테스트 실행자: 개발팀_
_테스트 상태: 완료_
EOF

echo "✅ 월간 요약 생성 완료: $SUMMARY_FILE"
echo ""

# 최종 결과 요약
echo "📈 최종 테스트 결과 요약:"
echo "================================"
for week in {1..4}; do
    status=${week_status[$week]}
    result=${week_results[$week]}
    echo "  ${week}주차: ${status} (${result})"
done
echo "================================"

echo ""
echo "🔍 자세한 결과는 각 주차별 폴더를 확인하세요."
echo "📋 월간 요약: $SUMMARY_FILE"
echo ""
echo "🎯 다음 실행: ./test_all_weeks.sh --month $((MONTH + 1)) --year $YEAR"
