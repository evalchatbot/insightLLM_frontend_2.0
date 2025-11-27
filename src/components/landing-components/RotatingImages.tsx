"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const slides = [
    { src: "/assets/hero-slide-1.png", label: "Candidate's Answer" },
    { src: "/assets/hero-slide-2.png", label: "Evaluation and Feedback" },
    { src: "/assets/hero-slide-3.png", label: "Ideal Outline" }
];

const RotatingImages = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const getPosition = (index: number) => {
        // Calculate position relative to current index
        // 0 = Center (Active)
        // 1 = Right
        // 2 = Left (or -1)

        const diff = (index - currentIndex + slides.length) % slides.length;

        if (diff === 0) return 'center';
        if (diff === 1) return 'right';
        return 'left';
    };

    return (
        <div className="relative w-full h-[550px] flex items-center justify-center perspective-1000">
            <div className="relative w-full max-w-[800px] h-[500px] flex items-center justify-center">
                <AnimatePresence mode="popLayout">
                    {slides.map((slide, index) => {
                        const position = getPosition(index);

                        let animateProps = {};
                        if (position === 'center') {
                            animateProps = {
                                x: 0,
                                scale: 1,
                                zIndex: 30,
                                opacity: 1,
                                filter: "blur(0px)",
                                rotateY: 0
                            };
                        } else if (position === 'right') {
                            animateProps = {
                                x: 180, // Move to right
                                scale: 0.8,
                                zIndex: 10,
                                opacity: 0.6,
                                filter: "blur(0px)",
                                rotateY: -15
                            };
                        } else { // left
                            animateProps = {
                                x: -180, // Move to left
                                scale: 0.8,
                                zIndex: 10,
                                opacity: 0.6,
                                filter: "blur(0px)",
                                rotateY: 15
                            };
                        }

                        return (
                            <motion.div
                                key={index}
                                initial={false}
                                animate={animateProps}
                                transition={{
                                    duration: 1.5,
                                    ease: [0.32, 0.72, 0, 1],
                                }}
                                className="absolute flex flex-col items-center gap-6"
                                style={{
                                    width: '300px',
                                    // height: '400px' // Removed fixed height to allow label to flow naturally
                                }}
                            >
                                <div className="relative w-[300px] h-[400px] rounded-xl shadow-2xl overflow-hidden border-[4px] border-white dark:border-zinc-800 bg-white dark:bg-zinc-900">
                                    <Image
                                        src={slide.src}
                                        alt={slide.label}
                                        fill
                                        className="object-cover"
                                        priority={index === 0}
                                        unoptimized
                                    />
                                </div>
                                <div className="bg-zinc-900 text-white px-6 py-2 rounded-full font-semibold text-sm shadow-lg border border-zinc-800">
                                    {slide.label}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default RotatingImages;
