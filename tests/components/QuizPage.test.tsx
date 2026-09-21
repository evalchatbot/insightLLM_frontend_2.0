import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { fetchCalls, mockFetch, type Route } from "../helpers/fetch";
import QuizPage from "@/app/quiz/page";

const GENRES = [
  { id: "history", name: "Pakistan History" },
  { id: "economy", name: "Economics" },
];
const mcq = (i: number) => ({
  id: `q${i}`,
  question: `Question text ${i}`,
  option_a: `Alpha ${i}`,
  option_b: `Bravo ${i}`,
  option_c: `Charlie ${i}`,
  option_d: `Delta ${i}`,
  correct_answer: "b",
});

function routes(extra: Route[] = []): Route[] {
  return [
    { url: "/api/genres", respond: { json: GENRES } },
    { method: "POST", url: "/api/quiz/check-limit", respond: { json: { success: true, can_proceed: true } } },
    { method: "POST", url: "/api/quiz/record-attempt", respond: { json: { success: true } } },
    { url: /\/quiz\/mcqs\?/, respond: { json: [mcq(1)] } },
    ...extra,
  ];
}

async function openConfig() {
  const user = userEvent.setup();
  render(<QuizPage />);
  await user.click(screen.getByRole("button", { name: /Start Practice Session/ }));
  expect(screen.getByRole("heading", { name: "START YOUR PRACTICE" })).toBeInTheDocument();
  return user;
}

const subjectSelect = () => screen.getAllByRole("combobox")[1] as HTMLSelectElement;
const startButton = () => screen.getAllByRole("button", { name: /Start Practice Session/ }).at(-1)!;

describe("Quiz page (MCQs)", () => {
  it("loads genres into the subject picker and preselects the first", async () => {
    mockFetch(routes());
    await openConfig();
    await waitFor(() => expect(subjectSelect()).toHaveValue("history"));
    expect(screen.getByRole("option", { name: "Economics" })).toBeInTheDocument();
  });

  it("blocks a new test when the free limit is used up (429)", async () => {
    const spy = mockFetch(
      routes([]).map((r) =>
        r.url === "/api/quiz/check-limit" ? { ...r, respond: { status: 429, json: { message: "You have used your free MCQ test." } } } : r
      )
    );
    const user = await openConfig();
    await waitFor(() => expect(subjectSelect()).toHaveValue("history"));
    await user.click(startButton());
    expect(await screen.findByText("You have used your free MCQ test.")).toBeInTheDocument();
    expect(fetchCalls(spy).some((c) => c.includes("/quiz/mcqs"))).toBe(false);
    expect(fetchCalls(spy).some((c) => c.includes("record-attempt"))).toBe(false);
  });

  it("refuses to start when the limit cannot be verified", async () => {
    mockFetch(routes().map((r) => (r.url === "/api/quiz/check-limit" ? { ...r, respond: { status: 500, json: {} } } : r)));
    const user = await openConfig();
    await waitFor(() => expect(subjectSelect()).toHaveValue("history"));
    await user.click(startButton());
    expect(await screen.findByText("Unable to verify your MCQ test limit. Please try again.")).toBeInTheDocument();
  });

  it("starts a test: checks the limit, loads MCQs, records the attempt, shows question 1", async () => {
    const spy = mockFetch(routes());
    const user = await openConfig();
    await waitFor(() => expect(subjectSelect()).toHaveValue("history"));
    await user.selectOptions(subjectSelect(), "economy");
    await user.click(startButton());
    expect(await screen.findByText("Question 1 of 20")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Question text 1" })).toBeInTheDocument();
    expect(fetchCalls(spy)).toEqual([
      "GET /api/genres",
      "POST /api/quiz/check-limit",
      "GET /quiz/mcqs?genre_id=economy&limit=20&random=true",
      "POST /api/quiz/record-attempt",
    ]);
  });

  it("still starts the test when recording the attempt fails", async () => {
    mockFetch(routes().map((r) => (r.url === "/api/quiz/record-attempt" ? { ...r, respond: { networkError: true } } : r)));
    const user = await openConfig();
    await waitFor(() => expect(subjectSelect()).toHaveValue("history"));
    await user.click(startButton());
    expect(await screen.findByText("Question 1 of 20")).toBeInTheDocument();
  });

  it("shows an error when MCQs cannot be loaded", async () => {
    mockFetch(routes().map((r) => (String(r.url).includes("mcqs") ? { ...r, respond: { status: 500, json: { error: "x" } } } : r)));
    const user = await openConfig();
    await waitFor(() => expect(subjectSelect()).toHaveValue("history"));
    await user.click(startButton());
    expect(await screen.findByText("fetch mcqs 500")).toBeInTheDocument();
  });

  it("disables Start until a subject is available", async () => {
    mockFetch(routes().map((r) => (r.url === "/api/genres" ? { ...r, respond: { json: [] } } : r)));
    await openConfig();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(startButton()).toBeDisabled();
  });

  it("scores answers, accepting every correct_answer format the data uses", async () => {
    // Correct answers stored as letters, "Option X", 1-based numbers, option text and
    // snake-case labels must all resolve to the matching option.
    const formats = ["b", "Option C", "4", "Alpha", "OPTION_B"];
    const expectedOption = ["Bravo", "Charlie", "Delta", "Alpha", "Bravo"];
    const questions = Array.from({ length: 20 }, (_, i) => ({
      ...mcq(i + 1),
      option_a: "Alpha",
      option_b: "Bravo",
      option_c: "Charlie",
      option_d: "Delta",
      correct_answer: formats[i % formats.length],
    }));
    mockFetch(routes().map((r) => (String(r.url).includes("mcqs") ? { ...r, respond: { json: questions } } : r)));
    vi.spyOn(Math, "random").mockReturnValue(0.999); // keep the shuffle in order
    const user = await openConfig();
    await waitFor(() => expect(subjectSelect()).toHaveValue("history"));
    await user.click(startButton());
    await screen.findByText("Question 1 of 20");

    // Text queries instead of role queries: 60 role lookups over this DOM are slow.
    const option = (text: string) => screen.getByText(text, { selector: "div" }).closest("button")!;
    for (let i = 0; i < 20; i++) {
      await screen.findByText(`Question text ${i + 1}`, { selector: "h2" });
      if (i === 18) {
        // leave unanswered
      } else if (i === 19) {
        await user.click(option(expectedOption[i % 5] === "Alpha" ? "Bravo" : "Alpha"));
      } else {
        await user.click(option(expectedOption[i % 5]));
      }
      if (i < 19) await user.click(screen.getByText("Next").closest("button")!);
    }
    await user.click(screen.getByText("Submit All Answers").closest("button")!);

    expect(await screen.findByRole("heading", { name: "Quiz Results" })).toBeInTheDocument();
    expect(screen.getByText("18/20")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
    // the wrong answer is flagged in the review list and on the current question
    expect(screen.getAllByText("Incorrect").length).toBeGreaterThanOrEqual(2);
  }, 30_000);

  // BUG: when /api/genres fails it returns `{ error: "..." }` with status 500; the page
  // stores that object as `genres` (src/app/quiz/page.tsx:53-56) and the config view
  // then crashes on `genres.map is not a function` (:588).
  it.fails("survives /api/genres returning an error object", async () => {
    mockFetch(routes().map((r) => (r.url === "/api/genres" ? { ...r, respond: { status: 500, json: { error: "Supabase credentials not set" } } } : r)));
    const user = userEvent.setup();
    render(<QuizPage />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    await user.click(screen.getByRole("button", { name: /Start Practice Session/ }));
    expect(screen.getByRole("heading", { name: "START YOUR PRACTICE" })).toBeInTheDocument();
    expect(startButton()).toBeDisabled();
  });
});
