import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clerkState, resetClerk, signInAs } from "../helpers/clerk";
import { resetNavigation, setLocation } from "../helpers/next-navigation";
import insightZustand from "@/utils/insight-zustand";

vi.mock("@clerk/nextjs", async () => (await import("../helpers/clerk")).clerkClientModule);
vi.mock("next/navigation", async () => (await import("../helpers/next-navigation")).navigationModule);
const theme = vi.hoisted(() => ({ value: "light", setTheme: vi.fn() }));
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: theme.value, setTheme: theme.setTheme }) }));
vi.mock("@/components/header-components/ProfileMenu", () => ({ default: () => <div data-testid="profile-menu" /> }));

import Navbar from "@/components/Navbar";
import NavigationWrapper from "@/components/NavigationWrapper";

vi.mock("@/components/RightNavbar", () => ({ default: () => <nav data-testid="right-navbar" /> }));

const TABS: Array<[string, string]> = [
  ["Home", "/"],
  ["Evaluations", "/app/ocr"],
  ["MCQs", "/quiz"],
  ["Fact Book", "/app/factbook"],
  ["Past Papers", "/app/past-papers"],
];

beforeEach(() => {
  resetClerk();
  resetNavigation();
  theme.value = "light";
  theme.setTheme.mockReset();
  insightZustand.setState({ topLoader: false });
});

function desktopNav() {
  // The desktop <nav> is the only navigation landmark until the mobile menu opens.
  return screen.getByRole("navigation");
}

describe("Navbar", () => {
  it("renders every feature tab with the right href", () => {
    render(<Navbar />);
    const nav = desktopNav();
    for (const [name, href] of TABS) {
      expect(within(nav).getByRole("link", { name })).toHaveAttribute("href", href);
    }
    expect(screen.getByRole("link", { name: /rubric\.ai/i })).toHaveAttribute("href", "/");
  });

  it("shows Chatbot as a disabled 'Soon' item, not a link", () => {
    render(<Navbar />);
    const nav = desktopNav();
    expect(within(nav).queryByRole("link", { name: /chatbot/i })).toBeNull();
    const chatbot = within(nav).getByTitle("Coming Soon");
    expect(chatbot).toHaveTextContent("Chatbot");
    expect(chatbot).toHaveTextContent("Soon");
  });

  it("highlights the active tab, including nested routes", () => {
    setLocation("/app/past-papers/css");
    render(<Navbar />);
    const nav = desktopNav();
    const activeClass = /(^|\s)bg-black(\s|$)/;
    expect(within(nav).getByRole("link", { name: "Past Papers" }).className).toMatch(activeClass);
    expect(within(nav).getByRole("link", { name: "Evaluations" }).className).not.toMatch(activeClass);
    expect(within(nav).getByRole("link", { name: "Home" }).className).not.toMatch(activeClass);
  });

  it("starts the top loader when navigating to another tab, but not for the current one", async () => {
    setLocation("/app/ocr");
    render(<Navbar />);
    const nav = desktopNav();
    within(nav).getByRole("link", { name: "Evaluations" }).addEventListener("click", (e) => e.preventDefault());
    within(nav).getByRole("link", { name: "MCQs" }).addEventListener("click", (e) => e.preventDefault());
    await userEvent.click(within(nav).getByRole("link", { name: "Evaluations" }));
    expect(insightZustand.getState().topLoader).toBe(false);
    await userEvent.click(within(nav).getByRole("link", { name: "MCQs" }));
    expect(insightZustand.getState().topLoader).toBe(true);
  });

  it("offers 'Log In' (Clerk modal) when signed out", async () => {
    render(<Navbar />);
    await userEvent.click(screen.getByRole("button", { name: "Log In" }));
    expect(clerkState.openSignIn).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("profile-menu")).toBeNull();
  });

  it("shows the profile menu instead of 'Log In' when signed in", () => {
    signInAs();
    render(<Navbar />);
    expect(screen.getByTestId("profile-menu")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Log In" })).toBeNull();
  });

  it("toggles the theme", async () => {
    const { rerender } = render(<Navbar />);
    await userEvent.click(screen.getByRole("button", { name: "Toggle Theme" }));
    expect(theme.setTheme).toHaveBeenCalledWith("dark");
    theme.value = "dark";
    rerender(<Navbar />);
    await userEvent.click(screen.getByRole("button", { name: "Toggle Theme" }));
    expect(theme.setTheme).toHaveBeenLastCalledWith("light");
  });

  it("opens a mobile menu with the same links and the signed-in user's details", async () => {
    signInAs({ firstName: "Ayesha", lastName: "Khan", primaryEmailAddress: { emailAddress: "ayesha@example.com" } });
    render(<Navbar />);
    const buttons = screen.getAllByRole("button");
    const menuToggle = buttons[buttons.length - 1];
    await userEvent.click(menuToggle);
    const navs = screen.getAllByRole("link", { name: "Fact Book" });
    expect(navs).toHaveLength(2);
    expect(screen.getByText("Ayesha Khan")).toBeInTheDocument();
    expect(screen.getByText("ayesha@example.com")).toBeInTheDocument();
  });
});

describe("NavigationWrapper", () => {
  it.each([
    ["/app", "right-navbar"],
    ["/app/abc123", "right-navbar"],
    ["/", "navbar"],
    ["/app/ocr", "navbar"],
    ["/app/factbook", "navbar"],
    ["/app/help", "navbar"],
    ["/app/quiz", "navbar"],
    ["/app/past-papers", "navbar"],
    ["/app/past-papers/css", "navbar"],
    ["/quiz", "navbar"],
  ])("on %s renders the %s", (path, expected) => {
    setLocation(path);
    render(<NavigationWrapper />);
    if (expected === "right-navbar") {
      expect(screen.getByTestId("right-navbar")).toBeInTheDocument();
    } else {
      expect(screen.queryByTestId("right-navbar")).toBeNull();
      expect(screen.getByRole("link", { name: "Evaluations" })).toBeInTheDocument();
    }
  });
});
