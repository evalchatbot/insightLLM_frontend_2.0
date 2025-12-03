"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";

export default function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] w-full gap-6">
            <div className="relative w-16 h-16">
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute inset-0 bg-red-600 dark:bg-red-500 rounded-full blur-xl opacity-20"
                />
                <div className="relative z-10 w-full h-full">
                    <Image
                        src="/assets/Rubrik logo.svg"
                        alt="Loading..."
                        fill
                        className="object-contain"
                    />
                </div>
            </div>

            <div className="flex flex-col items-center gap-2">
                <h3 className="text-lg font-bold text-red-700 dark:text-red-500 tracking-tight">
                    rubrik.ai
                </h3>
                <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            animate={{
                                y: ["0%", "-50%", "0%"],
                            }}
                            transition={{
                                duration: 0.6,
                                repeat: Infinity,
                                delay: i * 0.1,
                                ease: "easeInOut",
                            }}
                            className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-500"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
