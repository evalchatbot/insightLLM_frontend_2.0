"use client";
import React, { useEffect, useState, useCallback } from "react";
import dynamic from 'next/dynamic';
import DevPopover from "../dev-components/dev-popover";
import DevButton from "../dev-components/dev-button";
import { FaBrain } from "react-icons/fa";
import { FaChartPie } from "react-icons/fa";
import ProAccessModal from "./pro-access-modal";
import insightZustand from "@/utils/insight-zustand";
import { useUser } from "@clerk/nextjs";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import Confetti from 'react-confetti';

const CustomApiKey = ({ preloadedData }: { preloadedData?: any } = {}) => {
  const [showProModal, setShowProModal] = useState(false);
  const [proStatus, setProStatus] = useState<{
    hasAccess: boolean;
    daysLeft?: number;
    endDate?: string;
    usage?: {
      tokens_input: number;
      tokens_output: number;
      period_start: string;
    };
    limits?: {
      input_tokens: number;
      output_tokens: number;
    };
  }>({ hasAccess: false });
  const [showCelebration, setShowCelebration] = useState(false);
  const [confettiSize, setConfettiSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080
  });
  const { setToast } = insightZustand();
  const { isSignedIn, user } = useUser();
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const checkProAccessAndUsage = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/pro/status', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-cache' // Ensure fresh data
      });

      // Handle 503 Service Unavailable (transient Clerk API errors)
      if (res.status === 503) {
        const data = await res.json();
        // Log but don't show error - it's transient and will retry automatically
        if (data?.retry) {
          console.warn('Temporary authentication service issue, will retry:', data.message);
          // Keep current status, don't update to false
          return;
        }
      }

      const data = await res.json();
      if (data?.success) {
        // If user was downgraded, ensure we show free status
        const finalHasAccess = data.downgraded ? false : (data.hasAccess || false);

        setProStatus({
          hasAccess: finalHasAccess,
          daysLeft: finalHasAccess ? data.daysLeft : undefined,
          endDate: finalHasAccess ? data.end_date : undefined,
          usage: data.usage,
          limits: data.limits
        });

        // If downgraded, show toast notification
        if (data.downgraded) {
          setToast("Your Pro plan limit has been exceeded. You have been downgraded to Free user.");
        }
      } else {
        // Only update to false if it's not a transient error
        if (res.status !== 503) {
          setProStatus({ hasAccess: false });
        }
      }
    } catch (err) {
      // Network errors are also transient - log but don't crash
      console.warn('Failed to fetch pro status (will retry):', err);
      // Don't update status on network errors - keep current state
    }
  }, [user]);

  // Use preloaded data immediately if available
  useEffect(() => {
    if (preloadedData?.success) {
      const finalHasAccess = preloadedData.downgraded ? false : (preloadedData.hasAccess || false);
      setProStatus({
        hasAccess: finalHasAccess,
        daysLeft: finalHasAccess ? preloadedData.daysLeft : undefined,
        endDate: finalHasAccess ? preloadedData.end_date : undefined,
        usage: preloadedData.usage,
        limits: preloadedData.limits
      });
    }
  }, [preloadedData]);

  useEffect(() => {
    if (user) checkProAccessAndUsage();
  }, [user, checkProAccessAndUsage]);

  // Listen for custom event to open modal from header button
  useEffect(() => {
    const handleOpenModal = () => {
      if (isSignedIn) {
        setShowProModal(true);
      } else {
        setToast("Please sign in to access Pro features");
      }
    };
    window.addEventListener('openProModal', handleOpenModal);
    return () => window.removeEventListener('openProModal', handleOpenModal);
  }, [isSignedIn, setToast]);

  // Listen for custom event to refresh pro status (triggered when downgrade detected)
  useEffect(() => {
    const handleRefreshProStatus = () => {
      // Immediately refresh status when downgrade is detected
      checkProAccessAndUsage();
    };

    window.addEventListener('refreshProStatus', handleRefreshProStatus);
    return () => window.removeEventListener('refreshProStatus', handleRefreshProStatus);
  }, [checkProAccessAndUsage]);

  // Also listen for storage event as backup (in case of cross-tab communication)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'proStatusRefresh') {
        checkProAccessAndUsage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [checkProAccessAndUsage]);

  // Refresh usage data periodically (every 30 seconds)
  useEffect(() => {
    if (!user) return;

    // Refresh immediately, then every 30 seconds
    const interval = setInterval(() => {
      checkProAccessAndUsage();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user, checkProAccessAndUsage]);

  // Update daysLeft live (recompute every minute) while pro access is active
  useEffect(() => {
    if (!proStatus.hasAccess || !proStatus.endDate) return;

    const computeDaysLeft = () => {
      const now = new Date();
      const end = new Date(proStatus.endDate!);
      if (end <= now) {
        setProStatus({ hasAccess: false });
        return;
      }
      const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      setProStatus((prev) => ({ ...prev, daysLeft }));
    };

    // compute immediately then every 5 minutes (reduced frequency)
    computeDaysLeft();
    const t = setInterval(computeDaysLeft, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [proStatus.hasAccess, proStatus.endDate]);

  // Update confetti size on mount and resize
  useEffect(() => {
    const updateSize = () => {
      if (typeof window !== 'undefined') {
        setConfettiSize({
          width: window.innerWidth,
          height: window.innerHeight
        });
      }
    };

    // Set initial size immediately
    updateSize();

    // Update on resize and orientation change
    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
    };
  }, []);

  const handleProButtonClick = () => {
    if (!isSignedIn) {
      setToast("Please sign in to access Pro features");
      return;
    }
    setShowProModal(true);
  };

  // Calculate overall usage percentage (combined input and output)
  const getUsagePercentage = () => {
    if (!proStatus.usage || !proStatus.limits) return 0;
    const inputPct = ((proStatus.usage.tokens_input || 0) / (proStatus.limits.input_tokens || 1)) * 100;
    const outputPct = ((proStatus.usage.tokens_output || 0) / (proStatus.limits.output_tokens || 1)) * 100;
    // Use the higher percentage (worst case)
    return Math.max(inputPct, outputPct);
  };

  const usagePercentage = getUsagePercentage();

  // Determine icon color based on usage
  const getIconColor = () => {
    if (usagePercentage >= 90) return 'text-red-500';
    if (usagePercentage >= 70) return 'text-orange-500';
    return 'text-blue-500';
  };

  return (
    <>
      {/* Renew Button Test Panel - DISABLED: Renewal functionality is currently disabled */}
      {/* <div className="fixed top-20 right-4 z-50 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-purple-500"> */}
        <p className="text-xs text-gray-500 mb-2">TEST MODE - Renew Button</p>
        <div className="space-y-2">
          <button 
            onClick={handleProButtonClick}
            className="w-full py-2.5 px-4 bg-blue-100 hover:bg-blue-200 dark:bg-blue-600/20 dark:hover:bg-blue-600/30 border border-blue-300 dark:border-blue-500/50 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <FaBrain className="text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-blue-900 dark:text-blue-100 text-sm">Pro Active</span>
            <span className="text-xs text-blue-700 dark:text-blue-300">(30d)</span>
          </button>
          
          <button
            onClick={handleProButtonClick}
            className="w-full py-2.5 px-4 rounded-full bg-red-600 dark:bg-red-500 text-white text-sm font-bold hover:bg-red-700 dark:hover:bg-red-600 transition-all hover:scale-105 shadow-lg shadow-red-900/30 dark:shadow-red-900/20 flex items-center justify-center gap-2"
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

      <div className="w-full space-y-3">
        {/* Usage Display Removed as per user request */}
        {/* {proStatus.usage && proStatus.limits && (
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/30">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-200">Monthly Usage</span>
              <span className="text-xs font-mono font-semibold text-blue-900 dark:text-blue-100">{Math.round(usagePercentage)}%</span>
            </div>
            <div className="w-full bg-blue-100 dark:bg-blue-950/50 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  usagePercentage >= 90 ? 'bg-red-500' : 
                  usagePercentage >= 70 ? 'bg-orange-500' : 
                  'bg-blue-500'
                }`}
                style={{
                  width: `${Math.min(usagePercentage, 100)}%`,
                }}
              />
            </div>
          </div>
        )} */}

        {/* Pro Status Display */}
        {/* Renew Button - DISABLED: Renewal functionality is currently disabled */}
        {proStatus.hasAccess ? (
          <div className="space-y-2">
            {/* Pro Active Status Button */}
            <button 
              onClick={handleProButtonClick}
              className="w-full py-2.5 px-4 bg-blue-100 hover:bg-blue-200 dark:bg-blue-600/20 dark:hover:bg-blue-600/30 border border-blue-300 dark:border-blue-500/50 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <FaBrain className="text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-blue-900 dark:text-blue-100 text-sm">Pro Active</span>
              {proStatus.daysLeft !== undefined ? (
                <span className="text-xs text-blue-700 dark:text-blue-300">({proStatus.daysLeft}d)</span>
              ) : (
                <span className="text-xs text-blue-700 dark:text-blue-300">(30d)</span>
              )}
            </button>
            
            {/* Renew Subscription Button - DISABLED */}
            {/* <button
              onClick={handleProButtonClick}
              className="w-full py-2.5 px-4 rounded-full bg-red-600 dark:bg-red-500 text-white text-sm font-bold hover:bg-red-700 dark:hover:bg-red-600 transition-all hover:scale-105 shadow-lg shadow-red-900/30 dark:shadow-red-900/20 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                <path d="M3 21v-5h5"></path>
              </svg>
              Renew Subscription
            </button> */}
          </div>
        ) : (
          <button
            onClick={handleProButtonClick}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg transition-all flex items-center justify-center gap-2 font-semibold text-white text-sm shadow-lg"
          >
            <FaBrain />
            Try Pro
          </button>
        )}
      </div>

      {/* ===================================================== */}
      {/* STEP 5: Allow modal to open for both new activations and renewals */}
      {/* ===================================================== */}
      {/* Removed condition !proStatus.hasAccess - now modal can open for renewals too */}
      {showProModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <ProAccessModal
            onClose={() => setShowProModal(false)}
            onSuccess={(data) => {
              // =====================================================
              // STEP 6: Handle success for both renewals and new activations
              // =====================================================
              if (data?.end_date) {
                const endDate = data.end_date;
                const daysLeft = Math.max(0, Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                
                // Update pro status with new expiry date
                setProStatus({ 
                  hasAccess: true, 
                  daysLeft, 
                  endDate: endDate 
                });

                // Close modal and show confetti immediately
                setShowProModal(false);

                // Show confetti immediately after modal close
                setTimeout(() => {
                  setShowCelebration(true);

                  // Auto-hide after 5 seconds
                  setTimeout(() => {
                    setShowCelebration(false);
                  }, 5000);
                }, 100);

                // Refresh usage data to get latest status
                checkProAccessAndUsage();
              } else {
                // Only set to false if it was a new activation that failed
                // For renewals, keep the existing status
                if (!proStatus.hasAccess) {
                  setProStatus({ hasAccess: false });
                }
                setShowProModal(false);
              }
            }}
          />
        </div>
      )}

      {/* Celebration confetti */}
      {showCelebration && (
        <Confetti
          width={confettiSize.width}
          height={confettiSize.height}
          recycle={false}
          numberOfPieces={600}
          gravity={0.25}
          initialVelocityY={25}
          initialVelocityX={15}
          wind={0.08}
          friction={0.99}
          colors={['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#FFD93D', '#6BCF7F']}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 9999,
            pointerEvents: 'none',
            willChange: 'transform'
          }}
        />
      )}
    </>
  );
};

export default CustomApiKey;

