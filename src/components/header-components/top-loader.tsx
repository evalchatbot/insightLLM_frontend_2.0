'use client'
import insightZustand from '@/utils/insight-zustand'
import { AnimatePresence, motion } from 'framer-motion'
import React from 'react'

const TopLoader = () => {
    const { topLoader } = insightZustand()

    return (
        <AnimatePresence>
            {topLoader && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="fixed inset-x-0 top-0 z-[110] pointer-events-none"
                >
                    {/*
                      Trickle to ~92% while the next page loads, then hold.
                      The bar is unmounted (with the parent's opacity-exit) as soon
                      as navigation completes — the loader is cleared on pathname
                      change in Navbar/RightNavbar — so it reads as "finished quickly"
                      instead of looping forever.
                    */}
                    <motion.div
                        className="h-[3px] w-full bg-gradient-to-r from-amber-500 via-red-500 to-cyan-500 shadow-[0_0_16px_rgba(239,68,68,0.7)]"
                        style={{ transformOrigin: "0% 50%" }}
                        initial={{ scaleX: 0.06 }}
                        animate={{ scaleX: 0.92 }}
                        exit={{ scaleX: 1 }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default TopLoader
