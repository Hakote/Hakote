import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock rateLimit to control 429 path
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: {
    check: vi.fn().mockReturnValue(true),
  },
}));

// In-memory Supabase mock for subscribe route
vi.mock("@/lib/supabase", () => {
  type Row = Record<string, any>;
  type TableName =
    | "problem_lists"
    | "subscribers"
    | "subscriptions"
    | "subscription_progress";

  interface Db {
    problem_lists: Row[];
    subscribers: Row[];
    subscriptions: Row[];
    subscription_progress: Row[];
  }

  const getDb = (): Db => (globalThis as any).__apiDb;
  const setDb = (db: Db) => ((globalThis as any).__apiDb = db);

  const applyFilters = (rows: Row[], filters: Record<string, any>) => {
    return rows.filter((r) =>
      Object.entries(filters).every(([k, v]) => r[k] === v)
    );
  };

  const upsertInto = (table: TableName, data: Row, onConflict?: string) => {
    const db = getDb();
    const target = db[table];
    if (!onConflict) {
      target.push({ ...data });
      return data;
    }
    const keys = onConflict.split(/\s*,\s*/);
    const idx = target.findIndex((r) => keys.every((k) => r[k] === data[k]));
    if (idx >= 0) {
      target[idx] = { ...target[idx], ...data };
      return target[idx];
    }
    target.push({ ...data });
    return data;
  };

  const makeQuery = (table: TableName) => {
    const state: {
      filters: Record<string, any>;
      single: boolean;
      onConflict?: string;
    } = {
      filters: {},
      single: false,
    };

    const thenable: any = {
      select: () => thenable,
      eq: (col: string, val: any) => {
        state.filters[col] = val;
        return thenable;
      },
      single: () => {
        state.single = true;
        return thenable;
      },
      upsert: (
        data: Row,
        opts?: { onConflict?: string; ignoreDuplicates?: boolean }
      ) => {
        state.onConflict = opts?.onConflict;
        const saved = upsertInto(table, data, state.onConflict as any);
        return {
          select: () => ({
            single: () => Promise.resolve({ data: saved, error: null }),
          }),
        };
      },
      update: (data: Row) => ({
        eq: (col: string, val: any) => {
          const db = getDb();
          const rows = applyFilters(db[table], { [col]: val });
          rows.forEach((r) => Object.assign(r, data));
          return {
            select: () => ({
              single: () =>
                Promise.resolve({ data: rows[0] ?? null, error: null }),
            }),
            single: () =>
              Promise.resolve({ data: rows[0] ?? null, error: null }),
          };
        },
      }),
      then: (resolve: (v: any) => void) => {
        const db = getDb();
        const rows = applyFilters(db[table], state.filters);
        resolve({ data: state.single ? rows[0] ?? null : rows, error: null });
      },
    };
    return thenable;
  };

  return {
    supabaseAdmin: {
      from: (name: TableName) => makeQuery(name),
    },
    __setApiDb: setDb,
  };
});

describe("POST /api/subscribe - 통합 테스트(모킹)", () => {
  let originalEnv: NodeJS.ProcessEnv;
  beforeEach(() => {
    originalEnv = { ...process.env };
  });
  beforeEach(async () => {
    // 기본: rate limit 통과
    const rate = await import("@/lib/rateLimit");
    (rate.rateLimit.check as any).mockReturnValue(true);

    const mod: any = await import("@/lib/supabase");
    mod.__setApiDb({
      problem_lists: [{ id: "pl1", name: "기본", is_active: true }],
      subscribers: [],
      subscriptions: [],
      subscription_progress: [],
    });
  });
  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("유효 입력 시 200과 함께 subscriber/subscription/progress 생성", async () => {
    const { POST } = await import("@/app/api/subscribe/route");
    const req = new Request("http://localhost/api/subscribe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "1.1.1.1",
      },
      body: JSON.stringify({
        email: "a@a.com",
        frequency: "3x",
        consent: true,
        problem_list_name: "기본",
      }),
    }) as any;

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("문제 리스트 누락 시 400", async () => {
    const { POST } = await import("@/app/api/subscribe/route");
    const req = new Request("http://localhost/api/subscribe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "2.2.2.2",
      },
      body: JSON.stringify({
        email: "a@a.com",
        frequency: "3x",
        consent: true,
      }),
    }) as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("알 수 없는 문제 리스트면 400", async () => {
    const mod = await import("@/lib/supabase");
    (mod as any).__setApiDb({
      problem_lists: [],
      subscribers: [],
      subscriptions: [],
      subscription_progress: [],
    });

    const { POST } = await import("@/app/api/subscribe/route");
    const req = new Request("http://localhost/api/subscribe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "3.3.3.3",
      },
      body: JSON.stringify({
        email: "a@a.com",
        frequency: "3x",
        consent: true,
        problem_list_name: "기본",
      }),
    }) as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rate limit 초과 시 429", async () => {
    const rate = await import("@/lib/rateLimit");
    (rate.rateLimit.check as any).mockReturnValue(false);

    const { POST } = await import("@/app/api/subscribe/route");
    const req = new Request("http://localhost/api/subscribe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "1.1.1.1",
      },
      body: JSON.stringify({
        email: "a@a.com",
        frequency: "3x",
        consent: true,
        problem_list_name: "기본",
      }),
    }) as any;
    const res = await POST(req);
    expect(res.status).toBe(429);
  });

  it("중복 구독 요청은 200 유지(멱등), 레코드 중복 생성 없음", async () => {
    const mod: any = await import("@/lib/supabase");
    mod.__setApiDb({
      problem_lists: [{ id: "pl1", name: "기본", is_active: true }],
      subscribers: [],
      subscriptions: [],
      subscription_progress: [],
    });

    const { POST } = await import("@/app/api/subscribe/route");
    const makeReq = () =>
      new Request("http://localhost/api/subscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "4.4.4.4",
        },
        body: JSON.stringify({
          email: "dup@a.com",
          frequency: "3x",
          consent: true,
          problem_list_name: "기본",
        }),
      }) as any;

    const r1 = await POST(makeReq());
    const r2 = await POST(makeReq());
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    const db = (globalThis as any).__apiDb;
    expect(db.subscribers.length).toBe(1);
    expect(db.subscriptions.length).toBe(1);
    expect(db.subscription_progress.length).toBe(1);
  });

  it("XSS 유사 입력(problem_list_name) 400", async () => {
    const { POST } = await import("@/app/api/subscribe/route");
    const req = new Request("http://localhost/api/subscribe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "5.5.5.5",
      },
      body: JSON.stringify({
        email: "safe@a.com",
        frequency: "3x",
        consent: true,
        problem_list_name: "<script>alert(1)</script>",
      }),
    }) as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
