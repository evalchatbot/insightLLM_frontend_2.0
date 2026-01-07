"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { X, Wrench } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SignupIssueBanner = () => {
  const { user, isLoaded } = useUser();
  const [isDismissed, setIsDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if banner was dismissed
    const dismissalKey = 'signup_issue_banner_dismissed';
    const dismissed = localStorage.getItem(dismissalKey);
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  // Only show to non-authenticated users
  if (!mounted || !isLoaded || user || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    const dismissalKey = 'signup_issue_banner_dismissed';
    localStorage.setItem(dismissalKey, 'true');
    setIsDismissed(true);
  };

  return (
    <AnimatePresence>
      {!isDismissed && (
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
                  <Wrench className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">
                    Temporary Signup Issue
                  </p>
                  <p className="text-xs opacity-95 mt-0.5 leading-relaxed">
                    We're currently experiencing technical difficulties with our signup process. Our team is working diligently to resolve this issue. Please check back shortly, and thank you for your patience.
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
      )}
    </AnimatePresence>
  );
};

export default SignupIssueBanner;

