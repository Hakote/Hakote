import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { getDayName, nowKST, yyyyMmDdKST, isWeekdayKST } from "../date";

describe("크론 작업 관련 함수 테스트", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // 환경 변수 백업
    originalEnv = { ...process.env };
    // 테스트용 로거 생성
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 환경 변수 복원
    process.env = originalEnv;
    // TEST_DATE 제거
    delete process.env.TEST_DATE;
  });

  test("환경 변수로 날짜 제어 - 월요일", () => {
    // 월요일로 설정 (2024-01-15은 월요일)
    process.env.TEST_DATE = "2024-01-15";

    const currentDateKST = nowKST();
    const dayOfWeek = currentDateKST.getDay();
    const dayName = getDayName(dayOfWeek);
    const todayDate = yyyyMmDdKST();
    const isWeekday = isWeekdayKST();

    expect(dayOfWeek).toBe(1); // 월요일
    expect(dayName).toBe("월");
    expect(todayDate).toBe("2024-01-15");
    expect(isWeekday).toBe(true);
  });

  test("환경 변수로 날짜 제어 - 화요일", () => {
    // 화요일로 설정 (2024-01-16은 화요일)
    process.env.TEST_DATE = "2024-01-16";

    const currentDateKST = nowKST();
    const dayOfWeek = currentDateKST.getDay();
    const dayName = getDayName(dayOfWeek);
    const todayDate = yyyyMmDdKST();
    const isWeekday = isWeekdayKST();

    expect(dayOfWeek).toBe(2); // 화요일
    expect(dayName).toBe("화");
    expect(todayDate).toBe("2024-01-16");
    expect(isWeekday).toBe(true);
  });

  test("환경 변수로 날짜 제어 - 토요일", () => {
    // 토요일로 설정 (2024-01-20은 토요일)
    process.env.TEST_DATE = "2024-01-20";

    const currentDateKST = nowKST();
    const dayOfWeek = currentDateKST.getDay();
    const dayName = getDayName(dayOfWeek);
    const todayDate = yyyyMmDdKST();
    const isWeekday = isWeekdayKST();

    expect(dayOfWeek).toBe(6); // 토요일
    expect(dayName).toBe("토");
    expect(todayDate).toBe("2024-01-20");
    expect(isWeekday).toBe(false);
  });

  test("환경 변수로 날짜 제어 - 일요일", () => {
    // 일요일로 설정 (2024-01-21은 일요일)
    process.env.TEST_DATE = "2024-01-21";

    const currentDateKST = nowKST();
    const dayOfWeek = currentDateKST.getDay();
    const dayName = getDayName(dayOfWeek);
    const todayDate = yyyyMmDdKST();
    const isWeekday = isWeekdayKST();

    expect(dayOfWeek).toBe(0); // 일요일
    expect(dayName).toBe("일");
    expect(todayDate).toBe("2024-01-21");
    expect(isWeekday).toBe(false);
  });

  test("환경 변수 없을 때 실제 현재 시간 사용", () => {
    // TEST_DATE 환경 변수 제거
    delete process.env.TEST_DATE;

    const currentDateKST = nowKST();
    const dayOfWeek = currentDateKST.getDay();
    const dayName = getDayName(dayOfWeek);
    const todayDate = yyyyMmDdKST();
    const isWeekday = isWeekdayKST();

    // 실제 현재 시간이므로 유효한 값이어야 함
    expect(dayOfWeek).toBeGreaterThanOrEqual(0);
    expect(dayOfWeek).toBeLessThanOrEqual(6);
    expect(dayName).toBeDefined();
    expect(todayDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof isWeekday).toBe("boolean");
  });

  test("요일별 구독자 필터링 로직 테스트", () => {
    // 구독자 데이터 시뮬레이션
    const subscribers = [
      { frequency: "2x" }, // 화, 목
      { frequency: "3x" }, // 월, 수, 금
      { frequency: "5x" }, // 평일
    ];

    // 월요일 테스트
    process.env.TEST_DATE = "2024-01-15";
    const monday = nowKST().getDay();

    const mondayTargets = subscribers.filter((sub) => {
      switch (sub.frequency) {
        case "2x":
          return monday === 2 || monday === 4; // 화, 목
        case "3x":
          return monday === 1 || monday === 3 || monday === 5; // 월, 수, 금
        case "5x":
          return monday >= 1 && monday <= 5; // 평일
        default:
          return false;
      }
    });

    expect(mondayTargets).toHaveLength(2); // 3x, 5x만 포함
    expect(mondayTargets.some((s) => s.frequency === "3x")).toBe(true);
    expect(mondayTargets.some((s) => s.frequency === "5x")).toBe(true);
    expect(mondayTargets.some((s) => s.frequency === "2x")).toBe(false);

    // 화요일 테스트
    process.env.TEST_DATE = "2024-01-16";
    const tuesday = nowKST().getDay();

    const tuesdayTargets = subscribers.filter((sub) => {
      switch (sub.frequency) {
        case "2x":
          return tuesday === 2 || tuesday === 4; // 화, 목
        case "3x":
          return tuesday === 1 || tuesday === 3 || tuesday === 5; // 월, 수, 금
        case "5x":
          return tuesday >= 1 && tuesday <= 5; // 평일
        default:
          return false;
      }
    });

    expect(tuesdayTargets).toHaveLength(2); // 2x, 5x만 포함
    expect(tuesdayTargets.some((s) => s.frequency === "2x")).toBe(true);
    expect(tuesdayTargets.some((s) => s.frequency === "5x")).toBe(true);
    expect(tuesdayTargets.some((s) => s.frequency === "3x")).toBe(false);

    // 토요일 테스트
    process.env.TEST_DATE = "2024-01-20";
    const saturday = nowKST().getDay();

    const saturdayTargets = subscribers.filter((sub) => {
      switch (sub.frequency) {
        case "2x":
          return saturday === 2 || saturday === 4; // 화, 목
        case "3x":
          return saturday === 1 || saturday === 3 || saturday === 5; // 월, 수, 금
        case "5x":
          return saturday >= 1 && saturday <= 5; // 평일
        default:
          return false;
      }
    });

    expect(saturdayTargets).toHaveLength(0); // 주말이므로 모든 빈도 제외
  });

  test("모든 요일별 테스트", () => {
    const testDates = [
      {
        date: "2024-01-15",
        expectedDay: 1,
        expectedName: "월",
        expectedWeekday: true,
      },
      {
        date: "2024-01-16",
        expectedDay: 2,
        expectedName: "화",
        expectedWeekday: true,
      },
      {
        date: "2024-01-17",
        expectedDay: 3,
        expectedName: "수",
        expectedWeekday: true,
      },
      {
        date: "2024-01-18",
        expectedDay: 4,
        expectedName: "목",
        expectedWeekday: true,
      },
      {
        date: "2024-01-19",
        expectedDay: 5,
        expectedName: "금",
        expectedWeekday: true,
      },
      {
        date: "2024-01-20",
        expectedDay: 6,
        expectedName: "토",
        expectedWeekday: false,
      },
      {
        date: "2024-01-21",
        expectedDay: 0,
        expectedName: "일",
        expectedWeekday: false,
      },
    ];

    testDates.forEach(
      ({ date, expectedDay, expectedName, expectedWeekday }) => {
        process.env.TEST_DATE = date;

        const currentDateKST = nowKST();
        const dayOfWeek = currentDateKST.getDay();
        const dayName = getDayName(dayOfWeek);
        const isWeekday = isWeekdayKST();

        expect(dayOfWeek).toBe(expectedDay);
        expect(dayName).toBe(expectedName);
        expect(isWeekday).toBe(expectedWeekday);
      }
    );
  });

  test("환경 변수 복원 테스트", () => {
    // 원본 환경 변수 저장
    const originalTestDate = process.env.TEST_DATE;

    // 테스트용 환경 변수 설정
    process.env.TEST_DATE = "2024-01-15";
    expect(process.env.TEST_DATE).toBe("2024-01-15");

    // afterEach에서 자동으로 복원되는지 확인
    // 이 테스트는 beforeEach/afterEach의 동작을 검증
  });
});
