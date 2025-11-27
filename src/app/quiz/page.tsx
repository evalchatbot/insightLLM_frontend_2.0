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

  // New state for enhancements
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

  // Persist bookmarks to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('quizBookmarks', JSON.stringify(Array.from(bookmarkedQuestions)));
    }
  }, [bookmarkedQuestions]);

  // Persist bookmarked MCQs data to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('quizBookmarkedMcqs', JSON.stringify(bookmarkedMcqs));
    }
  }, [bookmarkedMcqs]);

  // Sync bookmarkedQuestions Set with bookmarkedMcqs array on mount
  useEffect(() => {
    if (bookmarkedMcqs.length > 0) {
      const mcqIds = new Set(bookmarkedMcqs.map(mcq => mcq.id));
      setBookmarkedQuestions(mcqIds);
    }
  }, []);

  // Timer effect
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

      // Set timer for timed mode (1.5 minutes per question)
      if (practiceMode === 'timed') {
        setTimeRemaining(questionCount * 90); // 90 seconds per question
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
        // Remove from bookmarked MCQs
        setBookmarkedMcqs(prevMcqs => prevMcqs.filter(m => m.id !== mcqId));
      } else {
        newSet.add(mcqId);
        // Add to bookmarked MCQs if not already there
        const mcqToBookmark = mcqs.find(m => m.id === mcqId);
        if (mcqToBookmark) {
          setBookmarkedMcqs(prevMcqs => {
            // Check if already exists
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

  const clearAllBookmarks = () => {
    setBookmarkedQuestions(new Set());
    if (typeof window !== 'undefined') {
      localStorage.removeItem('quizBookmarks');
    }
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
      setTimeRemaining(questionCount * 90);
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

  const displayedMcqs = showBookmarksOnly
    ? bookmarkedMcqs
    : mcqs;

  const currentMcq = displayedMcqs[currentQuestionIndex];

  // Landing View
  if (viewMode === 'landing') {
    return (
      <>
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-zinc-950 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-40 pb-0">
            <motion.section
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.3
                  }
                }
              }}
              className="pb-16"
            >
              <div className="text-center mb-12">
                <motion.h2
                  variants={{
                    hidden: { opacity: 0, y: -20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  className="text-3xl md:text-4xl font-bold text-[#2E5C55] dark:text-[#4ade80] mb-3"
                >
                  HOW IT WORKS
                </motion.h2>
                <motion.p
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1 }
                  }}
                  className="text-zinc-600 dark:text-zinc-400 text-lg"
                >
                  Four simple steps to master competitive exam MCQs
                </motion.p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
                <motion.div
                  variants={{
                    hidden: { scaleX: 0, opacity: 0 },
                    visible: {
                      scaleX: 1,
                      opacity: 1,
                      transition: { duration: 1.5, ease: "circOut", delay: 0.2 }
                    }
                  }}
                  style={{ originX: 0, left: '12.5%', right: '12.5%' }}
                  className="hidden md:block absolute top-6 h-[2px] bg-gradient-to-r from-[#2E5C55]/10 via-[#2E5C55]/40 to-[#2E5C55]/10 dark:from-[#4ade80]/10 dark:via-[#4ade80]/40 dark:to-[#4ade80]/10 -z-10 overflow-hidden rounded-full"
                >
                  {/* Primary Beam */}
                  <motion.div
                    className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-[#2E5C55] dark:via-[#4ade80] to-transparent blur-[1px]"
                    animate={{ x: ['-100%', '300%'] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  />
                  {/* Secondary Fast Beam */}
                  <motion.div
                    className="absolute top-0 left-0 h-full w-1/5 bg-gradient-to-r from-transparent via-[#4ade80] to-transparent blur-[2px] opacity-70"
                    animate={{ x: ['-100%', '400%'] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "linear", delay: 0.5 }}
                  />
                </motion.div>

                {[
                  { num: 1, title: "Choose Your Subject", desc: "Select from a wide range of competitive exam subjects and topics to focus your practice session." },
                  { num: 2, title: "Start Practicing", desc: "Answer MCQs with our intelligent system that adapts to your performance in real-time." },
                  { num: 3, title: "Review & Learn", desc: "Get instant feedback with detailed explanations to understand why each answer is correct or incorrect." },
                  { num: 4, title: "Track Progress", desc: "Monitor your performance analytics and identify areas that need more attention." }
                ].map((step, i) => (
                  <motion.div
                    key={step.num}
                    variants={{
                      hidden: { y: 20, opacity: 0 },
                      visible: { y: 0, opacity: 1 }
                    }}
                    className="flex flex-col items-center text-center"
                  >
                    <motion.div
                      animate={{ 
                        y: [0, -8, 0],
                        boxShadow: [
                          "0 0 0 0 rgba(46, 92, 85, 0)",
                          "0 0 20px 8px rgba(46, 92, 85, 0.3)",
                          "0 0 0 0 rgba(46, 92, 85, 0)"
                        ]
                      }}
                      transition={{
                        y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 },
                        boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }
                      }}
                      whileHover={{
                        scale: 1.15,
                        rotate: i % 2 === 0 ? 5 : -5,
                        boxShadow: "0 0 25px 10px rgba(74, 222, 128, 0.4)"
                      }}
                      className="w-12 h-12 rounded-full bg-[#2E5C55] dark:bg-[#4ade80] text-white dark:text-black flex items-center justify-center text-xl font-bold mb-6 shadow-lg ring-4 ring-white dark:ring-zinc-950 cursor-default relative z-10"
                    >
                      {step.num}
                    </motion.div>
                    <h3 className="font-bold text-lg mb-3 text-zinc-800 dark:text-zinc-100">{step.title}</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{step.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </div>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="py-20 bg-gradient-to-br from-[#1a2f2a] via-[#2d4a47] to-[#1e3a3a] dark:from-[#0f1f1c] dark:via-[#1a2f2a] dark:to-[#162b28] text-center relative overflow-hidden"
          >
            {/* Galaxy Background with Green Theme */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {/* Animated stars */}
              {[...Array(50)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-emerald-400/60 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: Math.random() * 3 + 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}

              {/* Large orbiting green nebula */}
              <motion.div
                className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl"
                animate={{
                  x: [0, 100, 0],
                  y: [0, 50, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Medium green glow orb */}
              <motion.div
                className="absolute top-1/4 right-1/4 w-64 h-64 bg-[#2E5C55]/30 rounded-full blur-3xl"
                animate={{
                  x: [0, -80, 0],
                  y: [0, 80, 0],
                  scale: [1, 1.3, 1],
                }}
                transition={{
                  duration: 15,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
              />

              {/* Bottom right emerald nebula */}
              <motion.div
                className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-emerald-400/15 rounded-full blur-3xl"
                animate={{
                  x: [0, -60, 0],
                  y: [0, -60, 0],
                  scale: [1, 1.15, 1],
                }}
                transition={{
                  duration: 18,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 2,
                }}
              />

              {/* Floating particles */}
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={`particle-${i}`}
                  className="absolute w-2 h-2 bg-green-400/40 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -100, 0],
                    x: [0, Math.random() * 50 - 25, 0],
                    opacity: [0, 0.6, 0],
                  }}
                  transition={{
                    duration: Math.random() * 10 + 10,
                    repeat: Infinity,
                    delay: Math.random() * 5,
                    ease: "easeInOut",
                  }}
                />
              ))}

              {/* Rotating ring effect */}
              <motion.div
                className="absolute top-1/2 left-1/2 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 border border-emerald-500/10 rounded-full"
                animate={{
                  rotate: 360,
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  rotate: { duration: 30, repeat: Infinity, ease: "linear" },
                  scale: { duration: 8, repeat: Infinity, ease: "easeInOut" },
                }}
              />

              {/* Inner rotating ring */}
              <motion.div
                className="absolute top-1/2 left-1/2 w-[400px] h-[400px] -translate-x-1/2 -translate-y-1/2 border border-green-400/10 rounded-full"
                animate={{
                  rotate: -360,
                  scale: [1, 1.15, 1],
                }}
                transition={{
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                  scale: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                }}
              />

              {/* Green light rays */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={`ray-${i}`}
                  className="absolute top-1/2 left-1/2 w-1 h-40 bg-gradient-to-t from-emerald-500/20 to-transparent origin-bottom"
                  style={{
                    transform: `rotate(${i * 45}deg) translateY(-50%)`,
                  }}
                  animate={{
                    opacity: [0.2, 0.5, 0.2],
                    scaleY: [1, 1.3, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <motion.h2 
                className="text-3xl md:text-4xl font-bold text-white mb-4"
                animate={{
                  textShadow: [
                    "0 0 20px rgba(74, 222, 128, 0.3)",
                    "0 0 40px rgba(74, 222, 128, 0.5)",
                    "0 0 20px rgba(74, 222, 128, 0.3)",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                READY TO START PRACTICING?
              </motion.h2>
              <p className="text-zinc-300 text-lg mb-8 max-w-3xl mx-auto">Click below to configure your practice session and begin mastering competitive exam MCQs</p>

              <motion.button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'instant' });
                  requestAnimationFrame(() => {
                    setViewMode('config');
                  });
                }}
                className="inline-flex items-center gap-2 bg-[#2E5C55] hover:bg-[#3d7a6f] dark:bg-[#4ade80] dark:hover:bg-[#3bc970] text-white dark:text-black font-semibold px-8 py-4 rounded-xl transition-all duration-300 shadow-xl hover:shadow-2xl relative overflow-hidden group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Button glow effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/30 to-emerald-400/0"
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <FiStar className="text-xl relative z-10" />
                <span className="relative z-10">Start Practice Session</span>
              </motion.button>
            </div>
          </motion.section>

          <div className="bg-[#F8FAFC] dark:bg-zinc-950 relative">
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-[#2E5C55] dark:text-[#4ade80] mb-3">COMPREHENSIVE PRACTICE FEATURES</h2>
                  <p className="text-zinc-600 dark:text-zinc-400 text-lg">Everything you need to excel in competitive exams</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { icon: <FiBook className="w-5 h-5" />, text: "20000+ curated MCQs across all subjects of Competitive Exams" },
                    { icon: <FiCheckCircle className="w-5 h-5" />, text: "Detailed explanations for every answer" },
                    { icon: <FiTarget className="w-5 h-5" />, text: "Subject-wise and topic-wise categorization" },
                    { icon: <FiClock className="w-5 h-5" />, text: "Timed and untimed practice modes" },
                    { icon: <FiTrendingUp className="w-5 h-5" />, text: "Performance tracking and analytics" },
                    { icon: <FiAward className="w-5 h-5" />, text: "Difficulty level progression" },
                    { icon: <FiBookmark className="w-5 h-5" />, text: "Bookmark questions for revision" },
                    { icon: <FiTarget className="w-5 h-5" />, text: "Mock test simulations" },
                  ].map((feature, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + (i * 0.05), duration: 0.4 }}
                      className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-[#2E5C55] dark:hover:border-[#4ade80] transition-colors"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#2E5C55]/10 dark:bg-[#4ade80]/10 text-[#2E5C55] dark:text-[#4ade80] flex items-center justify-center">
                        {feature.icon}
                      </div>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">{feature.text}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            </div>
          </div>
        </div>

        <footer className="py-6 border-t border-black/5 dark:border-white/10 bg-zinc-50 dark:bg-black/40">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="relative w-6 h-6">
                <img src="/assets/gemini-logo.svg" alt="InsightLLM Logo" className="object-contain w-full h-full" />
              </div>
              <span className="font-bold text-lg tracking-tight text-[#2E5C55] dark:text-[#4ade80]">rubrik.ai</span>
            </div>
            <div className="flex items-center gap-6 text-sm font-medium">
              <a href="#" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">Privacy</a>
              <a href="#" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">Terms</a>
              <a href="#" className="text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">Contact</a>
            </div>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">© 2025 RUBRIK. All rights reserved.</p>
          </div>
        </footer>
      </>
    );
  }

  // Configuration View
  if (viewMode === 'config') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 dark:from-zinc-950 dark:via-emerald-950/20 dark:to-zinc-900 text-foreground relative overflow-hidden">
        {/* Galaxy Background Animation */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {/* Animated stars */}
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={`star-${i}`}
              className="absolute w-1 h-1 bg-emerald-400/50 dark:bg-emerald-400/40 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 0.8, 0],
                scale: [0, 1.2, 0],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}

          {/* Floating nebula orbs */}
          <motion.div
            className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-300/10 dark:bg-emerald-500/10 rounded-full blur-3xl"
            animate={{
              x: [0, 80, 0],
              y: [0, 40, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.div
            className="absolute top-1/4 right-1/4 w-64 h-64 bg-green-300/10 dark:bg-green-500/10 rounded-full blur-3xl"
            animate={{
              x: [0, -60, 0],
              y: [0, 60, 0],
              scale: [1, 1.25, 1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />

          <motion.div
            className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-teal-300/10 dark:bg-emerald-400/10 rounded-full blur-3xl"
            animate={{
              x: [0, -50, 0],
              y: [0, -50, 0],
              scale: [1, 1.12, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />

          {/* Floating particles */}
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-1.5 h-1.5 bg-emerald-400/30 dark:bg-green-400/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -80, 0],
                x: [0, Math.random() * 40 - 20, 0],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: Math.random() * 8 + 8,
                repeat: Infinity,
                delay: Math.random() * 4,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <div className="relative max-w-4xl mx-auto p-6 z-10 pt-40">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-[#2E5C55] dark:text-[#4ade80] mb-2">START YOUR PRACTICE</h1>
            <p className="text-zinc-600 dark:text-zinc-400">Select your subject and practice mode to begin</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-card/80 backdrop-blur-md p-8 rounded-2xl border border-border shadow-xl"
          >
            <div className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-foreground">Select Exam</label>
                <select className="w-full p-3 bg-secondary border border-border rounded-xl text-foreground focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all">
                  <option>Choose your exam</option>
                  <option>CSS</option>
                  <option>PMS</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-foreground">Choose Subject</label>
                <select
                  className="w-full p-3 bg-secondary border border-border rounded-xl text-foreground focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
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
                <label className="block mb-3 text-sm font-medium text-foreground">Choose Practice Mode</label>
                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    onClick={() => setPracticeMode('untimed')}
                    className={`p-4 rounded-xl border-2 transition-all ${practiceMode === 'untimed'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-border bg-secondary hover:border-green-500/50'
                      }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiClock className="w-6 h-6 mx-auto mb-2 text-foreground" />
                    <h4 className="font-semibold text-foreground mb-1">Untimed Practice</h4>
                    <p className="text-xs text-muted-foreground">Learn at your own pace</p>
                  </motion.button>

                  <motion.button
                    onClick={() => setPracticeMode('timed')}
                    className={`p-4 rounded-xl border-2 transition-all ${practiceMode === 'timed'
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-border bg-secondary hover:border-green-500/50'
                      }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <FiTarget className="w-6 h-6 mx-auto mb-2 text-foreground" />
                    <h4 className="font-semibold text-foreground mb-1">Timed Practice</h4>
                    <p className="text-xs text-muted-foreground">Simulate exam conditions</p>
                  </motion.button>
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-foreground">Number of Questions</label>
                <select
                  className="w-full p-3 bg-secondary border border-border rounded-xl text-foreground focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                >
                  <option value={20}>20 Questions</option>
                  <option value={50}>50 Questions</option>
                  <option value={100}>100 Questions</option>
                </select>
              </div>

              {error && (
                <div className="text-amber-300 bg-amber-900/30 border border-amber-500/30 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <motion.button
                onClick={fetchMcqs}
                disabled={!selectedGenre || loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-semibold px-6 py-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <>
                    <motion.div
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <FiStar className="text-lg" />
                    <span>Start Practice Session</span>
                  </>
                )}
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
                className="w-full flex items-center justify-center gap-2 px-6 py-3 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 bg-white dark:bg-zinc-900 border-2 border-green-600 dark:border-green-400 rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FiBookmark className="text-lg" />
                Show Bookmarks {bookmarkedQuestions.size > 0 && `(${bookmarkedQuestions.size})`}
              </motion.button>

              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <p className="text-sm text-green-800 dark:text-green-300 flex items-start gap-2">
                  <span>📚</span>
                  <span>Note: We are trying our best to upload MCQs of all subjects soon. Thank you for your patience!</span>
                </p>
              </div>

              <motion.button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setMcqs([]);
                  setAnswers({});
                  setSubmitted(false);
                  setShowBookmarksOnly(false);
                  setViewMode('landing');
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 text-foreground hover:text-foreground bg-secondary hover:bg-accent rounded-xl transition-all border border-border font-medium"
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

  // Bookmark View - Show all bookmarked questions with answers
  if (viewMode === 'quiz' && showBookmarksOnly) {
    if (displayedMcqs.length === 0) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 dark:from-zinc-950 dark:via-emerald-950/20 dark:to-zinc-900 text-foreground relative overflow-hidden pt-40 flex items-center justify-center">
          {/* Galaxy Background Animation */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
            {/* Animated stars */}
            {[...Array(40)].map((_, i) => (
              <motion.div
                key={`star-${i}`}
                className="absolute w-1 h-1 bg-emerald-400/50 dark:bg-emerald-400/40 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  opacity: [0, 0.8, 0],
                  scale: [0, 1.2, 0],
                }}
                transition={{
                  duration: Math.random() * 3 + 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}

            {/* Floating nebula orbs */}
            <motion.div
              className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-300/10 dark:bg-emerald-500/10 rounded-full blur-3xl"
              animate={{
                x: [0, 80, 0],
                y: [0, 40, 0],
                scale: [1, 1.15, 1],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            <motion.div
              className="absolute top-1/4 right-1/4 w-64 h-64 bg-green-300/10 dark:bg-green-500/10 rounded-full blur-3xl"
              animate={{
                x: [0, -60, 0],
                y: [0, 60, 0],
                scale: [1, 1.25, 1],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
            />

            <motion.div
              className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-teal-300/10 dark:bg-emerald-400/10 rounded-full blur-3xl"
              animate={{
                x: [0, -50, 0],
                y: [0, -50, 0],
                scale: [1, 1.12, 1],
              }}
              transition={{
                duration: 18,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2,
              }}
            />

            {/* Floating particles */}
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={`particle-${i}`}
                className="absolute w-1.5 h-1.5 bg-emerald-400/30 dark:bg-green-400/30 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -80, 0],
                  x: [0, Math.random() * 40 - 20, 0],
                  opacity: [0, 0.6, 0],
                }}
                transition={{
                  duration: Math.random() * 8 + 8,
                  repeat: Infinity,
                  delay: Math.random() * 4,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          <div className="max-w-md mx-auto p-8 bg-card/80 backdrop-blur-md rounded-2xl border border-border shadow-xl text-center relative z-10">
            <FiBookmark className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold text-foreground mb-2">No Bookmarked Questions</h2>
            <p className="text-muted-foreground mb-6">You haven't bookmarked any questions yet. Start a quiz and bookmark questions you want to review later.</p>
            <motion.button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setShowBookmarksOnly(false);
                setViewMode('config');
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-xl font-medium"
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 dark:from-zinc-950 dark:via-emerald-950/20 dark:to-zinc-900 text-foreground relative overflow-hidden pt-40">
        {/* Galaxy Background Animation */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          {/* Animated stars */}
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={`star-${i}`}
              className="absolute w-1 h-1 bg-emerald-400/50 dark:bg-emerald-400/40 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 0.8, 0],
                scale: [0, 1.2, 0],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}

          {/* Floating nebula orbs */}
          <motion.div
            className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-300/10 dark:bg-emerald-500/10 rounded-full blur-3xl"
            animate={{
              x: [0, 80, 0],
              y: [0, 40, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.div
            className="absolute top-1/4 right-1/4 w-64 h-64 bg-green-300/10 dark:bg-green-500/10 rounded-full blur-3xl"
            animate={{
              x: [0, -60, 0],
              y: [0, 60, 0],
              scale: [1, 1.25, 1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />

          <motion.div
            className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-teal-300/10 dark:bg-emerald-400/10 rounded-full blur-3xl"
            animate={{
              x: [0, -50, 0],
              y: [0, -50, 0],
              scale: [1, 1.12, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />

          {/* Floating particles */}
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-1.5 h-1.5 bg-emerald-400/30 dark:bg-green-400/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -80, 0],
                x: [0, Math.random() * 40 - 20, 0],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: Math.random() * 8 + 8,
                repeat: Infinity,
                delay: Math.random() * 4,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <div className="relative max-w-5xl mx-auto p-3 sm:p-4 md:p-6 z-10">
          {/* Header */}
          <motion.div
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6 p-4 sm:p-6 bg-card/80 backdrop-blur-md rounded-xl sm:rounded-2xl border border-border shadow-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1">
                Bookmarked Questions
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm">
                {displayedMcqs.length} bookmarked question{displayedMcqs.length !== 1 ? 's' : ''}
              </p>
            </div>

            <motion.button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setShowBookmarksOnly(false);
                setViewMode('config');
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-accent rounded-xl transition-all border border-border font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FiHome className="text-base" />
              <span>Back to Setup</span>
            </motion.button>
          </motion.div>

          {/* Bookmarked Questions List */}
          <div className="space-y-4">
            {displayedMcqs.map((mcq, idx) => {
              const correctAnswer = normalizeCorrect(mcq);

              return (
                <motion.div
                  key={mcq.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-card/80 backdrop-blur-md p-6 rounded-2xl border border-border shadow-xl"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-lg font-semibold text-foreground leading-relaxed mb-4">
                          {mcq.question}
                        </h2>
                      </div>
                    </div>

                    <motion.button
                      onClick={() => toggleBookmark(mcq.id)}
                      className="flex-shrink-0 p-2 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500/30 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Remove bookmark"
                    >
                      <FiX className="w-5 h-5" />
                    </motion.button>
                  </div>

                  {/* Options */}
                  <div className="space-y-2 mb-4">
                    {(["option_a", "option_b", "option_c", "option_d"] as const).map((opt) => {
                      const value = mcq[opt];
                      const isCorrect = value === correctAnswer;

                      return (
                        <div
                          key={opt}
                          className={`p-4 rounded-xl border transition-all flex items-center gap-4 ${isCorrect
                            ? 'bg-green-500/10 border-green-500/50'
                            : 'bg-secondary/30 border-border'
                            }`}
                        >
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${isCorrect ? 'border-green-400 bg-green-500' : 'border-muted-foreground'
                            }`}>
                            {isCorrect && <FiCheck className="text-white text-xs" />}
                          </div>
                          <div className="flex-1 text-foreground">{value}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Correct Answer Label */}
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-500/10 px-4 py-2 rounded-lg">
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

  // Quiz View
  if (viewMode === 'quiz') {
    // If no current question, return null
    if (!currentMcq) return null;

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-green-50/30 to-teal-50/50 dark:from-zinc-950 dark:via-emerald-950/20 dark:to-zinc-900 text-foreground relative overflow-hidden pt-40">
        {/* Galaxy Background Animation */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          {/* Animated stars */}
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={`star-${i}`}
              className="absolute w-1 h-1 bg-emerald-400/50 dark:bg-emerald-400/40 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 0.8, 0],
                scale: [0, 1.2, 0],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}

          {/* Floating nebula orbs */}
          <motion.div
            className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-300/10 dark:bg-emerald-500/10 rounded-full blur-3xl"
            animate={{
              x: [0, 80, 0],
              y: [0, 40, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.div
            className="absolute top-1/4 right-1/4 w-64 h-64 bg-green-300/10 dark:bg-green-500/10 rounded-full blur-3xl"
            animate={{
              x: [0, -60, 0],
              y: [0, 60, 0],
              scale: [1, 1.25, 1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />

          <motion.div
            className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-teal-300/10 dark:bg-emerald-400/10 rounded-full blur-3xl"
            animate={{
              x: [0, -50, 0],
              y: [0, -50, 0],
              scale: [1, 1.12, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />

          {/* Floating particles */}
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute w-1.5 h-1.5 bg-emerald-400/30 dark:bg-green-400/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -80, 0],
                x: [0, Math.random() * 40 - 20, 0],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: Math.random() * 8 + 8,
                repeat: Infinity,
                delay: Math.random() * 4,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <div className="relative max-w-5xl mx-auto p-3 sm:p-4 md:p-6 z-10">

          {/* Single Question Card */}
          {!submitted && (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentMcq.id}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="mb-4"
                >
                  <div className="bg-card/80 backdrop-blur-md p-6 md:p-8 rounded-2xl border border-border shadow-xl">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-green-500/30">
                          {currentQuestionIndex + 1}
                        </div>
                        <div className="flex-1">
                          <h2 className="text-lg md:text-xl font-semibold text-foreground leading-relaxed">
                            {currentMcq.question}
                          </h2>
                        </div>
                      </div>

                      <motion.button
                        onClick={() => toggleBookmark(currentMcq.id)}
                        className={`flex-shrink-0 p-2 rounded-lg transition-colors ${bookmarkedQuestions.has(currentMcq.id)
                          ? 'bg-yellow-500/20 text-yellow-500'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                          }`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <FiBookmark className={bookmarkedQuestions.has(currentMcq.id) ? 'fill-current' : ''} />
                      </motion.button>
                    </div>

                    <div className="space-y-3">
                      {(["option_a", "option_b", "option_c", "option_d"] as const).map((opt) => {
                        const value = currentMcq[opt];
                        const isSelected = answers[currentMcq.id] === value;
                        const isCorrectOption = value === normalizeCorrect(currentMcq);
                        const showCorrect = submitted && isCorrectOption;
                        const showWrong = submitted && isSelected && value !== normalizeCorrect(currentMcq);

                        let classes = "relative p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 text-foreground cursor-pointer ";

                        if (submitted) {
                          if (showCorrect) {
                            classes += "bg-green-900/30 border-green-500/50";
                          } else if (showWrong) {
                            classes += "bg-red-900/30 border-red-500/50";
                          } else {
                            classes += "bg-secondary/30 border-border opacity-50";
                          }
                        } else {
                          classes += "bg-secondary/40 border-border hover:border-green-500/50 hover:bg-secondary/60";
                          if (isSelected) {
                            classes += " border-green-500 bg-green-500/20";
                          }
                        }

                        return (
                          <motion.label
                            key={opt}
                            className={classes}
                            whileHover={!submitted ? { x: 4 } : {}}
                            whileTap={!submitted ? { scale: 0.98 } : {}}
                          >
                            <input
                              type="radio"
                              name={`mcq-${currentMcq.id}`}
                              value={value}
                              disabled={submitted}
                              checked={isSelected}
                              onChange={() => handleAnswer(currentMcq.id, value)}
                              className="sr-only"
                            />
                            <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-green-500 bg-green-500' : 'border-muted-foreground'
                              } ${submitted && showCorrect ? 'border-green-400 bg-green-500' : ''} ${submitted && showWrong ? 'border-red-400 bg-red-500' : ''
                              }`}>
                              {(isSelected && !submitted) && <div className="w-2 h-2 bg-white rounded-full"></div>}
                              {submitted && showCorrect && <FiCheck className="text-white text-xs" />}
                              {submitted && showWrong && <FiX className="text-white text-xs" />}
                            </div>
                            <div className="flex-1">{value}</div>
                          </motion.label>
                        );
                      })}
                    </div>

                    {/* Navigation Buttons - Inside Card */}
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
                      <motion.button
                        onClick={goToPreviousQuestion}
                        disabled={currentQuestionIndex === 0}
                        className="flex items-center gap-2 px-6 py-2.5 bg-secondary hover:bg-accent rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <FiChevronLeft />
                        Previous
                      </motion.button>

                      <motion.button
                        onClick={goToNextQuestion}
                        disabled={currentQuestionIndex === displayedMcqs.length - 1}
                        className="flex items-center gap-2 px-6 py-2.5 bg-secondary hover:bg-accent rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Next
                        <FiChevronRight />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Compact Navigation Bar */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card/60 backdrop-blur-sm px-4 py-3 rounded-xl border border-border/50 shadow-sm mb-6"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Timer and Question Counter */}
                  <div className="flex items-center gap-3 text-sm">
                    {practiceMode === 'timed' && timeRemaining !== null && (
                      <>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium ${timeRemaining < 120 ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
                          <FiClock className="text-sm" />
                          <span className="font-mono text-xs">{formatTime(timeRemaining)}</span>
                        </div>
                        <div className="w-px h-4 bg-border"></div>
                      </>
                    )}
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{currentQuestionIndex + 1}</span>/{displayedMcqs.length}
                    </span>
                  </div>

                  {/* Center: Compact Question Numbers */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    {displayedMcqs.map((mcq, idx) => {
                      const isAnswered = !!answers[mcq.id];
                      const isCurrent = idx === currentQuestionIndex;
                      const isBookmarked = bookmarkedQuestions.has(mcq.id);
                      
                      return (
                        <motion.button
                          key={mcq.id}
                          onClick={() => setCurrentQuestionIndex(idx)}
                          className={`relative w-7 h-7 rounded-md text-xs font-semibold transition-all ${
                            isCurrent 
                              ? 'bg-green-500 text-white shadow-md' 
                              : isAnswered
                              ? 'bg-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/40'
                              : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                          }`}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {idx + 1}
                          {isBookmarked && (
                            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-500 rounded-full border border-background" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Right: Home Button */}
                  <motion.button
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      setAnswers({});
                      setSubmitted(false);
                      setCurrentQuestionIndex(0);
                      setShowBookmarksOnly(false);
                        setViewMode('config');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-accent rounded-md transition-all text-xs font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <FiHome className="text-sm" />
                      <span>Setup</span>
                  </motion.button>
                </div>
              </motion.div>

              {/* Submit Button - Outside Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center mt-8 pb-12"
              >
                <motion.button
                  onClick={handleSubmit}
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Submit Quiz
                </motion.button>
              </motion.div>
            </>
          )}

          {/* Results View */}
          {submitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card/80 backdrop-blur-md p-8 rounded-2xl border border-border shadow-xl text-center"
            >
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiAward className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Quiz Completed!</h2>
              <p className="text-muted-foreground mb-8">Here's how you performed</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-secondary/50 rounded-xl border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Total Questions</div>
                  <div className="text-2xl font-bold text-foreground">{displayedMcqs.length}</div>
                </div>
                <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                  <div className="text-sm text-green-600 dark:text-green-400 mb-1">Correct Answers</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {displayedMcqs.filter(m => answers[m.id] === normalizeCorrect(m)).length}
                  </div>
                </div>
                <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                  <div className="text-sm text-red-600 dark:text-red-400 mb-1">Incorrect</div>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {displayedMcqs.length - displayedMcqs.filter(m => answers[m.id] === normalizeCorrect(m)).length}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <motion.button
                  onClick={handleRetry}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-secondary hover:bg-accent rounded-xl transition-all border border-border font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiRefreshCw />
                  Try Again
                </motion.button>
                <motion.button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    // Reset quiz state but keep bookmarks so user can revisit
                    setAnswers({});
                    setSubmitted(false);
                    setCurrentQuestionIndex(0);
                    setTimeRemaining(null);
                    setShowBookmarksOnly(false);
                    setViewMode('config');
                  }}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-xl font-medium shadow-lg shadow-green-500/20"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FiHome />
                  Back to Setup
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Detailed Results - All Questions Review */}
          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 space-y-3"
            >
              <h3 className="text-xl font-bold text-foreground mb-4 text-center">Detailed Review</h3>
              
              {displayedMcqs.map((mcq, idx) => {
                const userAnswer = answers[mcq.id];
                const correctAnswer = normalizeCorrect(mcq);
                const isCorrect = userAnswer === correctAnswer;
                const wasAnswered = !!userAnswer;

                return (
                  <motion.div
                    key={mcq.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className={`bg-card/80 backdrop-blur-md p-4 rounded-xl border shadow-md ${
                      !wasAnswered 
                        ? 'border-gray-500/50' 
                        : isCorrect 
                        ? 'border-green-500/50' 
                        : 'border-red-500/50'
                    }`}
                  >
                    {/* Question Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md ${
                        !wasAnswered 
                          ? 'bg-gradient-to-br from-gray-500 to-gray-600' 
                          : isCorrect 
                          ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                          : 'bg-gradient-to-br from-red-500 to-rose-500'
                      }`}>
                        {!wasAnswered ? (
                          <span>-</span>
                        ) : isCorrect ? (
                          <FiCheck />
                        ) : (
                          <span>✕</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-muted-foreground">Q{idx + 1}</span>
                          {!wasAnswered && (
                            <span className="px-1.5 py-0.5 bg-gray-500/20 text-gray-600 dark:text-gray-400 text-[10px] rounded font-medium">
                              Not Answered
                            </span>
                          )}
                          {wasAnswered && isCorrect && (
                            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 text-[10px] rounded font-medium">
                              Correct
                            </span>
                          )}
                          {wasAnswered && !isCorrect && (
                            <span className="px-1.5 py-0.5 bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] rounded font-medium">
                              Incorrect
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold text-foreground leading-snug">
                          {mcq.question}
                        </h3>
                      </div>
                    </div>

                    {/* Show only relevant answers */}
                    <div className="space-y-2 ml-11">
                      {/* Show wrong answer if answered incorrectly */}
                      {wasAnswered && !isCorrect && (
                        <div className="p-2.5 rounded-lg border bg-red-500/10 border-red-500/50">
                          <div className="flex items-center gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full border border-red-500 bg-red-500 text-white flex items-center justify-center text-[10px] font-bold">
                              ✕
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold mr-1">Your:</span>
                              <span className="text-xs text-foreground">{userAnswer}: {mcq[userAnswer.toLowerCase() as 'a' | 'b' | 'c' | 'd']}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Always show correct answer */}
                      <div className="p-2.5 rounded-lg border bg-green-500/10 border-green-500/50">
                        <div className="flex items-center gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full border border-green-500 bg-green-500 text-white flex items-center justify-center">
                            <FiCheck className="text-[10px]" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold mr-1">Correct:</span>
                            <span className="text-xs text-foreground font-medium">{correctAnswer}: {mcq[correctAnswer.toLowerCase() as 'a' | 'b' | 'c' | 'd']}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return null;
}