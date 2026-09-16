"use client";

// Fact Book digest: calls the backend AI digest endpoint, then renders the result
// as a vector PDF (Lahore CSS Academy digest design) and downloads it. The accent
// colour is passed in so each app brands its own digest.

import { jsPDF } from "jspdf";
import type { FactbookEditorial } from "@/utils/factbook-api";

function normalizeApiUrl(url: string): string {
  if (url.startsWith("http:") && !url.startsWith("http://") && !url.startsWith("https://")) {
    return url.replace(/^http:/, "http://");
  }
  return url;
}

const BACKEND_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000");

export interface DigestCard {
  headline: string;
  bullets: string[];
  takeaway_label: string;
  takeaway_text: string;
  date: string;
}

export interface DigestFigure {
  figure: string;
  label: string;
  context: string;
  date: string;
}

export interface FactbookDigest {
  digest_title: string;
  source_name: string;
  topic: string;
  date_range: string;
  cards: DigestCard[];
  figures: DigestFigure[];
}

export interface DigestBrand {
  /** Accent colour (hex) for card marks, figures and takeaway rules. */
  accent: string;
}

type RGB = [number, number, number];

const CREAM: RGB = [242, 237, 227];
const DARK: RGB = [26, 26, 26];
const RULE: RGB = [217, 207, 190];
const MUTED: RGB = [107, 98, 85];

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return [193, 39, 45];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export async function fetchFactbookDigest(
  editorials: FactbookEditorial[],
  options?: { sourceName?: string; signal?: AbortSignal }
): Promise<FactbookDigest> {
  const response = await fetch(`${BACKEND_URL}/api/factbook/digest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      editorials,
      source_name: options?.sourceName || "Dawn Editorials",
    }),
    signal: options?.signal,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Digest request failed (${response.status})`);
  }
  return (await response.json()) as FactbookDigest;
}

// ---- PDF rendering -------------------------------------------------------

const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const MARGIN_X = 40;
const MARGIN_Y = 44;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const COL_GAP = 26;
const COL_W = (CONTENT_W - COL_GAP) / 2;

function setFill(doc: jsPDF, c: RGB) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function setDraw(doc: jsPDF, c: RGB) {
  doc.setDrawColor(c[0], c[1], c[2]);
}
function setText(doc: jsPDF, c: RGB) {
  doc.setTextColor(c[0], c[1], c[2]);
}

function paintBackground(doc: jsPDF) {
  setFill(doc, CREAM);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
}

interface CardLayout {
  height: number;
  titleLines: string[];
  bullets: string[][];
  label: string;
  labelW: number;
  takeFirst: string;
  takeRest: string[];
  takeLineCount: number;
  date: string;
}

// Wrap `text` so the first line fits `firstWidth` (room left after an inline label)
// and the rest fit `restWidth`. Assumes the caller has set the measuring font.
function splitWithFirst(doc: jsPDF, text: string, firstWidth: number, restWidth: number): string[] {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  let width = firstWidth;
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (!cur || doc.getTextWidth(trial) <= width) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
      width = restWidth;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

const TITLE_SIZE = 11.5;
const TITLE_LH = 13.5;
const BULLET_SIZE = 8.5;
const BULLET_LH = 11;
const TAKE_SIZE = 9.5;
const TAKE_LH = 12;
const DATE_SIZE = 7;
const BULLET_INDENT = 10;
const TAKE_PAD = 9;

function layoutCard(doc: jsPDF, card: DigestCard, cw: number): CardLayout {
  doc.setFont("times", "bold");
  doc.setFontSize(TITLE_SIZE);
  const titleLines = doc.splitTextToSize(card.headline || "Untitled", cw - 9) as string[];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(BULLET_SIZE);
  const bullets = (card.bullets || [])
    .slice(0, 2)
    .map((b) => doc.splitTextToSize(b, cw - BULLET_INDENT) as string[]);

  const label = card.takeaway_label || "Takeaway:";
  doc.setFont("times", "bold");
  doc.setFontSize(TAKE_SIZE);
  const labelW = doc.getTextWidth(`${label} `);
  const wrapped = splitWithFirst(doc, (card.takeaway_text || "").trim(), cw - TAKE_PAD - labelW - 2, cw - TAKE_PAD - 2);
  const takeFirst = wrapped[0] || "";
  const takeRest = wrapped.slice(1);
  const takeLineCount = 1 + takeRest.length;

  let h = 8; // top rule + gap
  h += titleLines.length * TITLE_LH + 6;
  for (const bl of bullets) h += bl.length * BULLET_LH + 3;
  h += 4;
  h += takeLineCount * TAKE_LH + 6;
  if (card.date) h += DATE_SIZE + 6;
  h += 10; // bottom padding

  return { height: h, titleLines, bullets, label, labelW, takeFirst, takeRest, takeLineCount, date: card.date || "" };
}

function drawCard(doc: jsPDF, layout: CardLayout, accent: RGB, x: number, topY: number, cw: number) {
  let y = topY;

  // top hairline
  setDraw(doc, RULE);
  doc.setLineWidth(0.7);
  doc.line(x, y, x + cw, y);
  y += 8;

  // accent mark + serif title
  const titleBlockH = layout.titleLines.length * TITLE_LH;
  setFill(doc, accent);
  doc.rect(x, y - 1, 3, titleBlockH, "F");
  doc.setFont("times", "bold");
  doc.setFontSize(TITLE_SIZE);
  setText(doc, DARK);
  layout.titleLines.forEach((ln, i) => doc.text(ln, x + 9, y + TITLE_SIZE * 0.72 + i * TITLE_LH));
  y += titleBlockH + 6;

  // bullets
  doc.setFont("helvetica", "normal");
  doc.setFontSize(BULLET_SIZE);
  setText(doc, DARK);
  for (const bl of layout.bullets) {
    doc.text("•", x, y + BULLET_SIZE * 0.72);
    bl.forEach((ln, i) => doc.text(ln, x + BULLET_INDENT, y + BULLET_SIZE * 0.72 + i * BULLET_LH));
    y += bl.length * BULLET_LH + 3;
  }
  y += 4;

  // takeaway: left accent border; accent label then dark text inline (no overprint)
  const takeH = layout.takeLineCount * TAKE_LH;
  setFill(doc, accent);
  doc.rect(x, y, 2, takeH, "F");
  doc.setFont("times", "bold");
  doc.setFontSize(TAKE_SIZE);
  const baseTake = y + TAKE_SIZE * 0.72;
  setText(doc, accent);
  doc.text(layout.label, x + TAKE_PAD, baseTake);
  setText(doc, DARK);
  if (layout.takeFirst) doc.text(layout.takeFirst, x + TAKE_PAD + layout.labelW, baseTake);
  layout.takeRest.forEach((ln, i) => doc.text(ln, x + TAKE_PAD, baseTake + (i + 1) * TAKE_LH));
  y += takeH + 6;

  // date
  if (layout.date) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(DATE_SIZE);
    setText(doc, MUTED);
    doc.text(layout.date, x, y + DATE_SIZE * 0.72);
    y += DATE_SIZE + 6;
  }
}

function columnX(col: number): number {
  return MARGIN_X + col * (COL_W + COL_GAP);
}

export function generateDigestPdf(digest: FactbookDigest, brand: DigestBrand): jsPDF {
  const accent = hexToRgb(brand.accent || "#C1272D");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const bottom = PAGE_H - MARGIN_Y;

  paintBackground(doc);

  // ---- header
  let headerY = MARGIN_Y;
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  setText(doc, DARK);
  const titleLines = doc.splitTextToSize(digest.digest_title || "Fact Book Digest", CONTENT_W - 170) as string[];
  titleLines.forEach((ln, i) => doc.text(ln, MARGIN_X, headerY + 22 * 0.72 + i * 24));

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(doc, MUTED);
  const src = digest.source_name || "Dawn Editorials";
  const range = digest.date_range || "";
  doc.text(src, PAGE_W - MARGIN_X, headerY + 8, { align: "right" });
  doc.text(range, PAGE_W - MARGIN_X, headerY + 19, { align: "right" });

  headerY += Math.max(titleLines.length * 24, 26) + 8;
  setDraw(doc, DARK);
  doc.setLineWidth(3);
  doc.line(MARGIN_X, headerY, MARGIN_X + CONTENT_W, headerY);
  const contentTop = headerY + 16;

  // ---- cards (sequential two-column fill)
  let col = 0;
  let y = contentTop;
  for (const card of digest.cards || []) {
    const layout = layoutCard(doc, card, COL_W);
    if (y + layout.height > bottom) {
      if (col === 0) {
        col = 1;
        y = contentTop;
      } else {
        doc.addPage();
        paintBackground(doc);
        col = 0;
        y = MARGIN_Y;
      }
    }
    drawCard(doc, layout, accent, columnX(col), y, COL_W);
    y += layout.height;
  }

  // ---- Key Figures table (full width)
  const figures = digest.figures || [];
  if (figures.length) {
    // move to a fresh full-width cursor below the taller column
    let ty = col === 1 ? Math.max(y, contentTop) : y;
    ty += 24;
    if (ty + 60 > bottom) {
      doc.addPage();
      paintBackground(doc);
      ty = MARGIN_Y;
    }
    setDraw(doc, DARK);
    doc.setLineWidth(3);
    doc.line(MARGIN_X, ty, MARGIN_X + CONTENT_W, ty);
    ty += 18;
    doc.setFont("times", "bold");
    doc.setFontSize(15);
    setText(doc, DARK);
    doc.text("Key Figures — Quick Revision", MARGIN_X, ty + 15 * 0.72);
    ty += 26;

    const numW = 118;
    const dateW = 58;
    const ctxX = MARGIN_X + numW + 8;
    const ctxW = CONTENT_W - numW - dateW - 16;
    const dateX = PAGE_W - MARGIN_X;

    for (const f of figures) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      const labelLines = doc.splitTextToSize(f.label || "", ctxW) as string[];
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const ctxLines = doc.splitTextToSize(f.context || "", ctxW) as string[];
      const rowH = Math.max(labelLines.length * 11 + ctxLines.length * 11 + 6, 26);

      if (ty + rowH > bottom) {
        doc.addPage();
        paintBackground(doc);
        ty = MARGIN_Y;
      }

      // figure (accent serif)
      doc.setFont("times", "bold");
      doc.setFontSize(13);
      setText(doc, accent);
      doc.text(f.figure || "", MARGIN_X, ty + 13 * 0.72);

      // label + context
      let cy = ty;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      setText(doc, DARK);
      labelLines.forEach((ln, i) => doc.text(ln, ctxX, cy + 8.5 * 0.72 + i * 11));
      cy += labelLines.length * 11 + 1;
      doc.setFont("helvetica", "normal");
      setText(doc, MUTED);
      ctxLines.forEach((ln, i) => doc.text(ln, ctxX, cy + 8.5 * 0.72 + i * 11));

      // date (right)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      setText(doc, MUTED);
      doc.text(f.date || "", dateX, ty + 8.5 * 0.72, { align: "right" });

      ty += rowH;
      setDraw(doc, RULE);
      doc.setLineWidth(0.6);
      doc.line(MARGIN_X, ty, MARGIN_X + CONTENT_W, ty);
      ty += 8;
    }
    y = ty;
  }

  // ---- footer on the last page
  const footerY = PAGE_H - 26;
  setDraw(doc, RULE);
  doc.setLineWidth(0.6);
  doc.line(MARGIN_X, footerY - 8, MARGIN_X + CONTENT_W, footerY - 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setText(doc, MUTED);
  doc.text(
    `Source: ${src} — ${digest.topic || "Current Affairs"}, ${range}. Condensed for quick, comprehensive reading.`,
    MARGIN_X,
    footerY
  );

  return doc;
}

export function downloadDigestPdf(
  digest: FactbookDigest,
  options: { accent: string; fileName: string }
): void {
  const doc = generateDigestPdf(digest, { accent: options.accent });
  const safeName = (options.fileName || "factbook-digest")
    .replace(/[^a-z0-9\-_]+/gi, "-")
    .replace(/-+/g, "-");
  doc.save(`${safeName}.pdf`);
}
