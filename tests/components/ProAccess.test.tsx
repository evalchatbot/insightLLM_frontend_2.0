import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clerkState, resetClerk, signInAs } from "../helpers/clerk";
import { fetchCalls, mockFetch, type Route } from "../helpers/fetch";
import insightZustand from "@/utils/insight-zustand";

vi.mock("@clerk/nextjs", async () => (await import("../helpers/clerk")).clerkClientModule);
vi.mock("react-confetti", () => ({ default: () => <div data-testid="confetti" /> }));

import ProAccessModal from "@/components/header-components/pro-access-modal";
import ProfileMenu from "@/components/header-components/ProfileMenu";

const FREE_STATUS: Route = { url: "/api/pro/status", respond: { json: { success: true, hasAccess: false, isPro: false } } };

beforeEach(() => {
  resetClerk();
  insightZustand.setState({ devToast: null });
});

async function openModal(routes: Route[], props: Partial<Parameters<typeof ProAccessModal>[0]> = {}) {
  const onClose = vi.fn();
  const onSuccess = vi.fn();
  const spy = mockFetch(routes);
  const user = userEvent.setup({
    advanceTimers: (ms) => {
      if (vi.isFakeTimers()) vi.advanceTimersByTime(ms);
    },
  });
  render(<ProAccessModal onClose={onClose} onSuccess={onSuccess} {...props} />);
  await screen.findByRole("heading", { name: /Get Pro Access|Renew Subscription/ });
  return { user, spy, onClose, onSuccess };
}

const keyInput = () => screen.getByPlaceholderText("Enter your Pro key");
const activate = () => screen.getByRole("button", { name: "Activate" });

describe("ProAccessModal", () => {
  it("shows payment instructions and requires a key before activating", async () => {
    const { user } = await openModal([FREE_STATUS]);
    expect(screen.getByText("Payment Instructions:")).toBeInTheDocument();
    expect(activate()).toBeDisabled();
    await user.type(keyInput(), "   ");
    expect(activate()).toBeDisabled();
    await user.clear(keyInput());
    await user.type(keyInput(), "RUBRIC-PRO-1");
    expect(activate()).toBeEnabled();
  });

  it("activates a valid key, celebrates, then closes and refreshes pro status", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const expiry = "2026-10-18T00:00:00.000Z";
    const { user, spy, onClose, onSuccess } = await openModal([
      FREE_STATUS,
      {
        method: "POST",
        url: "/api/pro/verify-key",
        respond: { json: { success: true, isRenewal: false, expiryDate: expiry, durationDays: 30 } },
      },
    ]);
    const refresh = vi.fn();
    window.addEventListener("refreshProStatus", refresh);

    await user.type(keyInput(), "RUBRIC-PRO-1");
    await user.click(activate());

    expect(await screen.findByText(/Pro access activated successfully!/)).toBeInTheDocument();
    expect(screen.getByText("Expires:")).toBeInTheDocument();
    expect(screen.getByTestId("confetti")).toBeInTheDocument();
    expect(keyInput()).toBeDisabled();
    expect(JSON.parse(spy.mock.calls[1][1]!.body as string)).toEqual({ key: "RUBRIC-PRO-1" });
    expect(insightZustand.getState().devToast).toMatch(/^Your Pro subscription is active until October 18, 2026\. \(30 days\)$/);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3600);
    });
    window.removeEventListener("refreshProStatus", refresh);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith({ end_date: expiry });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("proStatusRefresh")).toMatch(/^\d+$/);
  });

  it("submits on Enter and shows the server's rejection", async () => {
    const { user } = await openModal([
      FREE_STATUS,
      { method: "POST", url: "/api/pro/verify-key", respond: { status: 400, json: { success: false, message: "This key has already been used" } } },
    ]);
    await user.type(keyInput(), "USED-KEY{Enter}");
    expect(await screen.findByText(/This key has already been used/)).toBeInTheDocument();
    expect(insightZustand.getState().devToast).toBe("This key has already been used");
  });

  it("explains transient auth problems (503) and network failures", async () => {
    const { user } = await openModal([
      FREE_STATUS,
      {
        method: "POST",
        url: "/api/pro/verify-key",
        sequence: [{ status: 503, json: { success: false, retry: true } }, { networkError: true }],
      },
    ]);
    await user.type(keyInput(), "K1");
    await user.click(activate());
    expect(await screen.findByText(/Temporary authentication issue. Please try again in a moment./)).toBeInTheDocument();
    await user.click(activate());
    expect(await screen.findByText(/Network error. Please check your connection and try again./)).toBeInTheDocument();
  });

  it("still opens when the status check fails", async () => {
    await openModal([{ url: "/api/pro/status", respond: { networkError: true } }]);
    expect(screen.getByRole("heading", { name: "Get Pro Access" })).toBeInTheDocument();
  });

  it("shows renewal details for an active subscriber", async () => {
    const end = new Date(Date.now() + 5 * 86_400_000).toISOString();
    await openModal([{ url: "/api/pro/status", respond: { json: { success: true, hasAccess: true, daysLeft: 5, end_date: end } } }]);
    expect(screen.getByRole("heading", { name: "Renew Subscription" })).toBeInTheDocument();
    expect(screen.getByText("Renewing Your Active Subscription")).toBeInTheDocument();
    expect(screen.getByText(/5 days/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Renew Subscription" })).toBeDisabled();
  });

  it("closes from the X button", async () => {
    const { user, onClose } = await openModal([FREE_STATUS]);
    await user.click(screen.getByRole("button", { name: "Close modal" }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("ProfileMenu", () => {
  it("renders 'Log In' for signed-out users", async () => {
    render(<ProfileMenu />);
    await userEvent.click(screen.getByRole("button", { name: "Log In" }));
    expect(clerkState.openSignIn).toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("renders nothing until Clerk has loaded", () => {
    clerkState.isLoaded = false;
    const { container } = render(<ProfileMenu />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the user's plan and signs out", async () => {
    signInAs({ firstName: "Sara", lastName: "Ali", imageUrl: "/avatar.png", primaryEmailAddress: { emailAddress: "sara@example.com" } });
    const spy = mockFetch([{ url: "/api/pro/status", respond: { json: { success: true, isPro: true } } }]);
    const user = userEvent.setup();
    render(<ProfileMenu />);
    await waitFor(() => expect(fetchCalls(spy)).toEqual(["GET /api/pro/status"]));
    const toggle = screen.getByRole("button", { expanded: false });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Sara Ali")).toBeInTheDocument();
    expect(screen.getByText("sara@example.com")).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(clerkState.signOut).toHaveBeenCalled();
  });

  it("falls back to 'Free' when the status request is unavailable (503)", async () => {
    signInAs({ imageUrl: "/avatar.png" });
    mockFetch([{ url: "/api/pro/status", respond: { status: 503, json: { retry: true } } }]);
    const user = userEvent.setup();
    render(<ProfileMenu />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("closes when clicking outside", async () => {
    signInAs({ imageUrl: "/avatar.png" });
    mockFetch([FREE_STATUS]);
    const user = userEvent.setup();
    render(
      <div>
        <p>outside</p>
        <ProfileMenu />
      </div>
    );
    await user.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText("Status")).toBeInTheDocument();
    await user.click(screen.getByText("outside"));
    expect(screen.queryByText("Status")).toBeNull();
  });
});
