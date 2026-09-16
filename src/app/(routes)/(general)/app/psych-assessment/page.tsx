"use client"

import PsychUpload from "@/components/PsychUpload"
import { Brain, ListChecks, ScanLine, ShieldCheck } from "lucide-react"

export default function PsychAssessmentPage() {
  return (
    <main className="min-h-screen relative pt-40 pb-24 overflow-hidden bg-white dark:bg-zinc-950">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-300 mb-4">
            <Brain className="w-3.5 h-3.5" /> Psychological Assessment
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-red-900 dark:text-red-400 mb-3">
            CSS Psychological Assessment — AI Evaluation
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg max-w-2xl mx-auto">
            Upload the scanned booklet. The tool marks the objective IQ section and screens the
            projective (personality) sections separately, then returns an annotated report with
            margin notes and boxed feedback.
          </p>
        </div>

        {/* Feature strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { icon: ListChecks, title: "Objective IQ", body: "Each MCQ marked right/wrong with the correct answer and why." },
            { icon: ScanLine, title: "Projective screen", body: "Sentence completion, drawings & stories annotated with mistakes and suggestions." },
            { icon: ShieldCheck, title: "Kept separate", body: "IQ and personality are reported separately — a screening aid, not a verdict." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <div className="w-11 h-11 rounded-full bg-red-900/5 dark:bg-red-400/10 text-red-900 dark:text-red-400 flex items-center justify-center mb-3 ring-1 ring-red-900/20 dark:ring-red-400/20">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-bold mb-1 text-zinc-800 dark:text-zinc-100">{f.title}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="w-full max-w-2xl mx-auto">
          <PsychUpload />
        </div>
      </div>
    </main>
  )
}
