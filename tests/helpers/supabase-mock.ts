import { vi } from "vitest";

/**
 * Minimal, chainable stand-in for a `@supabase/supabase-js` client.
 *
 * Every query (`from(table)...`) records the builder calls it received and is
 * resolved by `queryHandler`, which tests configure per case. RPCs go through
 * `rpcHandler`. Nothing here touches the network.
 */
export type QueryResult = { data?: any; error?: any; count?: number | null };

export type RecordedQuery = {
  table: string;
  calls: Array<{ method: string; args: any[] }>;
  /** Terminal method that resolved the query: "single" | "maybeSingle" | "then". */
  terminal?: string;
  /** Convenience: first argument of the first call to `method`, if any. */
  arg(method: string, index?: number): any;
  /** True when a call to `method` was made with the given leading args. */
  has(method: string, ...args: any[]): boolean;
  /** Name of the mutating operation, if any (insert/upsert/update/delete). */
  op(): "select" | "insert" | "upsert" | "update" | "delete";
};

type QueryHandler = (query: RecordedQuery) => QueryResult | Promise<QueryResult>;
type RpcHandler = (name: string, args: any) => QueryResult | Promise<QueryResult>;

const CHAIN_METHODS = [
  "select",
  "insert",
  "upsert",
  "update",
  "delete",
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "is",
  "like",
  "ilike",
  "order",
  "limit",
  "range",
  "match",
  "filter",
];

function makeRecordedQuery(table: string): RecordedQuery {
  const calls: RecordedQuery["calls"] = [];
  return {
    table,
    calls,
    arg(method, index = 0) {
      const call = calls.find((c) => c.method === method);
      return call ? call.args[index] : undefined;
    },
    has(method, ...args) {
      return calls.some(
        (c) => c.method === method && args.every((a, i) => JSON.stringify(c.args[i]) === JSON.stringify(a))
      );
    },
    op() {
      for (const m of ["insert", "upsert", "update", "delete"] as const) {
        if (calls.some((c) => c.method === m)) return m;
      }
      return "select";
    },
  };
}

export function createSupabaseMock() {
  const queries: RecordedQuery[] = [];
  let queryHandler: QueryHandler = () => ({ data: null, error: null });
  let rpcHandler: RpcHandler = () => ({ data: null, error: null });

  const from = vi.fn((table: string) => {
    const recorded = makeRecordedQuery(table);
    queries.push(recorded);

    const resolve = (terminal: string) => {
      recorded.terminal = terminal;
      return Promise.resolve(queryHandler(recorded)).then((r) => ({
        data: r?.data ?? null,
        error: r?.error ?? null,
        count: r?.count ?? null,
      }));
    };

    const builder: any = {};
    for (const method of CHAIN_METHODS) {
      builder[method] = (...args: any[]) => {
        recorded.calls.push({ method, args });
        return builder;
      };
    }
    builder.single = () => resolve("single");
    builder.maybeSingle = () => resolve("maybeSingle");
    // Allow `await supabase.from(...).select(...)` without a terminal call.
    builder.then = (onFulfilled: any, onRejected: any) => resolve("then").then(onFulfilled, onRejected);
    return builder;
  });

  const rpc = vi.fn((name: string, args?: any) =>
    Promise.resolve(rpcHandler(name, args)).then((r) => ({ data: r?.data ?? null, error: r?.error ?? null }))
  );

  const admin = {
    createUser: vi.fn<(args: any) => Promise<QueryResult>>(async () => ({ data: { user: null }, error: null })),
    listUsers: vi.fn<(args: any) => Promise<QueryResult>>(async () => ({ data: { users: [] }, error: null })),
  };

  const client = { from, rpc, auth: { admin } };

  return {
    client,
    from,
    rpc,
    admin,
    queries,
    onQuery(handler: QueryHandler) {
      queryHandler = handler;
    },
    onRpc(handler: RpcHandler) {
      rpcHandler = handler;
    },
    /** Queries against one table, in call order. */
    queriesFor(table: string) {
      return queries.filter((q) => q.table === table);
    },
    reset() {
      queries.length = 0;
      queryHandler = () => ({ data: null, error: null });
      rpcHandler = () => ({ data: null, error: null });
      from.mockClear();
      rpc.mockClear();
      admin.createUser.mockReset();
      admin.createUser.mockImplementation(async () => ({ data: { user: null }, error: null }));
      admin.listUsers.mockReset();
      admin.listUsers.mockImplementation(async () => ({ data: { users: [] }, error: null }));
    },
  };
}

export type SupabaseMock = ReturnType<typeof createSupabaseMock>;

/**
 * File-wide singleton used with:
 *   vi.mock("@supabase/supabase-js", async () => (await import("../helpers/supabase-mock")).supabaseModule);
 *
 * Every createClient() call returns the same fake client, so routes that build
 * their client at module load still see per-test configuration. Stored on
 * globalThis so it survives vi.resetModules().
 */
const g = globalThis as unknown as { __supabaseTestMock?: SupabaseMock; __supabaseCreateClient?: ReturnType<typeof vi.fn> };
export const supabaseMock: SupabaseMock = (g.__supabaseTestMock ??= createSupabaseMock());
export const createClientSpy = (g.__supabaseCreateClient ??= vi.fn<(...args: any[]) => unknown>(() => supabaseMock.client));
export const supabaseModule = { createClient: createClientSpy };
