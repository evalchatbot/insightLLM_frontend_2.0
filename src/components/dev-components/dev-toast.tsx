"use client";
import insightZustand from "@/utils/insight-zustand";
import React, { useEffect } from "react";
import { HiOutlineExclamationCircle, HiOutlineXCircle } from "react-icons/hi";

const DevToast = () => {
  const { devToast, setToast } = insightZustand();

  // Determine if this is a limit exceeded message (show longer)
  const isLimitExceeded = devToast?.includes('limit reached') || 
                          devToast?.includes('limit exceeded') ||
                          devToast?.includes('Monthly token limit');

  useEffect(() => {
    if (devToast) {
      // Show limit exceeded messages for 8 seconds, others for 4 seconds
      const duration = isLimitExceeded ? 8000 : 4000;
      setTimeout(() => {
        setToast(null);
      }, duration);
    }
  }, [devToast, isLimitExceeded, setToast]);

  if (!devToast) return null;

  // Check if it's an error message (limit exceeded, error, etc.)
  const isError = isLimitExceeded || 
                   devToast.toLowerCase().includes('error') ||
                   devToast.toLowerCase().includes('failed') ||
                   devToast.toLowerCase().includes('unable');

  return (
    <div className={`dev-toast fixed top-6 left-1/2 transform -translate-x-1/2 text-center max-w-lg w-[min(90%,32rem)] text-sm font-medium p-4 z-50 rounded-lg shadow-xl backdrop-blur-md border-2 transition-all duration-300 ${
      isError 
        ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200' 
        : 'dark:text-black text-white dark:bg-rtlLight bg-rtlDark border-gray-300 dark:border-gray-600'
    }`}>
      <div className="flex items-start gap-3">
        {isError && (
          <HiOutlineExclamationCircle className="flex-shrink-0 w-5 h-5 mt-0.5 text-red-600 dark:text-red-400" />
        )}
        <div className="flex-1 text-left">
          <p className="leading-relaxed">{devToast}</p>
        </div>
        <button
          onClick={() => setToast(null)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close"
        >
          <HiOutlineXCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default DevToast;

