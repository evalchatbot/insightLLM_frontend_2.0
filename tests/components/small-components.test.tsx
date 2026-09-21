import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetClerk, signInAs } from "../helpers/clerk";
import { fetchCalls, mockFetch } from "../helpers/fetch";

vi.mock("@clerk/nextjs", async () => (await import("../helpers/clerk")).clerkClientModule);

import FeedbackWidget from "@/components/FeedbackWidget";
import EnsureSupabaseUser from "@/components/EnsureSupabaseUser";
import FAQ from "@/components/landing-components/FAQ";
import { useProAccess } from "@/hooks/useProAccess";

beforeEach(() => {
  resetClerk();
});

describe("FeedbackWidget", () => {
  const open = async (user = userEvent.setup()) => {
    await user.click(screen.getByRole("button"));
    return user;
  };

  it("opens a small form from the floating button", async () => {
    render(<FeedbackWidget />);
    await open();
    expect(screen.getByRole("heading", { name: "Share Feedback" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send Feedback/ })).toBeDisabled();
    expect(screen.getByText("0/500 characters")).toBeInTheDocument();
  });

  it("renders an inline 'Feedback' button variant", async () => {
    render(<FeedbackWidget variant="button" />);
    await open();
    expect(screen.getByRole("heading", { name: "Share Feedback" })).toBeInTheDocument();
  });

  it("does not submit whitespace-only feedback", async () => {
    render(<FeedbackWidget />);
    const user = await open();
    await user.type(screen.getByPlaceholderText(/Share your thoughts/), "   ");
    expect(screen.getByRole("button", { name: /Send Feedback/ })).toBeDisabled();
  });

  it("posts trimmed feedback with the user's identity, then closes after 1.5s", async () => {
    signInAs({ id: "user_42", primaryEmailAddress: { emailAddress: "f@example.com" } });
    const spy = mockFetch([{ method: "POST", url: "/api/feedback", respond: { status: 201, json: { success: true } } }]);
    const onSuccess = vi.fn();
    render(<FeedbackWidget pageName="ocr-evaluation-result" onSuccess={onSuccess} />);
    const user = await open();
    await user.type(screen.getByPlaceholderText(/Share your thoughts/), "  Great tool  ");
    expect(screen.getByText("14/500 characters")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Send Feedback/ }));
    expect(await screen.findByText(/Thank you for your feedback!/)).toBeInTheDocument();

    expect(fetchCalls(spy)).toEqual(["POST /api/feedback"]);
    const body = JSON.parse(spy.mock.calls[0][1]!.body as string);
    expect(body).toMatchObject({
      user_id: "user_42",
      user_email: "f@example.com",
      page_url: "ocr-evaluation-result",
      feedback_type: "general",
      subject: "User Feedback",
      message: "Great tool",
      rating: null,
    });

    expect(onSuccess).not.toHaveBeenCalled();
    // The widget closes itself 1.5s after a successful submit.
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1), { timeout: 3000 });
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Share Feedback" })).toBeNull());
  });

  it("sends null identity for anonymous visitors", async () => {
    const spy = mockFetch([{ method: "POST", url: "/api/feedback", respond: { status: 201, json: {} } }]);
    render(<FeedbackWidget />);
    const user = await open();
    await user.type(screen.getByPlaceholderText(/Share your thoughts/), "hello");
    await user.click(screen.getByRole("button", { name: /Send Feedback/ }));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(JSON.parse(spy.mock.calls[0][1]!.body as string)).toMatchObject({ user_id: null, user_email: null, page_url: "homepage" });
  });

  it.each([
    ["an HTTP error", { status: 500, json: { error: "x" } }],
    ["a network failure", { networkError: true }],
  ])("shows an error and keeps the text on %s", async (_label, response) => {
    mockFetch([{ method: "POST", url: "/api/feedback", respond: response }]);
    render(<FeedbackWidget />);
    const user = await open();
    await user.type(screen.getByPlaceholderText(/Share your thoughts/), "It broke");
    await user.click(screen.getByRole("button", { name: /Send Feedback/ }));
    expect(await screen.findByText(/Failed to submit. Try again./)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Share your thoughts/)).toHaveValue("It broke");
  });
});

describe("EnsureSupabaseUser", () => {
  it("does nothing for signed-out visitors", () => {
    render(<EnsureSupabaseUser />);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("ensures the Supabase row once per session, then primes pro status", async () => {
    signInAs({ id: "user_7" });
    const spy = mockFetch([
      { method: "POST", url: "/api/ensure-user", respond: { json: { ok: true, id: "sup-7" } } },
      { url: "/api/pro/status", respond: { json: { success: true } } },
    ]);
    const { rerender } = render(<EnsureSupabaseUser />);
    await waitFor(() => expect(fetchCalls(spy)).toEqual(["POST /api/ensure-user", "GET /api/pro/status"]));
    expect(sessionStorage.getItem("ensured:user_7")).toBe("1");
    rerender(<EnsureSupabaseUser />);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("skips the call when this session already ensured the user", () => {
    signInAs({ id: "user_7" });
    sessionStorage.setItem("ensured:user_7", "1");
    render(<EnsureSupabaseUser />);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("does not mark the session as ensured when the call fails", async () => {
    signInAs({ id: "user_8" });
    const spy = mockFetch([{ method: "POST", url: "/api/ensure-user", respond: { status: 500, json: { ok: false } } }]);
    render(<EnsureSupabaseUser />);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem("ensured:user_8")).toBeNull();
  });

  it("skips users without an email address", () => {
    signInAs({ id: "user_9", primaryEmailAddress: null });
    render(<EnsureSupabaseUser />);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("FAQ (landing component)", () => {
  it("toggles answers", async () => {
    const user = userEvent.setup();
    render(<FAQ />);
    const q = screen.getByRole("button", { name: "Can I track my progress over time?" });
    expect(screen.queryByText(/detailed analytics and progress tracking/)).toBeNull();
    await user.click(q);
    expect(screen.getByText(/detailed analytics and progress tracking/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "When can I use the evaluation service?" }));
    expect(screen.getByText(/available 24\/7/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/detailed analytics and progress tracking/)).toBeNull());
  });
});

describe("useProAccess", () => {
  it("is not Pro without stored access", () => {
    const { result } = renderHook(() => useProAccess());
    expect(result.current.proAccess).toBeNull();
    expect(result.current.isProUser).toBe(false);
  });

  it("restores unexpired access from localStorage", () => {
    const access = { active: true, expiryDate: new Date(Date.now() + 86_400_000).toISOString() };
    localStorage.setItem("proAccess", JSON.stringify(access));
    const { result } = renderHook(() => useProAccess());
    expect(result.current.proAccess).toEqual(access);
    expect(result.current.isProUser).toBe(true);
  });

  it("drops expired or inactive access", () => {
    localStorage.setItem("proAccess", JSON.stringify({ active: true, expiryDate: "2000-01-01T00:00:00Z" }));
    const { result } = renderHook(() => useProAccess());
    expect(result.current.isProUser).toBe(false);
    expect(localStorage.getItem("proAccess")).toBeNull();
  });

  it("clearProAccess removes it", () => {
    localStorage.setItem("proAccess", JSON.stringify({ active: true, expiryDate: new Date(Date.now() + 1e9).toISOString() }));
    const { result } = renderHook(() => useProAccess());
    act(() => result.current.clearProAccess());
    expect(result.current.isProUser).toBe(false);
    expect(localStorage.getItem("proAccess")).toBeNull();
  });
});
