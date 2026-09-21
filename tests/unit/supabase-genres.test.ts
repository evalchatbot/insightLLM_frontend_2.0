import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../helpers/supabase-mock";

const sb = vi.hoisted(() => ({ current: null as any }));
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn(() => sb.current.client) }));

type GenresModule = typeof import("@/utils/supabase-genres");
let mod: GenresModule;

beforeEach(async () => {
  sb.current = createSupabaseMock();
  vi.resetModules(); // the module caches genres in module scope
  mod = await import("@/utils/supabase-genres");
});

describe("fetchGenres", () => {
  it("returns the enum values from get_genre_enum_values and caches them", async () => {
    sb.current.onRpc(() => ({ data: ["History", "Economy"] }));
    await expect(mod.fetchGenres()).resolves.toEqual(["History", "Economy"]);
    await expect(mod.fetchGenres()).resolves.toEqual(["History", "Economy"]);
    expect(sb.current.rpc).toHaveBeenCalledTimes(1);
  });

  it("wraps a scalar result in an array", async () => {
    sb.current.onRpc(() => ({ data: "History" }));
    await expect(mod.fetchGenres()).resolves.toEqual(["History"]);
  });

  it("falls back to get_genre_enum_values_simple", async () => {
    sb.current.onRpc((name: string) =>
      name === "get_genre_enum_values" ? { error: { message: "function does not exist" } } : { data: ["Law"] }
    );
    await expect(mod.fetchGenres()).resolves.toEqual(["Law"]);
    expect(sb.current.rpc.mock.calls.map((c: any[]) => c[0])).toEqual(["get_genre_enum_values", "get_genre_enum_values_simple"]);
  });

  it("de-duplicates concurrent calls", async () => {
    sb.current.onRpc(() => ({ data: ["A"] }));
    const [a, b] = await Promise.all([mod.fetchGenres(), mod.fetchGenres()]);
    expect(a).toEqual(["A"]);
    expect(b).toEqual(["A"]);
    expect(sb.current.rpc).toHaveBeenCalledTimes(1);
  });

  it("throws when both functions are missing, and allows a retry afterwards", async () => {
    sb.current.onRpc(() => ({ error: { message: "missing" } }));
    await expect(mod.fetchGenres()).rejects.toThrow("SQL functions not created yet");
    sb.current.onRpc(() => ({ data: ["Retry"] }));
    await expect(mod.fetchGenres()).resolves.toEqual(["Retry"]);
  });
});

describe("getBooksCountByGenre", () => {
  it("returns the exact count for the genre", async () => {
    sb.current.onQuery(() => ({ count: 4 }));
    await expect(mod.getBooksCountByGenre("History")).resolves.toBe(4);
    const q = sb.current.queriesFor("books")[0];
    expect(q.has("eq", "genre", "History")).toBe(true);
    expect(q.arg("select", 1)).toEqual({ count: "exact", head: true });
  });

  it("returns 0 on errors or missing counts", async () => {
    sb.current.onQuery(() => ({ error: { message: "boom" } }));
    await expect(mod.getBooksCountByGenre("X")).resolves.toBe(0);
    sb.current.onQuery(() => ({ count: null }));
    await expect(mod.getBooksCountByGenre("X")).resolves.toBe(0);
  });
});
