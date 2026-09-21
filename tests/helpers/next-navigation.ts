import { vi } from "vitest";

/**
 * Controllable stand-in for `next/navigation`.
 *
 *   vi.mock("next/navigation", async () => (await import("../helpers/next-navigation")).navigationModule);
 */
export const navState = {
  pathname: "/",
  search: "",
  params: {} as Record<string, string | string[]>,
};

export const router = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
};

export function setLocation(pathname: string, search = "", params: Record<string, string | string[]> = {}) {
  navState.pathname = pathname;
  navState.search = search;
  navState.params = params;
}

export function resetNavigation() {
  setLocation("/");
  Object.values(router).forEach((fn) => fn.mockReset());
}

export class RedirectError extends Error {
  constructor(public readonly url: string) {
    super(`NEXT_REDIRECT:${url}`);
  }
}

// Like Next, return a stable object while the query string is unchanged
// (effects that depend on searchParams must not re-run on every render).
let cachedSearch: { search: string; params: URLSearchParams } | null = null;
function searchParams() {
  if (!cachedSearch || cachedSearch.search !== navState.search) {
    cachedSearch = { search: navState.search, params: new URLSearchParams(navState.search) };
  }
  return cachedSearch.params;
}

export const navigationModule = {
  useRouter: () => router,
  usePathname: () => navState.pathname,
  useSearchParams: searchParams,
  useParams: () => navState.params,
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
};
