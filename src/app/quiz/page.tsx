"use client";
import React, { useEffect, useState } from "react";
import { FiCheck, FiX, FiHome, FiRefreshCw, FiStar, FiBook } from 'react-icons/fi';

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
    <div className="min-h-screen bg-background text-white relative overflow-hidden">
      {/* Professional Background - Consistent with landing page */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
      
      {/* Subtle grid pattern */}
      <div className="fixed inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
        backgroundSize: '80px 80px'
      }}></div>
      
      {/* Subtle accent gradient orbs */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-3xl"></div>
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-3xl"></div>
      
      <div className="relative max-w-4xl mx-auto p-4 md:p-6 z-10">
        {/* Professional Header */}
        <div className="flex items-center justify-between mb-6 md:mb-8 p-5 md:p-6 bg-slate-800/40 backdrop-blur-md rounded-2xl border border-slate-700/50 shadow-xl">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
              Practice Quiz
            </h1>
            <p className="text-slate-400 text-sm">Test and enhance your knowledge</p>
          </div>
          <a 
            href="/app" 
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700/70 rounded-xl transition-all duration-300 border border-slate-600/50 hover:border-purple-500/50 text-sm font-medium text-white"
          >
            <FiHome className="text-base" />
            <span>Home</span>
          </a>
        </div>

        {!showQuiz && (
          <div className="bg-slate-800/40 backdrop-blur-md p-6 md:p-8 rounded-2xl border border-slate-700/50 shadow-xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
                <FiBook className="text-purple-400 text-2xl" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Choose Your Genre</h2>
              <p className="text-slate-400 text-sm md:text-base">Select a category to begin your practice session</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block mb-3 text-sm font-medium text-slate-300">Genre</label>
                <select
                  className="w-full p-4 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white text-sm md:text-base focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 backdrop-blur-sm hover:border-slate-500/70"
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                >
                  <option value="" className="bg-slate-800">-- Select Genre --</option>
                  {genres.map((g) => (
                    <option key={g.id} value={g.id} className="bg-slate-800">
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                {error && (
                  <div className="text-red-300 bg-red-900/30 border border-red-500/30 px-4 py-3 rounded-xl text-sm backdrop-blur-sm">
                    {error}
                  </div>
                )}
                
                <button
                  className="group relative inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm md:text-base shadow-lg hover:shadow-purple-500/20"
                  disabled={!selectedGenre || loading}
                  onClick={fetchMcqs}
                >
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <>
                      <span>Start Quiz</span>
                      <FiStar className="text-base" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {showQuiz && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Professional Quiz Header */}
            <div className="bg-slate-800/40 backdrop-blur-md p-5 md:p-6 rounded-2xl border border-slate-700/50 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                    {genres.find(g => g.id === selectedGenre)?.name || 'Selected Genre'}
                  </h2>
                  <p className="text-slate-400 text-sm">{mcqs.length} questions</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm text-slate-300 mb-2 font-medium">
                      {Object.keys(answers).length} / {mcqs.length} answered
                    </div>
                    <div className="w-40 md:w-48 bg-slate-700/50 rounded-full h-2.5 border border-slate-600/50">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500 ease-out shadow-sm"
                        style={{ width: `${Math.round(((Object.keys(answers).length||0)/mcqs.length)*100)||0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {usedRepeats && (
              <div className="p-4 rounded-xl bg-amber-900/20 border border-amber-600/30 text-amber-200 text-sm backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                  <span>Some questions were repeated to create a full quiz.</span>
                </div>
              </div>
            )}

            {/* Professional Questions */}
            <div className="space-y-5">
              {mcqs.map((mcq, idx) => {
                const user = answers[mcq.id];
                const correctValue = normalizeCorrect(mcq);
                
                return (
                  <div 
                    key={mcq.id} 
                    className="group p-5 md:p-6 rounded-2xl bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 hover:border-purple-500/30 transition-all duration-300 shadow-lg"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {idx + 1}
                        </div>
                        <div className="font-semibold text-white text-base md:text-lg leading-relaxed pt-0.5">
                          {mcq.question}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3 ml-12">
                      {(["option_a","option_b","option_c","option_d"] as const).map((opt) => {
                        const value = mcq[opt];
                        const isSelected = user === value;
                        const isCorrectOption = value === correctValue;
                        const showCorrect = submitted && isCorrectOption;
                        const showWrong = submitted && isSelected && value !== correctValue;

                        let classes = "relative p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 text-white text-sm md:text-base cursor-pointer ";
                        
                        if (submitted) {
                          if (showCorrect) {
                            classes += "bg-green-900/30 border-green-500/50 scale-[1.01] shadow-md";
                          } else if (showWrong) {
                            classes += "bg-red-900/30 border-red-500/50 scale-[1.01] shadow-md";
                          } else {
                            classes += "bg-slate-700/30 border-slate-600/30 opacity-50";
                          }
                        } else {
                          classes += "bg-slate-700/40 border-slate-600/50 hover:border-purple-500/50 hover:bg-slate-700/60";
                          if (isSelected) {
                            classes += " border-purple-400 bg-purple-900/20 scale-[1.01] shadow-sm";
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
                            <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                              isSelected ? 'border-purple-400 bg-purple-500' : 'border-slate-500'
                            } ${submitted && showCorrect ? 'border-green-400 bg-green-500' : ''} ${
                              submitted && showWrong ? 'border-red-400 bg-red-500' : ''
                            }`}>
                              {(isSelected && !submitted) && <div className="w-2 h-2 bg-white rounded-full"></div>}
                              {submitted && showCorrect && <FiCheck className="text-white text-xs" />}
                              {submitted && showWrong && <FiX className="text-white text-xs" />}
                            </div>
                            <div className="flex-1 leading-relaxed">{value}</div>
                            {submitted && showCorrect && (
                              <FiCheck className="flex-shrink-0 text-green-400 text-lg" />
                            )}
                            {submitted && showWrong && (
                              <FiX className="flex-shrink-0 text-red-400 text-lg" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Professional Action Buttons */}
            {!submitted ? (
              <div className="flex items-center gap-4 pt-2">
                <button 
                  type="submit" 
                  className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] text-sm md:text-base shadow-lg hover:shadow-green-500/20"
                >
                  <FiCheck className="text-base" />
                  Submit Quiz
                </button>
                <button 
                  type="button" 
                  className="flex items-center gap-2 px-6 py-4 text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700/70 rounded-xl transition-all duration-300 border border-slate-600/50 hover:border-slate-500/70 text-sm md:text-base font-medium"
                  onClick={() => { setShowQuiz(false); setMcqs([]); setAnswers({}); }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mt-6 p-8 rounded-2xl bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 text-center shadow-xl">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent mb-4">
                  {mcqs.filter((m) => {
                    const correctVal = normalizeCorrect(m);
                    return answers[m.id] === correctVal;
                  }).length} / {mcqs.length}
                </div>
                <div className="text-xl md:text-2xl font-bold text-white mb-3">Quiz Completed!</div>
                <div className="text-slate-400 text-base mb-6">
                  {mcqs.filter((m) => {
                    const correctVal = normalizeCorrect(m);
                    return answers[m.id] === correctVal;
                  }).length >= mcqs.length * 0.8 ? "Outstanding performance!" :
                   mcqs.filter((m) => {
                    const correctVal = normalizeCorrect(m);
                    return answers[m.id] === correctVal;
                  }).length >= mcqs.length * 0.6 ? "Great job! Keep it up!" :
                   "Keep practicing to improve!"}
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button 
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-[1.02] text-sm md:text-base shadow-lg hover:shadow-purple-500/20"
                    onClick={handleRetry}
                  >
                    <FiRefreshCw className="text-base" />
                    Try Again
                  </button>
                  <button 
                    className="flex items-center gap-2 px-6 py-3 text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700/70 rounded-xl transition-all duration-300 border border-slate-600/50 hover:border-slate-500/70 text-sm md:text-base font-medium"
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

    </div>
  );
}