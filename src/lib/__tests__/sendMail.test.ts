import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendTestEmail, sendEmail } from "../sendMail";

// Mock environment variables
vi.mock("process", () => ({
  env: {
    RESEND_API_KEY: "test-key",
    EMAIL_FROM: "test@example.com",
    NEXT_PUBLIC_BASE_URL: "http://localhost:3000",
  },
}));

describe("sendMail functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendTestEmail", () => {
    it("should simulate email sending with correct parameters", async () => {
      const params = {
        to: "test@example.com",
        subject: "테스트 제목",
        title: "테스트 문제",
        difficulty: "Easy",
        url: "https://example.com/problem",
        unsubscribeUrl: "http://localhost:3000/unsubscribe?token=test",
      };

      const result = await sendTestEmail(params);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe("test-email-id");
    });

    it("should handle different email parameters", async () => {
      const params = {
        to: "user@domain.co.uk",
        subject: "다른 제목",
        title: "다른 문제",
        difficulty: "Hard",
        url: "https://example.com/another",
        unsubscribeUrl: "http://localhost:3000/unsubscribe?token=another",
      };

      const result = await sendTestEmail(params);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe("test-email-id");
    });

    it("should handle special characters in parameters", async () => {
      const params = {
        to: "user+tag@example.com",
        subject: "특수문자: !@#$%^&*()",
        title: "한글 제목 테스트",
        difficulty: "Medium",
        url: "https://example.com/special?param=value",
        unsubscribeUrl:
          "http://localhost:3000/unsubscribe?token=special&type=test",
      };

      const result = await sendTestEmail(params);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe("test-email-id");
    });
  });

  describe("sendEmail", () => {
    it("should be a function", () => {
      expect(typeof sendEmail).toBe("function");
    });

    it("should accept email parameters", () => {
      const params = {
        to: "test@example.com",
        subject: "테스트",
        title: "테스트 문제",
        difficulty: "Easy",
        url: "https://example.com",
        unsubscribeUrl: "http://localhost:3000/unsubscribe",
      };

      // sendEmail이 함수인지 확인
      expect(() => sendEmail(params)).not.toThrow();
    });
  });
});
