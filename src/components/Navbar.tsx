"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { FaMoon, FaSun } from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, LogOut } from "lucide-react";

type NavLink = { name: string; href: string };

const NAV_LINKS: NavLink[] = [
    { name: "Home", href: "/" },
    { name: "Evaluations", href: "/app/ocr" },
    { name: "Fact Book", href: "/app/factbook" },
];

const Navbar = () => {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    if (!mounted) return null;

    const isDark = theme === "dark";
    const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

    const handleLogout = async () => {
        try {
            await fetch("/api/logout", { method: "POST" });
        } catch {
            /* ignore */
        }
        router.replace("/login");
        router.refresh();
    };

    return (
        <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${isScrolled ? "py-4" : "py-6"}`}>
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/95 to-transparent dark:from-black/95 backdrop-blur-lg -z-10 pointer-events-none" />
            <div className="max-w-7xl mx-auto px-6">
                <div className="relative rounded-full px-6 py-3 flex items-center justify-between bg-white/90 dark:bg-black/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-lg shadow-black/5">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 group z-10">
                        <div className="relative w-8 h-8 transition-transform group-hover:scale-110 duration-300">
                            <Image src="/assets/Rubric logo.svg" alt="Rubric AI Logo" fill className="object-contain" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-red-700 dark:text-red-500">rubric.ai</span>
                    </Link>

                    {/* Desktop nav */}
                    <nav className="hidden md:flex items-center gap-1 p-1.5 rounded-full absolute left-1/2 -translate-x-1/2">
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`relative px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                                    isActive(link.href)
                                        ? "text-white bg-black dark:bg-white dark:text-black shadow-md"
                                        : "text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
                                }`}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </nav>

                    {/* Right actions */}
                    <div className="hidden md:flex items-center gap-3 z-10">
                        <button
                            onClick={() => setTheme(isDark ? "light" : "dark")}
                            className={`p-2.5 rounded-full transition-all duration-300 ${
                                isDark ? "bg-white/10 text-yellow-300 hover:bg-white/20" : "bg-black/5 text-zinc-600 hover:bg-black/10"
                            }`}
                            aria-label="Toggle Theme"
                        >
                            {isDark ? <FaSun className="w-4 h-4" /> : <FaMoon className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-sm font-bold hover:scale-105 transition-transform shadow-lg shadow-black/20 dark:shadow-white/10 flex items-center gap-2"
                        >
                            <LogOut className="w-4 h-4" /> Log out
                        </button>
                    </div>

                    {/* Mobile menu button */}
                    <button
                        className="md:hidden p-2 text-zinc-600 dark:text-zinc-300"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle Menu"
                    >
                        {isMobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-full left-0 right-0 p-4 md:hidden z-[100]"
                    >
                        <div className="bg-white/90 dark:bg-black/90 backdrop-blur-2xl rounded-3xl border border-black/5 dark:border-white/10 shadow-2xl p-4 space-y-2">
                            {NAV_LINKS.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                                        isActive(link.href)
                                            ? "bg-black/5 dark:bg-white/10 text-black dark:text-white"
                                            : "text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5"
                                    }`}
                                >
                                    {link.name}
                                </Link>
                            ))}

                            <div className="h-px bg-black/5 dark:bg-white/5 my-2" />

                            <div className="flex items-center justify-between px-4 py-2">
                                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Theme</span>
                                <div className="flex bg-black/5 dark:bg-white/5 rounded-full p-1">
                                    <button onClick={() => setTheme("light")} className={`p-2 rounded-full transition-all ${!isDark ? "bg-white shadow-sm text-yellow-500" : "text-zinc-400"}`}>
                                        <FaSun className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setTheme("dark")} className={`p-2 rounded-full transition-all ${isDark ? "bg-zinc-800 shadow-sm text-blue-400" : "text-zinc-400"}`}>
                                        <FaMoon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="w-full py-3 mt-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-sm font-bold flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-4 h-4" /> Log out
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

export default Navbar;
