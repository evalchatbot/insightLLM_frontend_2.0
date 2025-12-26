"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { FaMoon, FaSun } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import ProfileMenu from "./header-components/ProfileMenu";

const Navbar = () => {
    const { user, isLoaded } = useUser();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (!mounted) return null;

    const isDark = theme === 'dark';

    const navLinks = [
        { name: "Home", href: "/" },
        { name: "Evaluations", href: "/app/ocr" },
        { name: "MCQs", href: "/quiz" },
        { name: "Chatbot", href: "/app", isSpecial: true },
    ];

    return (
        <header
            className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${isScrolled
                ? "py-4"
                : "py-6"
                }`}
        >
            {/* Blur overlay only above navbar */}
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/95 to-transparent dark:from-black/95 backdrop-blur-lg -z-10 pointer-events-none" />
            <div className={`max-w-7xl mx-auto px-6 transition-all duration-500 ${isScrolled ? "px-4" : "px-6"
                }`}>
                {/* ALWAYS TRANSLUCENT BACKGROUND */}
                <div className="relative rounded-full px-6 py-3 flex items-center justify-between transition-all duration-300 bg-white/90 dark:bg-black/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-lg shadow-black/5">

                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 group z-10">
                        <div className="relative w-8 h-8 transition-transform group-hover:scale-110 duration-300">
                            <Image
                                src="/assets/Rubrik logo.svg"
                                alt="InsightLLM Logo"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-red-700 dark:text-red-500">
                            rubrik.ai
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1 p-1.5 rounded-full absolute left-1/2 -translate-x-1/2">
                        {navLinks.map((link) => (
                            link.isSpecial ? (
                                // Chatbot - Disabled (Coming Soon)
                                <div
                                    key={link.name}
                                    className="relative px-5 py-2 rounded-full text-sm font-medium cursor-not-allowed opacity-50 text-zinc-400 dark:text-zinc-600"
                                    title="Coming Soon"
                                >
                                    {link.name}
                                    <span className="absolute -top-0.5 -right-0.5 text-red-500 text-[7px] font-bold uppercase tracking-wider">
                                        Soon
                                    </span>
                                </div>
                            ) : (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={`relative px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${pathname === link.href
                                        ? "text-white bg-black dark:bg-white dark:text-black shadow-md"
                                        : "text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            )
                        ))}
                    </nav>

                    {/* Right Actions */}
                    <div className="hidden md:flex items-center gap-3 z-10">
                        {/* Renew Subscription Button - DISABLED: Renewal functionality is currently disabled */}
                        {/* {isLoaded && user && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        window.dispatchEvent(new CustomEvent('openProModal'));
                                    }}
                                    className="px-4 py-2 rounded-full bg-red-600 dark:bg-red-500 text-white text-sm font-bold hover:bg-red-700 dark:hover:bg-red-600 transition-all hover:scale-105 shadow-lg shadow-red-900/30 dark:shadow-red-900/20 flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                                        <path d="M21 3v5h-5"></path>
                                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                                        <path d="M3 21v-5h5"></path>
                                    </svg>
                                    Renew
                                </button>
                            </div>
                        )} */}

                        {/* Theme Toggle */}
                        <button
                            onClick={() => setTheme(isDark ? 'light' : 'dark')}
                            className={`p-2.5 rounded-full transition-all duration-300 ${isDark
                                ? 'bg-white/10 text-yellow-300 hover:bg-white/20'
                                : 'bg-black/5 text-zinc-600 hover:bg-black/10'
                                }`}
                            aria-label="Toggle Theme"
                        >
                            {isDark ? <FaSun className="w-4 h-4" /> : <FaMoon className="w-4 h-4" />}
                        </button>

                        {/* User Profile / Login */}
                        {isLoaded && user ? (
                            <div className="pl-2">
                                <ProfileMenu />
                            </div>
                        ) : (
                            <SignInButton mode="modal">
                                <button className="px-6 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-sm font-bold hover:scale-105 transition-transform shadow-lg shadow-black/20 dark:shadow-white/10">
                                    Log In
                                </button>
                            </SignInButton>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-zinc-600 dark:text-zinc-300"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-full left-0 right-0 p-4 md:hidden z-[100]"
                    >
                        <div className="bg-white/90 dark:bg-black/90 backdrop-blur-2xl rounded-3xl border border-black/5 dark:border-white/10 shadow-2xl p-4 space-y-2 overflow-visible">
                            {navLinks.map((link) => (
                                link.isSpecial ? (
                                    // Chatbot - Disabled (Coming Soon)
                                    <div
                                        key={link.name}
                                        className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium cursor-not-allowed opacity-50 text-zinc-400 dark:text-zinc-600"
                                    >
                                        {link.name}
                                        <span className="text-red-500 text-[7px] font-bold uppercase tracking-wide">
                                            Soon
                                        </span>
                                    </div>
                                ) : (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${pathname === link.href
                                            ? "bg-black/5 dark:bg-white/10 text-black dark:text-white"
                                            : "text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5"
                                            }`}
                                    >
                                        {link.name}
                                    </Link>
                                )
                            ))}

                            <div className="h-px bg-black/5 dark:bg-white/5 my-2" />

                            <div className="flex items-center justify-between px-4 py-2">
                                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Theme</span>
                                <div className="flex bg-black/5 dark:bg-white/5 rounded-full p-1">
                                    <button
                                        onClick={() => setTheme('light')}
                                        className={`p-2 rounded-full transition-all ${!isDark ? 'bg-white shadow-sm text-yellow-500' : 'text-zinc-400'}`}
                                    >
                                        <FaSun className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setTheme('dark')}
                                        className={`p-2 rounded-full transition-all ${isDark ? 'bg-zinc-800 shadow-sm text-blue-400' : 'text-zinc-400'}`}
                                    >
                                        <FaMoon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Renew Subscription Button - DISABLED: Renewal functionality is currently disabled */}
                            {/* {isLoaded && user && (
                                <div className="px-4 py-2">
                                    <button
                                        onClick={() => {
                                            window.dispatchEvent(new CustomEvent('openProModal'));
                                        }}
                                        className="w-full px-4 py-2.5 rounded-full bg-red-600 dark:bg-red-500 text-white text-sm font-bold hover:bg-red-700 dark:hover:bg-red-600 transition-all hover:scale-105 shadow-lg shadow-red-900/30 dark:shadow-red-900/20 flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                                            <path d="M21 3v5h-5"></path>
                                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                                            <path d="M3 21v-5h5"></path>
                                        </svg>
                                        Renew Subscription
                                    </button>
                                </div>
                            )} */}

                            {/* User Profile / Login */}
                            {isLoaded && user ? (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5">
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
                                    <button className="w-full py-3 mt-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-bold">
                                        Log In
                                    </button>
                                </SignInButton>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

export default Navbar;
