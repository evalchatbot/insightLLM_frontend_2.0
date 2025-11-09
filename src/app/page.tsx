"use client";
import React, { useState, useEffect, useRef } from "react";
import { useUser, SignInButton, SignOutButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DevButton from "@/components/dev-components/dev-button";
import DevPopover from "@/components/dev-components/dev-popover";
import { GoSignOut } from "react-icons/go";
import { FaRobot, FaFileAlt, FaBrain } from "react-icons/fa";
import { HiArrowRight } from "react-icons/hi";

export default function LandingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [showArrow, setShowArrow] = useState(false);
  const signinButtonRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);

  const handleContainerClick = (route: string) => {
    if (!user) {
      setShowArrow(true);
      // Scroll to signin button
      setTimeout(() => {
        signinButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return;
    }
    router.push(route);
  };

  useEffect(() => {
    if (user) {
      setShowArrow(false);
    }
  }, [user]);

  return (
    <div className="h-screen w-full bg-background relative overflow-hidden">
      {/* Professional Background - Subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
        backgroundSize: '80px 80px'
      }}></div>
      
      {/* Subtle accent gradient orbs - very minimal */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-3xl"></div>

      {/* Header */}
      <header className="absolute inset-x-0 top-0 w-full h-fit flex-shrink-0 flex items-center p-4 md:px-12 px-6 md:justify-between justify-end bg-transparent z-50">
        <div className="md:block hidden"></div>
        <div ref={signinButtonRef} className="relative">
          {/* Simplified Sign In Button - No CustomApiKey */}
          <div>
            {isLoaded ? (
              user ? (
                <DevPopover contentClick={false} place="bottom-start" popButton={<Image src={user.imageUrl} alt={"img"} width={35} height={35} className="rounded-full cursor-pointer" />}>
                  <div className="py-2 w-48">
                    <SignOutButton>
                      <DevButton rounded="none" variant="v3" className="!justify-start  w-full" >
                        <GoSignOut className="text-lg" />
                        Sign Out
                      </DevButton>
                    </SignOutButton>
                  </div>
                </DevPopover>
              ) : (
                <SignInButton mode="modal">
                  <DevButton
                    className="text-sm !bg-accentBlue/50"
                  >
                    Sign In
                  </DevButton>
                </SignInButton>
              )
            ) : (
              <div className="animate-pulse">
                <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
              </div>
            )}
          </div>
          {/* Professional Arrow */}
          {showArrow && !user && (
            <div
              ref={arrowRef}
              className="absolute -left-44 md:-left-52 top-1/2 -translate-y-1/2 pointer-events-none z-50 bg-slate-800/95 backdrop-blur-md px-4 py-2.5 rounded-lg border border-slate-700/50 shadow-xl"
            >
              <div className="flex items-center gap-2.5 text-blue-400">
                <span className="text-sm font-medium whitespace-nowrap">Sign in to continue</span>
                <HiArrowRight className="text-xl" />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content - Centered and No Scroll */}
      <main className="h-screen w-full flex flex-col items-center justify-center px-5 relative z-10">
        {/* Professional Heading */}
        <div className="mb-12 md:mb-16 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-3 text-white tracking-tight">
            CSS CHATBOT
          </h1>
          <p className="text-slate-400 text-sm md:text-base font-light tracking-wide">
            Intelligent AI-Powered Learning Platform
          </p>
        </div>

        {/* Three Containers - Professional Design */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 w-full max-w-5xl">
          {/* Chatbot Container */}
          <div
            onClick={() => handleContainerClick("/app")}
            className="professional-card group cursor-pointer relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute inset-0 border border-slate-700/50 group-hover:border-blue-500/50 transition-colors duration-500"></div>
            <div className="relative z-10 p-8 h-full flex flex-col items-center justify-center text-center">
              <div className="mb-4 p-4 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors duration-500">
                <FaRobot className="text-3xl md:text-4xl text-blue-400 group-hover:text-blue-300 transition-colors duration-500" />
              </div>
              <h2 className="text-xl md:text-2xl font-semibold mb-2 text-white">Chatbot</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Engage with our advanced AI assistant for intelligent conversations
              </p>
            </div>
          </div>

          {/* Evaluate Container (OCR) */}
          <div
            onClick={() => handleContainerClick("/app/ocr")}
            className="professional-card group cursor-pointer relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute inset-0 border border-slate-700/50 group-hover:border-indigo-500/50 transition-colors duration-500"></div>
            <div className="relative z-10 p-8 h-full flex flex-col items-center justify-center text-center">
              <div className="mb-4 p-4 rounded-xl bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors duration-500">
                <FaFileAlt className="text-3xl md:text-4xl text-indigo-400 group-hover:text-indigo-300 transition-colors duration-500" />
              </div>
              <h2 className="text-xl md:text-2xl font-semibold mb-2 text-white">Evaluate</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Upload and analyze documents with precision and accuracy
              </p>
            </div>
          </div>

          {/* Practice Container (Quiz) */}
          <div
            onClick={() => handleContainerClick("/quiz")}
            className="professional-card group cursor-pointer relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute inset-0 border border-slate-700/50 group-hover:border-purple-500/50 transition-colors duration-500"></div>
            <div className="relative z-10 p-8 h-full flex flex-col items-center justify-center text-center">
              <div className="mb-4 p-4 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors duration-500">
                <FaBrain className="text-3xl md:text-4xl text-purple-400 group-hover:text-purple-300 transition-colors duration-500" />
              </div>
              <h2 className="text-xl md:text-2xl font-semibold mb-2 text-white">Practice</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Test and enhance your knowledge with interactive quizzes
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
