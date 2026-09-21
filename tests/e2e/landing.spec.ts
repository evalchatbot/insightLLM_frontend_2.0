import { expect, test, unexpectedErrors } from "./fixtures";

test.describe("Landing page", () => {
  test("renders the key marketing content", async ({ page, pageErrors }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle("Rubric AI");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("EVALUATION MATTERS!");
    await expect(page.getByRole("heading", { name: "EVALUATION BUILT TO PERFECTION" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "CHOOSE YOUR PLAN" })).toBeVisible();
    await expect(page.locator("#pricing")).toContainText("Rs.5,000");
    await expect(page.getByRole("heading", { name: "Frequently Asked Questions" })).toBeVisible();
    await expect(page.getByText("© 2025 RUBRIC. All rights reserved.")).toBeVisible();

    expect(unexpectedErrors(pageErrors)).toEqual([]);
  });

  test("navbar links point at the feature routes", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation");
    for (const [name, href] of [
      ["Evaluations", "/app/ocr"],
      ["MCQs", "/quiz"],
      ["Fact Book", "/app/factbook"],
      ["Past Papers", "/app/past-papers"],
    ]) {
      await expect(nav.getByRole("link", { name })).toHaveAttribute("href", href);
    }
    await expect(nav.getByTitle("Coming Soon")).toContainText("Chatbot");
  });

  test("is interactive after hydration: FAQ expands and the contact modal opens", async ({ page }) => {
    await page.goto("/");
    const question = page.getByRole("button", { name: "How quickly can I get feedback on my papers?" });
    await expect(question).toHaveAttribute("aria-expanded", "false");
    await question.click();
    await expect(question).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText(/instant feedback within seconds of submission/)).toBeVisible();

    await page.getByRole("button", { name: "Contact our support team" }).click();
    await expect(page.getByRole("heading", { name: "Contact Support Team" })).toBeVisible();
    await expect(page.getByRole("link", { name: "contact.rubric@gmail.com" })).toHaveAttribute("href", "mailto:contact.rubric@gmail.com");
  });

  test("serves its images (case-sensitive asset paths)", async ({ page, request }) => {
    await page.goto("/");
    const logo = await request.get("/assets/Rubric%20logo.svg");
    expect(logo.status()).toBe(200);
    for (const slide of ["hero-slide-1.png", "hero-slide-2.png", "hero-slide-3.png"]) {
      expect((await request.get(`/assets/${slide}`)).status(), slide).toBe(200);
    }
    const images = page.locator("img");
    await expect(images.first()).toBeVisible();
    // Every rendered <img> must have loaded (catches wrong-case paths on Linux).
    const broken = await images.evaluateAll((imgs) =>
      (imgs as HTMLImageElement[]).filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.src)
    );
    expect(broken).toEqual([]);
  });

  test("does not reach any third-party host from the browser", async ({ page, externalRequests }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Only Clerk's (fake) Frontend API is attempted - and it is blocked by the fixture.
    const hosts = [...new Set(externalRequests.map((u) => new URL(u).hostname))];
    expect(hosts.every((h) => h === "clerk.example.com")).toBe(true);
  });
});
