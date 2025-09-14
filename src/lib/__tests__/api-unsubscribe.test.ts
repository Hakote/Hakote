import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// In-memory Supabase mock for unsubscribe route
vi.mock("@/lib/supabase", () => {
  type Row = Record<string, any>;
  type TableName = "subscriptions" | "subscribers";

  interface Db {
    subscriptions: Row[];
    subscribers: Row[];
  }

  const getDb = (): Db => (globalThis as any).__unsubDb;
  const setDb = (db: Db) => ((globalThis as any).__unsubDb = db);

  const applyFilters = (rows: Row[], filters: Record<string, any>) => {
    return rows.filter((r) =>
      Object.entries(filters).every(([k, v]) => r[k] === v)
    );
  };

  const makeQuery = (table: TableName) => {
    const state: {
      filters: Record<string, any>;
      single: boolean;
      updateData?: Row;
    } = {
      filters: {},
      single: false,
    };

    const thenable: any = {
      select: (_?: string) => thenable,
      eq: (col: string, val: any) => {
        state.filters[col] = val;
        return thenable;
      },
      single: () => {
        state.single = true;
        return thenable;
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
    __setUnsubDb: setDb,
  };
});

describe("GET /api/unsubscribe - 통합 테스트(모킹)", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    const mod: any = await import("@/lib/supabase");
    mod.__setUnsubDb({
      subscribers: [
        {
          id: "user1",
          email: "u1@example.com",
          unsubscribe_token: "tok-u1",
          is_active: true,
        },
      ],
      subscriptions: [
        {
          id: "sub1",
          is_active: true,
          subscriber: {
            id: "user1",
            email: "u1@example.com",
            unsubscribe_token: "tok-u1",
          },
          problem_list: { id: "pl1", name: "리스트1" },
        },
      ],
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("subscription_id로 해지 성공시 200 반환 및 메시지 포함", async () => {
    const { GET } = await import("@/app/api/unsubscribe/route");
    const req = new Request(
      "http://localhost/api/unsubscribe?subscription_id=sub1",
      { method: "GET" }
    ) as any;
    const res = await GET(req);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain("구독 해지 완료");
    expect(html).toContain("리스트1");
  });

  it("존재하지 않는 subscription_id면 404", async () => {
    const { GET } = await import("@/app/api/unsubscribe/route");
    const req = new Request(
      "http://localhost/api/unsubscribe?subscription_id=unknown",
      { method: "GET" }
    ) as any;
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("token으로 해지 시 200, 모든 구독 비활성화 시도", async () => {
    const { GET } = await import("@/app/api/unsubscribe/route");
    const req = new Request("http://localhost/api/unsubscribe?token=tok-u1", {
      method: "GET",
    }) as any;
    const res = await GET(req);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain("구독 해지 완료");
  });

  it("파라미터 없으면 400", async () => {
    const { GET } = await import("@/app/api/unsubscribe/route");
    const req = new Request("http://localhost/api/unsubscribe", {
      method: "GET",
    }) as any;
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
