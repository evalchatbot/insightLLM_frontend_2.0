"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { FaTwitter, FaLinkedin, FaGithub, FaDiscord } from "react-icons/fa";

const Footer = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <footer className="py-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 relative">
                {/* Brand */}
                <div className="flex items-center gap-3">
                    <div className="relative w-6 h-6">
                        <Image
                            src="/assets/Rubrik logo.svg"
                            alt="InsightLLM Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-red-600 dark:text-red-400">
                        rubrik.ai
                    </span>
                </div>


                {/* Copyright */}
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    © 2025 RUBRIK. All rights reserved.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
