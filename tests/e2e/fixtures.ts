import { test as base, expect } from "@playwright/test";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/**
 * Every test gets a browser context that aborts requests to anything but the
 * local Next server (clerk-js from the fake Frontend API, Google Fonts, analytics),
 * so runs are hermetic and cannot flake on third-party availability.
 */
export const test = base.extend<{ externalRequests: string[]; pageErrors: string[] }>({
  externalRequests: [
    async ({ context }, use) => {
      const blocked: string[] = [];
      await context.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (LOCAL_HOSTS.has(url.hostname)) return route.continue();
        blocked.push(url.href);
        return route.abort("blockedbyclient");
      });
      await use(blocked);
    },
    { auto: true },
  ],
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await use(errors);
    },
    { auto: true },
  ],
});

export { expect };

/** Page errors that are expected because clerk-js is deliberately blocked. */
export function unexpectedErrors(errors: string[]) {
  return errors.filter((message) => !/clerk/i.test(message));
}
