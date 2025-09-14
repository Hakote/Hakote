/**요일 이름 상수*/
export const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"] as const;

/**테스트용 날짜 제어 함수*/
export const getTestDate = (): Date | null => {
  const testDate = process.env.TEST_DATE;
  if (testDate) {
    return new Date(testDate);
  }
  return null;
};

export const nowKST = () => {
  const testDate = getTestDate();
  if (testDate) {
    // 테스트용 날짜 사용
    return testDate;
  }
  // 실제 현재 시간 사용
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
  );
};

export const todayKSTDateOnly = () => {
  const d = nowKST();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const isWeekdayKST = () => {
  const d = nowKST().getDay(); // 0 Sun ... 6 Sat
  return d >= 1 && d <= 5;
};

export const yyyyMmDdKST = () => {
  const d = todayKSTDateOnly();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

/**요일 번호를 한글 이름으로 변환하는 헬퍼 함수*/
export const getDayName = (dayOfWeek: number): string => {
  return DAY_NAMES[dayOfWeek] || "알 수 없음";
};

/**날짜를 정수 해시(YYYYMMDD)로 반환*/
export const getDateHash = (date?: Date): number => {
  const d = date ?? todayKSTDateOnly();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return Number(`${year}${month}${day}`);
};
