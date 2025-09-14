import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock sendMail first to avoid any real email attempts
vi.mock("@/lib/sendMail", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  sendTestEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Supabase mock uses a global store so each test can set its own data set
vi.mock("@/lib/supabase", () => {
  type Subscription = {
    id: string;
    subscriber_id: string;
    problem_list_id: string;
    frequency: string;
    is_active: boolean;
    resubscribe_count?: number;
    last_resubscribed_at?: string | null;
    last_unsubscribed_at?: string | null;
    subscriber: {
      id: string;
      email: string;
      frequency: string;
      unsubscribe_token: string;
      created_at: string;
      is_active?: boolean;
    };
    problem_list: { id: string; name: string };
  };

  type Problem = {
    id: string;
    title: string;
    url: string;
    difficulty: string;
    week?: string;
    problem_list_id: string;
    active?: boolean;
  };

  type Progress = {
    id: string;
    subscription_id: string;
    current_problem_index: number;
    total_problems_sent: number;
  };

  type Delivery = {
    id: string;
    subscription_id: string;
    status: string;
    send_date?: string;
  };

  interface MockDb {
    subscriptions: Subscription[];
    problems: Problem[];
    progress: Progress[];
    deliveries: Delivery[];
  }

  const getDb = (): MockDb =>
    (globalThis as unknown as { __mockDb: MockDb }).__mockDb;

  const getByPath = (obj: Record<string, unknown>, path: string): unknown => {
    return path.split(".").reduce<unknown>((acc, part) => {
      if (acc && typeof acc === "object") {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  };

  const applyFilters = <T extends Record<string, unknown>>(
    data: T[],
    filters: Record<string, unknown>
  ): T[] => {
    let result = data;
    for (const [key, value] of Object.entries(filters)) {
      if (key.startsWith("in:")) {
        const col = key.slice(3);
        const values = value as unknown[];
        result = result.filter((row) => values.includes(getByPath(row, col)));
      } else {
        result = result.filter((row) => getByPath(row, key) === value);
      }
    }
    return result;
  };

  const makeQuery = (table: keyof MockDb) => {
    const state: {
      filters: Record<string, unknown>;
      single: boolean;
      orders: { column: string; ascending: boolean }[];
    } = { filters: {}, single: false, orders: [] };

    type Thenable = {
      select: () => Thenable;
      eq: (column: string, value: unknown) => Thenable;
      in: (column: string, values: unknown[]) => Thenable;
      order: (column: string, opts?: { ascending?: boolean }) => Thenable;
      single: () => Thenable;
      insert: () => Promise<{ error: null }>; // simplified
      update: () => { eq: () => { eq: () => Promise<{ error: null }> } };
      then: (resolve: (v: unknown) => void) => void;
    };

    const thenable: Thenable = {
      select: () => thenable,
      eq: (column: string, value: unknown) => {
        state.filters[column] = value;
        return thenable;
      },
      in: (column: string, values: unknown[]) => {
        state.filters[`in:${column}`] = values;
        return thenable;
      },
      order: (column: string, opts?: { ascending?: boolean }) => {
        state.orders.push({ column, ascending: opts?.ascending ?? true });
        return thenable;
      },
      single: () => {
        state.single = true;
        return thenable;
      },
      insert: () => Promise.resolve({ error: null }),
      update: () => ({
        eq: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }),
      then: (resolve: (v: unknown) => void) => {
        const db = getDb();
        // Clone to avoid mutation
        let data = [...(db[table] as unknown[])] as Record<string, unknown>[];
        data = applyFilters(data, state.filters);
        // naive order: no-op for now, as tests don't depend on exact order
        const result = state.single
          ? { data: (data[0] as unknown) ?? null, error: null }
          : { data: data as unknown, error: null };
        resolve(result);
      },
    };

    return thenable;
  };

  return {
    supabaseAdmin: {
      from: (table: string) => {
        switch (table) {
          case "subscriptions":
            return makeQuery("subscriptions");
          case "problems":
            return makeQuery("problems");
          case "subscription_progress":
            return makeQuery("progress");
          case "deliveries":
            return makeQuery("deliveries");
          default:
            return makeQuery("problems");
        }
      },
    },
  };
});

import { executeCronCore, type Logger } from "@/lib/cron/core";

const mockLogger: Logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  test: vi.fn(),
};

const setMockDb = (db: unknown) => {
  (globalThis as unknown as { __mockDb: unknown }).__mockDb = db;
};

describe("executeCronCore - 핵심 로직", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
    setMockDb({
      subscriptions: [],
      problems: [],
      progress: [],
      deliveries: [],
    });
    process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
    process.env.TEST_DATE = process.env.TEST_DATE || "2025-09-14";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("주말에는 미발송하고 0 카운트로 종료", async () => {
    process.env.TEST_DATE = "2024-01-20"; // 토요일

    setMockDb({
      subscriptions: [],
      problems: [],
      progress: [],
      deliveries: [],
    });

    const result = await executeCronCore({
      isTestMode: true,
      logger: mockLogger,
    });

    expect(result.ok).toBe(true);
    expect(result.summary.isTestMode).toBe(true);
    expect(result.summary.totalSubscribers).toBe(0);
    expect(result.summary.successCount).toBe(0);
    expect(result.summary.failureCount).toBe(0);
    expect(result.summary.newlySentCount).toBe(0);
    expect(result.summary.alreadySentCount).toBe(0);
  });

  it("평일 필터링 및 테스트메일 전송 집계", async () => {
    process.env.TEST_DATE = "2024-01-15"; // 월요일

    setMockDb({
      subscriptions: [
        {
          id: "sub-3x",
          subscriber_id: "u1",
          problem_list_id: "pl1",
          frequency: "3x",
          is_active: true,
          subscriber: {
            id: "u1",
            email: "u1@example.com",
            frequency: "3x",
            unsubscribe_token: "t1",
            created_at: new Date().toISOString(),
            is_active: true,
          },
          problem_list: { id: "pl1", name: "리스트1" },
        },
        {
          id: "sub-5x",
          subscriber_id: "u2",
          problem_list_id: "pl2",
          frequency: "5x",
          is_active: true,
          subscriber: {
            id: "u2",
            email: "u2@example.com",
            frequency: "5x",
            unsubscribe_token: "t2",
            created_at: new Date().toISOString(),
            is_active: true,
          },
          problem_list: { id: "pl2", name: "리스트2" },
        },
        {
          id: "sub-2x",
          subscriber_id: "u3",
          problem_list_id: "pl3",
          frequency: "2x",
          is_active: true,
          subscriber: {
            id: "u3",
            email: "u3@example.com",
            frequency: "2x",
            unsubscribe_token: "t3",
            created_at: new Date().toISOString(),
            is_active: true,
          },
          problem_list: { id: "pl3", name: "리스트3" },
        },
      ],
      problems: [
        {
          id: "p1",
          title: "문제1",
          url: "https://example.com/1",
          difficulty: "Easy",
          problem_list_id: "pl1",
          active: true,
        },
        {
          id: "p2",
          title: "문제2",
          url: "https://example.com/2",
          difficulty: "Medium",
          problem_list_id: "pl2",
          active: true,
        },
      ],
      progress: [
        {
          id: "pr1",
          subscription_id: "sub-3x",
          current_problem_index: 0,
          total_problems_sent: 0,
        },
      ],
      deliveries: [],
    });

    const result = await executeCronCore({
      isTestMode: true,
      logger: mockLogger,
    });

    // 월요일에는 3x, 5x만 대상 → 총 2개
    expect(result.ok).toBe(true);
    expect(result.summary.totalSubscribers).toBe(2);
    expect(result.summary.successCount).toBe(2);
    expect(result.summary.failureCount).toBe(0);
    expect(result.summary.newlySentCount).toBe(2);
    expect(result.summary.alreadySentCount).toBe(0);

    // 테스트 메일이 2건 전송되었는지 검증
    const { sendTestEmail } = await import("@/lib/sendMail");
    expect(sendTestEmail).toHaveBeenCalledTimes(2);
  });

  it("문제 데이터가 없으면 에러 발생", async () => {
    process.env.TEST_DATE = "2024-01-15"; // 평일

    setMockDb({
      subscriptions: [
        {
          id: "sub-3x",
          subscriber_id: "u1",
          problem_list_id: "pl1",
          frequency: "3x",
          is_active: true,
          subscriber: {
            id: "u1",
            email: "u1@example.com",
            frequency: "3x",
            unsubscribe_token: "t1",
            created_at: new Date().toISOString(),
            is_active: true,
          },
          problem_list: { id: "pl1", name: "리스트1" },
        },
      ],
      problems: [], // 빈 문제 목록 → 에러
      progress: [],
      deliveries: [],
    });

    await expect(
      executeCronCore({ isTestMode: true, logger: mockLogger })
    ).rejects.toBeTruthy();
  });

  it("alreadySent 처리: 기존 delivery가 sent면 중복 전송 없이 집계", async () => {
    process.env.TEST_DATE = "2024-01-15"; // 월요일

    setMockDb({
      subscriptions: [
        {
          id: "sub-dup",
          subscriber_id: "u1",
          problem_list_id: "pl1",
          frequency: "3x",
          is_active: true,
          subscriber: {
            id: "u1",
            email: "u1@example.com",
            frequency: "3x",
            unsubscribe_token: "t1",
            created_at: new Date().toISOString(),
            is_active: true,
          },
          problem_list: { id: "pl1", name: "리스트1" },
        },
      ],
      problems: [
        {
          id: "p1",
          title: "문제1",
          url: "https://example.com/1",
          difficulty: "Easy",
          problem_list_id: "pl1",
          active: true,
        },
      ],
      progress: [
        {
          id: "pr1",
          subscription_id: "sub-dup",
          current_problem_index: 0,
          total_problems_sent: 0,
        },
      ],
      deliveries: [
        {
          id: "d1",
          subscription_id: "sub-dup",
          status: "sent",
          send_date: "2024-01-15",
        },
      ],
    });

    const result = await executeCronCore({
      isTestMode: false,
      logger: mockLogger,
    });

    expect(result.ok).toBe(true);
    expect(result.summary.totalSubscribers).toBe(1);
    expect(result.summary.successCount).toBe(1);
    expect(result.summary.alreadySentCount).toBe(1);
    expect(result.summary.newlySentCount).toBe(0);

    const { sendEmail, sendTestEmail } = await import("@/lib/sendMail");
    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendTestEmail).not.toHaveBeenCalled();
  });

  it("문제 리스트 비어 있으면 해당 구독 실패로 집계", async () => {
    process.env.TEST_DATE = "2024-01-15"; // 월요일

    setMockDb({
      subscriptions: [
        {
          id: "sub-no-prob",
          subscriber_id: "u1",
          problem_list_id: "plX",
          frequency: "3x",
          is_active: true,
          subscriber: {
            id: "u1",
            email: "u1@example.com",
            frequency: "3x",
            unsubscribe_token: "t1",
            created_at: new Date().toISOString(),
            is_active: true,
          },
          problem_list: { id: "plX", name: "빈리스트" },
        },
      ],
      problems: [
        {
          id: "p1",
          title: "문제1",
          url: "https://example.com/1",
          difficulty: "Easy",
          problem_list_id: "pl1",
          active: true,
        },
      ],
      progress: [],
      deliveries: [],
    });

    const result = await executeCronCore({
      isTestMode: true,
      logger: mockLogger,
    });

    expect(result.ok).toBe(true);
    expect(result.summary.totalSubscribers).toBe(1);
    expect(result.summary.successCount).toBe(0);
    expect(result.summary.failureCount).toBe(1);
  });

  it("알 수 없는 빈도는 경고 로그 후 제외", async () => {
    process.env.TEST_DATE = "2024-01-15"; // 월요일

    setMockDb({
      subscriptions: [
        {
          id: "sub-unknown",
          subscriber_id: "u1",
          problem_list_id: "pl1",
          frequency: "X",
          is_active: true,
          subscriber: {
            id: "u1",
            email: "u1@example.com",
            frequency: "X",
            unsubscribe_token: "t1",
            created_at: new Date().toISOString(),
            is_active: true,
          },
          problem_list: { id: "pl1", name: "리스트1" },
        },
      ],
      problems: [
        {
          id: "p1",
          title: "문제1",
          url: "https://example.com/1",
          difficulty: "Easy",
          problem_list_id: "pl1",
          active: true,
        },
      ],
      progress: [],
      deliveries: [],
    });

    const warnSpy = vi.spyOn(mockLogger, "warn");
    const result = await executeCronCore({
      isTestMode: true,
      logger: mockLogger,
    });

    expect(result.ok).toBe(true);
    expect(result.summary.totalSubscribers).toBe(0);
    expect(warnSpy).toHaveBeenCalled();
  });
});
