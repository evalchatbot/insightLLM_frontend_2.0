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

const CustomApiKey = () => {
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
  const [confettiSize, setConfettiSize] = useState({ width: 0, height: 0 });
  const [confettiReady, setConfettiReady] = useState(false);
  const Confetti = dynamic(() => import('react-confetti'), { 
    ssr: false,
    loading: () => null
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

  useEffect(() => {
    if (user) checkProAccessAndUsage();
  }, [user, checkProAccessAndUsage]);

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

  // set confetti size on mount and resize
  useEffect(() => {
    const setSize = () => {
      if (typeof window !== 'undefined') {
        setConfettiSize({ 
          width: window.innerWidth || window.document.documentElement.clientWidth, 
          height: window.innerHeight || window.document.documentElement.clientHeight 
        });
        setConfettiReady(true);
      }
    };
    
    // Set initial size
    if (typeof window !== 'undefined') {
      setSize();
      window.addEventListener('resize', setSize);
      // Also listen to orientation change for mobile
      window.addEventListener('orientationchange', setSize);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', setSize);
        window.removeEventListener('orientationchange', setSize);
      }
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
      <div className="flex items-center gap-2">
        {/* Usage percentage indicator - small icon button */}
        {proStatus.usage && proStatus.limits && (
          <DevPopover
            popButton={
              <button className={`flex items-center justify-center w-6 h-6 ${getIconColor()} hover:opacity-80 transition-opacity`}>
                <FaChartPie className="text-sm" />
              </button>
            }
            place="bottom-end"
            contentClick={false}
          >
            <div className="p-4 space-y-3 min-w-[240px] bg-[#1a1625] border border-purple-900/30 rounded-lg">
              <h4 className="font-semibold text-sm text-purple-100">Usage</h4>
              {/* Single combined usage bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-purple-200">Usage</span>
                  <span className="font-mono text-purple-100 font-medium">{Math.round(usagePercentage)}%</span>
                </div>
                <div className="w-full bg-purple-900/30 rounded-full h-3 overflow-hidden shadow-inner relative">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 relative ${
                      usagePercentage >= 90 ? 'bg-red-500' : 
                      usagePercentage >= 70 ? 'bg-orange-500' : 
                      'bg-blue-500'
                    }`}
                    style={{
                      width: `${Math.min(usagePercentage, 100)}%`,
                    }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${
                      usagePercentage >= 90 ? 'from-red-600 to-red-400' : 
                      usagePercentage >= 70 ? 'from-orange-600 to-orange-400' : 
                      'from-blue-600 to-blue-400'
                    } opacity-80`} />
                  </div>
                </div>
              </div>
            </div>
          </DevPopover>
        )}

        {proStatus.hasAccess ? (
          <DevPopover
            popButton={
              <DevButton variant="v1" className="gap-2 text-sm flex">
                <FaBrain className="text-lg text-[#4E82EE]" />
                Pro Subscriber
              </DevButton>
            }
            place="bottom-start"
            contentClick={false}
          >
            <div className="p-4 space-y-2">
              <h4 className="font-semibold">Pro Access Status</h4>
              {proStatus.daysLeft !== undefined && (
                <p className="text-sm text-muted-foreground">
                  Days remaining: {proStatus.daysLeft}
                </p>
              )}
            </div>
          </DevPopover>
        ) : (
          <DevButton
            variant="v1"
            className="gap-2 text-sm flex"
            onClick={handleProButtonClick}
          >
            <FaBrain className="text-lg text-[#4E82EE]" />
            Try Insight LLM Pro
          </DevButton>
        )}
      </div>

      {showProModal && !proStatus.hasAccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <ProAccessModal
            onClose={() => setShowProModal(false)}
            onSuccess={(data) => {
              if (data?.end_date) {
                const daysLeft = Math.max(0, Math.ceil((new Date(data.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                setProStatus({ hasAccess: true, daysLeft, endDate: data.end_date });
                
                // Ensure confetti size is set before showing
                if (typeof window !== 'undefined') {
                  setConfettiSize({ 
                    width: window.innerWidth || window.document.documentElement.clientWidth, 
                    height: window.innerHeight || window.document.documentElement.clientHeight 
                  });
                  setConfettiReady(true);
                }
                
                // Close modal first, then show celebration after a brief delay
                setShowProModal(false);
                
                // Show celebration animation after modal closes
                // Use requestAnimationFrame for smoother timing
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    setShowCelebration(true);
                    // Hide confetti after animation completes
                    setTimeout(() => {
                      setShowCelebration(false);
                      setConfettiReady(false);
                    }, 5000); // Longer duration for smoother animation
                  }, 150); // Slightly longer delay to ensure modal is fully closed
                });
                
                // Refresh usage data
                checkProAccessAndUsage();
              } else {
                setProStatus({ hasAccess: false });
                setShowProModal(false);
              }
            }}
          />
        </div>
      )}

      {/* Celebration confetti */}
      {showCelebration && confettiReady && confettiSize.width > 0 && confettiSize.height > 0 && (
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

