"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookOpenText, CalendarRange, ChevronDown, GraduationCap, Layers3 } from "lucide-react";

const YEAR_OPTIONS = ["2020", "2021", "2022", "2023", "2024", "2025"];

type ExamKey = "CSS" | "PMS";

const EXAM_META: Record<ExamKey, { title: string; fullName: string; icon: typeof BookOpenText }> = {
  CSS: {
    title: "CSS",
    fullName: "Central Superior Services",
    icon: BookOpenText,
  },
  PMS: {
    title: "PMS",
    fullName: "Provincial Management Service",
    icon: GraduationCap,
  },
};

type SubjectOption = {
  id: string;
  display_name: string;
};

type GroupedSubjects = {
  compulsory: SubjectOption[];
  optional: SubjectOption[];
  all: SubjectOption[];
};

type PaperOption = {
  id: string;
  label: string;
  year: string;
};

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

function groupSubjects(subjects: SubjectOption[], exam: ExamKey): GroupedSubjects {
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

async function fetchAvailableSubjects(): Promise<SubjectOption[]> {
  const baseUrl = normalizeApiUrl(process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000");
  const response = await fetch(`${baseUrl}/api/ocr/subjects`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load subjects (${response.status})`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.subjects) ? payload.subjects : [];
}

export default function PastPapersLandingPage() {
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamKey>("CSS");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedPaper, setSelectedPaper] = useState("");
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const examMeta = EXAM_META[selectedExam];
  const groupedSubjects = useMemo(() => groupSubjects(subjects, selectedExam), [selectedExam, subjects]);
  const selectedSubject = groupedSubjects.all.find((subject) => subject.id === selectedSubjectId) || null;

  const paperOptions = useMemo<PaperOption[]>(() => {
    if (!selectedSubject) {
      return [];
    }

    const years = selectedYear === "all" ? YEAR_OPTIONS : selectedYear ? [selectedYear] : [];
    return years.map((year) => ({
      id: `${selectedExam}-${selectedSubject.id}-${year}`,
      label: `${selectedSubject.display_name} - ${year} Past Paper`,
      year,
    }));
  }, [selectedExam, selectedSubject, selectedYear]);

  const selectedPaperLabel = useMemo(() => {
    return paperOptions.find((paper) => paper.id === selectedPaper)?.label || "No paper selected";
  }, [paperOptions, selectedPaper]);

  useEffect(() => {
    let isMounted = true;

    const loadSubjects = async () => {
      setLoadingSubjects(true);
      setError(null);
      try {
        const payload = await fetchAvailableSubjects();
        if (isMounted) {
          setSubjects(payload);
        }
      } catch (loadError: any) {
        if (isMounted) {
          setError(loadError?.message || "Unable to load subjects right now.");
          setSubjects([]);
        }
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
    setSelectedSubjectId("");
    setSelectedYear("");
    setSelectedPaper("");
  }, [selectedExam]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f7f8fc_48%,#ffffff_100%)] dark:bg-[linear-gradient(180deg,#17080f_0%,#12060b_100%)] pt-28 pb-12 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] dark:opacity-[0.1] bg-[linear-gradient(to_right,rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.18)_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-[28px] border border-zinc-200/80 dark:border-rose-900/70 bg-white/96 dark:bg-[#1f0f18]/90 backdrop-blur-xl shadow-[0_24px_60px_-40px_rgba(15,23,42,0.42)] dark:shadow-[0_24px_64px_-36px_rgba(127,29,29,0.5)] p-6 sm:p-8"
        >
          <div className="flex items-start justify-between gap-5 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:border-rose-800/70 dark:bg-rose-950/38 dark:text-rose-100">
                <Layers3 className="h-3.5 w-3.5" />
                Past Papers
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-rose-50">
                Subject, year, then paper
              </h1>
              <p className="mt-2 max-w-2xl text-sm sm:text-base text-zinc-600 dark:text-rose-100/85 leading-relaxed">
                Choose CSS or PMS, pick a subject, choose a year or all time, and then open the paper dropdown.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-rose-800/70 dark:bg-rose-950/38 dark:text-rose-100 px-3 py-1 text-xs font-semibold">
              <CalendarRange className="h-3.5 w-3.5" />
              2020 - 2025 + All Time
            </div>
          </div>
        </motion.section>

        <div className="mt-6 space-y-4">
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-zinc-200/80 dark:border-rose-900/70 bg-white/96 dark:bg-[#220f1a]/90 backdrop-blur-xl p-5 sm:p-6 shadow-[0_18px_44px_-32px_rgba(15,23,42,0.24)] dark:shadow-[0_22px_54px_-34px_rgba(159,18,57,0.4)]"
          >
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-zinc-200 dark:border-rose-900/70 bg-zinc-50 dark:bg-rose-950/28 p-3 text-zinc-800 dark:text-rose-100">
                  <examMeta.icon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-rose-50">{examMeta.title}</h2>
                  <p className="text-sm text-zinc-600 dark:text-rose-100/85">{examMeta.fullName}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <label className="space-y-2">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-rose-200/80">
                    Subject
                  </span>
                  <select
                    value={selectedSubjectId}
                    onChange={(event) => {
                      setSelectedSubjectId(event.target.value);
                      setSelectedYear("");
                      setSelectedPaper("");
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

                <div className="space-y-2">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-rose-200/80">
                    Year
                  </span>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        value={selectedYear}
                        onChange={(event) => {
                          setSelectedYear(event.target.value);
                          setSelectedPaper("");
                        }}
                        disabled={!selectedSubjectId}
                        className="w-full appearance-none rounded-2xl border border-zinc-300 bg-white px-4 py-3 pr-10 text-sm text-zinc-800 outline-none transition focus:ring-2 focus:ring-zinc-400/35 dark:border-rose-900/80 dark:bg-[#2a111c] dark:text-rose-50 dark:focus:ring-rose-400/35 disabled:opacity-60"
                      >
                        <option value="">Select a year</option>
                        {YEAR_OPTIONS.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-rose-200/80" />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedSubjectId) {
                          return;
                        }
                        setSelectedYear("all");
                        setSelectedPaper("");
                      }}
                      disabled={!selectedSubjectId}
                      className={`shrink-0 rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${selectedYear === "all"
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-rose-200 dark:bg-rose-200 dark:text-rose-950"
                        : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-rose-900/80 dark:text-rose-100 dark:hover:bg-rose-900/40"
                        }`}
                    >
                      All Time
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px] md:items-center">
                <label className="space-y-2">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-rose-200/80">
                    Papers
                  </span>
                  <div className="relative">
                    <select
                      value={selectedPaper}
                      onChange={(event) => setSelectedPaper(event.target.value)}
                      disabled={!selectedSubjectId || paperOptions.length === 0}
                      className="w-full appearance-none rounded-2xl border border-zinc-300 bg-white px-4 py-3 pr-10 text-sm text-zinc-800 outline-none transition focus:ring-2 focus:ring-zinc-400/35 dark:border-rose-900/80 dark:bg-[#2a111c] dark:text-rose-50 dark:focus:ring-rose-400/35 disabled:opacity-60"
                    >
                      <option value="">
                        {!selectedSubjectId
                          ? "Select a subject first"
                          : selectedYear === "all"
                            ? "Choose a paper from all years"
                            : selectedYear
                              ? `Choose a ${selectedYear} paper`
                              : "Select a year first"}
                      </option>
                      {paperOptions.map((paper) => (
                        <option key={paper.id} value={paper.id}>
                          {paper.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-rose-200/80" />
                  </div>
                </label>

                <div className="rounded-2xl border border-zinc-200 dark:border-rose-900/70 bg-zinc-50/80 dark:bg-rose-950/28 p-4 text-sm text-zinc-700 dark:text-rose-100/85">
                  <p className="font-semibold text-zinc-900 dark:text-rose-50">Selected</p>
                  <p className="mt-1">Exam: {examMeta.title}</p>
                  <p className="mt-1">Subject: {selectedSubject?.display_name || "Select a subject"}</p>
                  <p className="mt-1">Year: {selectedYear === "all" ? "All Time" : selectedYear || "Select a year"}</p>
                  <p className="mt-1">Paper: {selectedPaperLabel}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-rose-900/70 bg-white/70 dark:bg-rose-950/20 p-4 sm:p-5">
                <p className="text-sm font-semibold text-zinc-900 dark:text-rose-50">Paper dropdown preview</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-rose-100/80">
                  {selectedSubjectId
                    ? paperOptions.length > 0
                      ? `${paperOptions.length} paper${paperOptions.length === 1 ? "" : "s"} available in the dropdown.`
                      : "Choose All Time or a year to load the paper list."
                    : "Pick a subject first, then choose a year or use All Time."}
                </p>
                {error && <p className="mt-2 text-sm text-rose-700 dark:text-rose-200">{error}</p>}
              </div>
            </div>
          </motion.article>
        </div>
      </div>
    </main>
  );
}
