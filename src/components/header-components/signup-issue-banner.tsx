"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SignupIssueBanner = () => {
  const { user, isLoaded } = useUser();
  const [isDismissed, setIsDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if banner was dismissed
    if (typeof window !== 'undefined') {
      const dismissalKey = 'signup_issue_banner_dismissed';
      const dismissed = localStorage.getItem(dismissalKey);
      if (dismissed) {
        setIsDismissed(true);
      }
    }
  }, []);

  // Don't render until mounted (prevents hydration issues)
  if (!mounted) {
    return null;
  }

  // Only show to non-authenticated users (wait for Clerk to load)
  // Show banner if: Clerk is loaded AND user is not logged in AND banner not dismissed
  if (isLoaded && user) {
    return null; // User is logged in, don't show
  }

  if (isDismissed) {
    return null; // Banner was dismissed
  }

  // Show banner if Clerk is still loading (will hide once loaded if user exists)
  // or if Clerk is loaded and no user exists

  const handleDismiss = () => {
    const dismissalKey = 'signup_issue_banner_dismissed';
    if (typeof window !== 'undefined') {
      localStorage.setItem(dismissalKey, 'true');
    }
    setIsDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold">
                      Temporary Signup Issue
                    </p>
                    <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-xs font-medium rounded-full border border-white/30">
                      High Traffic
                    </span>
                  </div>
                  <p className="text-xs opacity-95 mt-0.5 leading-relaxed">
                    We're experiencing temporary signup delays due to excessive login attempts. Our team is actively working to resolve this and restore normal service. Please check back shortly, and thank you for your patience.
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="ml-4 p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
    </AnimatePresence>
  );
};

export default SignupIssueBanner;

