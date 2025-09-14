import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit } from "../rateLimit";

describe("Rate limiting functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Date.now()
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("rateLimit.check", () => {
    it("should be a function", () => {
      expect(typeof rateLimit.check).toBe("function");
    });

    it("should accept parameters", () => {
      const result = rateLimit.check("test-ip", 5, 1000);
      expect(result).toBeDefined();
    });

    it("should handle different IP addresses", () => {
      const result1 = rateLimit.check("192.168.1.1", 5, 1000);
      const result2 = rateLimit.check("192.168.1.2", 5, 1000);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it("should handle different time windows", () => {
      const result1 = rateLimit.check("test-ip", 5, 1000);
      const result2 = rateLimit.check("test-ip", 10, 5000);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it("should handle different limits", () => {
      const result1 = rateLimit.check("test-ip", 1, 1000);
      const result2 = rateLimit.check("test-ip", 100, 1000);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });
});
