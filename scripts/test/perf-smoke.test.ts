import { describe, it, expect, vi } from "vitest";

// Mock sendMail to avoid real email
vi.mock("@/lib/sendMail", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  sendTestEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Supabase mock with large dataset
vi.mock("@/lib/supabase", () => {
  type Row = Record<string, any>;
  const db = {
    subscriptions: [] as Row[],
    problems: [] as Row[],
    subscription_progress: [] as Row[],
    deliveries: [] as Row[],
  };

  for (let i = 0; i < 200; i++) {
    db.subscriptions.push({
      id: `sub-${i}`,
      subscriber_id: `u-${i}`,
      problem_list_id: i % 2 === 0 ? "plA" : "plB",
      frequency: "5x",
      is_active: true,
      subscriber: {
        id: `u-${i}`,
        email: `user${i}@example.com`,
        frequency: "5x",
        unsubscribe_token: `t-${i}`,
        created_at: new Date().toISOString(),
        is_active: true,
      },
      problem_list: {
        id: i % 2 === 0 ? "plA" : "plB",
        name: i % 2 === 0 ? "리스트A" : "리스트B",
      },
    });
  }
  for (let i = 0; i < 50; i++) {
    db.problems.push({
      id: `pA-${i}`,
      title: `A-${i}`,
      url: "https://example.com/a",
      difficulty: "Easy",
      problem_list_id: "plA",
      active: true,
    });
    db.problems.push({
      id: `pB-${i}`,
      title: `B-${i}`,
      url: "https://example.com/b",
      difficulty: "Easy",
      problem_list_id: "plB",
      active: true,
    });
  }

  const getByPath = (obj: Row, path: string) =>
    path.split(".").reduce<any>((acc, k) => (acc ? acc[k] : undefined), obj);
  const applyIn = (rows: Row[], key: string, values: any[]) =>
    rows.filter((r) => values.includes(getByPath(r, key)));
  const applyEq = (rows: Row[], key: string, val: any) =>
    rows.filter((r) => getByPath(r, key) === val);

  const makeQuery = (table: keyof typeof db) => {
    const state: any = { filters: [], single: false, orders: [] };
    const thenable: any = {
      select: () => thenable,
      in: (col: string, values: any[]) => {
        state.filters.push({ type: "in", col, values });
        return thenable;
      },
      eq: (col: string, val: any) => {
        state.filters.push({ type: "eq", col, val });
        return thenable;
      },
      order: () => thenable,
      single: () => {
        state.single = true;
        return thenable;
      },
      insert: () => Promise.resolve({ error: null }),
      update: () => ({
        eq: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }),
      then: (resolve: (v: any) => void) => {
        let rows = [...(db as any)[table]] as Row[];
        for (const f of state.filters) {
          rows =
            f.type === "in"
              ? applyIn(rows, f.col, f.values)
              : applyEq(rows, f.col, f.val);
        }
        resolve({ data: state.single ? rows[0] ?? null : rows, error: null });
      },
    };
    return thenable;
  };

  return {
    supabaseAdmin: {
      from: (name: keyof typeof db) => makeQuery(name),
    },
  };
});

import { executeCronCore } from "@/lib/cron/core";
import { TestLogger } from "@/lib/cron/loggers";

describe("성능 스모크 - 200건 테스트 모드 처리", () => {
  it("요약 값과 총 시간 기준을 만족", async () => {
    process.env.TEST_DATE = "2024-01-15"; // 화~토 아닌 평일
    // 테스트에서는 배치 지연 제거
    process.env.CRON_BATCH_DELAY_MS = "0";
    const logger = new TestLogger();

    vi.useFakeTimers();
    const start = Date.now();
    const pending = executeCronCore({ isTestMode: true, logger });
    await vi.runAllTimersAsync();
    const result = await pending;
    vi.useRealTimers();
    const ms = Date.now() - start;

    expect(result.ok).toBe(true);
    expect(result.summary.totalSubscribers).toBe(200);
    expect(result.summary.failureCount).toBe(0);
    expect(result.summary.successCount).toBe(200);
    // 간단한 시간 상한(환경에 따라 조정 가능)
    expect(ms).toBeLessThan(60000);
  }, 70000);
});
