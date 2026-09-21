import { NextRequest } from "next/server";

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

/** Build a NextRequest the way the App Router hands it to a route handler. */
export function makeRequest(path: string, { method = "GET", body, headers = {} }: RequestOptions = {}) {
  const init: ConstructorParameters<typeof NextRequest>[1] = {
    method,
    headers: { "content-type": "application/json", ...headers },
  };
  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  return new NextRequest(new URL(path, "http://localhost:3000"), init);
}

export async function readJson(res: Response) {
  return { status: res.status, body: await res.json() };
}
