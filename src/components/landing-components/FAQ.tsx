"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
    {
        question: "How quickly can I get feedback on my papers?",
        answer: "Our AI-powered evaluation engine provides instant feedback within seconds of uploading your answer."
    },
    {
        question: "How accurate is the AI scoring system?",
        answer: "Our system is trained on thousands of high-scoring papers and follows strict rubric guidelines to ensure high accuracy."
    },
    {
        question: "Can I track my progress over time?",
        answer: "Yes, our dashboard provides detailed analytics and progress tracking to help you visualize your improvement."
    },
    {
        question: "What kind of suggestions will I receive?",
        answer: "You will receive feedback on structure, content quality, grammar, and relevance to the question."
    },
    {
        question: "When can I use the evaluation service?",
        answer: "The service is available 24/7, so you can practice and get evaluated whenever it suits your schedule."
    },
    {
        question: "Is this aligned with actual CSS exam requirements?",
        answer: "Absolutely. Our evaluation criteria are specifically designed to match the standards and requirements of CSS competitive exams."
    }
];

const FAQ = () => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    return (
        <div className="w-full max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
                <div
                    key={index}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                    <button
                        onClick={() => setActiveIndex(activeIndex === index ? null : index)}
                        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                        <span className="font-medium text-gray-900">{faq.question}</span>
                        <ChevronDown
                            className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${activeIndex === index ? "rotate-180" : ""
                                }`}
                        />
                    </button>
                    <AnimatePresence>
                        {activeIndex === index && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="px-6 pb-4 text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                                    {faq.answer}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>
    );
};

export default FAQ;
