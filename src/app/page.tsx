"use client";

import React, { useState, useEffect } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Check, Zap, Brain, Users, FileText, CheckCircle2, MessageSquare } from "lucide-react";
import RotatingImages from "@/components/landing-components/RotatingImages";
import FAQ from "@/components/landing-components/FAQ";
import ProAccessModal from "@/components/header-components/pro-access-modal";
import Footer from "@/components/Footer";

export default function LandingPage() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [showProModal, setShowProModal] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [showAuthNotice, setShowAuthNotice] = useState(false);

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
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground leading-[1.1] uppercase">
                            EVALUATION MATTERS! <br />
                            <span className="font-serif italic font-light text-zinc-600 dark:text-zinc-400 capitalize tracking-normal normal-case block mt-1 text-3xl md:text-5xl">
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
                                    <Check className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                                    <span className="text-base md:text-lg text-zinc-700 dark:text-zinc-300">{item}</span>
                                </motion.div>
                            ))}
                        </div>

                        <div className="pt-6">
                            {!user ? (
                                <SignInButton mode="modal">
                                    <button className={`px-8 py-3 rounded-full bg-[#B91C1C] text-white text-lg font-bold hover:bg-[#991b1b] transition-all hover:scale-105 shadow-lg shadow-red-900/20 ${showAuthNotice ? 'ring-2 ring-blue-500 ring-offset-2 animate-pulse' : ''}`}>
                                        Sign Up Now
                                    </button>
                                </SignInButton>
                            ) : (
                                <button
                                    disabled
                                    className="px-8 py-3 rounded-full bg-green-600 text-white text-lg font-bold cursor-default shadow-lg shadow-green-900/20 flex items-center gap-2 mx-auto lg:mx-0"
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
                        <h2 className="text-3xl md:text-4xl font-bold text-[#2E5C55] dark:text-[#4ade80]">EVALUATION BUILT TO PERFECTION</h2>
                        <p className="text-xl text-zinc-600 dark:text-zinc-400 italic font-serif">
                            More than a mentor, the first Self-learning platform for competitive exams.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Card 1 */}
                        <motion.div
                            {...fadeInUp}
                            transition={{ delay: 0.1 }}
                            className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center mb-6">
                                <FileText className="w-6 h-6 text-[#2E5C55] dark:text-[#4ade80]" />
                            </div>
                            <h3 className="text-lg font-bold mb-3 text-foreground">AI-Powered Evaluations</h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                Get instant, comprehensive feedback on answers of all subjects with our advanced AI evaluation system.
                            </p>
                        </motion.div>

                        {/* Card 2 */}
                        <motion.div
                            {...fadeInUp}
                            transition={{ delay: 0.2 }}
                            className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center mb-6">
                                <Brain className="w-6 h-6 text-[#2E5C55] dark:text-[#4ade80]" />
                            </div>
                            <h3 className="text-lg font-bold mb-3 text-foreground">Smart MCQ Practice</h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                Access thousands of multiple-choice questions tailored to Competitive exam patterns.
                            </p>
                        </motion.div>

                        {/* Card 3 - Chatbot (Coming Soon) */}
                        <motion.div
                            {...fadeInUp}
                            transition={{ delay: 0.3 }}
                            className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group"
                        >
                            <div className="absolute top-3 right-3 bg-[#B91C1C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                                Coming Soon
                            </div>
                            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <MessageSquare className="w-6 h-6 text-[#2E5C55] dark:text-[#4ade80]" />
                            </div>
                            <h3 className="text-lg font-bold mb-3 text-foreground">AI Chatbot Mentor</h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                24/7 instant guidance and doubt clearance from our specialized AI mentor trained on exam curriculum.
                            </p>
                        </motion.div>

                        {/* Card 4 - Expert Mentor (Coming Soon) */}
                        <motion.div
                            {...fadeInUp}
                            transition={{ delay: 0.4 }}
                            className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group"
                        >
                            <div className="absolute top-3 right-3 bg-[#B91C1C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
                                Coming Soon
                            </div>
                            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Users className="w-6 h-6 text-[#2E5C55] dark:text-[#4ade80]" />
                            </div>
                            <h3 className="text-lg font-bold mb-3 text-foreground">Expert Mentor Meetings</h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                Schedule one-on-one sessions with experienced CSS mentors for personalized guidance.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="py-24 px-6 bg-background" id="pricing">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        {...fadeInUp}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground">CHOOSE YOUR PLAN</h2>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Free Plan */}
                        <motion.div
                            {...fadeInUp}
                            transition={{ delay: 0.2 }}
                            className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 flex flex-col bg-card text-card-foreground hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                        >
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold mb-2">Free</h3>
                                <div className="text-4xl font-bold mb-2">Rs.0</div>
                                <p className="text-muted-foreground">Perfect for getting started with CSS preparation</p>
                            </div>
                            <ul className="space-y-4 mb-8 flex-1">
                                {[
                                    "5 Essay / Subject's question evaluations",
                                    "100 MCQ questions (any subject)",
                                    "Basic progress tracking",
                                    "Community forum access"
                                ].map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3 text-muted-foreground">
                                        <Check className="w-5 h-5 text-zinc-400 shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => !user ? document.querySelector<HTMLElement>('.cl-signInButton')?.click() : router.push('/app')}
                                className="w-full py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 text-foreground font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                                Get Started Free
                            </button>
                        </motion.div>

                        {/* Pro Plan */}
                        <motion.div
                            {...fadeInUp}
                            transition={{ delay: 0.4 }}
                            className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 flex flex-col relative shadow-xl bg-card text-card-foreground scale-105 z-10"
                        >
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#2E5C55] text-white px-4 py-1 rounded-full text-sm font-bold">
                                MOST POPULAR
                            </div>
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                                <div className="text-4xl font-bold mb-2">
                                    Rs.3,999<span className="text-lg text-muted-foreground font-normal">/month</span>
                                </div>
                                <p className="text-muted-foreground">Ultimate preparation package for top performers</p>
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
                                    <li key={i} className="flex items-start gap-3 text-muted-foreground">
                                        <Check className="w-5 h-5 text-[#2E5C55] dark:text-[#4ade80] shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={handleStartPro}
                                className="w-full py-3 rounded-lg bg-[#1F2937] dark:bg-white text-white dark:text-black font-bold hover:bg-black dark:hover:bg-zinc-200 transition-colors"
                            >
                                Start Pro Plan
                            </button>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-24 px-6 relative z-10">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        className="text-center mb-16"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-3xl md:text-5xl font-black text-foreground mb-6 uppercase tracking-tight">
                            Frequently Asked Questions
                        </h2>
                        <p className="text-xl text-zinc-600 dark:text-zinc-400">
                            Everything you need to know about InsightLLM
                        </p>
                    </motion.div>

                    <div className="space-y-4">
                        {[
                            { q: "How accurate is the AI evaluation?", a: "Our AI is trained on thousands of CSS/PMS papers and rubrics, providing highly accurate, consistent, and actionable feedback that aligns with examiner standards." },
                            { q: "Can I upload handwritten essays?", a: "Yes! Our advanced OCR technology can read and analyze handwritten documents with high precision." },
                            { q: "Is my data secure?", a: "Absolutely. We use enterprise-grade encryption and never share your personal data or uploaded documents with third parties." },
                            { q: "Can I cancel my subscription?", a: "Yes, you can cancel your Pro subscription at any time. You'll keep access until the end of your billing period." }
                        ].map((faq, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="group"
                            >
                                <div className="p-6 rounded-2xl bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/30 transition-all">
                                    <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {faq.q}
                                    </h3>
                                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                        {faq.a}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
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
        </div>
    );
}
