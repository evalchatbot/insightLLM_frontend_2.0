import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { fetchCalls, mockFetch } from "../helpers/fetch";
import PastPapersBrowser from "@/components/past-papers-components/past-papers-browser";

const q = (id: string, year: number, number: string, order: number, extra: Record<string, unknown> = {}) => ({
  id,
  subject_id: "s-econ",
  exam_type: "CSS",
  year,
  question_number: number,
  question_text: `Question ${id}`,
  answer_text: `Answer for ${id}`,
  marks: 20,
  display_order: order,
  created_at: "2026-01-01T00:00:00Z",
  ...extra,
});

const CSS_SUBJECTS = [
  {
    id: "s-econ",
    exam_type: "CSS",
    name: "Economics",
    slug: "economics",
    subject_group: "optional",
    past_paper_questions: [q("a", 2023, "2", 2), q("b", 2024, "1", 1), q("c", 2023, "1", 1, { marks: null })],
  },
  { id: "s-essay", exam_type: "CSS", name: "English Essay", slug: "essay", subject_group: "compulsory", past_paper_questions: [] },
];

const selects = () => {
  const [subject, year] = screen.getAllByRole("combobox") as HTMLSelectElement[];
  return { subject, year };
};

async function renderLoaded(props: Partial<Parameters<typeof PastPapersBrowser>[0]> = {}) {
  const user = userEvent.setup();
  render(<PastPapersBrowser exam="CSS" {...props} />);
  await waitFor(() => expect(selects().subject).toBeEnabled());
  return user;
}

describe("PastPapersBrowser", () => {
  it("loads subjects for the exam, grouped compulsory/optional", async () => {
    const spy = mockFetch([{ url: "/api/past-papers?exam=CSS", respond: { json: { success: true, subjects: CSS_SUBJECTS } } }]);
    await renderLoaded();
    expect(fetchCalls(spy)).toEqual(["GET /api/past-papers?exam=CSS"]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Central Superior Services");
    const compulsory = within(selects().subject).getByRole("group", { name: "COMPULSORY SUBJECTS" });
    const optional = within(selects().subject).getByRole("group", { name: "OPTIONAL SUBJECTS" });
    expect(within(compulsory).getByRole("option", { name: "English Essay" })).toBeInTheDocument();
    expect(within(optional).getByRole("option", { name: "Economics" })).toBeInTheDocument();
    expect(selects().year).toBeDisabled();
  });

  it("lists a year's questions in paper order and opens the answer", async () => {
    mockFetch([{ url: "/api/past-papers?exam=CSS", respond: { json: { success: true, subjects: CSS_SUBJECTS } } }]);
    const user = await renderLoaded();
    await user.selectOptions(selects().subject, "s-econ");
    expect(within(selects().year).getAllByRole("option").map((o) => o.textContent)).toEqual(["Select a year", "2024", "2023"]);

    await user.selectOptions(selects().year, "2023");
    const questionButtons = screen.getAllByRole("button", { name: /^Q\. No\./ }).filter((b) => !b.getAttribute("aria-label"));
    expect(questionButtons.map((b) => b.textContent)).toEqual(["Q. No. 1Question c", "Q. No. 2Question a(20)"]);

    await user.click(screen.getByRole("button", { name: /Question a/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Answer for a")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("shows an empty state until a subject and year are chosen", async () => {
    mockFetch([{ url: "/api/past-papers?exam=CSS", respond: { json: { success: true, subjects: CSS_SUBJECTS } } }]);
    const user = await renderLoaded();
    expect(screen.getByRole("heading", { name: "Select a subject" })).toBeInTheDocument();
    await user.selectOptions(selects().subject, "s-econ");
    expect(screen.getByRole("heading", { name: "Select a year" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download full paper/ })).toBeDisabled();
  });

  it("switches exams when allowed", async () => {
    const spy = mockFetch([
      { url: "/api/past-papers?exam=CSS", respond: { json: { success: true, subjects: CSS_SUBJECTS } } },
      { url: "/api/past-papers?exam=PMS", respond: { json: { success: true, subjects: [] } } },
    ]);
    const user = await renderLoaded({ allowExamSwitch: true });
    await user.click(screen.getByRole("button", { name: "PMS" }));
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Provincial Management Service"));
    expect(fetchCalls(spy)).toEqual(["GET /api/past-papers?exam=CSS", "GET /api/past-papers?exam=PMS"]);
  });

  it("hides exam switching by default", async () => {
    mockFetch([{ url: "/api/past-papers?exam=CSS", respond: { json: { success: true, subjects: [] } } }]);
    await renderLoaded();
    expect(screen.queryByRole("button", { name: "PMS" })).toBeNull();
  });

  it("shows the API error message when loading fails", async () => {
    mockFetch([{ url: "/api/past-papers?exam=CSS", respond: { status: 500, json: { success: false, message: "Unable to load past paper subjects." } } }]);
    await renderLoaded();
    expect(screen.getByText("Unable to load past paper subjects.")).toBeInTheDocument();
  });
});
