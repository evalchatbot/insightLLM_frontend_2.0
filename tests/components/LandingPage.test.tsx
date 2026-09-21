import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clerkState, resetClerk, signInAs } from "../helpers/clerk";
import { mockFetch } from "../helpers/fetch";
import { resetNavigation, router, setLocation } from "../helpers/next-navigation";

vi.mock("@clerk/nextjs", async () => (await import("../helpers/clerk")).clerkClientModule);
vi.mock("next/navigation", async () => (await import("../helpers/next-navigation")).navigationModule);
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }));
vi.mock("@/components/header-components/pro-access-modal", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog" aria-label="Pro access">
      <button onClick={onClose}>Close pro modal</button>
    </div>
  ),
}));

import LandingPage from "@/app/page";

beforeEach(() => {
  resetClerk();
  resetNavigation();
});

describe("Landing page", () => {
  it("renders the hero, features, pricing and FAQ sections", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/EVALUATION MATTERS!/);
    expect(screen.getByRole("heading", { name: "EVALUATION BUILT TO PERFECTION" })).toBeInTheDocument();
    for (const feature of ["AI-Powered Evaluations", "Smart MCQ Practice", "AI Chatbot Mentor", "Expert Mentor Meetings"]) {
      expect(screen.getByRole("heading", { name: feature })).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: "CHOOSE YOUR PLAN" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Frequently Asked Questions" })).toBeInTheDocument();
    expect(screen.getByText(/© 2025 RUBRIC/)).toBeInTheDocument();
  });

  it("shows both plans with their prices", () => {
    const { container } = render(<LandingPage />);
    const pricing = container.querySelector("#pricing") as HTMLElement;
    expect(within(pricing).getByRole("heading", { name: "Free" })).toBeInTheDocument();
    expect(within(pricing).getByText("Rs.0")).toBeInTheDocument();
    expect(within(pricing).getByRole("heading", { name: "Pro" })).toBeInTheDocument();
    expect(within(pricing).getByText("Rs.9,999")).toBeInTheDocument();
    expect(within(pricing).getByText("Rs.5,000")).toBeInTheDocument();
    expect(within(pricing).getByText("50% OFF")).toBeInTheDocument();
    expect(within(pricing).getByText("MOST POPULAR")).toBeInTheDocument();
    expect(within(pricing).getByRole("button", { name: "Get Started Free" })).toBeInTheDocument();
    expect(within(pricing).getByRole("button", { name: "Start Pro Plan" })).toBeEnabled();
  });

  it("FAQ items expand one at a time and collapse again", async () => {
    render(<LandingPage />);
    const q1 = screen.getByRole("button", { name: "How quickly can I get feedback on my papers?" });
    const q2 = screen.getByRole("button", { name: "How accurate is the AI scoring system?" });
    expect(screen.getAllByRole("button", { expanded: false }).length).toBeGreaterThanOrEqual(6);
    expect(screen.queryByText(/instant feedback within seconds of submission/)).toBeNull();

    await userEvent.click(q1);
    expect(q1).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/instant feedback within seconds of submission/)).toBeInTheDocument();

    await userEvent.click(q2);
    expect(q1).toHaveAttribute("aria-expanded", "false");
    expect(q2).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByText(/instant feedback within seconds of submission/)).toBeNull();
    expect(screen.getByText(/over 95% accuracy/)).toBeInTheDocument();

    await userEvent.click(q2);
    expect(q2).toHaveAttribute("aria-expanded", "false");
  });

  it("signed-out hero offers 'Sign Up Now' via the Clerk modal", async () => {
    render(<LandingPage />);
    await userEvent.click(screen.getByRole("button", { name: "Sign Up Now" }));
    expect(clerkState.openSignIn).toHaveBeenCalled();
  });

  it("signed-in hero greets the user instead", () => {
    signInAs({ firstName: "Bilal" });
    mockFetch([{ url: "/api/pro/status", respond: { json: { success: true, isPro: false } } }]);
    render(<LandingPage />);
    expect(screen.getByRole("button", { name: /Welcome, Bilal!/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Sign Up Now" })).toBeNull();
  });

  it("shows 'Please sign in to continue' after a protected-route redirect, then hides it", async () => {
    vi.useFakeTimers();
    setLocation("/", "auth=required&from=%2Fapp%2Focr");
    render(<LandingPage />);
    expect(screen.getByText("Please sign in to continue")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(3600);
    });
    expect(screen.queryByText("Please sign in to continue")).toBeNull();
  });

  it("does not show the sign-in notice on a normal visit", () => {
    render(<LandingPage />);
    expect(screen.queryByText("Please sign in to continue")).toBeNull();
  });

  it("feature cards route to their tools", async () => {
    render(<LandingPage />);
    await userEvent.click(screen.getByRole("heading", { name: "AI-Powered Evaluations" }));
    expect(router.push).toHaveBeenCalledWith("/app/ocr");
    await userEvent.click(screen.getByRole("heading", { name: "Smart MCQ Practice" }));
    expect(router.push).toHaveBeenLastCalledWith("/app/quiz");
  });

  it("'Start Pro Plan' asks signed-out visitors to log in", async () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    render(<LandingPage />);
    await userEvent.click(screen.getByRole("button", { name: "Start Pro Plan" }));
    expect(alert).toHaveBeenCalledWith("Please log in to subscribe.");
    expect(screen.queryByRole("dialog", { name: "Pro access" })).toBeNull();
  });

  it("'Start Pro Plan' opens the Pro access modal for signed-in free users", async () => {
    signInAs();
    mockFetch([{ url: "/api/pro/status", respond: { json: { success: true, isPro: false } } }]);
    render(<LandingPage />);
    await userEvent.click(screen.getByRole("button", { name: "Start Pro Plan" }));
    expect(await screen.findByRole("dialog", { name: "Pro access" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close pro modal" }));
    expect(screen.queryByRole("dialog", { name: "Pro access" })).toBeNull();
  });

  it("shows 'Rubric Pro Active' (disabled) for Pro users", async () => {
    signInAs();
    mockFetch([{ url: "/api/pro/status", respond: { json: { success: true, isPro: true } } }]);
    render(<LandingPage />);
    const active = await screen.findByRole("button", { name: /Rubric Pro Active/i });
    expect(active).toBeDisabled();
  });

  it("opens and closes the contact-support modal", async () => {
    render(<LandingPage />);
    await userEvent.click(screen.getByRole("button", { name: "Contact our support team" }));
    expect(screen.getByRole("heading", { name: "Contact Support Team" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "contact.rubric@gmail.com" })).toHaveAttribute("href", "mailto:contact.rubric@gmail.com");
    expect(screen.getByRole("link", { name: "+92 333 2296022" })).toHaveAttribute("href", "tel:+923332296022");
    const heading = screen.getByRole("heading", { name: "Contact Support Team" });
    const closeButton = heading.parentElement!.parentElement!.querySelector("button")!;
    await userEvent.click(closeButton);
    expect(screen.queryByRole("heading", { name: "Contact Support Team" })).toBeNull();
  });

  // BUG: "Get Started Free" clicks `document.querySelector('.cl-signInButton')`,
  // but Clerk's <SignInButton> renders the child button without that class, so the
  // button does nothing for signed-out visitors (src/app/page.tsx:323).
  it.fails("'Get Started Free' opens the sign-in flow for signed-out visitors", async () => {
    render(<LandingPage />);
    await userEvent.click(screen.getByRole("button", { name: "Get Started Free" }));
    expect(clerkState.openSignIn).toHaveBeenCalledTimes(1);
  });
});
