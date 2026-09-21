import { describe, expect, it, vi } from "vitest";
import { lazyClient } from "@/lib/lazy-client";

class FakeClient {
  calls = 0;
  config = { region: "test" };
  from(table: string) {
    this.calls += 1;
    return `${table}:${this.calls}`;
  }
}

describe("lazyClient", () => {
  it("does not create the client until it is first used", () => {
    const create = vi.fn(() => new FakeClient());
    const client = lazyClient(create);
    expect(create).not.toHaveBeenCalled();
    expect(client.from("users")).toBe("users:1");
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("reuses one instance and keeps `this` bound for methods", () => {
    const create = vi.fn(() => new FakeClient());
    const client = lazyClient(create);
    const from = client.from; // detached method still targets the real instance
    expect(from("a")).toBe("a:1");
    expect(client.from("b")).toBe("b:2");
    expect(client.config).toEqual({ region: "test" });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("surfaces a factory error at first use, not at creation", () => {
    const client = lazyClient<FakeClient>(() => {
      throw new Error("Missing Supabase environment variables");
    });
    expect(() => client.from("users")).toThrow("Missing Supabase environment variables");
  });
});
