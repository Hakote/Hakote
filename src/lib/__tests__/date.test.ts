import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  nowKST, 
  todayKSTDateOnly, 
  isWeekdayKST, 
  yyyyMmDdKST, 
  getDateHash 
} from '../date';

describe('Date utilities', () => {
  beforeEach(() => {
    // Mock Date to return a fixed date (Monday, January 15, 2024)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('nowKST', () => {
    it('should return current time in KST', () => {
      const result = nowKST();
      expect(result).toBeInstanceOf(Date);
      // KST is UTC+9, so 10:00 UTC should be 19:00 KST
      expect(result.getHours()).toBe(19);
    });
  });

  describe('todayKSTDateOnly', () => {
    it('should return today\'s date only in KST', () => {
      const result = todayKSTDateOnly();
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
    });
  });

  describe('isWeekdayKST', () => {
    it('should return true for weekdays', () => {
      // Monday
      vi.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
      expect(isWeekdayKST()).toBe(true);

      // Tuesday
      vi.setSystemTime(new Date('2024-01-16T10:00:00.000Z'));
      expect(isWeekdayKST()).toBe(true);

      // Wednesday
      vi.setSystemTime(new Date('2024-01-17T10:00:00.000Z'));
      expect(isWeekdayKST()).toBe(true);

      // Thursday
      vi.setSystemTime(new Date('2024-01-18T10:00:00.000Z'));
      expect(isWeekdayKST()).toBe(true);

      // Friday
      vi.setSystemTime(new Date('2024-01-19T10:00:00.000Z'));
      expect(isWeekdayKST()).toBe(true);
    });

    it('should return false for weekends', () => {
      // Saturday
      vi.setSystemTime(new Date('2024-01-20T10:00:00.000Z'));
      expect(isWeekdayKST()).toBe(false);

      // Sunday
      vi.setSystemTime(new Date('2024-01-21T10:00:00.000Z'));
      expect(isWeekdayKST()).toBe(false);
    });
  });

  describe('yyyyMmDdKST', () => {
    it('should return formatted date string', () => {
      const result = yyyyMmDdKST();
      expect(result).toBe('2024-01-15');
    });

    it('should handle single digit month and day', () => {
      // February 5th
      vi.setSystemTime(new Date('2024-02-05T10:00:00.000Z'));
      const result = yyyyMmDdKST();
      expect(result).toBe('2024-02-05');
    });
  });

  describe('getDateHash', () => {
    it('should return date hash for current date', () => {
      const result = getDateHash();
      expect(result).toBe(20240115);
    });

    it('should return date hash for specific date', () => {
      const specificDate = new Date('2024-12-25T10:00:00.000Z');
      const result = getDateHash(specificDate);
      expect(result).toBe(20241225);
    });

    it('should handle single digit month and day', () => {
      const specificDate = new Date('2024-02-05T10:00:00.000Z');
      const result = getDateHash(specificDate);
      expect(result).toBe(20240205);
    });
  });
});
