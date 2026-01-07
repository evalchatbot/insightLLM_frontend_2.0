"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { FaMoon, FaSun } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { Home, FileText, Brain, MessageSquare, X } from "lucide-react";
import ProfileMenu from "./header-components/ProfileMenu";

const RightNavbar = () => {
    const { user, isLoaded } = useUser();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [bannerVisible, setBannerVisible] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Check if signup banner should be visible
    useEffect(() => {
        if (!mounted || !isLoaded) return;
        // Banner is visible if user is not logged in and banner hasn't been dismissed
        const isDismissed = localStorage.getItem('signup_issue_banner_dismissed') === 'true';
        setBannerVisible(!user && !isDismissed);
    }, [mounted, isLoaded, user]);

    if (!mounted) return null;

    const isDark = theme === 'dark';

    const navLinks = [
        { name: "Home", href: "/", icon: Home },
        { name: "Evaluations", href: "/app/ocr", icon: FileText },
        { name: "MCQs", href: "/quiz", icon: Brain },
        { name: "Chatbot", href: "/app", icon: MessageSquare, isActive: true },
    ];

    return (
        <>
            {/* Hamburger Button - Fixed on right side */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed right-6 z-[60] p-3 rounded-full bg-white/90 dark:bg-black/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-lg hover:scale-110 transition-all duration-300 ${bannerVisible ? "top-[76px]" : "top-6"}`}
                aria-label="Toggle Navigation"
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-zinc-600 dark:text-zinc-300" />
                ) : (
                    <div className="flex flex-col gap-1.5">
                        <span className="w-6 h-0.5 bg-zinc-600 dark:bg-zinc-300 rounded-full"></span>
                        <span className="w-6 h-0.5 bg-zinc-600 dark:bg-zinc-300 rounded-full"></span>
                        <span className="w-6 h-0.5 bg-zinc-600 dark:bg-zinc-300 rounded-full"></span>
                    </div>
                )}
            </button>

            {/* Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[55]"
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Right Sidebar */}
            <AnimatePresence>
                {isOpen && (
                    <motion.aside
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-80 bg-white/95 dark:bg-black/95 backdrop-blur-2xl border-l border-white/20 dark:border-white/10 shadow-2xl z-[56] flex flex-col"
                    >
                        {/* Logo Section */}
                        <div className="p-6 border-b border-white/10">
                            <Link href="/" className="flex items-center gap-3 group" onClick={() => setIsOpen(false)}>
                                <div className="relative w-10 h-10 transition-transform group-hover:scale-110 duration-300">
                                    <Image
                                        src="/assets/Rubric logo.svg"
                                        alt="InsightLLM Logo"
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                                <span className="font-bold text-2xl tracking-tight text-red-700 dark:text-red-500">
                                    rubric.ai
                                </span>
                            </Link>
                        </div>

                        {/* Navigation Links */}
                        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                            {navLinks.map((link) => {
                                const Icon = link.icon;
                                const isActive = pathname === link.href || (link.href === '/app' && pathname?.startsWith('/app'));

                                // Chatbot is disabled (Coming Soon)
                                if (link.isActive) {
                                    return (
                                        <div
                                            key={link.name}
                                            className="flex items-center gap-4 px-4 py-3 rounded-xl text-base font-medium cursor-not-allowed opacity-50 text-zinc-400 dark:text-zinc-600 relative"
                                        >
                                            <Icon className="w-5 h-5" />
                                            <span>{link.name}</span>
                                            <span className="ml-auto text-red-500 text-[7px] font-bold uppercase tracking-wide">
                                                Soon
                                            </span>
                                        </div>
                                    );
                                }

                                return (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        onClick={() => setIsOpen(false)}
                                        className={`flex items-center gap-4 px-4 py-3 rounded-xl text-base font-medium transition-all duration-300 ${isActive
                                                ? "bg-black dark:bg-white text-white dark:text-black shadow-lg"
                                                : "text-zinc-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span>{link.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Bottom Actions */}
                        <div className="p-6 border-t border-white/10 space-y-4">
                            {/* Theme Toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Theme</span>
                                <div className="flex bg-black/5 dark:bg-white/5 rounded-full p-1 gap-1">
                                    <button
                                        onClick={() => setTheme('light')}
                                        className={`p-2 rounded-full transition-all ${!isDark ? 'bg-white dark:bg-zinc-800 shadow-sm text-yellow-500' : 'text-zinc-400'
                                            }`}
                                        aria-label="Light Mode"
                                    >
                                        <FaSun className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setTheme('dark')}
                                        className={`p-2 rounded-full transition-all ${isDark ? 'bg-zinc-800 shadow-sm text-blue-400' : 'text-zinc-400'
                                            }`}
                                        aria-label="Dark Mode"
                                    >
                                        <FaMoon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* User Profile / Login */}
                            {isLoaded && user ? (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-black/5 dark:bg-white/5">
                                    <ProfileMenu />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                            {user.firstName} {user.lastName}
                                        </p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                            {user.primaryEmailAddress?.emailAddress}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <SignInButton mode="modal">
                                    <button className="w-full py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-bold hover:scale-105 transition-transform shadow-lg">
                                        Log In
                                    </button>
                                </SignInButton>
                            )}
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </>
    );
};

export default RightNavbar;
