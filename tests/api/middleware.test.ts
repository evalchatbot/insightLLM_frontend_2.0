import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Keep Clerk's real route matcher, but unwrap clerkMiddleware so the app's
// handler can be called directly with a fake `auth`.
vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@clerk/nextjs/server")>();
  return { ...actual, clerkMiddleware: (handler: unknown) => handler };
});

const mod = await import("@/middleware");
type Handler = (auth: () => Promise<{ userId: string | null }>, req: NextRequest) => Promise<Response | undefined>;
const handler = mod.default as unknown as Handler;

const signedOut = async () => ({ userId: null });
const signedIn = async () => ({ userId: "user_1" });
const request = (path: string) => new NextRequest(new URL(path, "http://localhost:3000"));

describe("middleware route protection", () => {
  it.each(["/", "/api/genres", "/api/pro/status", "/api/past-papers", "/sign-in", "/sign-in/factor-one", "/sign-up", "/sso-callback"])(
    "lets signed-out users reach public route %s",
    async (path) => {
      await expect(handler(signedOut, request(path))).resolves.toBeUndefined();
    }
  );

  it.each(["/app", "/app/ocr", "/app/factbook", "/app/past-papers/css", "/app/some-chat-id", "/quiz", "/quiz/mcqs", "/ocr", "/nonexistent"])(
    "redirects signed-out users from protected route %s to /?auth=required",
    async (path) => {
      const res = await handler(signedOut, request(path));
      expect(res?.status).toBe(307);
      const location = new URL(res!.headers.get("location")!);
      expect(location.pathname).toBe("/");
      expect(location.searchParams.get("auth")).toBe("required");
      expect(location.searchParams.get("from")).toBe(path);
    }
  );

  it("does not treat look-alike paths as public", async () => {
    // "/api/(.*)" must not match "/apis" and "/" must only match the root.
    await expect(handler(signedOut, request("/apis"))).resolves.toHaveProperty("status", 307);
    await expect(handler(signedOut, request("/app/api/x"))).resolves.toHaveProperty("status", 307);
  });

  it("lets signed-in users through to protected routes", async () => {
    await expect(handler(signedIn, request("/app/ocr"))).resolves.toBeUndefined();
    await expect(handler(signedIn, request("/quiz"))).resolves.toBeUndefined();
  });

  it("fails closed: if auth() throws, the user is redirected", async () => {
    const res = await handler(async () => {
      throw new Error("clerk handshake failed");
    }, request("/app/factbook"));
    expect(res?.status).toBe(307);
    expect(new URL(res!.headers.get("location")!).searchParams.get("from")).toBe("/app/factbook");
  });
});

describe("middleware matcher config", () => {
  const [pages, root, api] = mod.config.matcher.map((m) => new RegExp(`^${m}$`));
  const runsOn = (path: string) => [pages, root, api].some((re) => re.test(path));

  it("runs on pages and API routes", () => {
    for (const path of ["/", "/app/ocr", "/quiz", "/api/genres", "/api/pro/verify-key"]) {
      expect(runsOn(path), path).toBe(true);
    }
  });

  it("skips static assets and Next internals", () => {
    for (const path of ["/assets/Rubric logo.svg", "/favicon.ico", "/_next/static/chunks/main.js", "/_next/image"]) {
      expect(runsOn(path), path).toBe(false);
    }
  });
});
