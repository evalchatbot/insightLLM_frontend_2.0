/**
 * Defer creating a client (e.g. Supabase) until it is first used.
 *
 * `next build` evaluates every route module while "Collecting page data", so a client
 * created at import time makes the build fail wherever the build environment has no
 * Supabase settings (e.g. the separate LCA Vercel project building this branch as a
 * preview). At runtime nothing changes: the client is created on first property
 * access and reused afterwards, and a missing setting still throws at that point.
 */
export function lazyClient<T extends object>(create: () => T): T {
  let client: T | undefined;
  return new Proxy({} as T, {
    get(_target, prop) {
      client ??= create();
      const value = Reflect.get(client, prop, client);
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}
