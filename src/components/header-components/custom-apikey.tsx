"use client";
import React, { useEffect, useState } from "react";
import dynamic from 'next/dynamic';
import DevPopover from "../dev-components/dev-popover";
import DevButton from "../dev-components/dev-button";
import { FaBrain } from "react-icons/fa";
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
  }>({ hasAccess: false });
  const [showCelebration, setShowCelebration] = useState(false);
  const [confettiSize, setConfettiSize] = useState({ width: 0, height: 0 });
  const Confetti = dynamic(() => import('react-confetti'), { ssr: false });
  const { setToast } = insightZustand();
  const { isSignedIn, user } = useUser();
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const checkSubscription = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/pro/status', { method: 'GET', credentials: 'include' });
      const data = await res.json();
      if (data?.success && data?.hasAccess) {
        setProStatus({ hasAccess: true, daysLeft: data.daysLeft, endDate: data.end_date });
      } else {
        setProStatus({ hasAccess: false });
      }
    } catch (err) {
      console.error('Failed to fetch pro status', err);
      setProStatus({ hasAccess: false });
    }
  };

  useEffect(() => {
    if (user) checkSubscription();
  }, [user]);

  // Update daysLeft live (recompute every minute) while subscription active
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

    // compute immediately then every 60s
    computeDaysLeft();
    const t = setInterval(computeDaysLeft, 60 * 1000);
    return () => clearInterval(t);
  }, [proStatus.hasAccess, proStatus.endDate]);

  // set confetti size on mount and resize
  useEffect(() => {
    const setSize = () => {
      setConfettiSize({ width: window.innerWidth, height: window.innerHeight });
    };
    setSize();
    window.addEventListener('resize', setSize);
    return () => window.removeEventListener('resize', setSize);
  }, []);

  // endSubscription removed — end-subscription feature disabled per user request

  const handleProButtonClick = () => {
    if (!isSignedIn) {
      setToast("Please sign in to access Pro features");
      return;
    }
    setShowProModal(true);
  };

  return (
    <>
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
              <h4 className="font-semibold">Pro Subscription Status</h4>
              <p className="text-sm text-muted-foreground">Days remaining: {proStatus.daysLeft}</p>
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

      {showProModal && !proStatus.hasAccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <ProAccessModal
            onClose={() => setShowProModal(false)}
            onSubscriptionChange={(sub) => {
              if (sub?.end_date) {
                const daysLeft = Math.max(0, Math.ceil((new Date(sub.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                setProStatus({ hasAccess: true, daysLeft, endDate: sub.end_date });
                // show celebration animation briefly
                setShowCelebration(true);
                setTimeout(() => setShowCelebration(false), 3200);
              } else {
                setProStatus({ hasAccess: false });
              }
              setShowProModal(false);
            }}
          />
        </div>
      )}

      {/* Celebration confetti */}
      {showCelebration && (
        // react-confetti is dynamically loaded; render when available
        <Confetti
          width={confettiSize.width}
          height={confettiSize.height}
          recycle={false}
          numberOfPieces={450}
          gravity={0.4}
        />
      )}
    </>
  );
};

export default CustomApiKey;

