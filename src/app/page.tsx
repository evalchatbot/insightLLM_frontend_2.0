"use client";

import React, { useState, useEffect } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Check, Zap, Brain, Users, FileText, CheckCircle2, MessageSquare, Mail, Phone, X, ChevronDown } from "lucide-react";
import RotatingImages from "@/components/landing-components/RotatingImages";
import FAQ from "@/components/landing-components/FAQ";
import ProAccessModal from "@/components/header-components/pro-access-modal";
import Footer from "@/components/Footer";

export default function LandingPage() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [showProModal, setShowProModal] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
    const [hoverFeature, setHoverFeature] = useState<number | null>(null);
    const [hoverPlan, setHoverPlan] = useState<number | null>(null);
    const [mounted, setMounted] = useState(false);
    const [showAuthNotice, setShowAuthNotice] = useState(false);
    const [isPro, setIsPro] = useState(false);

    useEffect(() => {
        const checkProStatus = async () => {
            if (!user) return;
            try {
                const res = await fetch('/api/pro/status', { method: 'GET', cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.isPro) {
                        setIsPro(true);
                    }
                }
            } catch (error) {
                console.error("Failed to check pro status", error);
            }
        };

        if (user) {
            checkProStatus();
        }

        // Listen for pro status updates
        const handleRefresh = () => checkProStatus();
        window.addEventListener('refreshProStatus', handleRefresh);
        return () => window.removeEventListener('refreshProStatus', handleRefresh);
    }, [user]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        const auth = searchParams?.get("auth");
        if (auth === "required") {
            setShowAuthNotice(true);
            const t = setTimeout(() => setShowAuthNotice(false), 3500);
            return () => clearTimeout(t);
        }
    }, [mounted, searchParams]);

    if (!mounted) return null;

    const handleStartPro = () => {
        if (!user) {
            alert("Please log in to subscribe.");
            return;
        }
        setShowProModal(true);
    };

    const fadeInUp = {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.6 }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950 relative overflow-x-hidden">
            {/* Auth required toast */}
            {showAuthNotice && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="fixed top-20 right-6 z-[80] pointer-events-none"
                >
                    <div className="pointer-events-auto rounded-xl px-4 py-3 shadow-2xl border border-white/20 bg-white/90 dark:bg-black/90 backdrop-blur-2xl">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            <p className="text-sm font-medium text-foreground">Please sign in to continue</p>
                        </div>
                    </div>
                </motion.div>
            )}
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 min-h-screen flex flex-col justify-center relative overflow-hidden">
                <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="space-y-6 text-center lg:text-left pt-10 lg:pt-0"
                    >
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 dark:text-white leading-[1.1] uppercase">
                            EVALUATION MATTERS! <br />
                            <span className="font-serif italic font-light text-zinc-600 dark:text-zinc-300 capitalize tracking-normal normal-case block mt-1 text-3xl md:text-5xl">
                                Craft your answers to perfection
                            </span>
                        </h1>

                        <div className="space-y-3 pt-2">
                            {[
                                "AI-based evaluation engine for Competitive Exams",
                                "Get instant, detailed feedback on your performance",
                                "Practice with thousands of MCQs tailored to exam patterns",
                                "Connect with expert mentors to achieve your goals"
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + (i * 0.1) }}
                                    className="flex items-center gap-3 justify-center lg:justify-start"
                                >
                                    <Check className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    <span className="text-base md:text-lg text-zinc-700 dark:text-zinc-300">{item}</span>
                                </motion.div>
                            ))}
                        </div>

                        <div className="pt-6">
                            {!user ? (
                                <SignInButton mode="modal">
                                    <button className={`px-8 py-3 rounded-full bg-red-600 text-white text-lg font-bold hover:bg-red-700 transition-all hover:scale-105 shadow-lg shadow-red-900/30 ${showAuthNotice ? 'ring-2 ring-blue-500 ring-offset-2 animate-pulse' : ''}`}>
                                        Sign Up Now
                                    </button>
                                </SignInButton>
                            ) : (
                                <button
                                    disabled
                                    className="px-8 py-3 rounded-full bg-red-600 text-white text-lg font-bold cursor-default shadow-lg shadow-red-900/30 flex items-center gap-2 mx-auto lg:mx-0"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    Welcome, {user.firstName || "User"}!
                                </button>
                            )}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="relative"
                    >
                        <RotatingImages />
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 px-6 bg-zinc-50 dark:bg-zinc-900/50">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        {...fadeInUp}
                        className="text-center mb-16 space-y-4"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white">EVALUATION BUILT TO PERFECTION</h2>
                        <p className="text-xl text-zinc-600 dark:text-zinc-300 italic font-serif">
                            More than a mentor, the first Self-learning platform for competitive exams.
                        </p>
                    </motion.div>

                    <div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                        onMouseLeave={() => setHoverFeature(null)}
                    >
                        {/* Card 1 */}
                        <motion.div
                            {...fadeInUp}
                            transition={{ delay: 0.1 }}
                            onClick={() => router.push('/app/ocr')}
                            onMouseEnter={() => setHoverFeature(0)}
                            className={`bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 transition-all duration-300 cursor-pointer hover:border-red-500 dark:hover:border-red-400
                                ${hoverFeature === 0 ? 'relative z-10 -translate-y-1 shadow-xl' : ''}
                                ${hoverFeature !== null && hoverFeature !== 0 ? 'blur-[2px] opacity-60' : ''}`}
                        >
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center mb-6">
                                <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold mb-3 text-zinc-900 dark:text-white">AI-Powered Evaluations</h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                                Get instant, comprehensive feedback on answers of all subjects with our advanced AI evaluation system.
                            </p>
                        </motion.div>

                        {/* Card 2 */}
                        <motion.div
                            {...fadeInUp}
                            transition={{ delay: 0.2 }}
                            onClick={() => router.push('/app/quiz')}
                            onMouseEnter={() => setHoverFeature(1)}
                            className={`bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 transition-all duration-300 cursor-pointer hover:border-red-500 dark:hover:border-red-400
                                ${hoverFeature === 1 ? 'relative z-10 -translate-y-1 shadow-xl' : ''}
                                ${hoverFeature !== null && hoverFeature !== 1 ? 'blur-[2px] opacity-60' : ''}`}
                        >
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center mb-6">
                                <Brain className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold mb-3 text-zinc-900 dark:text-white">Smart MCQ Practice</h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                                Access thousands of multiple-choice questions tailored to Competitive exam patterns.
                            </p>
                        </motion.div>

                        {/* Card 3 - Chatbot (Coming Soon) */}
                        <motion.div
                            {...fadeInUp}
                            transition={{ delay: 0.3 }}
                            onMouseEnter={() => setHoverFeature(2)}
                            className={`bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 transition-all duration-300 relative overflow-hidden group cursor-not-allowed opacity-75
                                ${hoverFeature === 2 ? 'relative z-10' : ''}
                                ${hoverFeature !== null && hoverFeature !== 2 ? 'blur-[2px] opacity-60' : ''}`}
                        >
                            <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                                Coming Soon
                            </div>
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <MessageSquare className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold mb-3 text-zinc-900 dark:text-white">AI Chatbot Mentor</h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                                24/7 instant guidance and doubt clearance from our specialized AI mentor trained on exam curriculum.
                            </p>
                        </motion.div>

                        {/* Card 4 - Expert Mentor (Coming Soon) */}
                        <motion.div
                            {...fadeInUp}
                            transition={{ delay: 0.4 }}
                            onMouseEnter={() => setHoverFeature(3)}
                            className={`bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 transition-all duration-300 relative overflow-hidden group
                                ${hoverFeature === 3 ? 'relative z-10 -translate-y-1 shadow-xl' : ''}
                                ${hoverFeature !== null && hoverFeature !== 3 ? 'blur-[2px] opacity-60' : ''}`}
                        >
                            <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                                Coming Soon
                            </div>
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Users className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold mb-3 text-zinc-900 dark:text-white">Expert Mentor Meetings</h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                                Schedule one-on-one sessions with experienced CSS mentors for personalized guidance.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-24 px-6 bg-zinc-50 dark:bg-zinc-900/50" id="pricing">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        {...fadeInUp}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white">CHOOSE YOUR PLAN</h2>
                    </motion.div>

                    <div
                        className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
                        onMouseLeave={() => setHoverPlan(null)}
                    >
                        {/* Free Plan */}
                        <motion.div
                            {...fadeInUp}
                            transition={{ delay: 0.2 }}
                            onMouseEnter={() => setHoverPlan(0)}
                            className={`border border-zinc-200 dark:border-zinc-700 rounded-2xl p-8 flex flex-col bg-white dark:bg-zinc-900 transition-all
                                ${hoverPlan === 0 ? 'relative z-10 -translate-y-1 shadow-xl' : 'hover:border-zinc-400 dark:hover:border-zinc-600'}
                                ${hoverPlan !== null && hoverPlan !== 0 ? 'blur-[2px] opacity-60' : ''}`}
                        >
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Free</h3>
                                <div className="text-4xl font-bold mb-2 text-zinc-900 dark:text-white">Rs.0</div>
                                <p className="text-zinc-600 dark:text-zinc-300">Perfect for getting started with CSS preparation</p>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                {[
                                    "5 Essay / Subject's question evaluations",
                                    "100 MCQ questions (any subject)",
                                    "Basic progress tracking",
                                    "Community forum access"
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <Check className="w-5 h-5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                                        <span className="text-zinc-600 dark:text-zinc-300">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => !user && document.querySelector<HTMLElement>('.cl-signInButton')?.click()}
                                className="w-full py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                                Get Started Free
                            </button>
                        </motion.div>

                        {/* Pro Plan */}
                        <motion.div
                            {...fadeInUp}
                            transition={{ delay: 0.4 }}
                            onMouseEnter={() => setHoverPlan(1)}
                            className={`border border-zinc-200 dark:border-zinc-700 rounded-2xl p-8 flex flex-col relative bg-white dark:bg-zinc-900 z-10 transition-all
                                ${hoverPlan === 1 ? 'relative z-20 -translate-y-1 shadow-2xl scale-105' : 'shadow-xl scale-105'}
                                ${hoverPlan !== null && hoverPlan !== 1 ? 'blur-[2px] opacity-60' : ''}`}
                        >
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                                MOST POPULAR
                            </div>
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Pro</h3>
                                <div className="text-4xl font-bold mb-2 text-zinc-900 dark:text-white">
                                    Rs.9,999<span className="text-lg text-zinc-600 dark:text-zinc-300 font-normal">/month</span>
                                </div>
                                <p className="text-zinc-600 dark:text-zinc-300">Ultimate preparation package for top performers</p>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                {[
                                    "Unlimited Essay / Subject's question evaluations",
                                    "10,000+ MCQ questions (all subjects)",
                                    "Advanced analytics with AI insights",
                                    "Community forum access",
                                    "6 mentor meetings per month",
                                    "Personalized study plan & roadmap",
                                    "Full mock exam simulations",
                                    "Essay writing templates & guides",
                                    "Priority 24/7 support",
                                    "Exclusive webinars & masterclasses",
                                    "Performance comparison with toppers"
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <Check className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                                        <span className="text-zinc-600 dark:text-zinc-300">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={isPro ? undefined : handleStartPro}
                                disabled={isPro}
                                className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg relative overflow-hidden group ${isPro
                                    ? "bg-gradient-to-r from-[#7f1d1d] via-[#dc2626] to-[#7f1d1d] text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] cursor-default border border-red-500/50"
                                    : "bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 shadow-red-900/30"
                                    }`}
                                style={isPro ? { backgroundSize: "200% auto", animation: "shine 3s linear infinite" } : {}}
                            >
                                {isPro ? (
                                    <span className="flex items-center justify-center gap-2 relative z-10 text-white drop-shadow-md">
                                        <Zap className="w-5 h-5 fill-current animate-pulse text-white" />
                                        <span className="tracking-widest font-black text-sm uppercase">Rubrik Pro Active</span>
                                    </span>
                                ) : "Start Pro Plan"}

                                <style jsx>{`
                                    @keyframes shine {
                                        to {
                                            background-position: 200% center;
                                        }
                                    }
                                `}</style>
                            </button>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-24 px-6 bg-white dark:bg-zinc-950 relative z-10">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-3xl md:text-5xl font-black text-zinc-900 dark:text-white mb-6 uppercase tracking-tight">
                            Frequently Asked Questions
                        </h2>
                        <p className="text-xl text-zinc-600 dark:text-zinc-300">
                            Everything you need to know about InsightLLM
                        </p>
                    </motion.div>

                    <div className="space-y-4">
                        {[
                            {
                                q: "How quickly can I get feedback on my papers?",
                                a: "Our AI evaluation system provides instant feedback within seconds of submission. Once you upload your answer script, the system analyzes it against our comprehensive rubrics and generates detailed feedback including scores, strengths, weaknesses, and specific improvement suggestions. No waiting period required - you can evaluate multiple papers back-to-back and track your progress in real-time."
                            },
                            {
                                q: "How accurate is the AI scoring system?",
                                a: "Our AI has been trained on thousands of CSS/PMS papers evaluated by experienced examiners and achieves over 95% accuracy compared to human grading. The system uses advanced natural language processing and is continuously refined based on official rubrics and examiner feedback. It evaluates content quality, structure, relevance, critical analysis, and presentation - ensuring comprehensive and fair assessment that mirrors actual exam standards."
                            },
                            {
                                q: "Can I track my progress over time?",
                                a: "Yes! Our platform provides comprehensive analytics and progress tracking features. You can view your performance trends across different subjects, track improvement in specific areas, compare scores over time, and identify your strengths and weaknesses. The dashboard displays visual graphs, subject-wise breakdowns, and personalized insights to help you understand your learning journey and focus on areas that need improvement."
                            },
                            {
                                q: "What kind of suggestions will I receive?",
                                a: "You'll receive detailed, actionable feedback covering multiple dimensions of your answer. This includes content accuracy, argument structure, use of relevant examples, writing style, grammar and presentation, time management tips, and subject-specific improvements. Each suggestion is tailored to your specific answer and includes practical examples of how to enhance your response. The feedback is designed to help you understand not just what to improve, but exactly how to improve it."
                            },
                            {
                                q: "When can I use the evaluation service?",
                                a: "Our platform is available 24/7, allowing you to practice and get evaluated at your convenience. Whether you prefer studying early morning or late night, you can submit your answers anytime and receive instant feedback. There's no scheduling required for AI evaluations - simply upload your paper whenever you're ready. This flexibility ensures you can maintain your study routine without any constraints."
                            },
                            {
                                q: "Is this aligned with actual CSS exam requirements?",
                                a: "Absolutely! Our evaluation system is built specifically for CSS/PMS exams and follows the official syllabus, marking schemes, and examiner guidelines. The rubrics are developed in consultation with CSS experts and successful candidates. We regularly update our assessment criteria to reflect any changes in exam patterns or requirements, ensuring you're practicing exactly what will be expected in the actual examination."
                            }
                        ].map((faq, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="group"
                            >
                                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 overflow-hidden">
                                    <button
                                        onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                                        className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                                        aria-expanded={openFaqIndex === i}
                                    >
                                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                            {faq.q}
                                        </h3>
                                        <ChevronDown className={`w-5 h-5 text-zinc-500 dark:text-zinc-400 transition-transform ${openFaqIndex === i ? 'rotate-180 text-red-600 dark:text-red-400' : ''}`} />
                                    </button>
                                    {openFaqIndex === i && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            transition={{ duration: 0.25 }}
                                            className="px-6 pb-6 -mt-2"
                                        >
                                            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                                                {faq.a}
                                            </p>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Support Section */}
            <section className="py-16 px-6 bg-zinc-50 dark:bg-zinc-900/50">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="space-y-4"
                    >
                        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">Still have questions?</h3>
                        <button
                            onClick={() => setShowContactModal(true)}
                            className="text-red-600 dark:text-red-400 underline underline-offset-4 text-lg font-semibold hover:text-red-700 dark:hover:text-red-300 transition-colors"
                        >
                            Contact our support team
                        </button>
                    </motion.div>
                </div>
            </section>

            <Footer />

            {/* Pro Access Modal */}
            {showProModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                        <ProAccessModal onClose={() => setShowProModal(false)} />
                    </div>
                </div>
            )}

            {/* Contact Support Modal */}
            {showContactModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
                    >
                        <div className="p-8">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Contact Support Team</h2>
                                    <p className="text-zinc-600 dark:text-zinc-300">Get in touch with our support team. We're here to help!</p>
                                </div>
                                <button
                                    onClick={() => setShowContactModal(false)}
                                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Email */}
                                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white dark:bg-zinc-700 rounded-lg flex items-center justify-center shrink-0">
                                            <Mail className="w-6 h-6 text-red-600 dark:text-red-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">Email</h3>
                                            <a
                                                href="mailto:contact.rubrik@gmail.com"
                                                className="text-red-600 dark:text-red-400 hover:underline"
                                            >
                                                contact.rubrik@gmail.com
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* Phone */}
                                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white dark:bg-zinc-700 rounded-lg flex items-center justify-center shrink-0">
                                            <Phone className="w-6 h-6 text-red-600 dark:text-red-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">Phone</h3>
                                            <a
                                                href="tel:+923332296022"
                                                className="text-red-600 dark:text-red-400 hover:underline"
                                            >
                                                +92 333 2296022
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-zinc-500 dark:text-zinc-300 mt-6 text-center">
                                Available Monday - Friday, 9:00 AM - 6:00 PM (PST)
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
