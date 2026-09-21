import { vi } from "vitest";

/**
 * Hermetic `fetch` stubs.
 *
 * The global setup installs a guard that records any fetch a test did not mock
 * and fails the test (see tests/setup/common.ts). Tests call `mockFetch(routes)`
 * to replace it with a routing stub.
 */

/** Requests that reached fetch without a matching mock; checked after each test. */
export const unmockedCalls: string[] = [];

export type ResponseSpec = {
  status?: number;
  json?: unknown;
  text?: string;
  headers?: Record<string, string>;
  /** Reject like a network failure (fetch throws TypeError). */
  networkError?: boolean;
};

type Responder =
  | ResponseSpec
  | Response
  | ((url: string, init: RequestInit | undefined, callIndex: number) => ResponseSpec | Response | Promise<ResponseSpec | Response>);

export type Route = {
  method?: string;
  /** Exact URL, exact path(+query) or a RegExp tested against the full URL. */
  url: string | RegExp;
  respond?: Responder;
  /** Sequential responders: call N uses sequence[N] (last one repeats). */
  sequence?: Responder[];
};

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

export function toResponse(spec: ResponseSpec | Response): Response {
  if (spec instanceof Response) return spec;
  if (spec.networkError) throw new TypeError("Failed to fetch");
  const status = spec.status ?? 200;
  if (spec.text !== undefined) {
    return new Response(spec.text, { status, headers: spec.headers });
  }
  return jsonResponse(spec.json ?? {}, status, spec.headers);
}

export function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return (input as Request).url;
}

function matches(route: Route, url: string, method: string): boolean {
  if ((route.method ?? "GET").toUpperCase() !== method) return false;
  if (route.url instanceof RegExp) return route.url.test(url);
  if (route.url === url) return true;
  try {
    const parsed = new URL(url, "http://localhost");
    return parsed.pathname + parsed.search === route.url || parsed.pathname === route.url;
  } catch {
    return false;
  }
}

/**
 * Install a routing fetch stub on globalThis. Unmatched requests throw, so a
 * missing mock fails loudly instead of silently reaching the network.
 */
export function mockFetch(routes: Route[]) {
  const counters = new Map<Route, number>();
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = requestUrl(input);
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const route = routes.find((r) => matches(r, url, method));
    if (!route) {
      unmockedCalls.push(`${method} ${url}`);
      throw new Error(`[test] Unmocked fetch: ${method} ${url}`);
    }
    const index = counters.get(route) ?? 0;
    counters.set(route, index + 1);
    const responder = route.sequence
      ? route.sequence[Math.min(index, route.sequence.length - 1)]
      : route.respond;
    if (!responder) throw new Error(`[test] Route for ${method} ${url} has no responder`);
    const produced = typeof responder === "function" ? await responder(url, init, index) : responder;
    return toResponse(produced);
  });
  globalThis.fetch = spy as unknown as typeof fetch;
  return spy;
}

/** Calls made to a fetch spy, as `METHOD url` strings (handy for assertions). */
export function fetchCalls(spy: ReturnType<typeof vi.fn>): string[] {
  return spy.mock.calls.map(([input, init]: any[]) => {
    const method = (init?.method ?? "GET").toUpperCase();
    return `${method} ${requestUrl(input)}`;
  });
}
