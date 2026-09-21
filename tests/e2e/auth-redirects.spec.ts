import { expect, test } from "./fixtures";

/**
 * Signed-out visitors hitting any non-public page are sent by src/middleware.ts to
 * `/?auth=required&from=<path>`, where the landing page shows a sign-in notice.
 */
const PROTECTED = ["/app/ocr", "/app/factbook", "/quiz", "/app/past-papers", "/app", "/app/some-chat-id"];

test.describe("Protected routes while signed out", () => {
  for (const path of PROTECTED) {
    test(`${path} redirects to the landing page with a sign-in notice`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL((url) => url.pathname === "/" && url.searchParams.get("auth") === "required");
      expect(new URL(page.url()).searchParams.get("from")).toBe(path);
      await expect(page.getByText("Please sign in to continue")).toBeVisible();
    });
  }

  test("the redirect is a server-side 307 (no protected HTML is sent)", async ({ request }) => {
    const response = await request.get("/app/factbook", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    const location = new URL(response.headers()["location"], "http://127.0.0.1");
    expect(location.pathname).toBe("/");
    expect(location.searchParams.get("auth")).toBe("required");
    expect(location.searchParams.get("from")).toBe("/app/factbook");
  });

  test("the MCQ data route is protected too", async ({ request }) => {
    const response = await request.get("/quiz/mcqs?genre_id=general&limit=5", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toContain("auth=required");
  });

  test("the sign-in notice disappears after a few seconds", async ({ page }) => {
    await page.goto("/app/ocr");
    const notice = page.getByText("Please sign in to continue");
    await expect(notice).toBeVisible();
    await expect(notice).toBeHidden({ timeout: 6_000 });
  });
});

test.describe("Not found", () => {
  test("unknown API routes return 404", async ({ request }) => {
    const response = await request.get("/api/this-route-does-not-exist");
    expect(response.status()).toBe(404);
  });

  test("unknown static files render the 404 page", async ({ page }) => {
    const response = await page.goto("/this-file-does-not-exist.txt");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
  });

  test("unknown page routes are treated as protected for signed-out users", async ({ request }) => {
    const response = await request.get("/definitely-not-a-page", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
  });
});
