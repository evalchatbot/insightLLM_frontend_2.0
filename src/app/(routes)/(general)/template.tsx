"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * Page-transition template for all general (`/app/*`) routes.
 *
 * Next.js remounts a `template.tsx` on every navigation, so this gentle
 * opacity fade replays each time the user moves between pages — giving a
 * smooth, minimal hand-off instead of an abrupt content swap. We animate
 * opacity only (no layout-shifting transforms) and keep it short so the
 * transition stays fast.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="h-full w-full"
    >
      {children}
    </motion.div>
  );
}
