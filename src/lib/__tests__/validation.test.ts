import { describe, it, expect } from "vitest";
import { isValidEmail, validateSubscribeRequest } from "../validation";

describe("isValidEmail", () => {
  it("should return true for valid email addresses", () => {
    const validEmails = [
      "test@example.com",
      "user.name@domain.co.uk",
      "user+tag@example.org",
      "123@test.com",
    ];

    validEmails.forEach((email) => {
      expect(isValidEmail(email)).toBe(true);
    });
  });

  it("should return false for invalid email addresses", () => {
    const invalidEmails = [
      "invalid-email",
      "@example.com",
      "user@",
      "user@.com",
      "user..name@example.com",
      "",
      "   ",
      "user@example",
    ];

    invalidEmails.forEach((email) => {
      expect(isValidEmail(email)).toBe(false);
    });
  });
});

describe("validateSubscribeRequest", () => {
  it("should return valid for correct data", () => {
    const validData = {
      email: "test@example.com",
      frequency: "3x" as const,
      consent: true,
    };

    const result = validateSubscribeRequest(validData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid for missing email", () => {
    const invalidData = {
      email: "",
      frequency: "7x" as const,
      consent: true,
    };

    const result = validateSubscribeRequest(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("유효한 이메일 주소를 입력해주세요.");
  });

  it("should return invalid for invalid email format", () => {
    const invalidData = {
      email: "invalid-email",
      frequency: "7x" as const,
      consent: true,
    };

    const result = validateSubscribeRequest(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("유효한 이메일 주소를 입력해주세요.");
  });

  it("should return invalid for invalid frequency", () => {
    const invalidData = {
      email: "test@example.com",
      frequency: "daily" as string,
      consent: true,
    };

    const result = validateSubscribeRequest(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("구독 빈도를 선택해주세요.");
  });

  it("should return invalid for missing consent", () => {
    const invalidData = {
      email: "test@example.com",
      frequency: "7x" as const,
      consent: false,
    };

    const result = validateSubscribeRequest(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("개인정보 수집 및 이용에 동의해주세요.");
  });

  it("should return invalid for multiple errors", () => {
    const invalidData = {
      email: "invalid-email",
      frequency: "daily" as string,
      consent: false,
    };

    const result = validateSubscribeRequest(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(3);
    expect(result.errors).toContain("유효한 이메일 주소를 입력해주세요.");
    expect(result.errors).toContain("구독 빈도를 선택해주세요.");
    expect(result.errors).toContain("개인정보 수집 및 이용에 동의해주세요.");
  });
});
