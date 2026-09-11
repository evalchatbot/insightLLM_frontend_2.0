"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronDown, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
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
type DateSelectionMode = "single" | "range" | "multiple";
type ModalDateSelectionMode = Exclude<DateSelectionMode, "single">;
type TopicDateMode = "current" | "range" | "all";
type FactbookDatePayload = Awaited<ReturnType<typeof fetchFactbookEditorials>>;

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
  if (!date) {
    return "Unknown date";
  }

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

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

function sortDateStringsDesc(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => {
    if (a === b) {
      return 0;
    }
    return a < b ? 1 : -1;
  });
}

function getNormalizedDateRange(startDate: string, endDate: string): [string, string] {
  if (!startDate || !endDate) {
    return [startDate, endDate];
  }
  return startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
}

function buildDateRangeSelection(startDate: string, endDate: string, datePool: string[]): string[] {
  if (!startDate || !endDate || datePool.length === 0) {
    return [];
  }

  const [from, to] = getNormalizedDateRange(startDate, endDate);
  return sortDateStringsDesc(datePool.filter((dateValue) => dateValue >= from && dateValue <= to));
}

function sanitizePdfFileName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "factbook";
}

function filterEditorialsBySelectedDates(
  rows: FactbookEditorial[],
  dateSelectionMode: DateSelectionMode,
  selectedDate: string,
  normalizedRangeDates: string[],
  normalizedSelectedDates: string[]
): FactbookEditorial[] {
  if (dateSelectionMode === "range") {
    const dateSet = new Set(normalizedRangeDates);
    return rows.filter((row) => dateSet.has(row.publication_date));
  }

  if (dateSelectionMode === "multiple") {
    const dateSet = new Set(normalizedSelectedDates);
    return rows.filter((row) => dateSet.has(row.publication_date));
  }

  return rows.filter((row) => row.publication_date === selectedDate);
}

function generateFactbookPdf(
  rows: FactbookEditorial[],
  options: {
    title: string;
    subtitle: string;
    fileName: string;
  }
): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 42;
  const marginY = 48;
  const contentWidth = pageWidth - marginX * 2;
  const columnGap = 24;
  const columnWidth = (contentWidth - columnGap) / 2;
  const bottomLimit = pageHeight - marginY;

  const INK: [number, number, number] = [17, 24, 39];
  const MUTED: [number, number, number] = [100, 116, 139];
  const RULE: [number, number, number] = [226, 232, 240];
  const BRAND: [number, number, number] = [178, 34, 34]; // #b22222 rubric red
  const CREAM: [number, number, number] = [228, 226, 221]; // #e4e2dd logo mark

  let currentColumn = 0;
  let columnTopY = marginY;
  let cursorY = marginY;
  const getColumnX = () => marginX + currentColumn * (columnWidth + columnGap);

  // rubric.ai watermark (logo mark + wordmark) in the top-right of every page.
  const drawWatermark = () => {
    const s = 14; // logo square size (pt)
    const label = "rubric.ai";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const labelW = doc.getTextWidth(label);
    const gap = 5;
    const totalW = s + gap + labelW;
    const x = pageWidth - marginX - totalW;
    const yTop = 20; // sits inside the top margin band, above content

    const anyDoc = doc as any;
    anyDoc.saveGraphicsState?.();
    if (anyDoc.GState && anyDoc.setGState) {
      anyDoc.setGState(new anyDoc.GState({ opacity: 0.5 }));
    }

    // brand square
    doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
    doc.roundedRect(x, yTop, s, s, 2, 2, "F");

    // cream "r" mark (stem + offset dot) from the real logo geometry
    doc.setFillColor(CREAM[0], CREAM[1], CREAM[2]);
    const gh = 0.64 * s;
    const gw = 0.513 * s;
    const gLeft = x + (s - gw) / 2;
    const gTop = yTop + (s - gh) / 2;
    doc.rect(gLeft, gTop + 0.026 * gh, 0.4527 * gw, 0.974 * gh, "F");
    doc.circle(gLeft + 0.779 * gw, gTop + 0.177 * gh, 0.177 * gh, "F");

    // wordmark
    doc.setTextColor(BRAND[0], BRAND[1], BRAND[2]);
    doc.text(label, x + s + gap, yTop + s * 0.72);

    anyDoc.restoreGraphicsState?.();
  };

  const newPage = () => {
    doc.addPage();
    drawWatermark();
    currentColumn = 0;
    columnTopY = marginY;
    cursorY = marginY;
  };

  const nextColumn = () => {
    if (currentColumn === 0) {
      currentColumn = 1;
      cursorY = columnTopY;
    } else {
      newPage();
    }
  };

  type LineItem = {
    lines: string[];
    fontSize: number;
    lineGap: number;
    bold: boolean;
    color: [number, number, number];
    gapAfter: number;
  };

  // Pre-split an editorial into measured line-items so the whole block can be
  // placed at once (avoids the text overlap caused by splitting blocks mid-flow).
  const buildBlock = (row: FactbookEditorial): LineItem[] => {
    const items: LineItem[] = [];
    const push = (
      text: string,
      fontSize: number,
      lineGap: number,
      bold: boolean,
      color: [number, number, number],
      gapAfter = 0
    ) => {
      const t = (text || "").trim();
      if (!t) return;
      doc.setFont("times", bold ? "bold" : "normal");
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(t, columnWidth) as string[];
      items.push({ lines, fontSize, lineGap, bold, color, gapAfter });
    };
    push(`${formatDate(row.publication_date)}  |  ${row.topic_domain || "Other"}`, 8.8, 12, true, MUTED, 3);
    // Headline only — no "COMPREHENSIVE EDITORIAL SUMMARY:" prefix.
    push((row.headline || "Untitled Editorial").toUpperCase(), 12.5, 15, true, INK, 5);
    (row.summary_bullets || []).slice(0, 3).forEach((bullet) => push(`•  ${bullet}`, 9.8, 13, false, INK, 3));
    if (row.takeaway) push(`Takeaway: ${row.takeaway}`, 9.8, 13, false, INK, 0);
    return items;
  };

  const blockHeight = (items: LineItem[]) =>
    items.reduce((h, it) => h + it.lines.length * it.lineGap + it.gapAfter, 0);

  const drawItems = (items: LineItem[]) => {
    items.forEach((it) => {
      doc.setFont("times", it.bold ? "bold" : "normal");
      doc.setFontSize(it.fontSize);
      doc.setTextColor(it.color[0], it.color[1], it.color[2]);
      const x = getColumnX();
      it.lines.forEach((line) => {
        // fallback for a block longer than a full column: flow to the next
        if (cursorY + it.lineGap > bottomLimit) nextColumn();
        doc.text(line, x, cursorY + it.fontSize * 0.78);
        cursorY += it.lineGap;
      });
      cursorY += it.gapAfter;
    });
  };

  // Header (first page)
  drawWatermark();
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  (doc.splitTextToSize(options.title, contentWidth) as string[]).forEach((line) => {
    doc.text(line, marginX, cursorY + 20 * 0.78);
    cursorY += 24;
  });
  cursorY += 2;
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  (doc.splitTextToSize(options.subtitle, contentWidth) as string[]).forEach((line) => {
    doc.text(line, marginX, cursorY + 11 * 0.78);
    cursorY += 15;
  });
  cursorY += 16;
  columnTopY = cursorY;

  rows.forEach((row) => {
    const items = buildBlock(row);
    const h = blockHeight(items);
    const columnCapacity = bottomLimit - columnTopY;

    // Place each editorial as a single block; if it won't fit in the rest of the
    // current column (but fits in a fresh one), move first so blocks never overlap.
    if (cursorY + h > bottomLimit && h <= columnCapacity) {
      nextColumn();
    }

    drawItems(items);

    // divider between editorials within a column
    cursorY += 8;
    if (cursorY < bottomLimit) {
      doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
      doc.setLineWidth(0.8);
      doc.line(getColumnX(), cursorY, getColumnX() + columnWidth, cursorY);
    }
    cursorY += 14;
  });

  // End-of-PDF appendix: compact date summary for readers who skip the full digest.
  drawDateSummaryAppendix(doc, rows, {
    pageWidth,
    pageHeight,
    marginX,
    marginY,
    contentWidth,
    ink: INK,
    muted: MUTED,
    rule: RULE,
    brand: BRAND,
    cream: CREAM,
    drawWatermark,
  });

  doc.save(`${sanitizePdfFileName(options.fileName)}.pdf`);
}

function drawDateSummaryAppendix(
  doc: jsPDF,
  rows: FactbookEditorial[],
  layout: {
    pageWidth: number;
    pageHeight: number;
    marginX: number;
    marginY: number;
    contentWidth: number;
    ink: [number, number, number];
    muted: [number, number, number];
    rule: [number, number, number];
    brand: [number, number, number];
    cream: [number, number, number];
    drawWatermark: () => void;
  }
): void {
  if (!rows.length) return;

  const {
    pageWidth,
    pageHeight,
    marginX,
    marginY,
    contentWidth,
    ink,
    muted,
    rule,
    brand,
    drawWatermark,
  } = layout;
  const bottomLimit = pageHeight - marginY;

  // Group by publication date (ascending) so the appendix reads chronologically.
  const byDate = new Map<string, FactbookEditorial[]>();
  for (const row of rows) {
    const key = row.publication_date || "unknown";
    const bucket = byDate.get(key) || [];
    bucket.push(row);
    byDate.set(key, bucket);
  }
  const dates = Array.from(byDate.keys()).sort();

  const ensureSpace = (needed: number, y: number): number => {
    if (y + needed <= bottomLimit) return y;
    doc.addPage();
    drawWatermark();
    return marginY;
  };

  doc.addPage();
  drawWatermark();
  let y = marginY;

  // Appendix header
  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.text("Quick Summary by Date", marginX, y + 18 * 0.78);
  y += 26;

  doc.setFont("times", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  const overview = `${rows.length} editorial${rows.length === 1 ? "" : "s"} across ${dates.length} date${
    dates.length === 1 ? "" : "s"
  } — skim this table if you do not want to read the full digest above.`;
  (doc.splitTextToSize(overview, contentWidth) as string[]).forEach((line) => {
    doc.text(line, marginX, y + 10.5 * 0.78);
    y += 14;
  });
  y += 10;

  // Accent rule under header
  doc.setDrawColor(brand[0], brand[1], brand[2]);
  doc.setLineWidth(1.2);
  doc.line(marginX, y, marginX + contentWidth, y);
  y += 16;

  // Column layout for table rows
  const colTopicW = 92;
  const colHeadlineW = contentWidth * 0.38;
  const colTakeawayX = marginX + colTopicW + colHeadlineW + 12;
  const colTakeawayW = marginX + contentWidth - colTakeawayX;

  for (const dateKey of dates) {
    const items = byDate.get(dateKey) || [];
    y = ensureSpace(36, y);

    // Date section banner
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(marginX, y - 4, contentWidth, 22, 3, 3, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(brand[0], brand[1], brand[2]);
    doc.text(formatDate(dateKey), marginX + 8, y + 11);
    doc.setFont("times", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    const countLabel = `${items.length} item${items.length === 1 ? "" : "s"}`;
    doc.text(countLabel, marginX + contentWidth - 8 - doc.getTextWidth(countLabel), y + 11);
    y += 28;

    // Column headers (once per date group)
    y = ensureSpace(18, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text("TOPIC", marginX, y);
    doc.text("HEADLINE", marginX + colTopicW + 6, y);
    doc.text("TAKEAWAY", colTakeawayX, y);
    y += 6;
    doc.setDrawColor(rule[0], rule[1], rule[2]);
    doc.setLineWidth(0.6);
    doc.line(marginX, y, marginX + contentWidth, y);
    y += 10;

    items.forEach((row, idx) => {
      const topic = (row.topic_domain || "Other").trim() || "Other";
      const headline = (row.headline || "Untitled Editorial").trim();
      const takeaway = (row.takeaway || (row.summary_bullets || [])[0] || "—").trim();

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const topicLines = doc.splitTextToSize(topic, colTopicW - 4) as string[];
      const headlineLines = doc.splitTextToSize(headline, colHeadlineW - 4) as string[];
      const takeawayLines = doc.splitTextToSize(takeaway, colTakeawayW - 2) as string[];
      const lineCount = Math.max(topicLines.length, headlineLines.length, takeawayLines.length, 1);
      const rowH = lineCount * 11 + 8;

      y = ensureSpace(rowH, y);

      // Alternating row tint for readability
      if (idx % 2 === 0) {
        doc.setFillColor(252, 252, 251);
        doc.rect(marginX, y - 3, contentWidth, rowH - 2, "F");
      }

      doc.setTextColor(ink[0], ink[1], ink[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      topicLines.forEach((line, i) => {
        doc.text(line, marginX, y + 8 + i * 11);
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      headlineLines.forEach((line, i) => {
        doc.text(line, marginX + colTopicW + 6, y + 8 + i * 11);
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(muted[0], muted[1], muted[2]);
      takeawayLines.forEach((line, i) => {
        doc.text(line, colTakeawayX, y + 8 + i * 11);
      });

      y += rowH;
      doc.setDrawColor(rule[0], rule[1], rule[2]);
      doc.setLineWidth(0.4);
      doc.line(marginX, y - 4, marginX + contentWidth, y - 4);
    });

    y += 12;
  }

  // Footer note on last appendix content
  y = ensureSpace(24, y);
  doc.setFont("times", "italic");
  doc.setFontSize(9);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text("Generated by Rubric.ai Factbook — summary appendix", marginX, y + 9);
}

function mergeEditorialRows(editorialGroups: FactbookEditorial[][]): FactbookEditorial[] {
  const deduped = new Map<string, FactbookEditorial>();

  for (const rows of editorialGroups) {
    for (const editorial of rows || []) {
      const key = editorial.id || `${editorial.publication_date}::${editorial.headline}`;
      if (!deduped.has(key)) {
        deduped.set(key, editorial);
      }
    }
  }

  return Array.from(deduped.values()).sort((left, right) => {
    if (left.publication_date !== right.publication_date) {
      return left.publication_date < right.publication_date ? 1 : -1;
    }
    return (left.headline || "").localeCompare(right.headline || "");
  });
}

export default function FactBookPage() {
  const [browseMode, setBrowseMode] = useState<BrowseMode>("date");
  const [dateSelectionMode, setDateSelectionMode] = useState<DateSelectionMode>("single");
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalIsoDate());
  const [autoDateSelection, setAutoDateSelection] = useState<boolean>(true);
  const [rangeStartDate, setRangeStartDate] = useState<string>(() => getLocalIsoDate());
  const [rangeEndDate, setRangeEndDate] = useState<string>(() => getLocalIsoDate());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectionModalOpen, setSelectionModalOpen] = useState(false);
  const [modalSelectionMode, setModalSelectionMode] = useState<ModalDateSelectionMode>("range");
  const [modalRangeStartDate, setModalRangeStartDate] = useState<string>(() => getLocalIsoDate());
  const [modalRangeEndDate, setModalRangeEndDate] = useState<string>(() => getLocalIsoDate());
  const [modalSelectedDates, setModalSelectedDates] = useState<string[]>([]);
  const [modalDateSearch, setModalDateSearch] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [topicDateMode, setTopicDateMode] = useState<TopicDateMode>("current");
  const [editorials, setEditorials] = useState<FactbookEditorial[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);
  const [allAvailableDates, setAllAvailableDates] = useState<string[]>([]);
  const [allDatesLoading, setAllDatesLoading] = useState(false);
  const [topicGroups, setTopicGroups] = useState<FactbookTopicGroup[]>(FALLBACK_TOPIC_GROUPS);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [pdfExportError, setPdfExportError] = useState<string | null>(null);
  // Tier gating: Free users may only view today's editorials (no date/topic controls).
  // null = unknown (loading), true = Pro, false = Free.
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const editorialCacheRef = useRef<Map<string, FactbookEditorial[]>>(new Map());
  const topicDropdownRef = useRef<HTMLDivElement | null>(null);

  // Resolve the user's tier once on mount. Fail closed (treat as Free) on error.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/pro/status");
        const data = await res.json().catch(() => ({} as any));
        if (!cancelled) setIsPro(Boolean(data?.isPro));
      } catch {
        if (!cancelled) setIsPro(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Free tier: force the view to today's editorials only (single date, no topic).
  useEffect(() => {
    if (isPro === false) {
      setBrowseMode("date");
      setDateSelectionMode("single");
      setAutoDateSelection(true);
      setSelectedDate(getLocalIsoDate());
      setSelectedTopic("");
    }
  }, [isPro]);

  const selectedMonth = useMemo(() => selectedDate.slice(0, 7), [selectedDate]);
  const normalizedSelectedDates = useMemo(() => sortDateStringsDesc(selectedDates), [selectedDates]);
  const normalizedRange = useMemo(() => getNormalizedDateRange(rangeStartDate, rangeEndDate), [rangeEndDate, rangeStartDate]);
  const normalizedRangeDates = useMemo(
    () => buildDateRangeSelection(normalizedRange[0], normalizedRange[1], allAvailableDates),
    [allAvailableDates, normalizedRange]
  );

  const activeDateFilterKey = useMemo(() => {
    if (dateSelectionMode === "single") {
      return autoDateSelection ? "date:auto" : `date:${selectedDate}`;
    }
    if (dateSelectionMode === "range") {
      return `date:range:${normalizedRange[0]}:${normalizedRange[1]}`;
    }
    return `date:multiple:${normalizedSelectedDates.join(",")}`;
  }, [autoDateSelection, dateSelectionMode, normalizedRange, normalizedSelectedDates, selectedDate]);

  const displayedEditorials = useMemo(() => {
    if (browseMode !== "topic") {
      return editorials;
    }

    if (topicDateMode === "all") {
      return editorials;
    }

    return filterEditorialsBySelectedDates(
      editorials,
      dateSelectionMode,
      selectedDate,
      normalizedRangeDates,
      normalizedSelectedDates
    );
  }, [
    browseMode,
    dateSelectionMode,
    editorials,
    normalizedRangeDates,
    normalizedSelectedDates,
    topicDateMode,
    selectedDate,
  ]);

  const activeFilterKey = browseMode === "date"
    ? activeDateFilterKey
    : `topic:${selectedTopic}:${topicDateMode}:${dateSelectionMode}:${selectedDate}:${rangeStartDate}:${rangeEndDate}:${selectedDates.join(",")}`;

  const editorialRows = useMemo(
    () =>
      displayedEditorials.map((editorial, index) => ({
        ...editorial,
        cardId: `${activeFilterKey}-${index}`,
      })),
    [activeFilterKey, displayedEditorials]
  );

  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates]);

  const monthDateRows = useMemo(
    () => availableDates.filter((dateValue) => dateValue.startsWith(`${selectedMonth}-`)).sort(),
    [availableDates, selectedMonth]
  );

  const dateSelectionDisplay = useMemo(() => {
    if (dateSelectionMode === "single") {
      return autoDateSelection ? `Latest available (${formatDate(selectedDate)})` : formatDate(selectedDate);
    }

    if (dateSelectionMode === "range") {
      return `${formatDate(normalizedRange[0])} to ${formatDate(normalizedRange[1])}`;
    }

    if (normalizedSelectedDates.length === 0) {
      return "No dates selected";
    }

    if (normalizedSelectedDates.length === 1) {
      return formatDate(normalizedSelectedDates[0]);
    }

    return `${normalizedSelectedDates.length} selected dates`;
  }, [autoDateSelection, dateSelectionMode, normalizedRange, normalizedSelectedDates, selectedDate]);

  const dateLoadingLabel = useMemo(() => {
    if (dateSelectionMode === "single") {
      return formatDate(selectedDate);
    }
    if (dateSelectionMode === "range") {
      return `${formatDate(normalizedRange[0])} to ${formatDate(normalizedRange[1])}`;
    }
    if (normalizedSelectedDates.length === 0) {
      return "selected dates";
    }
    return `${normalizedSelectedDates.length} selected dates`;
  }, [dateSelectionMode, normalizedRange, normalizedSelectedDates, selectedDate]);

  const modalRangePreviewDates = useMemo(
    () => buildDateRangeSelection(modalRangeStartDate, modalRangeEndDate, allAvailableDates),
    [allAvailableDates, modalRangeEndDate, modalRangeStartDate]
  );

  const filteredModalDateOptions = useMemo(() => {
    const query = modalDateSearch.trim();
    if (!query) {
      return allAvailableDates;
    }

    return allAvailableDates.filter((dateValue) => dateValue.includes(query));
  }, [allAvailableDates, modalDateSearch]);

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
    if (!selectionModalOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectionModalOpen(false);
        setModalError(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectionModalOpen]);

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
    if (browseMode !== "date" || dateSelectionMode !== "single") {
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
        setAvailableDates(sortDateStringsDesc(dates));
        setAllAvailableDates((currentDates) => sortDateStringsDesc([...currentDates, ...dates]));
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
  }, [browseMode, dateSelectionMode, selectedMonth]);

  useEffect(() => {
    if (browseMode !== "date") {
      return;
    }

    let isMounted = true;

    const loadAllEditorialDates = async () => {
      setAllDatesLoading(true);
      try {
        const allDates = await fetchFactbookEditorialDates(undefined, { bypassCache: true });
        if (!isMounted) {
          return;
        }
        const normalized = sortDateStringsDesc(allDates);
        setAllAvailableDates(normalized);

        if (dateSelectionMode === "multiple") {
          setSelectedDates((currentDates) => currentDates.filter((dateValue) => normalized.includes(dateValue)));
        }
      } catch {
        if (!isMounted) {
          return;
        }
        setAllAvailableDates((currentDates) => currentDates);
      } finally {
        if (isMounted) {
          setAllDatesLoading(false);
        }
      }
    };

    loadAllEditorialDates();

    return () => {
      isMounted = false;
    };
  }, [browseMode, dateSelectionMode]);

  useEffect(() => {
    if (browseMode !== "date" || dateSelectionMode !== "single" || availableDates.length === 0) {
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
  }, [availableDates, browseMode, dateSelectionMode]);

  useEffect(() => {
    let isMounted = true;

    const loadEditorials = async () => {
      const cacheKey = browseMode === "date"
        ? activeDateFilterKey
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
          if (dateSelectionMode === "single") {
            const payload = await fetchFactbookEditorials(autoDateSelection ? undefined : selectedDate);
            if (!isMounted) {
              return;
            }

            const resolvedDate = payload.date || selectedDate;
            const rows = payload.editorials || [];

            editorialCacheRef.current.set(`date:${resolvedDate}`, rows);
            editorialCacheRef.current.set("date:auto", rows);
            editorialCacheRef.current.set(cacheKey, rows);
            setEditorials(rows);
            setExpandedCardId(null);

            if (autoDateSelection && resolvedDate !== selectedDate) {
              setSelectedDate(resolvedDate);
            }

            return;
          }

          const targetDates = dateSelectionMode === "range" ? normalizedRangeDates : normalizedSelectedDates;

          if (targetDates.length === 0) {
            editorialCacheRef.current.set(cacheKey, []);
            setEditorials([]);
            setExpandedCardId(null);
            return;
          }

          const settledResults = await Promise.allSettled(
            targetDates.map((dateValue) => fetchFactbookEditorials(dateValue))
          );

          const successfulPayloads: FactbookDatePayload[] = settledResults
            .filter((result): result is PromiseFulfilledResult<FactbookDatePayload> => result.status === "fulfilled")
            .map((result) => result.value);

          if (!successfulPayloads.length) {
            const firstFailure = settledResults.find(
              (result): result is PromiseRejectedResult => result.status === "rejected"
            );
            throw firstFailure?.reason || new Error("Failed to fetch editorials for selected dates.");
          }

          const mergedRows = mergeEditorialRows(successfulPayloads.map((payload) => payload.editorials || []));
          editorialCacheRef.current.set(cacheKey, mergedRows);
          setEditorials(mergedRows);
          setExpandedCardId(null);
          return;
        }

        const response = await fetchFactbookEditorialsByTopic(selectedTopic, 500);
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
        setError(err?.message || "Failed to load editorials for selected filters.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (browseMode === "date" || (browseMode === "topic" && selectedTopic)) {
      void loadEditorials();
    }

    return () => {
      isMounted = false;
    };
  }, [
    activeDateFilterKey,
    autoDateSelection,
    browseMode,
    dateSelectionMode,
    normalizedRangeDates,
    normalizedSelectedDates,
    selectedDate,
    selectedTopic,
  ]);

  const switchToSingleDate = (dateValue?: string, useAuto = false) => {
    setDateSelectionMode("single");
    setSelectedDates([]);
    setModalError(null);

    if (useAuto) {
      setAutoDateSelection(true);
      setSelectedDate(getLocalIsoDate());
      return;
    }

    if (dateValue) {
      setSelectedDate(dateValue);
    }
    setAutoDateSelection(false);
  };

  const openSelectionModal = () => {
    const nextMode: ModalDateSelectionMode = dateSelectionMode === "single" ? "range" : dateSelectionMode;
    setModalSelectionMode(nextMode);

    const [nextRangeStart, nextRangeEnd] = getNormalizedDateRange(
      dateSelectionMode === "range" ? rangeStartDate : selectedDate,
      dateSelectionMode === "range" ? rangeEndDate : selectedDate
    );

    setModalRangeStartDate(nextRangeStart || getLocalIsoDate());
    setModalRangeEndDate(nextRangeEnd || getLocalIsoDate());
    setModalSelectedDates(
      sortDateStringsDesc(
        dateSelectionMode === "multiple" && selectedDates.length > 0
          ? selectedDates
          : selectedDate
            ? [selectedDate]
            : []
      )
    );
    setModalDateSearch("");
    setModalError(null);
    setSelectionModalOpen(true);
  };

  const toggleModalSelectedDate = (dateValue: string) => {
    setModalSelectedDates((currentDates) => {
      if (currentDates.includes(dateValue)) {
        return currentDates.filter((entry) => entry !== dateValue);
      }
      return sortDateStringsDesc([...currentDates, dateValue]);
    });
    setModalError(null);
  };

  const applySelectionModal = () => {
    setModalError(null);

    if (modalSelectionMode === "range") {
      const [nextRangeStart, nextRangeEnd] = getNormalizedDateRange(modalRangeStartDate, modalRangeEndDate);
      if (!nextRangeStart || !nextRangeEnd) {
        setModalError("Select both start and end dates.");
        return;
      }

      setDateSelectionMode("range");
      setAutoDateSelection(false);
      setRangeStartDate(nextRangeStart);
      setRangeEndDate(nextRangeEnd);
      setSelectionModalOpen(false);
      return;
    }

    const normalizedDates = sortDateStringsDesc(modalSelectedDates);
    if (normalizedDates.length === 0) {
      setModalError("Select at least one date.");
      return;
    }

    setDateSelectionMode("multiple");
    setAutoDateSelection(false);
    setSelectedDates(normalizedDates);
    setSelectionModalOpen(false);
  };

  const switchBrowseMode = (nextMode: BrowseMode) => {
    if (nextMode === browseMode) {
      return;
    }

    setBrowseMode(nextMode);
    setExpandedCardId(null);
    setError(null);
    setTopicDropdownOpen(false);
    setFilterPanelOpen(true);
    setSelectionModalOpen(false);
    setModalError(null);

    if (nextMode === "date") {
      switchToSingleDate(undefined, true);
      return;
    }

    setTopicDateMode("current");
  };

  const handleDownloadCurrentPdf = async () => {
    if (!displayedEditorials.length) {
      setPdfExportError("There are no editorials in the current selection to export.");
      return;
    }

    try {
      setIsPdfExporting(true);
      setPdfExportError(null);

      const title = browseMode === "date"
        ? "Fact Book - Selected Dates"
        : topicDateMode === "all"
          ? `Fact Book - ${selectedTopic} (All Time)`
          : `Fact Book - ${selectedTopic}`;

      const subtitle = browseMode === "date"
        ? `Selection: ${dateSelectionDisplay}`
        : topicDateMode === "all"
          ? `Topic: ${selectedTopic} | Selection: All Time`
          : `Topic: ${selectedTopic} | Selection: ${dateSelectionDisplay}`;

      const fileName = browseMode === "date"
        ? `factbook-${dateSelectionMode}-${selectedDate}`
        : topicDateMode === "all"
          ? `factbook-${sanitizePdfFileName(selectedTopic)}-all-time`
          : `factbook-${sanitizePdfFileName(selectedTopic)}-filtered`;

      generateFactbookPdf(displayedEditorials, { title, subtitle, fileName });
    } catch (downloadError: any) {
      setPdfExportError(downloadError?.message || "Unable to generate the PDF right now.");
    } finally {
      setIsPdfExporting(false);
    }
  };

  const handleDownloadTopicPdf = async () => {
    if (browseMode !== "topic" || !selectedTopic) {
      return;
    }

    if (!editorials.length) {
      setPdfExportError("No topic editorials are available to export yet.");
      return;
    }

    try {
      setIsPdfExporting(true);
      setPdfExportError(null);

      generateFactbookPdf(editorials, {
        title: `Fact Book - ${selectedTopic} (Complete Topic)`,
        subtitle: `Complete topic export for ${selectedTopic}`,
        fileName: `factbook-${sanitizePdfFileName(selectedTopic)}-complete`,
      });
    } catch (downloadError: any) {
      setPdfExportError(downloadError?.message || "Unable to generate the PDF right now.");
    } finally {
      setIsPdfExporting(false);
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
              {browseMode === "date"
                ? dateSelectionMode === "single"
                  ? "Editorials by Date"
                  : dateSelectionMode === "range"
                    ? "Editorials by Date Range"
                    : "Editorials by Multiple Dates"
                : selectedTopic
                  ? topicDateMode === "all"
                    ? `Topic: ${selectedTopic} | All Time`
                    : `Topic: ${selectedTopic}`
                  : "Choose a Topic"}
            </div>
          </div>
        </motion.section>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          <section className="order-2 xl:order-1 space-y-4">
            {isLoading && (
              <div className="rounded-2xl border border-zinc-200 dark:border-rose-900/70 bg-white/92 dark:bg-rose-950/28 p-5 flex items-center gap-3 text-zinc-700 dark:text-rose-100">
                <Loader2 className="w-5 h-5 animate-spin" />
                {browseMode === "date"
                  ? `Loading editorials for ${dateLoadingLabel}...`
                  : selectedTopic
                    ? `Loading editorials for topic ${selectedTopic}...`
                    : "Choose a topic to load editorials."}
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
                  ? dateSelectionMode === "single"
                    ? `No editorials available for ${formatDate(selectedDate)} yet.`
                    : dateSelectionMode === "range"
                      ? `No editorials available between ${formatDate(normalizedRange[0])} and ${formatDate(normalizedRange[1])} yet.`
                      : "No editorials available for the selected dates yet."
                  : selectedTopic
                    ? `No editorials available for topic ${selectedTopic} yet.`
                    : "Choose a topic to browse editorials by domain."}
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
                                Summary Points
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

          {isPro === true && (
          <aside className="order-1 xl:order-2 xl:sticky xl:top-28">
            <div className="rounded-3xl border border-zinc-200/80 dark:border-rose-900/70 bg-white/94 dark:bg-[#220f1a]/86 backdrop-blur-xl p-5 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.28)] dark:shadow-[0_22px_54px_-34px_rgba(159,18,57,0.45)]">
              <div className="mb-4 border-b border-zinc-200/80 pb-3 dark:border-rose-900/70">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-rose-200/80">
                  Topic
                </p>
                <h3 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-rose-50">
                  Select a topic
                </h3>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-rose-200/80">
                    {browseMode === "date" ? "Date Filters" : "Selected Topic"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-rose-50">
                    {browseMode === "date"
                      ? dateSelectionDisplay
                      : selectedTopic
                        ? topicDateMode === "all" ? "All Time" : dateSelectionDisplay
                        : "No topic selected"}
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
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => switchBrowseMode("date")}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${browseMode === "date"
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-rose-200 dark:bg-rose-200 dark:text-rose-950"
                          : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-rose-900/80 dark:text-rose-100 dark:hover:bg-rose-900/40"
                          }`}
                      >
                        Current Editorials
                      </button>
                      <button
                        type="button"
                        onClick={() => switchBrowseMode("topic")}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${browseMode === "topic"
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-rose-200 dark:bg-rose-200 dark:text-rose-950"
                          : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-rose-900/80 dark:text-rose-100 dark:hover:bg-rose-900/40"
                          }`}
                      >
                        Browse Topics
                      </button>
                    </div>

                    {browseMode === "date" ? (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => switchToSingleDate(undefined, true)}
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${dateSelectionMode === "single"
                              ? "border-zinc-900 bg-zinc-900 text-white dark:border-rose-200 dark:bg-rose-200 dark:text-rose-950"
                              : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-rose-900/80 dark:text-rose-100 dark:hover:bg-rose-900/40"
                              }`}
                          >
                            Latest Day
                          </button>
                          <button
                            type="button"
                            onClick={openSelectionModal}
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${dateSelectionMode === "single"
                              ? "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-rose-900/80 dark:text-rose-100 dark:hover:bg-rose-900/40"
                              : "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:border-rose-300 dark:bg-rose-300/20 dark:text-rose-100"
                              }`}
                          >
                            Range / Multi
                          </button>
                        </div>

                        <div className="mt-3 rounded-lg border border-zinc-200 dark:border-rose-900/70 bg-zinc-50/70 dark:bg-rose-950/30 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-zinc-500 dark:text-rose-200/80">
                            Active selection
                          </p>
                          <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-rose-50">
                            {dateSelectionDisplay}
                          </p>

                          {dateSelectionMode === "range" && (
                            <p className="mt-2 text-xs text-zinc-600 dark:text-rose-100/80">
                              {normalizedRangeDates.length} synced dates found inside this range.
                            </p>
                          )}

                          {dateSelectionMode === "multiple" && (
                            <>
                              <p className="mt-2 text-xs text-zinc-600 dark:text-rose-100/80">
                                {normalizedSelectedDates.length} dates selected.
                              </p>
                              {normalizedSelectedDates.length > 0 && (
                                <div className="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
                                  {normalizedSelectedDates.slice(0, 18).map((dateValue) => (
                                    <span
                                      key={`selected-${dateValue}`}
                                      className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700 dark:border-rose-900/75 dark:text-rose-100"
                                    >
                                      {dateValue}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </>
                          )}

                          {allDatesLoading && (
                            <p className="mt-2 text-xs text-zinc-500 dark:text-rose-200/80">
                              Refreshing synced dates...
                            </p>
                          )}
                        </div>

                        {dateSelectionMode === "single" && (
                          <>
                            <label htmlFor="factbook-date" className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-rose-200/80 mb-2">
                              Pick a date
                            </label>
                            <input
                              id="factbook-date"
                              type="date"
                              value={selectedDate}
                              onChange={(event) => {
                                switchToSingleDate(event.target.value);
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
                                        switchToSingleDate(dateValue);
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
                        )}

                        {dateSelectionMode !== "single" && (
                          <p className="mt-3 text-xs text-zinc-600 dark:text-rose-100/80">
                            {dateSelectionMode === "range"
                              ? "Showing merged editorials for each synced date inside the selected range."
                              : "Showing merged editorials for all selected dates."}
                          </p>
                        )}
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
                            <span className="truncate text-left font-semibold">{selectedTopic || "Choose a topic"}</span>
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
                                              setBrowseMode("topic");
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

                        <div className="mt-4 rounded-2xl border border-zinc-200 dark:border-rose-900/70 bg-zinc-50/80 dark:bg-rose-950/30 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-zinc-500 dark:text-rose-200/80">
                            Topic date filter
                          </p>
                          <p className="mt-1 text-sm font-semibold text-zinc-800 dark:text-rose-50">
                            {topicDateMode === "all"
                              ? "All Time"
                              : dateSelectionDisplay}
                          </p>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setTopicDateMode("current");
                                setDateSelectionMode("single");
                                setSelectedDates([]);
                                setAutoDateSelection(true);
                              }}
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${topicDateMode === "current"
                                ? "border-zinc-900 bg-zinc-900 text-white dark:border-rose-200 dark:bg-rose-200 dark:text-rose-950"
                                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-rose-900/80 dark:text-rose-100 dark:hover:bg-rose-900/40"
                                }`}
                            >
                              Current
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTopicDateMode("range");
                                openSelectionModal();
                              }}
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${topicDateMode === "range"
                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:border-rose-300 dark:bg-rose-300/20 dark:text-rose-100"
                                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-rose-900/80 dark:text-rose-100 dark:hover:bg-rose-900/40"
                                }`}
                            >
                              Date Range
                            </button>
                            <button
                              type="button"
                              onClick={() => setTopicDateMode("all")}
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${topicDateMode === "all"
                                ? "border-zinc-900 bg-zinc-900 text-white dark:border-rose-200 dark:bg-rose-200 dark:text-rose-950"
                                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-rose-900/80 dark:text-rose-100 dark:hover:bg-rose-900/40"
                                }`}
                            >
                              All Time
                            </button>
                          </div>

                          {topicDateMode === "range" && (
                            <p className="mt-2 text-xs text-zinc-600 dark:text-rose-100/80">
                              {normalizedRangeDates.length} synced dates found inside this range.
                            </p>
                          )}

                          {topicDateMode === "current" && dateSelectionMode === "multiple" && (
                            <p className="mt-2 text-xs text-zinc-600 dark:text-rose-100/80">
                              {normalizedSelectedDates.length} dates selected for this topic.
                            </p>
                          )}
                        </div>

                        <p className="mt-2 text-xs text-zinc-500 dark:text-rose-200/80">
                          {topicsLoading ? "Refreshing topic map..." : "Choose a domain to browse editorials grouped by theme and filter by date."}
                        </p>
                      </>
                    )}

                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDownloadCurrentPdf()}
                        disabled={isPdfExporting || !displayedEditorials.length}
                        className="rounded-xl border border-zinc-900 bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-200 dark:bg-rose-200 dark:text-rose-950"
                      >
                        {isPdfExporting ? "Generating PDF..." : "Download selected PDF"}
                      </button>

                      {browseMode === "topic" && selectedTopic && (
                        <button
                          type="button"
                          onClick={() => void handleDownloadTopicPdf()}
                          disabled={isPdfExporting || !editorials.length}
                          className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/80 dark:bg-[#2a111c] dark:text-rose-100 dark:hover:bg-rose-900/40"
                        >
                          Download complete topic PDF
                        </button>
                      )}
                    </div>

                    {pdfExportError && (
                      <p className="mt-3 rounded-xl border border-rose-300/80 bg-rose-50/85 px-3 py-2 text-xs text-rose-700 dark:border-rose-700/80 dark:bg-rose-950/45 dark:text-rose-100">
                        {pdfExportError}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="mt-4 text-xs leading-relaxed text-zinc-600 dark:text-rose-100/90">
                {browseMode === "date"
                  ? "Use date mode for single day, date range, or multiple-date selections from the advanced picker."
                  : topicDateMode === "all"
                    ? "All time shows every editorial for the selected topic."
                    : "Use topic mode to browse editorials by domain across dates."}
              </p>
            </div>
          </aside>
          )}

          {isPro === false && (
            <aside className="order-1 xl:order-2 xl:sticky xl:top-28">
              <div className="rounded-3xl border border-zinc-200/80 dark:border-rose-900/70 bg-white/94 dark:bg-[#220f1a]/86 backdrop-blur-xl p-5 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.28)] dark:shadow-[0_22px_54px_-34px_rgba(159,18,57,0.45)]">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-rose-200/80">
                  Today&apos;s Briefing
                </p>
                <h3 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-rose-50">
                  Free plan
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-rose-100/90">
                  You&apos;re viewing today&apos;s editorials. Upgrade to Pro to browse previous dates, date ranges, and topics.
                </p>
                <a
                  href="/"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-zinc-900 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 dark:border-rose-200 dark:bg-rose-200 dark:text-rose-950"
                >
                  Upgrade to Pro
                </a>
              </div>
            </aside>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectionModalOpen && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-[2px]"
              onClick={() => {
                setSelectionModalOpen(false);
                setModalError(null);
              }}
              aria-label="Close date selection modal"
            />

            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-xl rounded-3xl border border-zinc-200 bg-white/95 p-5 shadow-2xl dark:border-rose-900/80 dark:bg-[#220f1a]/95"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className={`${playfair.className} text-2xl leading-tight text-zinc-900 dark:text-rose-50`}>
                    Advanced Date Selection
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-rose-100/85">
                    Pick a synced date range or handpick multiple dates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectionModalOpen(false);
                    setModalError(null);
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-rose-900/80 dark:text-rose-100 dark:hover:bg-rose-900/45"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 inline-flex w-full rounded-xl border border-zinc-300 dark:border-rose-900/80 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setModalSelectionMode("range")}
                  className={`flex-1 px-3 py-2 text-sm font-semibold transition-colors ${modalSelectionMode === "range"
                    ? "bg-zinc-900 text-white dark:bg-rose-200 dark:text-rose-950"
                    : "bg-transparent text-zinc-700 dark:text-rose-100"
                    }`}
                >
                  Date Range
                </button>
                <button
                  type="button"
                  onClick={() => setModalSelectionMode("multiple")}
                  className={`flex-1 px-3 py-2 text-sm font-semibold transition-colors ${modalSelectionMode === "multiple"
                    ? "bg-zinc-900 text-white dark:bg-rose-200 dark:text-rose-950"
                    : "bg-transparent text-zinc-700 dark:text-rose-100"
                    }`}
                >
                  Multiple Dates
                </button>
              </div>

              {modalSelectionMode === "range" ? (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="factbook-modal-range-start" className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-rose-200/80">
                        Start date
                      </label>
                      <input
                        id="factbook-modal-range-start"
                        type="date"
                        value={modalRangeStartDate}
                        onChange={(event) => {
                          setModalRangeStartDate(event.target.value);
                          setModalError(null);
                        }}
                        min="2026-01-01"
                        max={getLocalIsoDate()}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:ring-2 focus:ring-zinc-400/35 dark:border-rose-900/80 dark:bg-[#2a111c] dark:text-rose-50 dark:focus:ring-rose-400/35"
                      />
                    </div>
                    <div>
                      <label htmlFor="factbook-modal-range-end" className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-rose-200/80">
                        End date
                      </label>
                      <input
                        id="factbook-modal-range-end"
                        type="date"
                        value={modalRangeEndDate}
                        onChange={(event) => {
                          setModalRangeEndDate(event.target.value);
                          setModalError(null);
                        }}
                        min="2026-01-01"
                        max={getLocalIsoDate()}
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:ring-2 focus:ring-zinc-400/35 dark:border-rose-900/80 dark:bg-[#2a111c] dark:text-rose-50 dark:focus:ring-rose-400/35"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-rose-100/85">
                    {modalRangePreviewDates.length} synced dates in this range.
                  </p>

                  {modalRangePreviewDates.length > 0 && (
                    <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/80 p-2 dark:border-rose-900/70 dark:bg-rose-950/30">
                      {modalRangePreviewDates.slice(0, 24).map((dateValue) => (
                        <span
                          key={`modal-range-preview-${dateValue}`}
                          className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700 dark:border-rose-900/75 dark:text-rose-100"
                        >
                          {dateValue}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <label htmlFor="factbook-modal-search" className="block text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-rose-200/80">
                    Filter dates
                  </label>
                  <input
                    id="factbook-modal-search"
                    type="text"
                    placeholder="Search YYYY-MM"
                    value={modalDateSearch}
                    onChange={(event) => setModalDateSearch(event.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:ring-2 focus:ring-zinc-400/35 dark:border-rose-900/80 dark:bg-[#2a111c] dark:text-rose-50 dark:focus:ring-rose-400/35"
                  />

                  <p className="text-xs text-zinc-600 dark:text-rose-100/85">
                    {modalSelectedDates.length} date{modalSelectedDates.length === 1 ? "" : "s"} selected.
                  </p>

                  <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/80 p-2 dark:border-rose-900/70 dark:bg-rose-950/30">
                    {allDatesLoading ? (
                      <p className="px-2 py-3 text-xs text-zinc-500 dark:text-rose-200/80">Loading synced dates...</p>
                    ) : filteredModalDateOptions.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-zinc-500 dark:text-rose-200/80">No matching dates.</p>
                    ) : (
                      <div className="space-y-1">
                        {filteredModalDateOptions.map((dateValue) => {
                          const isSelected = modalSelectedDates.includes(dateValue);
                          return (
                            <button
                              key={`modal-select-${dateValue}`}
                              type="button"
                              onClick={() => toggleModalSelectedDate(dateValue)}
                              className={`w-full rounded-md border px-2.5 py-2 text-left text-sm transition-colors ${isSelected
                                ? "border-emerald-500 bg-emerald-500 text-white dark:border-rose-300 dark:bg-rose-300 dark:text-rose-950"
                                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-rose-900/80 dark:text-rose-100 dark:hover:bg-rose-900/45"
                                }`}
                            >
                              {dateValue}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {modalError && (
                <p className="mt-3 rounded-lg border border-rose-300/80 bg-rose-50/85 px-3 py-2 text-xs text-rose-700 dark:border-rose-700/80 dark:bg-rose-950/45 dark:text-rose-100">
                  {modalError}
                </p>
              )}

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectionModalOpen(false);
                    setModalError(null);
                  }}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-rose-900/80 dark:text-rose-100 dark:hover:bg-rose-900/45"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applySelectionModal}
                  className="rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:opacity-90 dark:border-rose-200 dark:bg-rose-200 dark:text-rose-950"
                >
                  Apply Selection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
