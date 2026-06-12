"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { jsPDF } from "jspdf";
import ReactMarkdown from "react-markdown";

type ExamKey = "CSS" | "PMS";
type SubjectGroup = "compulsory" | "optional";

type Question = {
  id: string;
  subject_id: string;
  exam_type: ExamKey;
  year: number;
  question_number: string;
  question_text: string;
  answer_text: string;
  marks: number | null;
  display_order: number;
  created_at: string;
};

type Subject = {
  id: string;
  exam_type: ExamKey;
  name: string;
  slug: string;
  subject_group: SubjectGroup;
  past_paper_questions: Question[];
};

type GroupedSubjects = {
  compulsory: Subject[];
  optional: Subject[];
  all: Subject[];
};

type AnswerBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string };

const EXAM_DETAILS: Record<ExamKey, { title: string; fullName: string; description: string }> = {
  CSS: {
    title: "CSS",
    fullName: "Central Superior Services",
    description: "Browse solved past paper questions by subject and year.",
  },
  PMS: {
    title: "PMS",
    fullName: "Provincial Management Service",
    description: "Browse solved past paper questions by subject and year.",
  },
};

function groupSubjects(subjects: Subject[]): GroupedSubjects {
  const sortedSubjects = [...subjects].sort((a, b) => a.name.localeCompare(b.name));
  return {
    compulsory: sortedSubjects.filter((subject) => subject.subject_group === "compulsory"),
    optional: sortedSubjects.filter((subject) => subject.subject_group === "optional"),
    all: sortedSubjects,
  };
}

function formatQuestionLabel(questionNumber: string) {
  const trimmed = questionNumber.trim();
  if (/^q\.?\s*no\.?/i.test(trimmed)) {
    return trimmed;
  }
  return `Q. No. ${trimmed}`;
}

function compareQuestions(a: Question, b: Question) {
  if (a.year !== b.year) {
    return b.year - a.year;
  }

  if (a.display_order !== b.display_order) {
    return a.display_order - b.display_order;
  }

  const aNumber = Number.parseInt(a.question_number, 10);
  const bNumber = Number.parseInt(b.question_number, 10);
  if (!Number.isNaN(aNumber) && !Number.isNaN(bNumber) && aNumber !== bNumber) {
    return aNumber - bNumber;
  }

  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function sanitizePdfFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "past-paper";
}

function normalizeAnswerText(value: string) {
  return (value || "")
    .replace(/\\r\\n|\\n|\\r/g, "\n")
    .replace(/\r\n?/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<\/?p>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanInlineText(value: string) {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function isHeadingLine(line: string) {
  const cleanLine = cleanInlineText(line.replace(/^#{1,6}\s+/, ""));
  if (!cleanLine || cleanLine.length > 90) {
    return false;
  }

  if (/^#{1,6}\s+/.test(line)) {
    return true;
  }

  if (/^[A-Z][A-Za-z\s/&-]{2,}:$/.test(cleanLine)) {
    return true;
  }

  return /^(introduction|outline|answer|thesis|background|main body|analysis|critical analysis|arguments?|causes?|impacts?|effects?|challenges?|solutions?|recommendations?|way forward|conclusion|examples?|references?)$/i.test(cleanLine);
}

function parseListItem(line: string) {
  const unordered = line.match(/^\s*(?:[-*+•])\s+(.+)$/);
  if (unordered) {
    return { ordered: false, text: unordered[1].trim() };
  }

  const ordered = line.match(/^\s*(?:\d+|[a-zA-Z]|[ivxlcdmIVXLCDM]+)[.)]\s+(.+)$/);
  if (ordered) {
    return { ordered: true, text: ordered[1].trim() };
  }

  return null;
}

function parseAnswerBlocks(value: string): AnswerBlock[] {
  const text = normalizeAnswerText(value);
  if (!text) {
    return [];
  }

  const blocks: AnswerBlock[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let listOrdered = false;

  const flushParagraph = () => {
    const paragraph = paragraphLines.map((line) => line.trim()).filter(Boolean).join(" ");
    if (paragraph) {
      blocks.push({ type: "paragraph", text: paragraph });
    }
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: "list", ordered: listOrdered, items: listItems });
    }
    listItems = [];
    listOrdered = false;
  };

  text.split("\n").forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    const quote = line.match(/^>\s+(.+)$/);
    if (quote) {
      flushParagraph();
      flushList();
      blocks.push({ type: "quote", text: quote[1].trim() });
      return;
    }

    const listItem = parseListItem(line);
    if (listItem) {
      flushParagraph();
      if (listItems.length > 0 && listOrdered !== listItem.ordered) {
        flushList();
      }
      listOrdered = listItem.ordered;
      listItems.push(listItem.text);
      return;
    }

    if (isHeadingLine(line)) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", text: cleanInlineText(line.replace(/^#{1,6}\s+/, "").replace(/:$/, "")) });
      return;
    }

    flushList();
    paragraphLines.push(line);
  });

  flushParagraph();
  flushList();

  return blocks;
}

function writeQuestionPdf(
  options: {
    examTitle: string;
    subjectName: string;
    year: string;
    questions: Question[];
    fileName: string;
  }
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const marginY = 46;
  const contentWidth = pageWidth - marginX * 2;
  let cursorY = marginY;

  const ensureSpace = (height: number) => {
    if (cursorY + height <= pageHeight - marginY) {
      return;
    }
    doc.addPage();
    cursorY = marginY;
  };

  const writeText = (
    text: string,
    fontSize = 11,
    lineHeight = 15,
    style: "normal" | "bold" | "italic" = "normal",
    indent = 0
  ) => {
    const cleanText = (text || "").trim();
    if (!cleanText) {
      return;
    }

    doc.setFont("times", style);
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(cleanText, contentWidth - indent);
    ensureSpace(lines.length * lineHeight + 6);
    doc.text(lines, marginX + indent, cursorY);
    cursorY += lines.length * lineHeight + 6;
  };

  const writeDivider = () => {
    ensureSpace(18);
    doc.setDrawColor(190, 190, 190);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 18;
  };

  const writeAnswer = (answer: string) => {
    parseAnswerBlocks(answer).forEach((block) => {
      if (block.type === "heading") {
        cursorY += 4;
        writeText(cleanInlineText(block.text), 12, 16, "bold");
        return;
      }

      if (block.type === "list") {
        block.items.forEach((item, itemIndex) => {
          const marker = block.ordered ? `${itemIndex + 1}.` : "-";
          writeText(`${marker} ${cleanInlineText(item)}`, 11, 15, "normal", 14);
        });
        cursorY += 2;
        return;
      }

      if (block.type === "quote") {
        writeText(cleanInlineText(block.text), 11, 15, "italic", 14);
        return;
      }

      writeText(cleanInlineText(block.text), 11, 15);
    });
  };

  doc.setTextColor(17, 24, 39);
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.text(options.examTitle.toUpperCase(), pageWidth / 2, cursorY, { align: "center" });
  cursorY += 22;
  doc.setFontSize(18);
  doc.text(options.subjectName.toUpperCase(), pageWidth / 2, cursorY, { align: "center" });
  cursorY += 18;
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.text(`Year ${options.year}`, pageWidth / 2, cursorY, { align: "center" });
  cursorY += 24;
  writeDivider();

  options.questions.forEach((question, index) => {
    if (index > 0) {
      cursorY += 6;
      writeDivider();
    }

    const marks = question.marks ? ` (${question.marks})` : "";
    writeText(`${formatQuestionLabel(question.question_number)}${marks}`, 12, 16, "bold");
    writeText(question.question_text, 12, 16);
    cursorY += 4;
    writeText("Answer", 12, 16, "bold");
    writeAnswer(question.answer_text);
  });

  doc.save(options.fileName);
}

function InlineMarkdown({ source }: { source: string }) {
  return (
    <ReactMarkdown
      allowedElements={["strong", "em", "code", "br", "p"] as any}
      components={{
        p: ({ children }) => <>{children}</>,
        code: ({ children }) => (
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-[0.92em] dark:bg-rose-950/70">
            {children}
          </code>
        ),
      }}
    >
      {source}
    </ReactMarkdown>
  );
}

function AnswerMarkdown({ source }: { source: string }) {
  const blocks = parseAnswerBlocks(source);

  if (blocks.length === 0) {
    return <p className="text-zinc-500 dark:text-rose-100/70">No answer added yet.</p>;
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, blockIndex) => {
        if (block.type === "heading") {
          return (
            <h4
              key={`${block.type}-${blockIndex}`}
              className="border-b border-zinc-200 pb-1 text-base font-semibold text-zinc-950 dark:border-rose-900/70 dark:text-rose-50"
            >
              <InlineMarkdown source={block.text} />
            </h4>
          );
        }

        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              key={`${block.type}-${blockIndex}`}
              className={`${block.ordered ? "list-decimal" : "list-disc"} space-y-2 pl-6`}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${blockIndex}-${itemIndex}`} className="leading-7">
                  <InlineMarkdown source={item} />
                </li>
              ))}
            </ListTag>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote
              key={`${block.type}-${blockIndex}`}
              className="border-l-2 border-zinc-300 pl-3 italic leading-7 text-zinc-700 dark:border-rose-900 dark:text-rose-100/80"
            >
              <InlineMarkdown source={block.text} />
            </blockquote>
          );
        }

        return (
          <p key={`${block.type}-${blockIndex}`} className="leading-7">
            <InlineMarkdown source={block.text} />
          </p>
        );
      })}
    </div>
  );
}

async function fetchPastPaperQuestions(exam: ExamKey): Promise<Subject[]> {
  const response = await fetch(`/api/past-papers?exam=${exam}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || `Failed to load ${exam} past paper questions.`);
  }

  return Array.isArray(payload.subjects) ? payload.subjects : [];
}

export default function PastPapersBrowser({
  exam,
  allowExamSwitch = false,
}: {
  exam: ExamKey;
  allowExamSwitch?: boolean;
}) {
  const [activeExam, setActiveExam] = useState<ExamKey>(exam);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const examMeta = EXAM_DETAILS[activeExam];
  const groupedSubjects = useMemo(() => groupSubjects(subjects), [subjects]);
  const selectedSubject = groupedSubjects.all.find((subject) => subject.id === selectedSubjectId) || null;

  const yearOptions = useMemo(() => {
    if (!selectedSubject) {
      return [];
    }

    const years = selectedSubject.past_paper_questions.map((question) => question.year);
    return Array.from(new Set(years)).sort((a, b) => b - a);
  }, [selectedSubject]);

  const visibleQuestions = useMemo(() => {
    if (!selectedSubject || !selectedYear) {
      return [];
    }

    return selectedSubject.past_paper_questions
      .filter((question) => String(question.year) === selectedYear)
      .sort(compareQuestions);
  }, [selectedSubject, selectedYear]);

  const downloadQuestion = (question: Question) => {
    const subjectName = selectedSubject?.name || "Past Paper";
    writeQuestionPdf({
      examTitle: examMeta.fullName,
      subjectName,
      year: String(question.year),
      questions: [question],
      fileName: `${sanitizePdfFileName(`${activeExam}-${subjectName}-${question.year}-${question.question_number}`)}.pdf`,
    });
  };

  const downloadSelectedPaper = () => {
    if (!selectedSubject || !selectedYear || visibleQuestions.length === 0) {
      return;
    }

    writeQuestionPdf({
      examTitle: examMeta.fullName,
      subjectName: selectedSubject.name,
      year: selectedYear,
      questions: visibleQuestions,
      fileName: `${sanitizePdfFileName(`${activeExam}-${selectedSubject.name}-${selectedYear}-solved-paper`)}.pdf`,
    });
  };

  useEffect(() => {
    setActiveExam(exam);
  }, [exam]);

  useEffect(() => {
    let isMounted = true;

    const loadQuestions = async () => {
      setLoading(true);
      setError(null);
      setSelectedSubjectId("");
      setSelectedYear("");
      setSelectedQuestion(null);

      try {
        const payload = await fetchPastPaperQuestions(activeExam);
        if (isMounted) {
          setSubjects(payload);
        }
      } catch (loadError: any) {
        if (isMounted) {
          setError(loadError?.message || "Unable to load past paper questions right now.");
          setSubjects([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadQuestions();

    return () => {
      isMounted = false;
    };
  }, [activeExam]);

  useEffect(() => {
    setSelectedQuestion(null);
  }, [selectedSubjectId, selectedYear]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedQuestion(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_46%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#17080f_0%,#12060b_100%)] pt-28 pb-12 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] dark:opacity-[0.1] bg-[linear-gradient(to_right,rgba(148,163,184,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.2)_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-xl border border-zinc-200/80 bg-white/92 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-rose-900/70 dark:bg-[#1f0f18]/84 dark:shadow-[0_24px_64px_-36px_rgba(127,29,29,0.55)] sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:border-rose-800/70 dark:bg-rose-950/38 dark:text-rose-100">
                <Sparkles className="h-3.5 w-3.5" />
                Solved Past Questions
              </div>
              <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-zinc-900 dark:text-rose-50 sm:text-4xl lg:text-[2.65rem]">
                {examMeta.fullName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-rose-100/90 sm:text-base">
                {examMeta.description}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {allowExamSwitch && (["CSS", "PMS"] as ExamKey[]).map((examOption) => (
                <button
                  key={examOption}
                  type="button"
                  onClick={() => setActiveExam(examOption)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    activeExam === examOption
                      ? "border-zinc-900 bg-zinc-900 text-white dark:!border-rose-500 dark:!bg-rose-900 dark:!text-rose-50"
                      : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:!border-rose-900/80 dark:!bg-[#2a111c] dark:!text-rose-100 dark:hover:!bg-rose-950/70"
                  }`}
                >
                  {examOption}
                </button>
              ))}
            </div>
          </div>
        </motion.section>

        <div className="mt-6">
          <section className="space-y-4">
            <div className="rounded-xl border border-zinc-200/80 bg-white/94 p-5 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-rose-900/70 dark:bg-[#220f1a]/86 dark:shadow-[0_22px_54px_-34px_rgba(159,18,57,0.45)] sm:p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-rose-200/80">Subject</span>
                  <select
                    value={selectedSubjectId}
                    onChange={(event) => {
                      setSelectedSubjectId(event.target.value);
                      setSelectedYear("");
                    }}
                    disabled={loading}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-800 outline-none transition focus:ring-2 focus:ring-zinc-400/35 disabled:opacity-60 dark:border-rose-900/80 dark:bg-[#2a111c] dark:text-rose-50 dark:focus:ring-rose-400/35"
                  >
                    <option value="">{loading ? "Loading subjects..." : "Select a subject"}</option>
                    {groupedSubjects.compulsory.length > 0 && (
                      <optgroup label="COMPULSORY SUBJECTS">
                        {groupedSubjects.compulsory.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {groupedSubjects.optional.length > 0 && (
                      <optgroup label="OPTIONAL SUBJECTS">
                        {groupedSubjects.optional.map((subject) => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-rose-200/80">Year</span>
                  <div className="relative">
                    <select
                      value={selectedYear}
                      onChange={(event) => setSelectedYear(event.target.value)}
                      disabled={!selectedSubject || yearOptions.length === 0}
                      className="w-full appearance-none rounded-lg border border-zinc-300 bg-white px-4 py-3 pr-10 text-sm text-zinc-800 outline-none transition focus:ring-2 focus:ring-zinc-400/35 disabled:opacity-60 dark:border-rose-900/80 dark:bg-[#2a111c] dark:text-rose-50 dark:focus:ring-rose-400/35"
                    >
                      <option value="">{selectedSubject ? "Select a year" : "Select subject first"}</option>
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-rose-200/80" />
                  </div>
                </label>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-300/70 bg-rose-50/85 p-4 text-sm text-rose-800 dark:border-rose-800/70 dark:bg-rose-950/35 dark:text-rose-100">
                {error}
              </div>
            )}

            <div className="rounded-xl border border-zinc-200/80 bg-white/94 p-5 backdrop-blur-xl dark:border-rose-900/70 dark:bg-[#220f1a]/86 sm:p-6">
              <div className="mx-auto max-w-6xl rounded-lg border border-zinc-300 bg-white px-4 py-6 text-zinc-950 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.45)] dark:border-rose-900/60 dark:bg-[#fffafc] dark:text-zinc-950 sm:px-8 lg:px-10">
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    {examMeta.title} Past Paper Questions
                  </p>
                  <h2 className="mt-3 text-2xl font-bold uppercase leading-snug tracking-tight underline decoration-zinc-500 underline-offset-4 sm:text-3xl">
                    {selectedSubject?.name || "Select Subject"}
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-zinc-600">
                    {selectedYear ? `Year ${selectedYear}` : "Select a year to view questions"}
                  </p>
                </div>

                <div className="my-6 flex flex-col gap-3 border-y border-zinc-300 py-3 text-sm leading-relaxed text-zinc-700 sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    Questions are listed as they are added for the selected subject and year. Click any question to view its answer.
                  </p>
                  <button
                    type="button"
                    onClick={downloadSelectedPaper}
                    disabled={!selectedSubject || !selectedYear || visibleQuestions.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Download className="h-4 w-4" />
                    Download full paper
                  </button>
                </div>

                <div className="space-y-3">
                  {loading ? (
                    <div className="flex items-center justify-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading questions...
                    </div>
                  ) : selectedSubject && selectedYear && visibleQuestions.length > 0 ? (
                    visibleQuestions.map((question) => (
                      <div
                        key={question.id}
                        className="grid w-full grid-cols-1 gap-3 rounded-lg border border-transparent px-2 py-3 transition hover:border-zinc-300 hover:bg-zinc-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-4 sm:px-3"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedQuestion(question)}
                          className="group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 text-left focus:outline-none focus:ring-2 focus:ring-zinc-400/40 sm:gap-5"
                        >
                          <span className="whitespace-nowrap pt-0.5 text-sm font-bold text-zinc-950 sm:text-base">
                            {formatQuestionLabel(question.question_number)}
                          </span>
                          <span className="text-sm leading-relaxed text-zinc-900 sm:text-base">
                            {question.question_text}
                          </span>
                          <span className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-zinc-700">
                            {question.marks ? `(${question.marks})` : ""}
                            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadQuestion(question)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-500 hover:text-zinc-950 sm:justify-start"
                          aria-label={`Download ${formatQuestionLabel(question.question_number)}`}
                          title="Download this question"
                        >
                          <Download className="h-4 w-4" />
                          <span className="sm:hidden lg:inline">Download</span>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center sm:p-8">
                      <CalendarDays className="mx-auto h-10 w-10 text-zinc-400" />
                      <h3 className="mt-4 text-lg font-semibold text-zinc-950">
                        {selectedSubject
                          ? selectedYear
                            ? "No questions for this year"
                            : "Select a year"
                          : "Select a subject"}
                      </h3>
                      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">
                        Choose a subject and year to load the dynamic question list.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <AnimatePresence>
        {selectedQuestion && (
          <div
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={`${formatQuestionLabel(selectedQuestion.question_number)} answer`}
          >
            <button
              type="button"
              className="absolute inset-0 h-full w-full cursor-default"
              aria-label="Close answer"
              onClick={() => setSelectedQuestion(null)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-[#1f0f18] sm:border-l sm:border-zinc-200 dark:sm:border-rose-900/80"
            >
              <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-rose-900/80 sm:px-6">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-rose-200/80">
                    Answer
                  </p>
                  <h3 className="mt-1 text-lg font-semibold leading-snug text-zinc-900 dark:text-rose-50">
                    {formatQuestionLabel(selectedQuestion.question_number)}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-rose-100/75">
                    {selectedSubject?.name} - {selectedQuestion.year}
                    {selectedQuestion.marks ? ` - ${selectedQuestion.marks} marks` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedQuestion(null)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition hover:border-zinc-500 hover:text-zinc-900 dark:border-rose-900/80 dark:text-rose-100 dark:hover:border-rose-700"
                  aria-label="Close answer"
                  title="Close answer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-5 sm:px-6">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-rose-900/70 dark:bg-[#2a111c]">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-rose-50">Question</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-rose-100/85">
                    {selectedQuestion.question_text}
                  </p>
                </div>

                <div className="mt-5">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-rose-50">Answer</p>
                  <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm leading-7 text-zinc-800 dark:border-rose-900/70 dark:bg-[#180912] dark:text-rose-50/90 sm:text-base">
                    <AnswerMarkdown source={selectedQuestion.answer_text} />
                  </div>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
