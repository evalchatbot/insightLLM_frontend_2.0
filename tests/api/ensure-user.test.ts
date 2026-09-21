import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerClerk, serverState } from "../helpers/clerk";
import { makeRequest, readJson } from "../helpers/request";
import { supabaseMock as sb } from "../helpers/supabase-mock";

vi.mock("@clerk/nextjs/server", async () => (await import("../helpers/clerk")).clerkServerModule);
vi.mock("@supabase/supabase-js", async () => (await import("../helpers/supabase-mock")).supabaseModule);

const { POST } = await import("@/app/api/ensure-user/route");
const call = async () => readJson(await POST(makeRequest("/api/ensure-user", { method: "POST" })));

beforeEach(() => {
  sb.reset();
  resetServerClerk();
  serverState.userId = "user_clerk_1";
});

/** users lookups return `found` in order; inserts return `insert`. */
function usersTable(found: Array<any>, insert: { data?: any; error?: any } = { data: { id: "auth-1" } }) {
  let lookups = 0;
  sb.onQuery((q) => {
    if (q.op() === "insert") return insert;
    const next = found[Math.min(lookups, found.length - 1)];
    lookups++;
    return { data: next };
  });
}

describe("POST /api/ensure-user", () => {
  it("returns 401 when signed out", async () => {
    serverState.userId = null;
    await expect(call()).resolves.toEqual({ status: 401, body: { ok: false, error: "Unauthorized" } });
  });

  it("returns 400 when Clerk has no email (or cannot be reached)", async () => {
    serverState.email = null;
    await expect(call()).resolves.toEqual({ status: 400, body: { ok: false, error: "No email on user" } });
    serverState.email = "x@example.com";
    serverState.getUserError = new Error("clerk down");
    await expect(call()).resolves.toMatchObject({ status: 400 });
  });

  it("is idempotent: an existing row is returned without creating anything", async () => {
    usersTable([{ id: "sup-existing" }]);
    await expect(call()).resolves.toEqual({ status: 200, body: { ok: true, id: "sup-existing", created: false } });
    expect(sb.admin.createUser).not.toHaveBeenCalled();
  });

  it("creates the auth user and the public.users row for a new account", async () => {
    usersTable([null], { data: { id: "auth-new" } });
    sb.admin.createUser.mockResolvedValue({ data: { user: { id: "auth-new" } }, error: null });
    await expect(call()).resolves.toEqual({ status: 200, body: { ok: true, id: "auth-new", created: true } });
    expect(sb.admin.createUser).toHaveBeenCalledWith({ email: "student@example.com", email_confirm: true });
    const insert = sb.queries.find((q) => q.op() === "insert")!;
    expect(insert.arg("insert")).toEqual({ id: "auth-new", email: "student@example.com" });
  });

  it("reuses an existing auth user when createUser says it already exists", async () => {
    usersTable([null], { data: { id: "auth-old" } });
    sb.admin.createUser.mockResolvedValue({ data: null, error: { message: "User already registered", status: 422 } });
    sb.admin.listUsers.mockResolvedValue({
      data: { users: [{ id: "someone-else", email: "other@example.com" }, { id: "auth-old", email: "student@example.com" }] },
      error: null,
    });
    await expect(call()).resolves.toEqual({ status: 200, body: { ok: true, id: "auth-old", created: true } });
  });

  it("handles an insert race (unique violation) by re-reading the row", async () => {
    usersTable([null, { id: "raced-row" }], { error: { code: "23505", message: "duplicate key" } });
    sb.admin.createUser.mockResolvedValue({ data: { user: { id: "auth-new" } }, error: null });
    await expect(call()).resolves.toEqual({ status: 200, body: { ok: true, id: "raced-row", created: false } });
  });

  it("returns 500 when the insert fails for another reason", async () => {
    usersTable([null], { error: { code: "42501", message: "permission denied" } });
    sb.admin.createUser.mockResolvedValue({ data: { user: { id: "auth-new" } }, error: null });
    await expect(call()).resolves.toEqual({ status: 500, body: { ok: false, error: "DB insert failed" } });
  });

  it("returns 500 when no auth user can be ensured and no row appeared meanwhile", async () => {
    usersTable([null, null]);
    sb.admin.createUser.mockRejectedValue(new Error("admin api down"));
    await expect(call()).resolves.toEqual({ status: 500, body: { ok: false, error: "Cannot ensure auth user for FK" } });
  });

  it("returns the row created concurrently when the auth user cannot be ensured", async () => {
    usersTable([null, { id: "late-row" }]);
    sb.admin.createUser.mockResolvedValue({ data: null, error: { message: "unexpected failure" } });
    await expect(call()).resolves.toEqual({ status: 200, body: { ok: true, id: "late-row", created: false } });
  });
});
