"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronDown, Download, Eye, FileText, Loader2, Sparkles, X } from "lucide-react";

type ExamKey = "CSS" | "PMS";
type SubjectGroup = "compulsory" | "optional";

type Paper = {
  id: string;
  year: number;
  title: string;
  public_url: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
};

type Subject = {
  id: string;
  exam_type: ExamKey;
  name: string;
  slug: string;
  subject_group: SubjectGroup;
  past_papers: Paper[];
};

type GroupedSubjects = {
  compulsory: Subject[];
  optional: Subject[];
  all: Subject[];
};

const EXAM_DETAILS: Record<ExamKey, { title: string; fullName: string; description: string }> = {
  CSS: {
    title: "CSS",
    fullName: "Central Superior Services",
    description: "Browse CSS past papers by subject and year.",
  },
  PMS: {
    title: "PMS",
    fullName: "Provincial Management Service",
    description: "Browse PMS past papers by subject and year.",
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

function formatFileSize(bytes: number | null) {
  if (!bytes) {
    return "PDF";
  }

  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

async function fetchPastPapers(exam: ExamKey): Promise<Subject[]> {
  const response = await fetch(`/api/past-papers?exam=${exam}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || `Failed to load ${exam} past papers.`);
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
  const [selectedYear, setSelectedYear] = useState("all");
  const [previewPaper, setPreviewPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const examMeta = EXAM_DETAILS[activeExam];
  const groupedSubjects = useMemo(() => groupSubjects(subjects), [subjects]);
  const selectedSubject = groupedSubjects.all.find((subject) => subject.id === selectedSubjectId) || null;

  const yearOptions = useMemo(() => {
    if (!selectedSubject) {
      return [];
    }

    const years = selectedSubject.past_papers.map((paper) => paper.year);
    return Array.from(new Set(years)).sort((a, b) => b - a);
  }, [selectedSubject]);

  const visiblePapers = useMemo(() => {
    if (!selectedSubject) {
      return [];
    }

    const papers = selectedSubject.past_papers || [];
    const filtered = selectedYear === "all"
      ? papers
      : papers.filter((paper) => String(paper.year) === selectedYear);

    return [...filtered].sort((a, b) => {
      if (a.year !== b.year) {
        return b.year - a.year;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [selectedSubject, selectedYear]);

  useEffect(() => {
    setActiveExam(exam);
  }, [exam]);

  useEffect(() => {
    let isMounted = true;

    const loadPapers = async () => {
      setLoading(true);
      setError(null);
      setSelectedSubjectId("");
      setSelectedYear("all");

      try {
        const payload = await fetchPastPapers(activeExam);
        if (isMounted) {
          setSubjects(payload);
        }
      } catch (loadError: any) {
        if (isMounted) {
          setError(loadError?.message || "Unable to load past papers right now.");
          setSubjects([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPapers();

    return () => {
      isMounted = false;
    };
  }, [activeExam]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_46%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#17080f_0%,#12060b_100%)] pt-28 pb-12 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] dark:opacity-[0.1] bg-[linear-gradient(to_right,rgba(148,163,184,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.2)_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-[28px] border border-zinc-200/80 dark:border-rose-900/70 bg-white/92 dark:bg-[#1f0f18]/84 backdrop-blur-xl shadow-[0_24px_60px_-40px_rgba(15,23,42,0.45)] dark:shadow-[0_24px_64px_-36px_rgba(127,29,29,0.55)] p-6 sm:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:border-rose-800/70 dark:bg-rose-950/38 dark:text-rose-100">
                <Sparkles className="h-3.5 w-3.5" />
                Past Papers
              </div>
              <h1 className="mt-4 text-3xl sm:text-4xl lg:text-[2.65rem] leading-tight text-zinc-900 dark:text-rose-50 font-semibold tracking-tight">
                {examMeta.fullName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base text-zinc-600 dark:text-rose-100/90 leading-relaxed">
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

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_350px] gap-6 items-start">
          <section className="order-2 xl:order-1 space-y-4">
            <div className="rounded-3xl border border-zinc-200/80 dark:border-rose-900/70 bg-white/94 dark:bg-[#220f1a]/86 backdrop-blur-xl p-5 sm:p-6 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.28)] dark:shadow-[0_22px_54px_-34px_rgba(159,18,57,0.45)]">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-rose-200/80">Subject</span>
                  <select
                    value={selectedSubjectId}
                    onChange={(event) => {
                      setSelectedSubjectId(event.target.value);
                      setSelectedYear("all");
                    }}
                    disabled={loading}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-800 outline-none transition focus:ring-2 focus:ring-zinc-400/35 dark:border-rose-900/80 dark:bg-[#2a111c] dark:text-rose-50 dark:focus:ring-rose-400/35 disabled:opacity-60"
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
                      disabled={!selectedSubject}
                      className="w-full appearance-none rounded-2xl border border-zinc-300 bg-white px-4 py-3 pr-10 text-sm text-zinc-800 outline-none transition focus:ring-2 focus:ring-zinc-400/35 dark:border-rose-900/80 dark:bg-[#2a111c] dark:text-rose-50 dark:focus:ring-rose-400/35 disabled:opacity-60"
                    >
                      <option value="all">All years</option>
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
              <div className="rounded-2xl border border-rose-300/70 dark:border-rose-800/70 bg-rose-50/85 dark:bg-rose-950/35 p-4 text-sm text-rose-800 dark:text-rose-100">
                {error}
              </div>
            )}

            <div className="rounded-3xl border border-zinc-200/80 dark:border-rose-900/70 bg-white/94 dark:bg-[#220f1a]/86 backdrop-blur-xl p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-rose-50">
                    {selectedSubject ? selectedSubject.name : "Available papers"}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-rose-100/80">
                    {visiblePapers.length} paper{visiblePapers.length === 1 ? "" : "s"} shown, newest year first.
                  </p>
                </div>
                <FileText className="h-6 w-6 text-zinc-400 dark:text-rose-200/70" />
              </div>

              <div className="mt-5 space-y-3">
                {loading ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 dark:border-rose-900/70 bg-zinc-50/80 dark:bg-rose-950/28 p-4 text-sm text-zinc-600 dark:text-rose-100/85">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading past papers...
                  </div>
                ) : selectedSubject && visiblePapers.length > 0 ? (
                  visiblePapers.map((paper) => (
                    <div
                      key={paper.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 dark:border-rose-900/70 bg-zinc-50/80 dark:bg-rose-950/28 p-4 transition hover:border-zinc-400 dark:hover:border-rose-700"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-rose-50 truncate">{paper.title}</p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-rose-200/75">
                          {paper.year} - {formatFileSize(paper.file_size)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewPaper(paper)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-600 transition hover:border-zinc-500 hover:text-zinc-900 dark:border-rose-900/80 dark:bg-[#2a111c] dark:text-rose-100 dark:hover:border-rose-700"
                          aria-label={`Preview ${paper.title}`}
                          title="Preview paper"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <a
                          href={paper.public_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-600 transition hover:border-zinc-500 hover:text-zinc-900 dark:border-rose-900/80 dark:bg-[#2a111c] dark:text-rose-100 dark:hover:border-rose-700"
                          aria-label={`Open ${paper.title}`}
                          title="Open PDF"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-6 text-center dark:!border-rose-900/80 dark:!bg-[#1a0a12] sm:p-8">
                    <CalendarDays className="mx-auto h-10 w-10 text-zinc-400 dark:text-rose-200/70" />
                    <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-rose-50">
                      {selectedSubject ? "No papers for this filter" : "Select a subject"}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-rose-100/80 max-w-xl mx-auto">
                      Choose a subject to view available papers by year.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="order-1 xl:order-2 xl:sticky xl:top-28">
            <div className="rounded-3xl border border-zinc-200/80 dark:border-rose-900/70 bg-white/94 dark:bg-[#220f1a]/86 backdrop-blur-xl p-5 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.28)] dark:shadow-[0_22px_54px_-34px_rgba(159,18,57,0.45)] space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-rose-200/80">
                  Exam Type
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-rose-50">
                  {examMeta.fullName}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-rose-200/80">
                  Selected Subject
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-rose-50">
                  {selectedSubject?.name || "None selected"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-rose-200/80">
                  Selected Year
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-rose-50">
                  {selectedYear === "all" ? "All years" : selectedYear}
                </p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-600 dark:!border-rose-900/80 dark:!bg-[#2a111c] dark:!text-rose-100/85">
                Choose a subject and year to narrow the paper list.
              </div>
            </div>
          </aside>
        </div>
      </div>

      {previewPaper && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-3 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={previewPaper.title}
        >
          <div className="flex h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-rose-900/80 dark:bg-[#1f0f18]">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-rose-900/80">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-rose-50">
                  {previewPaper.title}
                </p>
                <p className="text-xs text-zinc-500 dark:text-rose-200/75">
                  {previewPaper.year} - {formatFileSize(previewPaper.file_size)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={previewPaper.public_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition hover:border-zinc-500 hover:text-zinc-900 dark:border-rose-900/80 dark:text-rose-100 dark:hover:border-rose-700"
                  aria-label="Open PDF"
                  title="Open PDF"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPaper(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition hover:border-zinc-500 hover:text-zinc-900 dark:border-rose-900/80 dark:text-rose-100 dark:hover:border-rose-700"
                  aria-label="Close preview"
                  title="Close preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <iframe
              src={previewPaper.public_url}
              title={previewPaper.title}
              className="h-full w-full bg-zinc-100 dark:bg-black"
            />
          </div>
        </div>
      )}
    </main>
  );
}
