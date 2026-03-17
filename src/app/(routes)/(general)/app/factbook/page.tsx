"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronDown, Loader2 } from "lucide-react";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import {
  FactbookEditorial,
  FactbookTopicGroup,
  fetchFactbookEditorialDates,
  fetchFactbookEditorials,
  fetchFactbookEditorialsByTopic,
  fetchFactbookTopics,
} from "@/utils/factbook-api";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["600", "700"] });
const sourceSans = Source_Sans_3({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

type BrowseMode = "date" | "topic";

const FALLBACK_TOPIC_GROUPS: FactbookTopicGroup[] = [
  {
    title: "Pakistan Domains",
    topics: [
      "Economy",
      "Governance",
      "Geopolitics",
      "Climate & Environment",
      "Security",
      "Technology",
      "Law & Justice",
      "Society",
      "Health",
      "Education",
      "Energy",
      "Gender",
      "Human Rights",
      "Media & Communication",
    ],
  },
  {
    title: "Global Domains",
    topics: [
      "Global Economy",
      "Global Geopolitics",
      "Global Climate Emergency",
      "Global Security",
      "Global Technology",
      "Globalisation",
    ],
  },
  { title: "Other", topics: ["Other"] },
];

function getLocalIsoDate(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function truncateText(value: string, limit = 170): string {
  const text = (value || "").trim();
  if (!text) {
    return "";
  }
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit - 3).trim()}...`;
}

function getEditorialTeaser(editorial: FactbookEditorial): string {
  const thesis = truncateText(editorial.thesis_statement || "", 170);
  if (thesis) {
    return thesis;
  }

  const firstBullet = truncateText((editorial.summary_bullets || [])[0] || "", 170);
  if (firstBullet) {
    return firstBullet;
  }

  const takeaway = truncateText(editorial.takeaway || "", 170);
  if (takeaway) {
    return takeaway;
  }

  const firstSentence = (editorial.summary_paragraph || "").split(/(?<=[.!?])\s+/)[0] || "";
  return truncateText(firstSentence, 170);
}

function getInitialTopic(groups: FactbookTopicGroup[]): string {
  for (const group of groups) {
    if (group.topics.length > 0) {
      return group.topics[0];
    }
  }
  return "Economy";
}

export default function FactBookPage() {
  const [browseMode, setBrowseMode] = useState<BrowseMode>("date");
  const [selectedDate, setSelectedDate] = useState<string>(getLocalIsoDate());
  const [autoDateSelection, setAutoDateSelection] = useState<boolean>(true);
  const [selectedTopic, setSelectedTopic] = useState<string>("Economy");
  const [editorials, setEditorials] = useState<FactbookEditorial[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);
  const [topicGroups, setTopicGroups] = useState<FactbookTopicGroup[]>(FALLBACK_TOPIC_GROUPS);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  const [topicsLoading, setTopicsLoading] = useState(false);
  const editorialCacheRef = useRef<Map<string, FactbookEditorial[]>>(new Map());
  const topicDropdownRef = useRef<HTMLDivElement | null>(null);

  const selectedMonth = useMemo(() => selectedDate.slice(0, 7), [selectedDate]);
  const activeFilterKey = browseMode === "date" ? selectedDate : selectedTopic;

  const editorialRows = useMemo(
    () =>
      editorials.map((editorial, index) => ({
        ...editorial,
        cardId: `${activeFilterKey}-${index}`,
      })),
    [editorials, activeFilterKey]
  );

  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates]);

  const monthDateRows = useMemo(
    () => availableDates.filter((dateValue) => dateValue.startsWith(`${selectedMonth}-`)).sort(),
    [availableDates, selectedMonth]
  );

  useEffect(() => {
    if (!topicDropdownOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (topicDropdownRef.current && !topicDropdownRef.current.contains(target)) {
        setTopicDropdownOpen(false);
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [topicDropdownOpen]);

  useEffect(() => {
    let isMounted = true;

    const loadTopics = async () => {
      setTopicsLoading(true);
      try {
        const payload = await fetchFactbookTopics();
        if (!isMounted) {
          return;
        }

        const groups = payload.groups.length ? payload.groups : FALLBACK_TOPIC_GROUPS;
        setTopicGroups(groups);
        setTopicCounts(payload.counts || {});

        const flattenedTopics = groups.flatMap((group) => group.topics);
        if (!flattenedTopics.includes(selectedTopic)) {
          setSelectedTopic(getInitialTopic(groups));
        }
      } catch {
        if (!isMounted) {
          return;
        }
        setTopicGroups(FALLBACK_TOPIC_GROUPS);
        setTopicCounts({});
      } finally {
        if (isMounted) {
          setTopicsLoading(false);
        }
      }
    };

    loadTopics();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (browseMode !== "date") {
      return;
    }

    let isMounted = true;

    const loadEditorialDates = async () => {
      setDatesLoading(true);
      try {
        const dates = await fetchFactbookEditorialDates(selectedMonth);
        if (!isMounted) {
          return;
        }
        setAvailableDates(dates);
      } catch {
        if (!isMounted) {
          return;
        }
        setAvailableDates([]);
      } finally {
        if (isMounted) {
          setDatesLoading(false);
        }
      }
    };

    loadEditorialDates();

    return () => {
      isMounted = false;
    };
  }, [browseMode, selectedMonth]);

  useEffect(() => {
    if (browseMode !== "date" || availableDates.length === 0) {
      return;
    }

    const primeDates = availableDates.slice(0, 4);
    for (const dateValue of primeDates) {
      if (editorialCacheRef.current.has(`date:${dateValue}`)) {
        continue;
      }

      void fetchFactbookEditorials(dateValue)
        .then((payload) => {
          const cacheDate = payload.date || dateValue;
          editorialCacheRef.current.set(`date:${cacheDate}`, payload.editorials || []);
        })
        .catch(() => undefined);
    }
  }, [browseMode, availableDates]);

  useEffect(() => {
    let isMounted = true;

    const loadEditorials = async () => {
      const cacheKey = browseMode === "date"
        ? autoDateSelection
          ? "date:auto"
          : `date:${selectedDate}`
        : `topic:${selectedTopic}`;

      const cachedRows = editorialCacheRef.current.get(cacheKey);
      const hasCachedRows = Boolean(cachedRows && cachedRows.length > 0);

      if (cachedRows) {
        setEditorials(cachedRows);
      }

      setIsLoading(!hasCachedRows);
      setError(null);

      try {
        if (browseMode === "date") {
          const payload = await fetchFactbookEditorials(autoDateSelection ? undefined : selectedDate);
          if (!isMounted) {
            return;
          }

          const resolvedDate = payload.date || selectedDate;
          const rows = payload.editorials || [];

          editorialCacheRef.current.set(`date:${resolvedDate}`, rows);
          editorialCacheRef.current.set("date:auto", rows);
          setEditorials(rows);
          setExpandedCardId(null);

          if (autoDateSelection && resolvedDate !== selectedDate) {
            setSelectedDate(resolvedDate);
          }

          return;
        }

        const response = await fetchFactbookEditorialsByTopic(selectedTopic);
        if (!isMounted) {
          return;
        }

        editorialCacheRef.current.set(`topic:${selectedTopic}`, response || []);
        setEditorials(response || []);
        setExpandedCardId(null);
      } catch (err: any) {
        if (!isMounted) {
          return;
        }
        setEditorials([]);
        setExpandedCardId(null);
        setError(err?.message || "Failed to load editorials for this date.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (browseMode === "date" || (browseMode === "topic" && selectedTopic)) {
      loadEditorials();
    }

    return () => {
      isMounted = false;
    };
  }, [autoDateSelection, browseMode, selectedDate, selectedTopic]);

  const switchBrowseMode = (nextMode: BrowseMode) => {
    if (nextMode === browseMode) {
      return;
    }

    setBrowseMode(nextMode);
    setExpandedCardId(null);
    setError(null);
    setTopicDropdownOpen(false);
    setFilterPanelOpen(true);

    if (nextMode === "date") {
      setAutoDateSelection(true);
      setSelectedDate(getLocalIsoDate());
      return;
    }
  };

  return (
    <main className={`${sourceSans.className} min-h-screen w-full pt-24 pb-12 sm:pt-28 relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_46%,#ffffff_100%)] dark:bg-[radial-gradient(circle_at_18%_0%,rgba(190,24,93,0.24),transparent_40%),radial-gradient(circle_at_84%_12%,rgba(153,27,27,0.24),transparent_44%),linear-gradient(180deg,#17080f_0%,#12060b_100%)]`}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] dark:opacity-[0.13] bg-[linear-gradient(to_right,rgba(148,163,184,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.2)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-zinc-100/70 via-transparent dark:from-rose-500/10" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-7 rounded-[28px] border border-zinc-200/80 dark:border-rose-900/70 bg-white/92 dark:bg-[#1f0f18]/84 backdrop-blur-xl shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)] dark:shadow-[0_24px_64px_-36px_rgba(127,29,29,0.55)] p-6 sm:p-8"
        >
          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className={`${playfair.className} mt-1 text-3xl sm:text-4xl lg:text-[2.65rem] leading-tight text-zinc-900 dark:text-rose-50`}>
                Daily Editorial Briefing
              </h1>

              <div className="relative mt-4 h-10 w-[220px] overflow-hidden rounded-xl border border-zinc-300/80 bg-zinc-100/90 dark:border-rose-900/70 dark:bg-rose-950/35">
                <motion.div
                  className="absolute inset-y-0 w-14 bg-gradient-to-r from-transparent via-white/45 to-transparent dark:via-rose-200/20"
                  animate={{ x: [-70, 230] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 px-3 py-2.5 space-y-1">
                  <motion.div
                    className="h-[2px] rounded-full bg-zinc-400/70 dark:bg-rose-200/50"
                    animate={{ scaleX: [0.92, 1, 0.92] }}
                    transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="h-[2px] w-4/5 rounded-full bg-zinc-400/65 dark:bg-rose-200/45"
                    animate={{ scaleX: [1, 0.9, 1] }}
                    transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut", delay: 0.12 }}
                  />
                  <motion.div
                    className="h-[2px] w-3/5 rounded-full bg-zinc-400/60 dark:bg-rose-200/40"
                    animate={{ scaleX: [0.88, 1, 0.88] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 0.22 }}
                  />
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-rose-800/70 dark:bg-rose-950/38 dark:text-rose-100 px-3 py-1 text-xs font-semibold">
              {browseMode === "date" ? "Editorials by Date" : `Topic: ${selectedTopic}`}
            </div>
          </div>
        </motion.section>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          <section className="order-2 xl:order-1 space-y-4">
            {isLoading && (
              <div className="rounded-2xl border border-zinc-200 dark:border-rose-900/70 bg-white/92 dark:bg-rose-950/28 p-5 flex items-center gap-3 text-zinc-700 dark:text-rose-100">
                <Loader2 className="w-5 h-5 animate-spin" />
                {browseMode === "date"
                  ? `Loading editorials for ${formatDate(selectedDate)}...`
                  : `Loading editorials for topic ${selectedTopic}...`}
              </div>
            )}

            {!isLoading && error && (
              <div className="rounded-2xl border border-rose-300/60 dark:border-rose-800/70 bg-rose-50/85 dark:bg-rose-950/35 p-5 text-sm text-rose-800 dark:text-rose-100">
                {error}
              </div>
            )}

            {!isLoading && !error && editorialRows.length === 0 && (
              <div className="rounded-2xl border border-zinc-200 dark:border-rose-900/70 bg-white/92 dark:bg-rose-950/28 p-6 text-zinc-700 dark:text-rose-100">
                {browseMode === "date"
                  ? `No editorials available for ${formatDate(selectedDate)} yet.`
                  : `No editorials available for topic ${selectedTopic} yet.`}
              </div>
            )}

            {!isLoading && !error &&
              editorialRows.map((editorial, idx) => {
                const isExpanded = editorial.cardId === expandedCardId;

                return (
                  <motion.article
                    key={editorial.cardId}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: idx * 0.05 }}
                    className="rounded-2xl border border-zinc-200 dark:border-rose-900/70 bg-white/92 dark:bg-rose-950/28 backdrop-blur p-1"
                  >
                    <button
                      onClick={() => setExpandedCardId(isExpanded ? null : editorial.cardId)}
                      className="w-full text-left rounded-xl px-4 sm:px-5 py-4 sm:py-5 hover:bg-zinc-900/[0.04] dark:hover:bg-rose-900/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-rose-200/80">
                            {formatDate(editorial.publication_date)}
                          </p>
                          <h2 className={`${playfair.className} mt-1 text-xl sm:text-2xl text-zinc-900 dark:text-rose-50 leading-snug`}>
                            {editorial.headline}
                          </h2>
                          <p className="mt-2 text-sm text-zinc-700 dark:text-rose-100/95 leading-relaxed line-clamp-2">
                            {getEditorialTeaser(editorial)}
                          </p>
                          {editorial.topic_domain && (
                            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-800 dark:text-rose-300">
                              {editorial.topic_domain}
                            </p>
                          )}
                        </div>
                        <ChevronDown className={`w-5 h-5 mt-1 text-zinc-500 dark:text-rose-200 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mx-4 sm:mx-5 mb-5 rounded-xl border border-zinc-200 dark:border-rose-900/65 bg-zinc-50/80 dark:bg-rose-950/35 p-4 sm:p-5 grid gap-4 md:grid-cols-[1.1fr_2fr]">
                            <div>
                              <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-rose-200/80">
                                Quick Brief
                              </h3>
                              <ul className="mt-3 space-y-2">
                                {(editorial.summary_bullets || []).slice(0, 3).map((bullet, bulletIndex) => (
                                  <li key={`${editorial.cardId}-bullet-${bulletIndex}`} className="text-sm leading-relaxed text-zinc-700 dark:text-rose-100">
                                    - {bullet}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-rose-200/80">
                                In Detail
                              </h3>
                              <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-zinc-700 dark:text-rose-100 whitespace-pre-wrap">
                                {editorial.summary_paragraph}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.article>
                );
              })}
          </section>

          <aside className="order-1 xl:order-2 xl:sticky xl:top-28">
            <div className="rounded-3xl border border-zinc-200/80 dark:border-rose-900/70 bg-white/94 dark:bg-[#220f1a]/86 backdrop-blur-xl p-5 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.28)] dark:shadow-[0_22px_54px_-34px_rgba(159,18,57,0.45)]">
              <div className="mb-4 inline-flex w-full rounded-xl border border-zinc-300 dark:border-rose-900/80 overflow-hidden">
                <button
                  type="button"
                  onClick={() => void switchBrowseMode("date")}
                  className={`flex-1 px-3 py-2 text-sm font-semibold transition-colors ${browseMode === "date"
                    ? "bg-zinc-900 text-white dark:bg-rose-200 dark:text-rose-950"
                    : "bg-transparent text-zinc-700 dark:text-rose-100"
                    }`}
                >
                  By Date
                </button>
                <button
                  type="button"
                  onClick={() => void switchBrowseMode("topic")}
                  className={`flex-1 px-3 py-2 text-sm font-semibold transition-colors ${browseMode === "topic"
                    ? "bg-zinc-900 text-white dark:bg-rose-200 dark:text-rose-950"
                    : "bg-transparent text-zinc-700 dark:text-rose-100"
                    }`}
                >
                  By Topic
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-rose-200/80">
                    {browseMode === "date" ? "Editorial Date" : "Selected Topic"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-rose-50">
                    {browseMode === "date" ? formatDate(selectedDate) : selectedTopic}
                  </p>
                </div>

                <button
                  onClick={() => setFilterPanelOpen((open) => !open)}
                  className="h-11 rounded-xl border border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-rose-800/80 dark:bg-rose-950/45 dark:text-rose-100 inline-flex items-center gap-2 px-3 hover:scale-[1.02] transition-transform"
                  aria-label="Toggle filter panel"
                >
                  {browseMode === "date" && <CalendarDays className="w-4 h-4" />}
                  <span className="text-xs font-semibold">Filters</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${filterPanelOpen ? "rotate-180" : ""}`} />
                </button>
              </div>

              <AnimatePresence>
                {filterPanelOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-4 rounded-2xl border border-zinc-200 dark:border-rose-900/70 bg-white/95 dark:bg-rose-950/25 p-3"
                  >
                    {browseMode === "date" ? (
                      <>
                        <label htmlFor="factbook-date" className="block text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-rose-200/80 mb-2">
                          Pick a date
                        </label>
                        <input
                          id="factbook-date"
                          type="date"
                          value={selectedDate}
                          onChange={(event) => {
                            setAutoDateSelection(false);
                            setSelectedDate(event.target.value);
                          }}
                          min="2026-01-01"
                          max={getLocalIsoDate()}
                          className={`w-full rounded-lg border bg-white dark:bg-[#2a111c] px-3 py-2 text-sm text-zinc-800 dark:text-rose-50 outline-none focus:ring-2 focus:ring-zinc-400/35 dark:focus:ring-rose-400/35 ${availableDateSet.has(selectedDate)
                            ? "border-emerald-400 dark:border-rose-400"
                            : "border-zinc-300 dark:border-rose-900/80"
                            }`}
                        />

                        <div className="mt-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-zinc-500 dark:text-rose-200/80">
                            {datesLoading ? "Checking available dates..." : "Available dates this month"}
                          </p>
                          {!datesLoading && monthDateRows.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {monthDateRows.map((dateValue) => (
                                <button
                                  key={dateValue}
                                  type="button"
                                  onClick={() => {
                                    setAutoDateSelection(false);
                                    setSelectedDate(dateValue);
                                  }}
                                  className={`min-w-8 rounded-md border px-2 py-1 text-xs transition-colors ${dateValue === selectedDate
                                    ? "border-emerald-500 bg-emerald-500 text-white dark:border-rose-400 dark:bg-rose-400 dark:text-rose-950"
                                    : "border-zinc-300 dark:border-rose-900/80 hover:border-emerald-400 dark:hover:border-rose-500 dark:text-rose-100"
                                    }`}
                                  title={formatDate(dateValue)}
                                >
                                  {dateValue.slice(8)}
                                </button>
                              ))}
                            </div>
                          )}
                          {!datesLoading && monthDateRows.length === 0 && (
                            <p className="mt-1 text-xs text-zinc-500 dark:text-rose-200/80">No synced dates for this month yet.</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-rose-200/80 mb-2">
                          Select a topic
                        </label>
                        <div ref={topicDropdownRef} className="relative">
                          <button
                            type="button"
                            onClick={() => setTopicDropdownOpen((open) => !open)}
                            className="w-full rounded-lg border border-zinc-300 dark:border-rose-900/80 bg-white dark:bg-[#2a111c] px-3 py-2 text-sm text-zinc-800 dark:text-rose-50 outline-none focus:ring-2 focus:ring-zinc-400/35 dark:focus:ring-rose-400/35 inline-flex items-center justify-between gap-2"
                          >
                            <span className="truncate text-left font-semibold">{selectedTopic}</span>
                            <ChevronDown className={`w-4 h-4 text-zinc-500 dark:text-rose-200 transition-transform ${topicDropdownOpen ? "rotate-180" : ""}`} />
                          </button>

                          <AnimatePresence>
                            {topicDropdownOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="absolute left-0 right-0 z-20 mt-2 max-h-72 overflow-y-auto rounded-xl border border-zinc-300/90 dark:border-rose-900/85 bg-white dark:bg-[#2a111c] shadow-2xl"
                              >
                                {topicGroups.map((group) => (
                                  <div key={group.title} className="p-2">
                                    <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-rose-200/80">
                                      {group.title}
                                    </p>
                                    <div className="space-y-1">
                                      {group.topics.map((topic) => {
                                        const isSelected = topic === selectedTopic;
                                        return (
                                          <button
                                            key={`${group.title}-${topic}`}
                                            type="button"
                                            onClick={() => {
                                              setSelectedTopic(topic);
                                              setTopicDropdownOpen(false);
                                            }}
                                            className={`w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors inline-flex items-center justify-between ${isSelected
                                              ? "bg-zinc-900 text-white dark:bg-rose-300 dark:text-rose-950"
                                              : "text-zinc-700 dark:text-rose-100 hover:bg-zinc-100 dark:hover:bg-rose-900/45"
                                              }`}
                                          >
                                            <span className="truncate">{topic}</span>
                                            <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isSelected
                                              ? "bg-white/20 dark:bg-rose-100/35"
                                              : "bg-zinc-200 text-zinc-700 dark:bg-rose-900/55 dark:text-rose-100"
                                              }`}>
                                              {topicCounts[topic] || 0}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <p className="mt-2 text-xs text-zinc-500 dark:text-rose-200/80">
                          {topicsLoading ? "Refreshing topic map..." : "Choose a domain to browse editorials grouped by theme."}
                        </p>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="mt-4 text-xs leading-relaxed text-zinc-600 dark:text-rose-100/90">
                {browseMode === "date"
                  ? "Use date mode to browse the latest day and switch calendar dates."
                  : "Use topic mode to browse editorials by domain across dates."}
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
