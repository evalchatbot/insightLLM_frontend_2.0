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
                    className="fixed inset-x-0 top-0 z-[110] pointer-events-none"
                >
                    <motion.div
                        className="h-[3px] w-full bg-gradient-to-r from-amber-500 via-red-500 to-cyan-500 shadow-[0_0_16px_rgba(239,68,68,0.7)]"
                        initial={{ scaleX: 0.1, transformOrigin: "0% 50%" }}
                        animate={{ scaleX: [0.1, 0.72, 0.94] }}
                        transition={{ duration: 1.2, ease: "easeOut", repeat: Infinity }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default TopLoader
