"use client";
import React, { useEffect, useState } from "react";
import { FiCheck, FiX, FiHome, FiRefreshCw, FiStar, FiBook, FiAward, FiTarget, FiClock, FiTrendingUp, FiCheckCircle, FiBookmark, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

type Genre = { id: string; name: string };

type MCQ = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
};

type ViewMode = 'landing' | 'config' | 'quiz';

export default function QuizPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedRepeats, setUsedRepeats] = useState(false);
  const [practiceMode, setPracticeMode] = useState<'untimed' | 'timed'>('untimed');
  const [questionCount, setQuestionCount] = useState(20);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('quizBookmarks');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });
  const [bookmarkedMcqs, setBookmarkedMcqs] = useState<MCQ[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('quizBookmarkedMcqs');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  useEffect(() => {
    fetch("/api/genres")
      .then((r) => r.json())
      .then((d) => setGenres(d || []))
      .catch(() => setGenres([]));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('quizBookmarks', JSON.stringify(Array.from(bookmarkedQuestions)));
    }
  }, [bookmarkedQuestions]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('quizBookmarkedMcqs', JSON.stringify(bookmarkedMcqs));
    }
  }, [bookmarkedMcqs]);

  useEffect(() => {
    if (bookmarkedMcqs.length > 0) {
      const mcqIds = new Set(bookmarkedMcqs.map(mcq => mcq.id));
      setBookmarkedQuestions(mcqIds);
    }
  }, []);

  useEffect(() => {
    if (practiceMode === 'timed' && timeRemaining !== null && timeRemaining > 0 && !submitted) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining, practiceMode, submitted]);

  const shuffle = <T,>(arr: T[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const fetchMcqs = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/quiz/mcqs?genre_id=${selectedGenre}&limit=${questionCount}&random=true&useLocal=true`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`fetch mcqs ${res.status}`);
      const data = await res.json();
      let questions: MCQ[] = Array.isArray(data) ? data : [];

      questions = shuffle(questions || []);
      const final: MCQ[] = [];
      if (questions.length === 0) {
        for (let i = 0; i < questionCount; i++) {
          final.push({
            id: `gen-${i}`,
            question: `Sample question ${i + 1}`,
            option_a: `A${i + 1}`,
            option_b: `B${i + 1}`,
            option_c: `C${i + 1}`,
            option_d: `D${i + 1}`,
            correct_answer: `A${i + 1}`,
          });
        }
        setUsedRepeats(true);
      } else {
        let idx = 0;
        while (final.length < questionCount) {
          const pick = questions[idx % questions.length];
          final.push({ ...pick, id: `${pick.id}-f${final.length}` });
          idx++;
        }
        setUsedRepeats(questions.length < questionCount);
      }

      setMcqs(final);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setSubmitted(false);
      setShowBookmarksOnly(false);
      setStartTime(Date.now());
      setElapsedTime(0);

      if (practiceMode === 'timed') {
        setTimeRemaining(questionCount * 60);
      } else {
        setTimeRemaining(null);
      }

      setViewMode('quiz');
      window.scrollTo(0, 0);
      try { document.documentElement.style.overflow = 'auto'; document.body.style.overflow = 'auto'; } catch (e) { }
    } catch (e: any) {
      setError(e?.message || "Failed to fetch mcqs");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (mcqId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [mcqId]: option }));
  };

  const toggleBookmark = (mcqId: string) => {
    setBookmarkedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mcqId)) {
        newSet.delete(mcqId);
        setBookmarkedMcqs(prevMcqs => prevMcqs.filter(m => m.id !== mcqId));
      } else {
        newSet.add(mcqId);
        const mcqToBookmark = mcqs.find(m => m.id === mcqId);
        if (mcqToBookmark) {
          setBookmarkedMcqs(prevMcqs => {
            if (prevMcqs.some(m => m.id === mcqId)) {
              return prevMcqs;
            }
            return [...prevMcqs, mcqToBookmark];
          });
        }
      }
      return newSet;
    });
  };

  const normalizeCorrect = (m: MCQ) => {
    const a = (m.option_a || "").toString().trim();
    const b = (m.option_b || "").toString().trim();
    const c = (m.option_c || "").toString().trim();
    const d = (m.option_d || "").toString().trim();

    const caRaw = (m.correct_answer || "").toString().trim();
    if (!caRaw) return "";

    if (caRaw === a || caRaw === b || caRaw === c || caRaw === d) return caRaw;

    const norm = caRaw.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (norm === "optiona" || norm === "option_a" || norm === "a") return a;
    if (norm === "optionb" || norm === "option_b" || norm === "b") return b;
    if (norm === "optionc" || norm === "option_c" || norm === "c") return c;
    if (norm === "optiond" || norm === "option_d" || norm === "d") return d;

    if (norm === "1") return a;
    if (norm === "2") return b;
    if (norm === "3") return c;
    if (norm === "4") return d;

    return caRaw;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (startTime) {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }
    setSubmitted(true);
    setTimeRemaining(null);
  };

  const handleRetry = () => {
    if (!mcqs || mcqs.length === 0) return;
    setMcqs((prev) => shuffle(prev));
    setAnswers({});
    setSubmitted(false);
    setCurrentQuestionIndex(0);
    setBookmarkedQuestions(new Set());
    setStartTime(Date.now());
    setElapsedTime(0);
    if (practiceMode === 'timed') {
      setTimeRemaining(questionCount * 60);
    }
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < mcqs.length - 1) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const displayedMcqs = showBookmarksOnly ? bookmarkedMcqs : mcqs;
  const currentMcq = displayedMcqs[currentQuestionIndex];

  // Landing View
  if (viewMode === 'landing') {
    return (
      <>
        <main className="min-h-screen relative pt-40 overflow-hidden bg-white dark:bg-zinc-950">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

          <div className="relative z-10">
            <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 mb-16">
              <div className="text-center mb-16 animate-fade-in">
                <h2 className="text-3xl md:text-4xl font-bold text-red-900 dark:text-red-400 mb-3">HOW IT WORKS</h2>
                <p className="text-zinc-600 dark:text-zinc-400 text-lg">Master competitive exams in four simple steps</p>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start relative max-w-4xl mx-auto">
                {/* Animated connection line */}
                <div className="hidden md:block absolute top-6 left-0 w-full h-[2px] -z-10 rounded-full overflow-hidden bg-gradient-to-r from-red-900/10 via-red-900/30 to-red-900/10 dark:from-red-400/10 dark:via-red-400/30 dark:to-red-400/10">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-900 dark:via-red-400 to-transparent animate-shimmer"></div>
                </div>

                <div className="flex flex-col items-center text-center w-full md:w-1/4 px-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <div className="w-12 h-12 rounded-full bg-red-900 dark:bg-red-500 text-white dark:text-white flex items-center justify-center text-xl font-bold mb-6 shadow-lg ring-4 ring-white dark:ring-zinc-950 hover:scale-110 transition-transform duration-300">1</div>
                  <h3 className="font-serif text-xl mb-3 text-zinc-800 dark:text-zinc-100">Choose Subject</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[250px] mx-auto">Select from competitive exam subjects to focus your practice</p>
                </div>

                <div className="flex flex-col items-center text-center w-full md:w-1/4 px-4 mt-12 md:mt-0 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <div className="w-12 h-12 rounded-full bg-red-900 dark:bg-red-500 text-white dark:text-white flex items-center justify-center text-xl font-bold mb-6 shadow-lg ring-4 ring-white dark:ring-zinc-950 hover:scale-110 transition-transform duration-300">2</div>
                  <h3 className="font-serif text-xl mb-3 text-zinc-800 dark:text-zinc-100">Start Practicing</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[250px] mx-auto">Answer MCQs with our intelligent adaptive system</p>
                </div>

                <div className="flex flex-col items-center text-center w-full md:w-1/4 px-4 mt-12 md:mt-0 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                  <div className="w-12 h-12 rounded-full bg-red-900 dark:bg-red-500 text-white dark:text-white flex items-center justify-center text-xl font-bold mb-6 shadow-lg ring-4 ring-white dark:ring-zinc-950 hover:scale-110 transition-transform duration-300">3</div>
                  <h3 className="font-serif text-xl mb-3 text-zinc-800 dark:text-zinc-100">Review & Learn</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[250px] mx-auto">Get instant feedback with detailed explanations</p>
                </div>

                <div className="flex flex-col items-center text-center w-full md:w-1/4 px-4 mt-12 md:mt-0 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                  <div className="w-12 h-12 rounded-full bg-red-900 dark:bg-red-500 text-white dark:text-white flex items-center justify-center text-xl font-bold mb-6 shadow-lg ring-4 ring-white dark:ring-zinc-950 hover:scale-110 transition-transform duration-300">4</div>
                  <h3 className="font-serif text-xl mb-3 text-zinc-800 dark:text-zinc-100">Track Progress</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[250px] mx-auto">Monitor performance and identify improvement areas</p>
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
          </div>

          {/* CTA Section - Full Width */}
          <motion.section
            initial={{ opacity: 0, x: -100 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-20 w-full"
          >
            <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 dark:from-red-700 dark:via-red-800 dark:to-zinc-900 p-12 md:p-14 overflow-hidden"
            >
              {/* Animated stars background */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(30)].map((_, i) => (
                  <div
                    key={`star-${i}`}
                    className="absolute w-1 h-1 bg-white/40 rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite ${Math.random() * 2}s`
                    }}
                  />
                ))}
              </div>

              <div className="relative z-10 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  READY TO START PRACTICING?
                </h2>
                <p className="text-red-100 dark:text-red-100 text-base md:text-lg mb-8 max-w-2xl mx-auto">
                  Click below to configure your practice session and begin mastering competitive exam MCQs
                </p>
                <motion.button
                  onClick={() => setViewMode('config')}
                  className="inline-flex items-center gap-3 bg-white hover:bg-red-50 text-red-900 font-bold px-8 py-3.5 rounded-xl transition-all duration-300 shadow-2xl hover:scale-105"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FiStar className="text-lg" />
                  <span className="text-base">Start Practice Session</span>
                </motion.button>
              </div>
            </div>
          </motion.section>

          {/* Features Section */}
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
            <section className="mb-20">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="text-center mb-12"
              >
                <h2 className="text-3xl md:text-4xl font-bold text-red-700 dark:text-red-400 mb-3">
                  COMPREHENSIVE PRACTICE FEATURES
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 text-base md:text-lg">
                  Everything you need to excel in competitive exams
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-4xl mx-auto">
                {[
                  { icon: FiBook, title: "20000+ curated MCQs across all subjects of Competitive Exams" },
                  { icon: FiCheckCircle, title: "Detailed explanations for every answer" },
                  { icon: FiTarget, title: "Subject-wise and topic-wise categorization" },
                  { icon: FiClock, title: "Timed and untimed practice modes" },
                  { icon: FiTrendingUp, title: "Performance tracking and analytics" },
                  { icon: FiAward, title: "Difficulty level progression" },
                  { icon: FiBookmark, title: "Bookmark questions for revision" },
                  { icon: FiTarget, title: "Mock test simulations" }
                ].map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    className="flex items-start gap-3 md:gap-4 bg-white dark:bg-zinc-900 p-4 md:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-red-500/50 dark:hover:border-red-500/50 transition-all hover:shadow-lg"
                  >
                    <div className="flex-shrink-0 w-10 h-10 md:w-11 md:h-11 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                      <feature.icon className="w-5 h-5 md:w-6 md:h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm md:text-base text-zinc-900 dark:text-zinc-100 font-medium">
                        {feature.title}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            <style jsx>{`
                @keyframes twinkle {
                  0%, 100% {
                    opacity: 0;
                    transform: scale(0);
                  }
                  50% {
                    opacity: 0.8;
                    transform: scale(1.2);
                  }
                }
              `}</style>
          </div>
        </main>

        <footer className="py-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="relative w-6 h-6">
                <img src="/assets/Rubrik logo.svg" alt="InsightLLM Logo" className="object-contain w-full h-full" />
              </div>
              <span className="font-bold text-xl tracking-tight text-red-600 dark:text-red-400">rubrik.ai</span>
            </div>

            {/* Links - Centered */}
            {/* Links - Centered - Removed */}

            {/* Copyright */}
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              © {new Date().getFullYear()} RUBRIK. All rights reserved.
            </p>
          </div>
        </footer>
      </>
    );
  }

  // Config View
  if (viewMode === 'config') {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 text-foreground relative overflow-hidden pt-40">
        <div className="relative max-w-4xl mx-auto p-6 z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-red-900 dark:text-red-400 mb-2">START YOUR PRACTICE</h1>
            <p className="text-zinc-600 dark:text-zinc-400">Select your subject and practice mode to begin</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl"
          >
            <div className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Select Exam</label>
                <select className="w-full p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all">
                  <option>Choose your exam</option>
                  <option>CSS</option>
                  <option>PMS</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Choose Subject</label>
                <select
                  className="w-full p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                >
                  <option value="">Select an exam first</option>
                  {genres.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-3 text-sm font-medium text-zinc-900 dark:text-white">Choose Practice Mode</label>
                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    onClick={() => setPracticeMode('untimed')}
                    className={`p-4 rounded-xl border-2 transition-all ${practiceMode === 'untimed'
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-red-500/50'
                      }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiClock className="w-6 h-6 mx-auto mb-2 text-zinc-900 dark:text-white" />
                    <h4 className="font-semibold text-zinc-900 dark:text-white mb-1">Untimed Practice</h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">Learn at your own pace</p>
                  </motion.button>

                  <motion.button
                    onClick={() => setPracticeMode('timed')}
                    className={`p-4 rounded-xl border-2 transition-all ${practiceMode === 'timed'
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-red-500/50'
                      }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiTarget className="w-6 h-6 mx-auto mb-2 text-zinc-900 dark:text-white" />
                    <h4 className="font-semibold text-zinc-900 dark:text-white mb-1">Timed Practice</h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">Simulate exam conditions</p>
                  </motion.button>
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-zinc-900 dark:text-white">Number of Questions</label>
                <select
                  className="w-full p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                >
                  <option value={20}>20 Questions</option>
                  <option value={50}>50 Questions</option>
                  <option value={100}>100 Questions</option>
                </select>
              </div>

              {error && (
                <div className="text-red-700 dark:text-red-300 bg-red-500/10 border border-red-500/30 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <motion.button
                onClick={fetchMcqs}
                disabled={!selectedGenre || loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold px-6 py-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'Loading...' : 'Start Practice Session'}
              </motion.button>

              <motion.button
                onClick={() => {
                  if (bookmarkedQuestions.size > 0) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setShowBookmarksOnly(true);
                    setSubmitted(false);
                    setCurrentQuestionIndex(0);
                    setViewMode('quiz');
                  }
                }}
                disabled={bookmarkedQuestions.size === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-white dark:bg-zinc-800 border-2 border-red-600 dark:border-red-400 rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiBookmark className="text-lg" />
                Show Bookmarks {bookmarkedQuestions.size > 0 && `(${bookmarkedQuestions.size})`}
              </motion.button>

              <motion.button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setViewMode('landing');
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 text-zinc-900 dark:text-white hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-all border border-zinc-200 dark:border-zinc-700 font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiHome className="text-lg" />
                Back to Home
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Quiz View - Bookmarks List
  if (viewMode === 'quiz' && showBookmarksOnly) {
    if (displayedMcqs.length === 0) {
      return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 text-foreground relative overflow-hidden pt-40 flex items-center justify-center">
          <div className="max-w-md mx-auto p-8 bg-card/80 backdrop-blur-md rounded-2xl border border-border shadow-xl text-center relative z-10">
            <FiBookmark className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Bookmarked Questions</h2>
            <p className="text-muted-foreground mb-6">You haven't bookmarked any questions yet.</p>
            <motion.button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setShowBookmarksOnly(false);
                setViewMode('config');
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-500 text-white rounded-xl font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Back to Setup
            </motion.button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 text-foreground relative overflow-hidden pt-40">
        <div className="relative max-w-5xl mx-auto p-6 z-10">
          <motion.div
            className="flex items-center justify-between mb-6 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">
                Bookmarked Questions
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400">
                {displayedMcqs.length} bookmarked question{displayedMcqs.length !== 1 ? 's' : ''}
              </p>
            </div>

            <motion.button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setShowBookmarksOnly(false);
                setViewMode('config');
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-all border border-zinc-200 dark:border-zinc-700 font-medium text-zinc-900 dark:text-white"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiHome />
              Back to Setup
            </motion.button>
          </motion.div>

          <div className="space-y-4">
            {displayedMcqs.map((mcq, idx) => {
              const correctAnswer = normalizeCorrect(mcq);

              return (
                <motion.div
                  key={mcq.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white leading-relaxed mb-4">
                          {mcq.question}
                        </h2>
                      </div>
                    </div>

                    <motion.button
                      onClick={() => toggleBookmark(mcq.id)}
                      className="flex-shrink-0 p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <FiX className="w-5 h-5" />
                    </motion.button>
                  </div>

                  <div className="space-y-2 mb-4">
                    {(["option_a", "option_b", "option_c", "option_d"] as const).map((opt) => {
                      const value = mcq[opt];
                      const isCorrect = value === correctAnswer;

                      return (
                        <div
                          key={opt}
                          className={`p-4 rounded-xl border transition-all flex items-center gap-4 ${isCorrect
                            ? 'bg-red-500/10 border-red-500/50'
                            : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'
                            }`}
                        >
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${isCorrect ? 'border-red-400 bg-red-500' : 'border-zinc-400 dark:border-zinc-600'
                            }`}>
                            {isCorrect && <FiCheck className="text-white text-xs" />}
                          </div>
                          <div className="flex-1 text-zinc-900 dark:text-white">{value}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-500/10 px-4 py-2 rounded-lg">
                    <FiCheckCircle className="w-4 h-4" />
                    <span className="font-medium">Correct Answer: {correctAnswer}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Quiz View - Main Quiz Interface
  if (viewMode === 'quiz' && !showBookmarksOnly) {
    if (!currentMcq) {
      return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center pt-40">
          <div className="text-center">
            <p className="text-zinc-600 dark:text-zinc-400">Loading quiz...</p>
          </div>
        </div>
      );
    }

    const correctAnswer = normalizeCorrect(currentMcq);
    const userAnswer = answers[currentMcq.id];
    const isCorrect = submitted && userAnswer === correctAnswer;
    const isWrong = submitted && userAnswer && userAnswer !== correctAnswer;

    const correctCount = submitted ? mcqs.filter(m => answers[m.id] === normalizeCorrect(m)).length : 0;
    const percentage = submitted ? Math.round((correctCount / mcqs.length) * 100) : 0;

    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 relative overflow-hidden pt-40 pb-20">
        <div className="relative max-w-4xl mx-auto p-6 z-10">
          {/* Header */}
          <motion.div
            className="flex items-center justify-between mb-6 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Question {currentQuestionIndex + 1} of {mcqs.length}
              </span>
              {practiceMode === 'timed' && timeRemaining !== null && !submitted && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${timeRemaining < 300 ? 'bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'}`}>
                  <FiClock className="w-4 h-4" />
                  <span className="font-mono font-semibold">{formatTime(timeRemaining)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => toggleBookmark(currentMcq.id)}
                className={`p-2 rounded-lg transition-colors ${bookmarkedQuestions.has(currentMcq.id)
                  ? 'bg-red-500 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FiBookmark className="w-5 h-5" />
              </motion.button>

              <motion.button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setViewMode('config');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-all text-zinc-900 dark:text-white"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiHome className="w-4 h-4" />
                Exit
              </motion.button>
            </div>
          </motion.div>

          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl mb-6"
            >
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white leading-relaxed mb-6">
                {currentMcq.question}
              </h2>

              <div className="space-y-3">
                {(["option_a", "option_b", "option_c", "option_d"] as const).map((opt) => {
                  const value = currentMcq[opt];
                  const isThisCorrect = value === correctAnswer;
                  const isSelected = userAnswer === value;

                  let bgClass = 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700';
                  let textClass = 'text-zinc-900 dark:text-white';

                  if (submitted) {
                    if (isThisCorrect) {
                      bgClass = 'bg-green-500/10 border-green-500/50';
                      textClass = 'text-green-700 dark:text-green-400';
                    } else if (isSelected) {
                      bgClass = 'bg-red-500/10 border-red-500/50';
                      textClass = 'text-red-700 dark:text-red-400';
                    }
                  } else if (isSelected) {
                    bgClass = 'bg-red-500/10 border-red-500';
                    textClass = 'text-zinc-900 dark:text-white';
                  }

                  return (
                    <motion.button
                      key={opt}
                      onClick={() => !submitted && handleAnswer(currentMcq.id, value)}
                      disabled={submitted}
                      className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left ${bgClass} ${!submitted ? 'hover:border-red-500/50 cursor-pointer' : 'cursor-default'}`}
                      whileHover={!submitted ? { scale: 1.02 } : {}}
                      whileTap={!submitted ? { scale: 0.98 } : {}}
                    >
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected
                        ? submitted && isThisCorrect
                          ? 'border-green-500 bg-green-500'
                          : submitted && !isThisCorrect
                            ? 'border-red-500 bg-red-500'
                            : 'border-red-500 bg-red-500'
                        : isThisCorrect && submitted
                          ? 'border-green-500 bg-green-500'
                          : 'border-zinc-400 dark:border-zinc-600'
                        }`}>
                        {(isSelected || (submitted && isThisCorrect)) && <FiCheck className="text-white text-sm" />}
                      </div>
                      <div className={`flex-1 ${textClass}`}>{value}</div>
                    </motion.button>
                  );
                })}
              </div>

              {submitted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-6 p-4 rounded-xl flex items-start gap-3 ${isCorrect ? 'bg-green-500/10 border border-green-500/50' : isWrong ? 'bg-red-500/10 border border-red-500/50' : 'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'}`}
                >
                  {isCorrect ? (
                    <FiCheck className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : isWrong ? (
                    <FiX className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <FiX className="w-5 h-5 text-zinc-600 dark:text-zinc-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${isCorrect ? 'text-green-700 dark:text-green-400' : isWrong ? 'text-red-700 dark:text-red-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                      {isCorrect ? 'Correct!' : isWrong ? 'Incorrect' : 'Not answered'}
                    </p>
                    {!isCorrect && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        Correct answer: <span className="font-semibold text-green-600 dark:text-green-400">{correctAnswer}</span>
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons - Outside Card */}
          {!submitted && (
            <div className="flex items-center justify-between gap-4 mb-6">
              <motion.button
                onClick={goToPreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 dark:text-white font-medium shadow-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiChevronLeft />
                Previous
              </motion.button>

              <motion.button
                onClick={goToNextQuestion}
                disabled={currentQuestionIndex === mcqs.length - 1}
                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 dark:text-white font-medium shadow-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Next
                <FiChevronRight />
              </motion.button>
            </div>
          )}

          {/* Quick Navigation Bar - Compact */}
          {!submitted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent pb-2">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap flex-shrink-0">
                  Questions:
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {mcqs.map((mcq, idx) => {
                    const isAnswered = answers[mcq.id];
                    const isCurrent = idx === currentQuestionIndex;
                    const isBookmarked = bookmarkedQuestions.has(mcq.id);

                    return (
                      <motion.button
                        key={mcq.id}
                        onClick={() => {
                          setCurrentQuestionIndex(idx);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`relative w-8 h-8 rounded-md font-semibold text-xs transition-all flex-shrink-0 ${isCurrent
                            ? 'bg-red-600 text-white ring-2 ring-red-400'
                            : isAnswered
                              ? 'bg-green-500 text-white hover:bg-green-600'
                              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                          }`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {idx + 1}
                        {isBookmarked && (
                          <FiBookmark className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-red-500 fill-red-500" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
                <span className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap flex-shrink-0 ml-2">
                  {Object.keys(answers).length}/{mcqs.length}
                </span>
              </div>
            </motion.div>
          )}

          {/* Submit/Retry Button */}
          {!submitted ? (
            <motion.button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length === 0}
              className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-6"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FiCheckCircle />
              Submit All Answers
            </motion.button>
          ) : (
            <motion.button
              onClick={handleRetry}
              className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl font-semibold shadow-lg transition-all mb-6"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FiRefreshCw />
              Retry Quiz
            </motion.button>
          )}

          {/* Results Section */}
          {submitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-12 space-y-6"
            >
              {/* Results Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-zinc-900 rounded-2xl border-2 border-red-500/30 dark:border-red-500/30 shadow-xl"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-red-600 dark:bg-red-500 flex items-center justify-center">
                    <FiAward className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Quiz Results</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-4 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{correctCount}/{mcqs.length}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Correct</p>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{percentage}%</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Score</p>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{formatTime(elapsedTime)}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Time Taken</p>
                  </div>
                  <div className="text-center p-4 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{bookmarkedQuestions.size}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Bookmarked</p>
                  </div>
                </div>
              </motion.div>

              {/* All Questions Review */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Question Review</h3>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <FiCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-zinc-600 dark:text-zinc-400">Correct</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FiX className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <span className="text-zinc-600 dark:text-zinc-400">Wrong</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded-full border-2 border-zinc-400 dark:border-zinc-600"></div>
                      <span className="text-zinc-600 dark:text-zinc-400">Unanswered</span>
                    </div>
                  </div>
                </div>

                {mcqs.map((mcq, idx) => {
                  const correctAns = normalizeCorrect(mcq);
                  const userAns = answers[mcq.id];
                  const isCorrectAns = userAns === correctAns;
                  const isWrongAns = userAns && userAns !== correctAns;
                  const isUnanswered = !userAns;

                  return (
                    <motion.div
                      key={mcq.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`p-4 rounded-xl border ${isCorrectAns
                          ? 'bg-green-50 dark:bg-green-950/20 border-green-500/40'
                          : isWrongAns
                            ? 'bg-red-50 dark:bg-red-950/20 border-red-500/40'
                            : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-300 dark:border-zinc-700'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white ${isCorrectAns
                            ? 'bg-green-600'
                            : isWrongAns
                              ? 'bg-red-600'
                              : 'bg-zinc-500'
                          }`}>
                          {idx + 1}
                        </div>

                        <div className="flex-1">
                          <h4 className="text-base font-semibold text-zinc-900 dark:text-white mb-3 leading-relaxed">
                            {mcq.question}
                          </h4>

                          <div className="space-y-1.5">
                            {/* Show user's answer if wrong */}
                            {isWrongAns && (
                              <div className="p-2 rounded-md border bg-red-100 dark:bg-red-950/30 border-red-400 dark:border-red-500/50 flex items-center gap-2">
                                <div className="flex-shrink-0 w-3.5 h-3.5 rounded-full border border-red-500 bg-red-500 flex items-center justify-center">
                                  <FiX className="text-white text-[9px]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-[9px] font-semibold text-red-600 dark:text-red-400 block leading-tight">Your Answer</span>
                                  <span className="text-xs text-zinc-900 dark:text-white line-clamp-1">{userAns}</span>
                                </div>
                              </div>
                            )}

                            {/* Always show correct answer */}
                            <div className="p-2 rounded-md border bg-green-100 dark:bg-green-950/30 border-green-400 dark:border-green-500/50 flex items-center gap-2">
                              <div className="flex-shrink-0 w-3.5 h-3.5 rounded-full border border-green-500 bg-green-500 flex items-center justify-center">
                                <FiCheck className="text-white text-[9px]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-[9px] font-semibold text-green-600 dark:text-green-400 block leading-tight">Correct Answer</span>
                                <span className="text-xs text-zinc-900 dark:text-white font-medium line-clamp-1">{correctAns}</span>
                              </div>
                            </div>
                          </div>

                          {/* Status badge */}
                          <div className="mt-2.5">
                            {isCorrectAns ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400">
                                <FiCheck className="w-3 h-3" />
                                <span className="text-[10px] font-semibold">Correct</span>
                              </div>
                            ) : isWrongAns ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400">
                                <FiX className="w-3 h-3" />
                                <span className="text-[10px] font-semibold">Incorrect</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400">
                                <FiX className="w-3 h-3" />
                                <span className="text-[10px] font-semibold">Unanswered</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return null;
}