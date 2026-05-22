"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, CalendarDays, ChevronDown, Loader2, Sparkles } from "lucide-react";

type ExamKey = "CSS" | "PMS";

type Subject = {
  id: string;
  display_name: string;
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
    description: "Browse subjects, then narrow down papers by year. The paper library is ready for expansion.",
  },
  PMS: {
    title: "PMS",
    fullName: "Provincial Management Service",
    description: "Browse subjects, then narrow down papers by year. The paper library is ready for expansion.",
  },
};

const YEAR_OPTIONS = ["2020", "2021", "2022", "2023", "2024", "2025"];

function normalizeApiUrl(url: string): string {
  if (url.startsWith("http:") && !url.startsWith("http://") && !url.startsWith("https://")) {
    return url.replace(/^http:/, "http://");
  }
  return url;
}

function getDisplayName(originalName: string): string {
  const mapping: Record<string, string> = {
    CLAW: "Constitutional Law",
    European: "European History",
    "I Law": "International Law",
    IR: "International Relations",
    "Mass Comm": "Mass Communication",
    "Pak Affairs": "Pakistan Affairs",
    "Political Science Rubric": "Political Science",
    "Islamic studies": "Islamic Studies",
  };
  return mapping[originalName] || originalName;
}

function groupSubjects(subjects: Subject[], exam: ExamKey): GroupedSubjects {
  const transformed = subjects.map((subject) => ({
    ...subject,
    display_name: getDisplayName(subject.display_name),
  }));

  if (exam === "PMS") {
    const compulsoryNames = ["Pakistan Affairs", "Islamic Studies", "English Essay", "English Precis"];
    const optionalNames = [
      "Business Administration",
      "Public Administration",
      "Political Science",
      "Mass Communication",
      "Sociology",
      "Psychology",
      "Philosophy",
    ];

    const compulsory = transformed.filter((subject) => compulsoryNames.includes(subject.display_name));
    if (!compulsory.some((subject) => subject.display_name === "English Essay")) {
      compulsory.unshift({ id: "english_essay", display_name: "English Essay" });
    }
    if (!compulsory.some((subject) => subject.display_name === "English Precis")) {
      compulsory.push({ id: "english_precis", display_name: "English Precis" });
    }

    const optional = transformed.filter((subject) => optionalNames.includes(subject.display_name));
    return { compulsory, optional, all: transformed };
  }

  const compulsoryNames = ["Current Affairs", "Pakistan Affairs", "Islamic Studies", "English Essay", "English Precis"];
  const compulsory = transformed.filter((subject) => compulsoryNames.includes(subject.display_name));
  if (!compulsory.some((subject) => subject.display_name === "English Essay")) {
    compulsory.unshift({ id: "english_essay", display_name: "English Essay" });
  }
  if (!compulsory.some((subject) => subject.display_name === "English Precis")) {
    compulsory.push({ id: "english_precis", display_name: "English Precis" });
  }

  const optional = transformed.filter((subject) => !compulsoryNames.includes(subject.display_name));
  return { compulsory, optional, all: transformed };
}

async function fetchAvailableSubjects(): Promise<Subject[]> {
  const baseUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000");
  const response = await fetch(`${baseUrl}/api/ocr/subjects`, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load subjects (${response.status})`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.subjects) ? payload.subjects : [];
}

export default function PastPapersBrowser({ exam }: { exam: ExamKey }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const examMeta = EXAM_DETAILS[exam];
  const groupedSubjects = useMemo(() => groupSubjects(subjects, exam), [exam, subjects]);

  useEffect(() => {
    let isMounted = true;

    const loadSubjects = async () => {
      setLoadingSubjects(true);
      setError(null);
      try {
        const payload = await fetchAvailableSubjects();
        if (!isMounted) {
          return;
        }
        setSubjects(payload);
      } catch (loadError: any) {
        if (!isMounted) {
          return;
        }
        setError(loadError?.message || "Unable to load subjects right now.");
        setSubjects([]);
      } finally {
        if (isMounted) {
          setLoadingSubjects(false);
        }
      }
    };

    loadSubjects();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setSelectedSubject("");
    setSelectedYear("");
  }, [exam]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_46%,#ffffff_100%)] dark:bg-[radial-gradient(circle_at_18%_0%,rgba(190,24,93,0.18),transparent_40%),radial-gradient(circle_at_84%_12%,rgba(153,27,27,0.18),transparent_44%),linear-gradient(180deg,#17080f_0%,#12060b_100%)] pt-28 pb-12 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] dark:opacity-[0.1] bg-[linear-gradient(to_right,rgba(148,163,184,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.2)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-zinc-100/70 via-transparent dark:from-rose-500/10" />

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

            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-rose-800/70 dark:bg-rose-950/38 dark:text-rose-100 px-3 py-1 text-xs font-semibold">
              {examMeta.title}
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
                    value={selectedSubject}
                    onChange={(event) => {
                      setSelectedSubject(event.target.value);
                      setSelectedYear("");
                    }}
                    disabled={loadingSubjects}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-800 outline-none transition focus:ring-2 focus:ring-zinc-400/35 dark:border-rose-900/80 dark:bg-[#2a111c] dark:text-rose-50 dark:focus:ring-rose-400/35 disabled:opacity-60"
                  >
                    <option value="">{loadingSubjects ? "Loading subjects..." : "Select a subject"}</option>
                    <optgroup label="COMPULSORY SUBJECTS">
                      {groupedSubjects.compulsory.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.display_name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="OPTIONAL SUBJECTS">
                      {groupedSubjects.optional.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.display_name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-rose-200/80">Year</span>
                  <select
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(event.target.value)}
                    disabled={!selectedSubject}
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-800 outline-none transition focus:ring-2 focus:ring-zinc-400/35 dark:border-rose-900/80 dark:bg-[#2a111c] dark:text-rose-50 dark:focus:ring-rose-400/35 disabled:opacity-60"
                  >
                    <option value="">Select a year</option>
                    {YEAR_OPTIONS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-5 rounded-2xl border border-zinc-200 dark:border-rose-900/70 bg-zinc-50/80 dark:bg-rose-950/28 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-rose-50">
                  <BookOpen className="h-4 w-4" />
                  Preview area
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-rose-100/85">
                  {selectedSubject && selectedYear
                    ? `Paper slots for ${examMeta.title} ${selectedYear} will appear here next.`
                    : "Choose a subject and a year to open the paper slots."
                  }
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-300/70 dark:border-rose-800/70 bg-rose-50/85 dark:bg-rose-950/35 p-4 text-sm text-rose-800 dark:text-rose-100">
                {error}
              </div>
            )}

            <div className="rounded-3xl border border-dashed border-zinc-300 dark:border-rose-900/70 bg-white/70 dark:bg-rose-950/20 p-6 sm:p-8 text-center">
              <CalendarDays className="mx-auto h-10 w-10 text-zinc-400 dark:text-rose-200/70" />
              <h2 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-rose-50">
                Paper library coming soon
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-rose-100/80 max-w-2xl mx-auto">
                The CSS and PMS dropdown flow is ready. Year-wise paper data can be connected here without changing the selection structure.
              </p>
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
                  {selectedSubject || "None selected"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-zinc-500 dark:text-rose-200/80">
                  Selected Year
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-800 dark:text-rose-50">
                  {selectedYear || "None selected"}
                </p>
              </div>

              {loadingSubjects ? (
                <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 dark:border-rose-900/70 bg-zinc-50/80 dark:bg-rose-950/28 p-4 text-sm text-zinc-600 dark:text-rose-100/85">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading subjects from evaluations...
                </div>
              ) : (
                <div className="rounded-2xl border border-zinc-200 dark:border-rose-900/70 bg-zinc-50/80 dark:bg-rose-950/28 p-4 text-sm text-zinc-600 dark:text-rose-100/85">
                  Subject list is synced from the evaluations catalog, so the options stay consistent across the app.
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
