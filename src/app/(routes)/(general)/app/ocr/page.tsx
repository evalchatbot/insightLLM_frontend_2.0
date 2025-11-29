"use client"
import OCRUpload from "@/components/OCRUpload"
import { Clock, Target, TrendingUp, CheckCircle2 } from "lucide-react"

export default function OCRPage() {
  return (
    <>
      <main className="min-h-screen relative pt-40 overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 dark:from-zinc-950 dark:via-emerald-950/30 dark:to-zinc-900">
        
        {/* Animated gradient orbs */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-400/20 dark:bg-emerald-500/10 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-teal-400/20 dark:bg-teal-500/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-green-400/20 dark:bg-green-500/10 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        {/* Subtle grid pattern */}
        <div className="fixed inset-0 -z-10 opacity-[0.02] dark:opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.5) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(16, 185, 129, 0.5) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mb-16">
            <div className="text-center mb-16 animate-fade-in">
              <h2 className="text-3xl md:text-4xl font-bold text-[#2E5C55] dark:text-[#4ade80] mb-3">HOW IT WORKS</h2>
              <p className="text-zinc-600 dark:text-zinc-400 text-lg">Get professional feedback in three simple steps</p>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start relative max-w-4xl mx-auto">
              {/* Animated connection line */}
              <div className="hidden md:block absolute top-6 left-0 w-full h-[2px] -z-10 rounded-full overflow-hidden bg-gradient-to-r from-[#2E5C55]/10 via-[#2E5C55]/30 to-[#2E5C55]/10 dark:from-[#4ade80]/10 dark:via-[#4ade80]/30 dark:to-[#4ade80]/10">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2E5C55] dark:via-[#4ade80] to-transparent animate-shimmer"></div>
              </div>

              <div className="flex flex-col items-center text-center w-full md:w-1/3 px-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="w-12 h-12 rounded-full bg-[#2E5C55] dark:bg-[#4ade80] text-white dark:text-black flex items-center justify-center text-xl font-bold mb-6 shadow-lg ring-4 ring-white dark:ring-zinc-950 hover:scale-110 transition-transform duration-300">1</div>
                <h3 className="font-serif text-xl mb-3 text-zinc-800 dark:text-zinc-100">Upload your answer</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[250px] mx-auto">Select your subject and upload your PDF essay (up to 10MB)</p>
              </div>

              <div className="flex flex-col items-center text-center w-full md:w-1/3 px-4 mt-12 md:mt-0 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="w-12 h-12 rounded-full bg-[#2E5C55] dark:bg-[#4ade80] text-white dark:text-black flex items-center justify-center text-xl font-bold mb-6 shadow-lg ring-4 ring-white dark:ring-zinc-950 hover:scale-110 transition-transform duration-300">2</div>
                <h3 className="font-serif text-xl mb-3 text-zinc-800 dark:text-zinc-100">AI Analysis</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[250px] mx-auto">Our AI evaluates content, structure, grammar, and more in seconds</p>
              </div>

              <div className="flex flex-col items-center text-center w-full md:w-1/3 px-4 mt-12 md:mt-0 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <div className="w-12 h-12 rounded-full bg-[#2E5C55] dark:bg-[#4ade80] text-white dark:text-black flex items-center justify-center text-xl font-bold mb-6 shadow-lg ring-4 ring-white dark:ring-zinc-950 hover:scale-110 transition-transform duration-300">3</div>
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
              <h2 className="text-3xl font-serif text-[#2E5C55] dark:text-[#4ade80] mb-3">Improve Your Score</h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-lg">Comprehensive analysis designed for CSS exam preparation</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 rounded-full bg-[#2E5C55]/5 dark:bg-[#4ade80]/10 text-[#2E5C55] dark:text-[#4ade80] flex items-center justify-center mb-6 ring-1 ring-[#2E5C55]/20 dark:ring-[#4ade80]/20">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg font-bold mb-3 text-zinc-800 dark:text-zinc-100">Instant Feedback</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">Get comprehensive results in under 30 seconds</p>
              </div>

              <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 rounded-full bg-[#2E5C55]/5 dark:bg-[#4ade80]/10 text-[#2E5C55] dark:text-[#4ade80] flex items-center justify-center mb-6 ring-1 ring-[#2E5C55]/20 dark:ring-[#4ade80]/20">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg font-bold mb-3 text-zinc-800 dark:text-zinc-100">Detailed Scoring</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">Precise evaluation on content, structure, and grammar</p>
              </div>

              <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="w-14 h-14 rounded-full bg-[#2E5C55]/5 dark:bg-[#4ade80]/10 text-[#2E5C55] dark:text-[#4ade80] flex items-center justify-center mb-6 ring-1 ring-[#2E5C55]/20 dark:ring-[#4ade80]/20">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg font-bold mb-3 text-zinc-800 dark:text-zinc-100">Track Progress</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">Monitor improvement with detailed analytics over time</p>
              </div>
            </div>
          </section>
        </div>

        <section className="bg-[#1F2937] dark:bg-black py-12 px-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-10">
            <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#2E5C55] rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-serif text-white mb-6">Ready to Improve Your Scores?</h2>
            <p className="text-zinc-300 text-lg mb-10 max-w-2xl mx-auto">Join thousands of CSS candidates using AI to simplify evaluations and amplify scores</p>

            <div className="flex flex-wrap justify-center gap-6 text-zinc-400 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
                <span>Instant results</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
                <span>Secure & private</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 border-t border-black/5 dark:border-white/10 bg-zinc-50 dark:bg-black/40">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative w-6 h-6">
              <img src="/assets/gemini-logo.svg" alt="InsightLLM Logo" className="object-contain w-full h-full" />
            </div>
            <span className="font-bold text-xl tracking-tight text-emerald-700 dark:text-emerald-400">rubrik.ai</span>
          </div>

          <div className="flex items-center gap-6 text-sm font-medium">
            <a href="#" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">Terms</a>
            <a href="#" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">Contact</a>
          </div>

          <p className="text-sm text-zinc-400 dark:text-zinc-500"> 2025 RUBRIK. All rights reserved.</p>
        </div>
      </footer>
    </>
  )
}
