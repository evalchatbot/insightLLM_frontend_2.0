"use client";

// Fact Book HTML digest: calls the backend AI digest endpoint, then fills the
// shared digest template (Lahore CSS Academy design) and downloads a self-contained
// .html file. The accent colour is passed in so each app can brand its own digest.

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
  /** Accent colour used for card marks, figures and takeaway rules. */
  accent: string;
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

function escapeHtml(value: string): string {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderCard(card: DigestCard): string {
  const bullets = (card.bullets || [])
    .slice(0, 2)
    .map((b) => `<li>${escapeHtml(b)}</li>`)
    .join("\n        ");
  return `    <div class="card">
      <div class="card-head"><div class="card-mark"></div><div class="card-title">${escapeHtml(
        card.headline
      )}</div></div>
      <ul>
        ${bullets}
      </ul>
      <div class="takeaway"><span class="takeaway-label">${escapeHtml(
        card.takeaway_label
      )}</span> ${escapeHtml(card.takeaway_text)}</div>
      <div class="date">${escapeHtml(card.date)}</div>
    </div>`;
}

function renderFigures(figures: DigestFigure[]): string {
  if (!figures || figures.length === 0) return "";
  const rows = figures
    .map(
      (f) => `      <tr>
        <td class="num-cell">${escapeHtml(f.figure)}</td>
        <td class="ctx-cell"><span class="label">${escapeHtml(
          f.label
        )}</span><span class="desc">${escapeHtml(f.context)}</span></td>
        <td class="date-cell">${escapeHtml(f.date)}</td>
      </tr>`
    )
    .join("\n");
  return `  <div class="table-section">
    <div class="table-head">Key Figures — Quick Revision</div>
    <table>
${rows}
    </table>
  </div>`;
}

export function renderDigestHtml(digest: FactbookDigest, brand: DigestBrand): string {
  const accent = brand.accent || "#C1272D";
  const title = escapeHtml(digest.digest_title || "Fact Book Digest");
  const dateRange = escapeHtml(digest.date_range || "");
  const sourceName = escapeHtml(digest.source_name || "Dawn Editorials");
  const topic = escapeHtml(digest.topic || "Current Affairs");
  const cards = (digest.cards || []).map(renderCard).join("\n\n");
  const figures = renderFigures(digest.figures || []);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — ${dateRange}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=DM+Sans:wght@400;500;600;700&display=swap');

  :root{
    --red:${accent};
    --cream:#F2EDE3;
    --dark:#1A1A1A;
    --rule:#D9CFBE;
    --muted:#6b6255;
  }
  *{box-sizing:border-box;}
  body{
    margin:0;
    background:var(--cream);
    color:var(--dark);
    font-family:'DM Sans', sans-serif;
    padding:36px 20px 60px;
  }
  .sheet{ max-width:920px; margin:0 auto; }

  header{
    border-bottom:3px solid var(--dark);
    padding-bottom:14px;
    margin-bottom:24px;
    display:flex;
    justify-content:space-between;
    align-items:flex-end;
    gap:16px;
    flex-wrap:wrap;
  }
  header .title{
    font-family:'Cormorant Garamond', serif;
    font-weight:700;
    font-size:2rem;
    line-height:1.05;
  }
  header .meta{
    font-size:0.72rem;
    color:var(--muted);
    text-align:right;
    line-height:1.5;
  }

  .grid{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:0 32px;
  }

  .card{
    border-top:1px solid var(--rule);
    padding:14px 0 16px;
    break-inside:avoid;
  }
  .card-head{
    display:flex;
    gap:8px;
    margin-bottom:6px;
  }
  .card-mark{
    width:5px;
    background:var(--red);
    flex-shrink:0;
    border-radius:1px;
  }
  .card-title{
    font-family:'Cormorant Garamond', serif;
    font-weight:700;
    font-size:1.15rem;
    line-height:1.15;
  }
  .card ul{
    margin:0 0 8px;
    padding-left:16px;
    font-size:0.82rem;
    line-height:1.4;
    color:var(--dark);
  }
  .card li{ margin-bottom:3px; }
  .card .takeaway{
    font-family:'Cormorant Garamond', serif;
    font-weight:700;
    font-size:0.95rem;
    color:var(--dark);
    line-height:1.35;
    border-left:2px solid var(--red);
    padding-left:8px;
  }
  .card .takeaway .takeaway-label{
    color:var(--red);
  }
  .card .date{
    font-size:0.66rem;
    color:var(--muted);
    margin-top:6px;
  }

  .table-section{
    margin-top:32px;
    padding-top:20px;
    border-top:3px solid var(--dark);
  }
  .table-head{
    font-family:'Cormorant Garamond', serif;
    font-weight:700;
    font-size:1.4rem;
    margin-bottom:10px;
  }
  .table-section table{
    width:100%;
    border-collapse:collapse;
  }
  .table-section tr{
    border-bottom:1px solid var(--rule);
  }
  .table-section tr:last-child{
    border-bottom:none;
  }
  .table-section td{
    padding:10px 6px;
    vertical-align:top;
  }
  .table-section .num-cell{
    width:130px;
    font-family:'Cormorant Garamond', serif;
    font-weight:700;
    font-size:1.25rem;
    color:var(--red);
    white-space:nowrap;
  }
  .table-section .ctx-cell{
    font-size:0.82rem;
    line-height:1.4;
  }
  .table-section .ctx-cell .label{
    font-weight:600;
    display:block;
    margin-bottom:1px;
    color:var(--dark);
  }
  .table-section .ctx-cell .desc{
    color:var(--muted);
  }
  .table-section .date-cell{
    width:64px;
    text-align:right;
    font-size:0.66rem;
    color:var(--muted);
    white-space:nowrap;
    padding-top:12px;
  }

  footer{
    margin-top:28px;
    padding-top:12px;
    border-top:1px solid var(--rule);
    font-size:0.7rem;
    color:var(--muted);
  }

  @media (max-width:640px){
    .grid{ grid-template-columns:1fr; }
    header{ flex-direction:column; align-items:flex-start; }
    header .meta{ text-align:left; }
    .table-section .date-cell{ display:none; }
  }
</style>
</head>
<body>
<div class="sheet">

  <header>
    <div class="title">${title}</div>
    <div class="meta">${sourceName}<br>${dateRange}</div>
  </header>

  <div class="grid">

${cards}

  </div>

${figures}

  <footer>Source: ${sourceName} — ${topic}, ${dateRange}. Condensed for quick, comprehensive reading.</footer>

</div>
</body>
</html>`;
}

export function downloadDigestHtml(html: string, fileName: string): void {
  const safeName = (fileName || "factbook-digest").replace(/[^a-z0-9\-_]+/gi, "-").replace(/-+/g, "-");
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
