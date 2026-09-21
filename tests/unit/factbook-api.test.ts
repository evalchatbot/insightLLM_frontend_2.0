import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCalls, mockFetch } from "../helpers/fetch";

const BACKEND = "http://backend.test";
type FactbookApi = typeof import("@/utils/factbook-api");

// The module keeps TTL caches in module scope; load a fresh copy per test.
let api: FactbookApi;
beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ now: new Date("2026-09-18T08:00:00Z"), toFake: ["Date"] });
  api = await import("@/utils/factbook-api");
});

const editorial = (id: string, date = "2026-09-17") => ({
  id,
  publication_date: date,
  headline: `Headline ${id}`,
  summary_bullets: ["b1"],
  takeaway: "t",
  summary_paragraph: "p",
});

const advance = (ms: number) => vi.setSystemTime(Date.now() + ms);

describe("fetchFactbookEditorials", () => {
  it("requests the latest editorials and normalizes the payload", async () => {
    const spy = mockFetch([
      { url: `${BACKEND}/api/factbook/editorials`, respond: { json: { date: "2026-09-17", editorials: [editorial("a"), editorial("b")] } } },
    ]);
    await expect(api.fetchFactbookEditorials()).resolves.toEqual({
      date: "2026-09-17",
      count: 2,
      editorials: [editorial("a"), editorial("b")],
    });
    expect(spy.mock.calls[0][1]).toMatchObject({ method: "GET", cache: "no-store" });
  });

  it("encodes the date query and tolerates a malformed payload", async () => {
    const spy = mockFetch([{ url: `${BACKEND}/api/factbook/editorials?date=2026-09-01`, respond: { json: { editorials: "nope" } } }]);
    await expect(api.fetchFactbookEditorials("2026-09-01")).resolves.toEqual({ date: "2026-09-01", count: 0, editorials: [] });
    expect(fetchCalls(spy)).toEqual([`GET ${BACKEND}/api/factbook/editorials?date=2026-09-01`]);
  });

  it("serves repeat calls from cache for 2 minutes, then refetches", async () => {
    const spy = mockFetch([{ url: /\/api\/factbook\/editorials\?date=/, respond: { json: { date: "2026-09-10", editorials: [editorial("a")] } } }]);
    await api.fetchFactbookEditorials("2026-09-10");
    advance(2 * 60 * 1000 - 1);
    await api.fetchFactbookEditorials("2026-09-10");
    expect(spy).toHaveBeenCalledTimes(1);
    advance(2);
    await api.fetchFactbookEditorials("2026-09-10");
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("caches the 'latest' response under its resolved date as well", async () => {
    const spy = mockFetch([{ url: `${BACKEND}/api/factbook/editorials`, respond: { json: { date: "2026-09-17", editorials: [editorial("a")] } } }]);
    await api.fetchFactbookEditorials();
    const byDate = await api.fetchFactbookEditorials("2026-09-17");
    expect(byDate.editorials).toHaveLength(1);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("bypassCache forces a network request", async () => {
    const spy = mockFetch([{ url: `${BACKEND}/api/factbook/editorials`, respond: { json: { date: "d", editorials: [] } } }]);
    await api.fetchFactbookEditorials();
    await api.fetchFactbookEditorials(undefined, { bypassCache: true });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("throws the response text on HTTP errors, or a status message when empty, and does not cache failures", async () => {
    const spy = mockFetch([
      {
        url: `${BACKEND}/api/factbook/editorials`,
        sequence: [{ status: 500, text: "database unavailable" }, { status: 503, text: "" }, { json: { date: "x", editorials: [] } }],
      },
    ]);
    await expect(api.fetchFactbookEditorials()).rejects.toThrow("database unavailable");
    await expect(api.fetchFactbookEditorials()).rejects.toThrow("Failed to fetch fact book editorials (503)");
    await expect(api.fetchFactbookEditorials()).resolves.toMatchObject({ date: "x" });
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("propagates network errors", async () => {
    mockFetch([{ url: `${BACKEND}/api/factbook/editorials`, respond: { networkError: true } }]);
    await expect(api.fetchFactbookEditorials()).rejects.toThrow("Failed to fetch");
  });
});

describe("fetchFactbookEditorialDates", () => {
  it("fetches dates for a month and caches them for 5 minutes", async () => {
    const spy = mockFetch([{ url: `${BACKEND}/api/factbook/editorial-dates?month=2026-09`, respond: { json: { dates: ["2026-09-17", "2026-09-16"] } } }]);
    await expect(api.fetchFactbookEditorialDates("2026-09")).resolves.toEqual(["2026-09-17", "2026-09-16"]);
    advance(5 * 60 * 1000 - 1);
    await api.fetchFactbookEditorialDates("2026-09");
    expect(spy).toHaveBeenCalledTimes(1);
    advance(2);
    await api.fetchFactbookEditorialDates("2026-09");
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("uses a separate cache entry for 'all dates' and returns [] for malformed payloads", async () => {
    const spy = mockFetch([
      { url: `${BACKEND}/api/factbook/editorial-dates`, respond: { json: { dates: null } } },
      { url: `${BACKEND}/api/factbook/editorial-dates?month=2026-08`, respond: { json: { dates: ["2026-08-01"] } } },
    ]);
    await expect(api.fetchFactbookEditorialDates()).resolves.toEqual([]);
    await expect(api.fetchFactbookEditorialDates("2026-08")).resolves.toEqual(["2026-08-01"]);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("throws on HTTP errors", async () => {
    mockFetch([{ url: `${BACKEND}/api/factbook/editorial-dates`, respond: { status: 502, text: "" } }]);
    await expect(api.fetchFactbookEditorialDates()).rejects.toThrow("Failed to fetch fact book editorial dates (502)");
  });
});

describe("fetchFactbookTopics", () => {
  it("returns groups and counts, cached for 8 minutes", async () => {
    const payload = { count: 1, groups: [{ title: "Pakistan Domains", topics: ["Economy"] }], counts: { Economy: 12 } };
    const spy = mockFetch([{ url: `${BACKEND}/api/factbook/topics`, respond: { json: payload } }]);
    await expect(api.fetchFactbookTopics()).resolves.toEqual({ groups: payload.groups, counts: payload.counts });
    advance(8 * 60 * 1000 - 1);
    await expect(api.fetchFactbookTopics()).resolves.toEqual({ groups: payload.groups, counts: payload.counts });
    expect(spy).toHaveBeenCalledTimes(1);
    advance(2);
    await api.fetchFactbookTopics();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("normalizes missing groups/counts", async () => {
    mockFetch([{ url: `${BACKEND}/api/factbook/topics`, respond: { json: { groups: "bad" } } }]);
    await expect(api.fetchFactbookTopics()).resolves.toEqual({ groups: [], counts: {} });
  });

  it("throws on HTTP errors", async () => {
    mockFetch([{ url: `${BACKEND}/api/factbook/topics`, respond: { status: 500, text: "nope" } }]);
    await expect(api.fetchFactbookTopics()).rejects.toThrow("nope");
  });
});

describe("fetchFactbookEditorialsByTopic", () => {
  it("encodes topic and default limit, and returns the editorials", async () => {
    const spy = mockFetch([
      {
        url: `${BACKEND}/api/factbook/editorials/by-topic?topic=Law%20%26%20Justice&limit=180`,
        respond: { json: { topic: "Law & Justice", editorials: [editorial("x")] } },
      },
    ]);
    await expect(api.fetchFactbookEditorialsByTopic("Law & Justice")).resolves.toEqual([editorial("x")]);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("caches per topic+limit for 2 minutes", async () => {
    const spy = mockFetch([{ url: /by-topic\?topic=Economy&limit=\d+$/, respond: { json: { editorials: [editorial("e")] } } }]);
    await api.fetchFactbookEditorialsByTopic("Economy", 500);
    await api.fetchFactbookEditorialsByTopic("Economy", 500);
    expect(spy).toHaveBeenCalledTimes(1);
    await api.fetchFactbookEditorialsByTopic("Economy", 50);
    expect(spy).toHaveBeenCalledTimes(2);
    advance(2 * 60 * 1000 + 1);
    await api.fetchFactbookEditorialsByTopic("Economy", 500);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("returns [] for malformed payloads and throws on HTTP errors", async () => {
    mockFetch([
      { url: /topic=A&/, respond: { json: {} } },
      { url: /topic=B&/, respond: { status: 404, text: "" } },
    ]);
    await expect(api.fetchFactbookEditorialsByTopic("A")).resolves.toEqual([]);
    await expect(api.fetchFactbookEditorialsByTopic("B")).rejects.toThrow("Failed to fetch fact book topic editorials (404)");
  });
});

describe("backend URL normalization", () => {
  it("repairs 'http:host' URLs from the environment", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http:factbook.local:8001");
    vi.resetModules();
    const fresh: FactbookApi = await import("@/utils/factbook-api");
    const spy = mockFetch([{ url: "http://factbook.local:8001/api/factbook/topics", respond: { json: { groups: [] } } }]);
    await fresh.fetchFactbookTopics();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
