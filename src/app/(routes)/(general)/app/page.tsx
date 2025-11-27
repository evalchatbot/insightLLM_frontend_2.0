'use client';
import { currentUser } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";
import HomeCards from "@/components/temp-components/home-cards";
import TypingText from "@/components/TypingText";
import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

export const dynamic = 'force-dynamic';

const Page = () => {
  const { user, isLoaded } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <section className="fade-in-section w-full h-[calc(100vh-120px)] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center gap-6">
        {/* Hero Section */}
        <div className="text-center w-full relative">
          {/* Background Glow - Green Theme */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-teal-500/10 blur-[100px] rounded-full -z-10 animate-pulse-slow"></div>

          <h2 className="animate-fade-in-up inline-block bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 dark:from-emerald-400 dark:via-green-400 dark:to-teal-400 bg-clip-text text-3xl sm:text-4xl md:text-5xl text-transparent font-bold mb-2 tracking-tight leading-tight">
            <TypingText text={`Hello, ${isLoaded && user ? user.firstName : "Guest"}`} speed={50} />
          </h2>
          <p className="animate-fade-in-up delay-100 text-sm sm:text-base text-foreground/70 font-normal">
            Ask anything. Get instant exam-focused answers.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="w-full animate-fade-in-up delay-200">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-lg">✨</span>
            <h4 className="text-xs font-medium text-foreground/70 uppercase tracking-wider">
              Quick Start
            </h4>
          </div>

          <div className="w-full">
            <HomeCards />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Page;
