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
        <footer className={`py-6 border-t ${isDark ? 'border-white/10' : 'border-black/5'} bg-zinc-50 dark:bg-black/40`}>
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Brand */}
                <div className="flex items-center gap-3">
                    <div className="relative w-6 h-6">
                        <Image
                            src="/assets/gemini-logo.svg"
                            alt="InsightLLM Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-emerald-700 dark:text-emerald-400">
                        rubrik.ai
                    </span>
                </div>

                {/* Links */}
                <div className="flex items-center gap-6 text-sm font-medium">
                    <Link href="#" className={`transition-colors ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-black'}`}>
                        Privacy
                    </Link>
                    <Link href="#" className={`transition-colors ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-black'}`}>
                        Terms
                    </Link>
                    <Link href="#" className={`transition-colors ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-black'}`}>
                        Contact
                    </Link>
                </div>

                {/* Copyright */}
                <p className={`text-sm ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    © 2025 RUBRIK. All rights reserved.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
