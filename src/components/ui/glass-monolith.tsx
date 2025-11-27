"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { MessageSquare, FileText, PenTool, Brain, Scan, CheckCircle2, Activity, Sparkles, ChevronRight } from "lucide-react";
import { useTheme } from "next-themes";

export const GlassMonolith = () => {
    const [activeFeature, setActiveFeature] = useState(0);
    const features = ["chat", "ocr", "quiz"];
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Mouse interaction for 3D tilt
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
    const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });
    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    // Auto-cycle features
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveFeature((prev) => (prev + 1) % features.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full flex justify-center items-center py-20 perspective-1000">
            <motion.div
                className="relative w-[380px] h-[550px] transform-style-3d cursor-pointer"
                style={{ rotateX, rotateY }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 1 }}
            >
                {/* The Monolith Structure */}
                <div className={`absolute inset-0 rounded-[40px] backdrop-blur-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden transform-style-3d group transition-colors duration-500 ${isDark
                        ? 'bg-gradient-to-br from-white/10 to-white/5 border-white/20'
                        : 'bg-gradient-to-br from-white/80 to-white/40 border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.1)]'
                    }`}>

                    {/* Internal Lighting/Reflection */}
                    <div className={`absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-50`}></div>
                    <div className="absolute -inset-[100%] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_50%)] opacity-50 blur-3xl pointer-events-none"></div>

                    {/* Content Container */}
                    <div className="relative h-full w-full p-8 flex flex-col justify-between z-10">

                        {/* Header: Dynamic Island Style */}
                        <div className="w-full flex justify-center mb-8">
                            <motion.div
                                layoutId="dynamic-island"
                                className={`h-8 rounded-full flex items-center px-3 gap-2 border shadow-inner backdrop-blur-md ${isDark ? 'bg-black/40 border-white/10' : 'bg-white/60 border-black/5'
                                    }`}
                            >
                                <div className={`w-2 h-2 rounded-full ${activeFeature === 0 ? 'bg-cyan-400 shadow-[0_0_10px_cyan]' : (isDark ? 'bg-white/20' : 'bg-black/10')}`}></div>
                                <div className={`w-2 h-2 rounded-full ${activeFeature === 1 ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : (isDark ? 'bg-white/20' : 'bg-black/10')}`}></div>
                                <div className={`w-2 h-2 rounded-full ${activeFeature === 2 ? 'bg-rose-400 shadow-[0_0_10px_#fb7185]' : (isDark ? 'bg-white/20' : 'bg-black/10')}`}></div>
                            </motion.div>
                        </div>

                        {/* Main Feature Display */}
                        <div className="flex-1 relative">
                            <AnimatePresence mode="wait">
                                {activeFeature === 0 && <ChatFeature key="chat" isDark={isDark} />}
                                {activeFeature === 1 && <OCRFeature key="ocr" isDark={isDark} />}
                                {activeFeature === 2 && <QuizFeature key="quiz" isDark={isDark} />}
                            </AnimatePresence>
                        </div>

                        {/* Footer: Feature Label */}
                        <div className="mt-8">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeFeature}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="text-center"
                                >
                                    <h3 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-800'}`}>
                                        {activeFeature === 0 && "AI Tutor"}
                                        {activeFeature === 1 && "Smart OCR"}
                                        {activeFeature === 2 && "Adaptive Quiz"}
                                    </h3>
                                    <p className={`text-sm font-medium mt-1 ${isDark ? 'text-white/50' : 'text-zinc-500'}`}>
                                        {activeFeature === 0 && "Instant answers for complex topics."}
                                        {activeFeature === 1 && "Digitize handwriting in seconds."}
                                        {activeFeature === 2 && "Master your syllabus daily."}
                                    </p>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                    </div>
                </div>

                {/* Depth Layers (Simulating Thickness) */}
                <div className={`absolute inset-0 rounded-[40px] border-2 translate-z-[-10px] opacity-50 ${isDark ? 'border-white/5' : 'border-black/5'}`}></div>
                <div className={`absolute inset-0 rounded-[40px] border-2 translate-z-[-20px] opacity-30 ${isDark ? 'border-white/5' : 'border-black/5'}`}></div>

                {/* Ambient Glow */}
                <div className={`absolute inset-0 rounded-[40px] blur-[60px] -z-10 transition-colors duration-1000 ${activeFeature === 0 ? (isDark ? 'bg-cyan-500/30' : 'bg-cyan-400/40') :
                        activeFeature === 1 ? (isDark ? 'bg-emerald-500/30' : 'bg-emerald-400/40') :
                            (isDark ? 'bg-rose-500/30' : 'bg-rose-400/40')
                    }`}></div>

            </motion.div>
        </div>
    );
};

// --- Feature Sub-Components ---

const ChatFeature = ({ isDark }: { isDark: boolean }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.1 }}
        className="h-full flex flex-col justify-center space-y-4"
    >
        <div className="flex gap-3 items-start">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${isDark ? 'bg-white/10 text-white/70' : 'bg-black/5 text-black/60'}`}>U</div>
            <div className={`p-3 rounded-2xl rounded-tl-none text-sm backdrop-blur-md border ${isDark
                    ? 'bg-white/10 text-white/90 border-white/5'
                    : 'bg-white/60 text-zinc-800 border-black/5 shadow-sm'
                }`}>
                Explain the concept of Federalism.
            </div>
        </div>
        <div className="flex gap-3 items-start flex-row-reverse">
            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_15px_cyan]">AI</div>
            <div className={`p-3 rounded-2xl rounded-tr-none text-sm backdrop-blur-md border ${isDark
                    ? 'bg-cyan-500/20 text-cyan-100 border-cyan-500/30'
                    : 'bg-cyan-500/10 text-cyan-900 border-cyan-500/20 shadow-sm'
                }`}>
                <Typewriter text="Federalism is a mixed or compound mode of government that combines a general government with regional governments..." />
            </div>
        </div>
    </motion.div>
);

const OCRFeature = ({ isDark }: { isDark: boolean }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-full flex flex-col items-center justify-center relative"
    >
        <div className={`w-48 h-64 border-2 border-dashed rounded-lg relative overflow-hidden flex items-center justify-center ${isDark ? 'border-white/20 bg-white/5' : 'border-black/10 bg-black/5'
            }`}>
            <FileText className={`w-16 h-16 ${isDark ? 'text-white/20' : 'text-black/20'}`} />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent h-[10%] w-full animate-[scan_2s_linear_infinite] shadow-[0_0_20px_#34d399]"></div>
        </div>
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={`mt-6 flex items-center gap-2 font-bold px-4 py-2 rounded-full border backdrop-blur-md ${isDark
                    ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30'
                    : 'bg-emerald-100/80 text-emerald-700 border-emerald-500/20'
                }`}
        >
            <CheckCircle2 className="w-4 h-4" />
            <span>Text Extracted</span>
        </motion.div>
    </motion.div>
);

const QuizFeature = ({ isDark }: { isDark: boolean }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="h-full flex flex-col justify-center space-y-4"
    >
        <div className="text-center mb-4">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Question 1</span>
            <h4 className={`text-lg font-medium mt-2 ${isDark ? 'text-white' : 'text-zinc-800'}`}>What is the supreme law of the USA?</h4>
        </div>
        <div className="space-y-2">
            {["Declaration of Independence", "The Constitution", "Bill of Rights"].map((opt, i) => (
                <motion.div
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={`p-3 rounded-xl border text-sm font-medium flex justify-between items-center ${i === 1
                            ? (isDark
                                ? 'bg-rose-500/20 border-rose-500/50 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                                : 'bg-rose-100 border-rose-300 text-rose-800 shadow-sm')
                            : (isDark
                                ? 'bg-white/5 border-white/10 text-white/60'
                                : 'bg-white/60 border-black/5 text-zinc-600')
                        }`}
                >
                    {opt}
                    {i === 1 && <CheckCircle2 className="w-4 h-4 text-rose-400" />}
                </motion.div>
            ))}
        </div>
    </motion.div>
);

// Typewriter Effect Helper
const Typewriter = ({ text }: { text: string }) => {
    const [displayedText, setDisplayedText] = useState("");

    useEffect(() => {
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplayedText((prev) => prev + text.charAt(i));
                i++;
            } else {
                clearInterval(timer);
            }
        }, 30);
        return () => clearInterval(timer);
    }, [text]);

    return <span>{displayedText}</span>;
};
