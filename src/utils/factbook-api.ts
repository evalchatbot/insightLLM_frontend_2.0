"use client";

function normalizeApiUrl(url: string): string {
  if (url.startsWith("http:") && !url.startsWith("http://") && !url.startsWith("https://")) {
    return url.replace(/^http:/, "http://");
  }
  return url;
}

const BACKEND_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000");

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const EDITORIALS_TTL_MS = 2 * 60 * 1000;
const DATES_TTL_MS = 5 * 60 * 1000;
const TOPICS_TTL_MS = 8 * 60 * 1000;

const editorialsByDateCache = new Map<string, CacheEntry<EditorialListResponse>>();
const editorialsByTopicCache = new Map<string, CacheEntry<EditorialTopicListResponse>>();
const editorialDatesCache = new Map<string, CacheEntry<string[]>>();
const topicPayloadCache = new Map<string, CacheEntry<FactbookTopicListResponse>>();

function getCachedValue<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const cached = cache.get(key);
  if (!cached) {
    return null;
  }

  if (Date.now() > cached.expiresAt) {
    cache.delete(key);
    return null;
  }

  return cached.value;
}

function setCachedValue<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number): void {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export interface FactbookEditorial {
  id?: string;
  publication_date: string;
  headline: string;
  summary_bullets: string[];
  takeaway: string;
  summary_paragraph: string;
  topic_domain?: string;
  thesis_statement?: string;
}

interface EditorialListResponse {
  date: string;
  count: number;
  editorials: FactbookEditorial[];
}

interface EditorialDateListResponse {
  month?: string;
  count: number;
  dates: string[];
}

export interface FactbookTopicGroup {
  title: string;
  topics: string[];
}

interface FactbookTopicListResponse {
  count: number;
  groups: FactbookTopicGroup[];
  counts: Record<string, number>;
}

interface EditorialTopicListResponse {
  topic: string;
  count: number;
  editorials: FactbookEditorial[];
}

export async function fetchFactbookEditorials(
  date?: string,
  options?: { bypassCache?: boolean }
): Promise<EditorialListResponse> {
  const cacheKey = date || "__auto__";
  if (!options?.bypassCache) {
    const cached = getCachedValue(editorialsByDateCache, cacheKey);
    if (cached) {
      return cached;
    }
  }

  const queryString = date ? `?date=${encodeURIComponent(date)}` : "";
  const response = await fetch(`${BACKEND_URL}/api/factbook/editorials${queryString}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Failed to fetch fact book editorials (${response.status})`);
  }

  const payload = (await response.json()) as EditorialListResponse;
  const normalized: EditorialListResponse = {
    date: payload.date || date || "",
    count: Array.isArray(payload.editorials) ? payload.editorials.length : 0,
    editorials: Array.isArray(payload.editorials) ? payload.editorials : [],
  };

  setCachedValue(editorialsByDateCache, cacheKey, normalized, EDITORIALS_TTL_MS);
  if (normalized.date) {
    setCachedValue(editorialsByDateCache, normalized.date, normalized, EDITORIALS_TTL_MS);
  }

  return normalized;
}

export async function fetchFactbookEditorialDates(month?: string, options?: { bypassCache?: boolean }): Promise<string[]> {
  const cacheKey = month || "__all__";
  if (!options?.bypassCache) {
    const cached = getCachedValue(editorialDatesCache, cacheKey);
    if (cached) {
      return cached;
    }
  }

  const queryString = month ? `?month=${encodeURIComponent(month)}` : "";
  const response = await fetch(`${BACKEND_URL}/api/factbook/editorial-dates${queryString}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Failed to fetch fact book editorial dates (${response.status})`);
  }

  const payload = (await response.json()) as EditorialDateListResponse;
  const dates = Array.isArray(payload.dates) ? payload.dates : [];
  setCachedValue(editorialDatesCache, cacheKey, dates, DATES_TTL_MS);
  return dates;
}

export async function fetchFactbookTopics(
  options?: { bypassCache?: boolean }
): Promise<{ groups: FactbookTopicGroup[]; counts: Record<string, number> }> {
  const cacheKey = "__topics__";
  if (!options?.bypassCache) {
    const cached = getCachedValue(topicPayloadCache, cacheKey);
    if (cached) {
      return {
        groups: Array.isArray(cached.groups) ? cached.groups : [],
        counts: cached.counts || {},
      };
    }
  }

  const response = await fetch(`${BACKEND_URL}/api/factbook/topics`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Failed to fetch fact book topics (${response.status})`);
  }

  const payload = (await response.json()) as FactbookTopicListResponse;
  setCachedValue(topicPayloadCache, cacheKey, payload, TOPICS_TTL_MS);
  return {
    groups: Array.isArray(payload.groups) ? payload.groups : [],
    counts: payload.counts || {},
  };
}

export async function fetchFactbookEditorialsByTopic(
  topic: string,
  limit = 180,
  options?: { bypassCache?: boolean }
): Promise<FactbookEditorial[]> {
  const cacheKey = `${topic}::${limit}`;
  if (!options?.bypassCache) {
    const cached = getCachedValue(editorialsByTopicCache, cacheKey);
    if (cached) {
      return Array.isArray(cached.editorials) ? cached.editorials : [];
    }
  }

  const response = await fetch(
    `${BACKEND_URL}/api/factbook/editorials/by-topic?topic=${encodeURIComponent(topic)}&limit=${encodeURIComponent(String(limit))}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Failed to fetch fact book topic editorials (${response.status})`);
  }

  const payload = (await response.json()) as EditorialTopicListResponse;
  const normalized: EditorialTopicListResponse = {
    topic: payload.topic || topic,
    count: Array.isArray(payload.editorials) ? payload.editorials.length : 0,
    editorials: Array.isArray(payload.editorials) ? payload.editorials : [],
  };
  setCachedValue(editorialsByTopicCache, cacheKey, normalized, EDITORIALS_TTL_MS);
  return normalized.editorials;
}
