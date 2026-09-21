import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockFetch, type ResponseSpec } from "../helpers/fetch";

vi.mock("next/font/google", () => ({
  Playfair_Display: () => ({ className: "font-playfair" }),
  Source_Sans_3: () => ({ className: "font-source-sans" }),
}));
vi.mock("@/utils/factbook-api", () => ({
  fetchFactbookEditorials: vi.fn(),
  fetchFactbookEditorialDates: vi.fn(),
  fetchFactbookEditorialsByTopic: vi.fn(),
  fetchFactbookTopics: vi.fn(),
}));

import FactBookPage from "@/app/(routes)/(general)/app/factbook/page";
import * as factbook from "@/utils/factbook-api";

const m = vi.mocked(factbook);
const editorial = {
  id: "ed-1",
  publication_date: "2026-09-17",
  headline: "Budget deficit narrows",
  summary_bullets: ["Revenue up 12%", "Spending flat"],
  takeaway: "Fiscal discipline is paying off.",
  summary_paragraph: "The federal budget deficit narrowed in the first quarter.",
  thesis_statement: "Pakistan's fiscal position is stabilising.",
  topic_domain: "Economy",
};

function setup(proStatus: ResponseSpec) {
  mockFetch([{ url: "/api/pro/status", respond: proStatus }]);
  m.fetchFactbookTopics.mockResolvedValue({ groups: [{ title: "Pakistan Domains", topics: ["Economy"] }], counts: { Economy: 3 } });
  m.fetchFactbookEditorialDates.mockResolvedValue(["2026-09-17", "2026-09-16"]);
  m.fetchFactbookEditorials.mockResolvedValue({ date: "2026-09-17", count: 1, editorials: [editorial] });
  m.fetchFactbookEditorialsByTopic.mockResolvedValue([]);
  return userEvent.setup();
}

/** Flush pending promises/effects so the page reaches a stable state. */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 50)));

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-09-18T09:00:00Z"), toFake: ["Date"] });
});

describe("Fact Book page", () => {
  it("free users see only the latest briefing and an upgrade prompt", async () => {
    setup({ json: { success: true, isPro: false } });
    render(<FactBookPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Daily Editorial Briefing" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Budget deficit narrows" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Free plan" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Upgrade to Pro" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("heading", { name: "Select a topic" })).toBeNull();
    expect(m.fetchFactbookEditorials).toHaveBeenCalledWith(undefined); // "latest available"
  });

  it("Pro users get the topic/date filter panel", async () => {
    setup({ json: { success: true, isPro: true } });
    render(<FactBookPage />);
    expect(await screen.findByRole("heading", { name: "Select a topic" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Free plan" })).toBeNull();
  });

  it("fails closed to the free view when the pro-status check errors", async () => {
    setup({ networkError: true });
    render(<FactBookPage />);
    expect(await screen.findByRole("heading", { name: "Free plan" })).toBeInTheDocument();
  });

  it("shows the teaser and expands an editorial into its details", async () => {
    const user = setup({ json: { isPro: false } });
    render(<FactBookPage />);
    await screen.findByRole("heading", { name: "Free plan" });
    await settle(); // let the date lists finish loading (they trigger a reload, see BUG below)
    const headline = await screen.findByRole("heading", { name: "Budget deficit narrows" });
    expect(screen.getByText("Pakistan's fiscal position is stabilising.")).toBeInTheDocument();
    expect(screen.queryByText("Summary Points")).toBeNull();
    await user.click(headline);
    expect(screen.getByText("Summary Points")).toBeInTheDocument();
    expect(screen.getByText("- Revenue up 12%")).toBeInTheDocument();
    expect(screen.getByText("The federal budget deficit narrowed in the first quarter.")).toBeInTheDocument();
  });

  it("shows the API error when editorials cannot be loaded", async () => {
    setup({ json: { isPro: false } });
    m.fetchFactbookEditorials.mockRejectedValue(new Error("Failed to fetch fact book editorials (503)"));
    render(<FactBookPage />);
    expect(await screen.findByText("Failed to fetch fact book editorials (503)")).toBeInTheDocument();
  });

  it("shows an empty state when there are no editorials yet", async () => {
    setup({ json: { isPro: false } });
    m.fetchFactbookEditorials.mockResolvedValue({ date: "2026-09-18", count: 0, editorials: [] });
    render(<FactBookPage />);
    expect(await screen.findByText(/No editorials available for .* yet\./)).toBeInTheDocument();
  });

  // BUG: the editorial-loading effect depends on `normalizedRangeDates` even in
  // single-date mode (src/app/(routes)/(general)/app/factbook/page.tsx:1013-1022). When
  // the date list arrives, that memo gets a new identity, editorials are re-fetched and
  // `setExpandedCardId(null)` collapses whatever card the reader had opened.
  it.fails("keeps an opened editorial expanded when the date list finishes loading", async () => {
    const user = setup({ json: { isPro: false } });
    const pendingDates: Array<(dates: string[]) => void> = [];
    m.fetchFactbookEditorialDates.mockImplementation(() => new Promise((resolve) => pendingDates.push(resolve)));
    render(<FactBookPage />);
    await screen.findByRole("heading", { name: "Free plan" });
    await settle();
    const headline = await screen.findByRole("heading", { name: "Budget deficit narrows" });
    // The chevron reflects the expanded state immediately (the details panel itself
    // lingers during framer-motion's exit animation).
    const chevron = () => headline.closest("button")!.querySelector("svg")!;
    await user.click(headline);
    expect(screen.getByText("Summary Points")).toBeInTheDocument();
    expect(chevron()).toHaveClass("rotate-180");

    await act(async () => pendingDates.forEach((resolve) => resolve(["2026-09-17", "2026-09-16"])));
    await settle();
    expect(chevron()).toHaveClass("rotate-180");
  });

  it("loads topics and editorial dates for the filters", async () => {
    setup({ json: { isPro: true } });
    render(<FactBookPage />);
    await waitFor(() => expect(m.fetchFactbookTopics).toHaveBeenCalled());
    await waitFor(() => expect(m.fetchFactbookEditorialDates).toHaveBeenCalledWith("2026-09"));
    expect(m.fetchFactbookEditorialDates).toHaveBeenCalledWith(undefined, { bypassCache: true });
  });
});
