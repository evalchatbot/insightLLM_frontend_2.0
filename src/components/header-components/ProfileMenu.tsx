"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useUser, SignInButton, SignOutButton } from "@clerk/nextjs";
import Image from "next/image";

interface APIResponse {
  success: boolean;
  usage: {
    tokens_input_used: number;
    tokens_output_used: number;
    period_start: string;
  } | null;
  limits: {
    input_tokens: number;
    output_tokens: number;
  } | null;
  isPro: boolean;
  hasAccess?: boolean;
  daysLeft?: number;
  end_date?: string;
  downgraded?: boolean;
}

export default function ProfileMenu() {
  const { user, isLoaded } = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<APIResponse | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await fetch('/api/pro/status', { method: 'GET', credentials: 'include', cache: 'no-cache' });
      // Gracefully handle 503 transient errors
      if (res.status === 503) {
        setLoading(false);
        return;
      }
      const data: APIResponse = await res.json();
      setStatus(data?.success ? data : null);
    } catch (e) {
      // Keep silent; will show basic UI
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open) fetchStatus();
  }, [open, fetchStatus]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  if (!isLoaded) return null;

  if (!user) {
    return (
      <SignInButton mode="modal">
        <button className="px-6 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black text-sm font-bold hover:scale-105 transition-transform shadow-lg">
          Log In
        </button>
      </SignInButton>
    );
  }
  // Usage percentage removed per latest request

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-2"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-white/20 ring-2 ring-black/5 dark:ring-white/10">
          <Image src={user.imageUrl} alt={user.firstName || 'User'} fill className="object-cover" />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 sm:left-auto sm:right-0 mt-2 w-full sm:w-80 rounded-xl bg-white/95 dark:bg-black/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl p-4 z-[200]">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/20">
              <Image src={user.imageUrl} alt={user.firstName || 'User'} fill className="object-cover" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.primaryEmailAddress?.emailAddress}</p>
            </div>
            {/* Pro/Free badge removed */}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Status</span>
              <span className="font-medium">{status?.isPro ? 'Pro' : 'Free'}</span>
            </div>
            {/* Usage row removed */}
          </div>

          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
            <SignOutButton>
              <button className="px-3 py-1.5 text-xs rounded-md bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">Sign out</button>
            </SignOutButton>
            {/* Upgrade entrypoint removed; accessible via landing page CTA */}
          </div>

          {loading && (
            <div className="absolute inset-0 bg-black/5 dark:bg-white/5 rounded-xl" />
          )}
        </div>
      )}
    </div>
  );
}
