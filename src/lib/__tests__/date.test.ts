import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  nowKST,
  todayKSTDateOnly,
  isWeekdayKST,
  yyyyMmDdKST,
  getDateHash,
} from "../date";

describe("Date utilities", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 전역 TEST_DATE를 기본으로 사용하되, 개별 케이스에서 재설정함
    const base = process.env.TEST_DATE || "2025-09-14";
    // UTC 시각을 고정 (KST = UTC+9)
    vi.setSystemTime(new Date(`${base}T10:00:00.000Z`));
  });

  afterEach(() => {
    vi.useRealTimers();
    // 테스트 후 기본 기준일 복원
    process.env.TEST_DATE = "2025-09-14";
  });

  describe("nowKST", () => {
    it("should return current date matching TEST_DATE", () => {
      const result = nowKST();
      expect(result).toBeInstanceOf(Date);
      const iso = result.toISOString().slice(0, 10);
      expect(iso).toBe(process.env.TEST_DATE || "2025-09-14");
    });
  });

  describe("todayKSTDateOnly", () => {
    it("should return today's date only in KST", () => {
      const result = todayKSTDateOnly();
      expect(result).toBeInstanceOf(Date);
      const base = new Date(process.env.TEST_DATE || "2025-09-14");
      expect(result.getFullYear()).toBe(base.getFullYear());
      expect(result.getMonth()).toBe(base.getMonth());
      expect(result.getDate()).toBe(base.getDate());
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });
  });

  describe("isWeekdayKST", () => {
    it("should return true for weekdays", () => {
      // Monday (2024-01-15)
      process.env.TEST_DATE = "2024-01-15";
      expect(isWeekdayKST()).toBe(true);

      // Tuesday
      process.env.TEST_DATE = "2024-01-16";
      expect(isWeekdayKST()).toBe(true);

      // Wednesday
      process.env.TEST_DATE = "2024-01-17";
      expect(isWeekdayKST()).toBe(true);

      // Thursday
      process.env.TEST_DATE = "2024-01-18";
      expect(isWeekdayKST()).toBe(true);

      // Friday
      process.env.TEST_DATE = "2024-01-19";
      expect(isWeekdayKST()).toBe(true);
    });

    it("should return false for weekends", () => {
      // Saturday
      process.env.TEST_DATE = "2024-01-20";
      expect(isWeekdayKST()).toBe(false);

      // Sunday
      process.env.TEST_DATE = "2024-01-21";
      expect(isWeekdayKST()).toBe(false);
    });
  });

  describe("yyyyMmDdKST", () => {
    it("should return formatted date string", () => {
      process.env.TEST_DATE = "2025-09-14";
      const result = yyyyMmDdKST();
      expect(result).toBe("2025-09-14");
    });

    it("should handle single digit month and day", () => {
      // February 5th
      process.env.TEST_DATE = "2024-02-05";
      const result = yyyyMmDdKST();
      expect(result).toBe("2024-02-05");
    });
  });

  describe("getDateHash", () => {
    it("should return date hash for current date", () => {
      process.env.TEST_DATE = "2025-09-14";
      const result = getDateHash();
      expect(result).toBe(20250914);
    });

    it("should return date hash for specific date", () => {
      const specificDate = new Date("2024-12-25T10:00:00.000Z");
      const result = getDateHash(specificDate);
      expect(result).toBe(20241225);
    });

    it("should handle single digit month and day", () => {
      const specificDate = new Date("2024-02-05T10:00:00.000Z");
      const result = getDateHash(specificDate);
      expect(result).toBe(20240205);
    });
  });
});
