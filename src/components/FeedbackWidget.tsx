"use client";

import React, { useState } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";

interface FeedbackWidgetProps {
  pageName?: string;
  variant?: "floating" | "button";
  onSuccess?: () => void;
}

export default function FeedbackWidget({ 
  pageName = "homepage",
  variant = "floating",
  onSuccess
}: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  
  const { user } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user?.id || null,
          user_email: user?.primaryEmailAddress?.emailAddress || null,
          page_url: pageName,
          feedback_type: "general",
          subject: "User Feedback",
          message: message.trim(),
          rating: null,
          user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null,
        }),
      });

      if (response.ok) {
        setSubmitStatus("success");
        // Reset form
        setMessage("");
        
        // Close after 1.5 seconds
        setTimeout(() => {
          setIsOpen(false);
          setSubmitStatus("idle");
          onSuccess?.();
        }, 1500);
      } else {
        setSubmitStatus("error");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Feedback Button */}
      {variant === "floating" ? (
        <motion.button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 bg-red-600 hover:bg-red-700 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 group"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <MessageSquare className="w-5 h-5" />
          
          {/* Tooltip */}
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Feedback
          </span>
        </motion.button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-4 py-2 border-2 border-red-600 dark:border-red-600 text-red-600 dark:text-red-400 bg-white dark:bg-zinc-900 hover:bg-red-50 dark:hover:bg-red-950/20"
        >
          <MessageSquare className="w-4 h-4" />
          Feedback
        </button>
      )}

      {/* Feedback Popup - Chatbot Style */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/30 z-[60]"
            />

            {/* Feedback Form - Small Popup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed bottom-20 right-5 w-[380px] max-w-[calc(100vw-2rem)] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl z-[70] border border-zinc-200 dark:border-zinc-800"
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                      Share Feedback
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Help us improve
                    </p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Success/Error Messages */}
                {submitStatus === "success" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                  >
                    <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                      ✅ Thank you for your feedback!
                    </p>
                  </motion.div>
                )}

                {submitStatus === "error" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                  >
                    <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                      ❌ Failed to submit. Try again.
                    </p>
                  </motion.div>
                )}

                {/* Feedback Form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Your Feedback
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Share your thoughts, suggestions, or report issues..."
                      rows={5}
                      className="w-full px-3 py-2.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 resize-none"
                      required
                      maxLength={500}
                    />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {message.length}/500 characters
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Feedback
                      </>
                    )}
                  </button>
                </form>

                {/* Footer Note */}
                <p className="text-xs text-center text-zinc-500 dark:text-zinc-400 mt-3">
                  Thank you for helping us improve! 🙏
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
