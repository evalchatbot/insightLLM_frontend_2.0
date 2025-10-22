"use client";
import React, { useEffect, useState } from "react";
import { FiCheck, FiX, FiHome, FiRefreshCw, FiStar } from 'react-icons/fi';

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

// Floating particles component
const FloatingParticles = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 20}s`,
            animationDuration: `${15 + Math.random() * 20}s`,
          }}
        >
          <div className={`w-2 h-2 rounded-full ${
            i % 3 === 0 ? 'bg-red-400/20' : 
            i % 3 === 1 ? 'bg-blue-400/20' : 
            'bg-purple-400/20'
          }`} />
        </div>
      ))}
    </div>
  );
};

// Animated background gradients
const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-slate-900 to-black"></div>
      <div className="absolute top-1/4 -left-10 w-72 h-72 bg-red-500/5 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/3 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
    </div>
  );
};

export default function QuizPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedRepeats, setUsedRepeats] = useState(false);

  useEffect(() => {
    fetch("/api/genres")
      .then((r) => r.json())
      .then((d) => setGenres(d || []))
      .catch(() => setGenres([]));
  }, []);

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
      const url = `/quiz/mcqs?genre_id=${selectedGenre}&limit=20&random=true&useLocal=true`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`fetch mcqs ${res.status}`);
      const data = await res.json();
      let questions: MCQ[] = Array.isArray(data) ? data : [];

      questions = shuffle(questions || []);
      const final: MCQ[] = [];
      if (questions.length === 0) {
        for (let i = 0; i < 20; i++) {
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
        while (final.length < 20) {
          const pick = questions[idx % questions.length];
          final.push({ ...pick, id: `${pick.id}-f${final.length}` });
          idx++;
        }
        setUsedRepeats(questions.length < 20);
      }

      setMcqs(final);
      setShowQuiz(final.length > 0);
      try { document.documentElement.style.overflow = 'auto'; document.body.style.overflow = 'auto'; } catch (e) {}
    } catch (e: any) {
      setError(e?.message || "Failed to fetch mcqs");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (mcqId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [mcqId]: option }));
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
    setSubmitted(true);
  };

  const handleRetry = () => {
    if (!mcqs || mcqs.length === 0) return;
    setMcqs((prev) => shuffle(prev));
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      <AnimatedBackground />
      <FloatingParticles />
      
      <div className="relative max-w-2xl mx-auto p-4 z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-blue-400 bg-clip-text text-transparent">
              QuizMaster
            </h1>
            <p className="text-gray-400 text-xs mt-1">Test your knowledge</p>
          </div>
          <a href="/app" className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300 border border-white/10 hover:border-red-400/30 text-sm">
            <FiHome className="text-sm" />
            <span>Home</span>
          </a>
        </div>

        {!showQuiz && (
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <FiStar className="text-white text-lg" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Choose Your Genre</h2>
              <p className="text-gray-400 text-sm">Select a category to start the challenge</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-300">Genre</label>
                <select
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-red-400/50 focus:ring-1 focus:ring-red-400/30 transition-all duration-300 backdrop-blur-sm"
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                >
                  <option value="" className="bg-gray-800">-- Select Genre --</option>
                  {genres.map((g) => (
                    <option key={g.id} value={g.id} className="bg-gray-800">
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                {error && (
                  <div className="text-red-300 bg-red-900/20 border border-red-500/20 px-3 py-2 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                
                <button
                  className="group relative inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-500 hover:to-blue-500 text-white font-medium px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm"
                  disabled={!selectedGenre || loading}
                  onClick={fetchMcqs}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Loading...
                    </div>
                  ) : (
                    <>
                      Start Quiz
                      <FiStar className="text-sm" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {showQuiz && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quiz Header */}
            <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {genres.find(g => g.id === selectedGenre)?.name || 'Selected Genre'}
                  </h2>
                  <p className="text-gray-400 text-xs mt-1">{mcqs.length} questions</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-gray-300 mb-1">
                      {Object.keys(answers).length}/{mcqs.length}
                    </div>
                    <div className="w-32 bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-red-500 to-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${Math.round(((Object.keys(answers).length||0)/mcqs.length)*100)||0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {usedRepeats && (
              <div className="p-3 rounded-xl bg-yellow-900/20 border border-yellow-600/30 text-yellow-200 text-sm backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span>Some questions were repeated to create a full quiz.</span>
                </div>
              </div>
            )}

            {/* Questions */}
            <div className="space-y-4">
              {mcqs.map((mcq, idx) => {
                const user = answers[mcq.id];
                const correctValue = normalizeCorrect(mcq);
                
                return (
                  <div 
                    key={mcq.id} 
                    className="group p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-red-400/30 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-red-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div className="font-medium text-white text-sm leading-relaxed">
                          {mcq.question}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 ml-9">
                      {(["option_a","option_b","option_c","option_d"] as const).map((opt) => {
                        const value = mcq[opt];
                        const isSelected = user === value;
                        const isCorrectOption = value === correctValue;
                        const showCorrect = submitted && isCorrectOption;
                        const showWrong = submitted && isSelected && value !== correctValue;

                        let classes = "relative p-3 rounded-lg border transition-all duration-300 flex items-center gap-3 text-white text-sm cursor-pointer ";
                        
                        if (submitted) {
                          if (showCorrect) {
                            classes += "bg-green-900/20 border-green-500 scale-[1.02]";
                          } else if (showWrong) {
                            classes += "bg-red-900/20 border-red-500 scale-[1.02]";
                          } else {
                            classes += "bg-white/5 border-white/10 opacity-60";
                          }
                        } else {
                          classes += "bg-white/5 border-white/10 hover:border-red-400/50 hover:bg-white/10";
                          if (isSelected) {
                            classes += " border-blue-400 bg-blue-900/20 scale-[1.02]";
                          }
                        }

                        return (
                          <label key={opt} className={classes}>
                            <input
                              type="radio"
                              name={`mcq-${mcq.id}`}
                              value={value}
                              disabled={submitted}
                              checked={isSelected}
                              onChange={() => handleAnswer(mcq.id, value)}
                              className="sr-only"
                            />
                            <div className={`flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-300 ${
                              isSelected ? 'border-blue-400 bg-blue-500' : 'border-gray-400'
                            } ${submitted && showCorrect ? 'border-green-400 bg-green-500' : ''} ${
                              submitted && showWrong ? 'border-red-400 bg-red-500' : ''
                            }`}>
                              {(isSelected && !submitted) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                            </div>
                            <div className="flex-1 leading-relaxed">{value}</div>
                            {submitted && showCorrect && (
                              <FiCheck className="flex-shrink-0 text-green-400 text-sm" />
                            )}
                            {submitted && showWrong && (
                              <FiX className="flex-shrink-0 text-red-400 text-sm" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            {!submitted ? (
              <div className="flex items-center gap-3 pt-4">
                <button 
                  type="submit" 
                  className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-medium px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 text-sm"
                >
                  <FiCheck className="text-sm" />
                  Submit Quiz
                </button>
                <button 
                  type="button" 
                  className="flex items-center gap-2 px-4 py-3 text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-300 border border-white/10 hover:border-red-400/30 text-sm"
                  onClick={() => { setShowQuiz(false); setMcqs([]); setAnswers({}); }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-red-900/20 to-blue-900/20 backdrop-blur-sm border border-white/10 text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-red-400 to-blue-400 bg-clip-text text-transparent mb-3">
                  {mcqs.filter((m) => {
                    const correctVal = normalizeCorrect(m);
                    return answers[m.id] === correctVal;
                  }).length} / {mcqs.length}
                </div>
                <div className="text-lg font-semibold text-white mb-3">Quiz Completed!</div>
                <div className="text-gray-400 text-sm mb-4">
                  {mcqs.filter((m) => {
                    const correctVal = normalizeCorrect(m);
                    return answers[m.id] === correctVal;
                  }).length >= mcqs.length * 0.8 ? "Outstanding! 🎉" :
                   mcqs.filter((m) => {
                    const correctVal = normalizeCorrect(m);
                    return answers[m.id] === correctVal;
                  }).length >= mcqs.length * 0.6 ? "Great job! 👍" :
                   "Keep practicing! 💪"}
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button 
                    className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-500 hover:to-blue-500 text-white font-medium px-5 py-2 rounded-xl transition-all duration-300 transform hover:scale-105 text-sm"
                    onClick={handleRetry}
                  >
                    <FiRefreshCw className="text-sm" />
                    Try Again
                  </button>
                  <button 
                    className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-300 border border-white/10 hover:border-red-400/30 text-sm"
                    onClick={() => { setShowQuiz(false); setMcqs([]); setAnswers({}); setSubmitted(false); }}
                  >
                    New Quiz
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Add floating animation to CSS */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
}