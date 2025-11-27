"use client";
import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";

export default function EnsureSupabaseUser() {
  const { isSignedIn, isLoaded, user } = useUser();
  const onceRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    const uid = user.id;
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) return;

    // Ensure we call once per session and avoid duplicate fetches
    if (onceRef.current === uid) return;
    const cacheKey = `ensured:${uid}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(cacheKey)) {
      onceRef.current = uid;
      return;
    }

    const ensure = async () => {
      try {
        const res = await fetch("/api/ensure-user", { method: "POST" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          console.warn("ensure-user failed", body);
          return;
        }
        if (typeof window !== "undefined") {
          sessionStorage.setItem(cacheKey, "1");
        }
        onceRef.current = uid;

        // After ensuring user row exists, trigger a lightweight status check
        // This will create an initial usage_free row if missing (0-token status check)
        try {
          await fetch('/api/pro/status', {
            method: 'GET',
            credentials: 'include',
            cache: 'no-cache'
          });
        } catch (e) {
          // Non-fatal: profile UI can fetch later as well
          console.warn('ensure-user: pro status priming failed (will retry later)', e);
        }
      } catch (e) {
        console.warn("ensure-user request error", e);
      }
    };

    ensure();
  }, [isLoaded, isSignedIn, user]);

  return null;
}
