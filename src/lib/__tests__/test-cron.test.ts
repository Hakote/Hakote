import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock cron core to avoid importing heavy deps (like supabase) transitively
vi.mock("@/lib/cron/core", () => ({
  executeCronCore: vi.fn(),
}));

// Mock logger to avoid console noise and ensure handler construction
vi.mock("@/lib/cron/loggers", () => ({
  TestLogger: vi.fn().mockImplementation(() => ({
    test: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

describe("Test Cron API - minimal passing tests", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("GET /api/test-cron", () => {
    it("should return success response with correct structure", async () => {
      const { GET } = await import("@/app/api/test-cron/route");

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        ok: true,
        message:
          "Test cron endpoint is working. Use POST method for test execution.",
        timestamp: expect.any(String),
      });
    });
  });

  describe("POST /api/test-cron", () => {
    it("should reject requests in production environment", async () => {
      // NODE_ENV는 읽기 전용이므로, 테스트에서는 임시 변수로 분기 유도
      const original = process.env.NODE_ENV;
      Object.defineProperty(process.env, "NODE_ENV", { value: "production" });
      const { POST } = await import("@/app/api/test-cron/route");

      const request = new NextRequest("http://localhost:3000/api/test-cron", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        ok: false,
        error: "Test endpoint only available in development",
      });
      // 복원
      Object.defineProperty(process.env, "NODE_ENV", { value: original });
    });
  });
});
