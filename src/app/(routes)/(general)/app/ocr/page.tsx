"use client"
import OCRUpload from "@/components/OCRUpload"
import FeedbackWidget from "@/components/FeedbackWidget"
import { Clock, Target, TrendingUp, CheckCircle2 } from "lucide-react"

export default function OCRPage() {
  return (
    <>
      <main className="min-h-screen relative pt-40 overflow-hidden bg-white dark:bg-zinc-950">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mb-16">
            <div className="text-center mb-16 animate-fade-in">
              <h2 className="text-3xl md:text-4xl font-bold text-red-900 dark:text-red-400 mb-3">HOW IT WORKS</h2>
              <p className="text-zinc-600 dark:text-zinc-400 text-lg">Get professional feedback in three simple steps</p>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start relative max-w-4xl mx-auto">
              {/* Animated connection line */}
              <div className="hidden md:block absolute top-6 left-0 w-full h-[2px] -z-10 rounded-full overflow-hidden bg-gradient-to-r from-red-900/10 via-red-900/30 to-red-900/10 dark:from-red-400/10 dark:via-red-400/30 dark:to-red-400/10">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-900 dark:via-red-400 to-transparent animate-shimmer"></div>
              </div>

              <div className="flex flex-col items-center text-center w-full md:w-1/3 px-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="w-12 h-12 rounded-full bg-red-900 dark:bg-red-500 text-white dark:text-white flex items-center justify-center text-xl font-bold mb-6 shadow-lg ring-4 ring-white dark:ring-zinc-950 hover:scale-110 transition-transform duration-300">1</div>
                <h3 className="font-serif text-xl mb-3 text-zinc-800 dark:text-zinc-100">Upload your answer</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[250px] mx-auto">Select your subject and upload your PDF essay (up to 20MB)</p>
              </div>

              <div className="flex flex-col items-center text-center w-full md:w-1/3 px-4 mt-12 md:mt-0 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="w-12 h-12 rounded-full bg-red-900 dark:bg-red-500 text-white dark:text-white flex items-center justify-center text-xl font-bold mb-6 shadow-lg ring-4 ring-white dark:ring-zinc-950 hover:scale-110 transition-transform duration-300">2</div>
                <h3 className="font-serif text-xl mb-3 text-zinc-800 dark:text-zinc-100">AI Analysis</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[250px] mx-auto">Our AI evaluates content, structure, grammar, and more in seconds</p>
              </div>

              <div className="flex flex-col items-center text-center w-full md:w-1/3 px-4 mt-12 md:mt-0 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <div className="w-12 h-12 rounded-full bg-red-900 dark:bg-red-500 text-white dark:text-white flex items-center justify-center text-xl font-bold mb-6 shadow-lg ring-4 ring-white dark:ring-zinc-950 hover:scale-110 transition-transform duration-300">3</div>
                <h3 className="font-serif text-xl mb-3 text-zinc-800 dark:text-zinc-100">Get Results</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[250px] mx-auto">Download detailed feedback with scores and improvement suggestions</p>
              </div>
            </div>
          </div>

          <style jsx>{`
            @keyframes fade-in {
              from {
                opacity: 0;
                transform: translateY(-10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            @keyframes slide-up {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            @keyframes shimmer {
              0% {
                transform: translateX(-100%);
              }
              100% {
                transform: translateX(100%);
              }
            }

            .animate-fade-in {
              animation: fade-in 0.6s ease-out;
            }

            .animate-slide-up {
              animation: slide-up 0.8s ease-out both;
            }

            .animate-shimmer {
              animation: shimmer 3s ease-in-out infinite;
            }

            @keyframes blob {
              0%, 100% {
                transform: translate(0, 0) scale(1);
              }
              33% {
                transform: translate(30px, -50px) scale(1.1);
              }
              66% {
                transform: translate(-20px, 20px) scale(0.9);
              }
            }

            .animate-blob {
              animation: blob 7s ease-in-out infinite;
            }

            .animation-delay-2000 {
              animation-delay: 2s;
            }

            .animation-delay-4000 {
              animation-delay: 4s;
            }
          `}</style>

          <div className="w-full max-w-2xl mx-auto mb-24">
            <OCRUpload />
          </div>

          <section className="mb-24">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-serif text-red-900 dark:text-red-400 mb-3">Improve Your Score</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-lg">Comprehensive analysis designed for CSS exam preparation</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 rounded-full bg-red-900/5 dark:bg-red-400/10 text-red-900 dark:text-red-400 flex items-center justify-center mb-6 ring-1 ring-red-900/20 dark:ring-red-400/20">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg font-bold mb-3 text-zinc-800 dark:text-zinc-100">Instant Feedback</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">Get comprehensive results in under 30 seconds</p>
              </div>

              <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 rounded-full bg-red-900/5 dark:bg-red-400/10 text-red-900 dark:text-red-400 flex items-center justify-center mb-6 ring-1 ring-red-900/20 dark:ring-red-400/20">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg font-bold mb-3 text-zinc-800 dark:text-zinc-100">Detailed Scoring</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">Precise evaluation on content, structure, and grammar</p>
              </div>

              <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 rounded-full bg-red-900/5 dark:bg-red-400/10 text-red-900 dark:text-red-400 flex items-center justify-center mb-6 ring-1 ring-red-900/20 dark:ring-red-400/20">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg font-bold mb-3 text-zinc-800 dark:text-zinc-100">Track Progress</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">Monitor improvement with detailed analytics over time</p>
              </div>
            </div>
          </section>
        </div>

        <section className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 dark:bg-gradient-to-br dark:from-red-950/40 dark:via-black dark:to-red-900/30 py-12 px-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-10 dark:opacity-30">
            <div className="absolute top-10 left-10 w-64 h-64 bg-red-400 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-10 right-10 w-80 h-80 bg-red-300 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/20 rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-serif text-white mb-6">Ready to Improve Your Scores?</h2>
            <p className="text-white/90 dark:text-zinc-300 text-lg mb-10 max-w-2xl mx-auto">Join thousands of CSS candidates using AI to simplify evaluations and amplify scores</p>

            <div className="flex flex-wrap justify-center gap-6 text-white/80 dark:text-zinc-400 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-400" />
                <span>Instant results</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-400" />
                <span>Secure & private</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="relative w-6 h-6">
              <img src="/assets/Rubric logo.svg" alt="InsightLLM Logo" className="object-contain w-full h-full" />
            </div>
            <span className="font-bold text-xl tracking-tight text-red-600 dark:text-red-400">rubric.ai</span>
          </div>

          {/* Links - Centered */}
          {/* Links - Centered - Removed */}

          {/* Copyright */}
          <p className="text-sm text-zinc-600 dark:text-zinc-400">© 2025 RUBRIC. All rights reserved.</p>
        </div>
      </footer>

      {/* Feedback Widget */}
      <FeedbackWidget pageName="ocr-evaluation" />
    </>
  )
}
