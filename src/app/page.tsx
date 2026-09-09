import Link from "next/link";
import { FileText, BookOpenText, ArrowRight } from "lucide-react";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <div className="min-h-dvh flex flex-col bg-white dark:bg-zinc-950 relative overflow-x-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <section className="flex-1 pt-40 pb-24 px-6 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 dark:text-white leading-[1.1] uppercase">
              Evaluation Matters!
              <span className="block mt-2 font-serif italic font-light text-2xl md:text-4xl text-zinc-600 dark:text-zinc-300 capitalize tracking-normal normal-case">
                Craft your answers to perfection
              </span>
            </h1>
            <p className="mt-6 text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
              AI-powered answer evaluation and a daily editorial Fact Book for competitive exam prep.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Link
              href="/app/ocr"
              className="group bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-red-500 dark:hover:border-red-400 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-red-100 dark:bg-red-500/20 rounded-xl flex items-center justify-center mb-6">
                <FileText className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white flex items-center gap-2">
                Evaluations
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Upload an answer PDF and get instant, detailed AI feedback — rubric, essay, précis and outline modes.
              </p>
            </Link>

            <Link
              href="/app/factbook"
              className="group bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-red-500 dark:hover:border-red-400 transition-all duration-300"
            >
              <div className="w-14 h-14 bg-red-100 dark:bg-red-500/20 rounded-xl flex items-center justify-center mb-6">
                <BookOpenText className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-zinc-900 dark:text-white flex items-center gap-2">
                Fact Book
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Browse concise daily editorial summaries by date and topic — key takeaways at a glance.
              </p>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
