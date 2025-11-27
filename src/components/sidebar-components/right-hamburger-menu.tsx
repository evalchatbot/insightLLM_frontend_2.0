"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoSettingsOutline } from "react-icons/io5";
import { IoMdHelpCircleOutline } from "react-icons/io";
import { AiOutlineFileText } from "react-icons/ai";
import { RxCounterClockwiseClock } from "react-icons/rx";
import { FaBrain } from "react-icons/fa";
import { MdOutlineDarkMode } from "react-icons/md";
import { RiMenu3Fill } from "react-icons/ri";
import { GoSignOut } from "react-icons/go";
import { usePathname, useRouter } from "next/navigation";
import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import Image from "next/image";
import ThemeSwitch from "./theme-switch";
import DevButton from "../dev-components/dev-button";
import CustomApiKey from "../header-components/custom-apikey";

// User Account Section Component
const UserAccountSection = ({ preloadedData }: { preloadedData?: any }) => {
  const { user, isLoaded } = useUser();
  
  if (!isLoaded) {
    return (
      <div className="mb-6 p-5 rounded-xl bg-secondary/50 border border-border animate-pulse">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-muted mb-3"></div>
          <div className="h-4 bg-muted rounded w-32 mb-2"></div>
          <div className="h-3 bg-muted rounded w-40"></div>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="mb-6 p-4 rounded-xl bg-secondary/50 border border-border">
        <SignInButton mode="modal">
          <button className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
            Sign In
          </button>
        </SignInButton>
      </div>
    );
  }
  
  return (
    <div className="mb-5 space-y-3">
      {/* User Profile Card - Professional Centered Layout */}
      <div className="p-4 rounded-lg bg-gradient-to-br from-secondary/60 to-secondary/30 border border-border shadow-sm">
        <div className="flex flex-col items-center text-center">
          {/* Circular Avatar with Ring */}
          <div className="relative mb-2.5">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-sm opacity-30"></div>
            <Image 
              src={user.imageUrl} 
              alt={user.firstName || 'User'} 
              width={56} 
              height={56} 
              className="relative rounded-full border-3 border-background shadow-md"
            />
          </div>
          
          {/* User Info */}
          <div className="mb-2.5">
            <h3 className="font-semibold text-foreground text-sm mb-0.5">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
              {user.primaryEmailAddress?.emailAddress}
            </p>
          </div>
          
          {/* Sign Out Button */}
          <SignOutButton>
            <button className="w-full py-1.5 px-3 bg-muted hover:bg-accent rounded-md text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-all">
              <GoSignOut className="text-sm" />
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>
      
      {/* Pro Access */}
      <div className="p-3 rounded-lg bg-secondary/30 border border-border">
        <CustomApiKey preloadedData={preloadedData} />
      </div>
    </div>
  );
};

const RightHamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [preloadedData, setPreloadedData] = useState<any>(null);
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  // Pre-load usage data immediately when component mounts
  React.useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        const res = await fetch('/api/pro/status', { 
          method: 'GET', 
          credentials: 'include',
          cache: 'no-cache'
        });
        const data = await res.json();
        if (data?.success) {
          setPreloadedData(data);
        }
      } catch (err) {
        console.warn('Failed to preload pro status:', err);
      }
    };
    loadData();
  }, [user]);

  // Determine which items to show based on current page
  const getMenuItems = () => {
    const currentPath = pathname || '';
    const allItems = [
      { 
        icon: IoMdHelpCircleOutline, 
        label: "Chat", 
        href: "/app",
        // Show Chat button when NOT on home page or actual chat pages
        // Should show on: OCR, Help, Quiz pages
        show: currentPath !== '/app' && 
              !currentPath.match(/^\/app\/[a-f0-9-]{21}$/) // Only hide on actual chat IDs (nanoid format)
      },
      { 
        icon: FaBrain, 
        label: "Quiz", 
        href: "/quiz",
        show: !currentPath.startsWith('/quiz')
      },
      { 
        icon: AiOutlineFileText, 
        label: "OCR Analysis", 
        href: "/app/ocr",
        show: !currentPath.startsWith('/app/ocr')
      },
      { 
        icon: IoMdHelpCircleOutline, 
        label: "Help", 
        href: "/app/help",
        show: !currentPath.startsWith('/app/help')
      },
    ];

    return allItems.filter(item => item.show);
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Hamburger Button - Centered with Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-[0.8rem] right-3 sm:top-[1rem] sm:right-4 md:right-6 z-[9999] w-11 h-11 md:w-10 md:h-10 rounded-lg bg-primary hover:bg-primary/90 shadow-lg flex items-center justify-center transition-all touch-manipulation active:scale-95"
        aria-label="Menu"
      >
        {isOpen ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-primary-foreground">
            <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-primary-foreground">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Menu Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.2 }}
            className="fixed top-0 right-0 h-full w-[280px] sm:w-72 bg-card border-l border-border shadow-2xl z-[58] overflow-y-auto"
          >
            <div className="p-5 pt-16 pb-6">
              {/* User Account Section */}
              <UserAccountSection preloadedData={preloadedData} />
              
              {/* Menu Items */}
              <div className="space-y-1 mb-4">
                {menuItems.map((item, index) => (
                  <button
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-secondary/60 transition-colors group"
                  >
                    <item.icon className="text-muted-foreground group-hover:text-foreground text-base transition-colors" />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground font-medium transition-colors">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
              
              {/* Settings Section */}
              <div className="border-t border-border pt-4 space-y-1">
                {/* Theme Toggle */}
                <div className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-secondary/60 transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <MdOutlineDarkMode className="text-muted-foreground group-hover:text-foreground text-base transition-colors" />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground font-medium transition-colors">Theme</span>
                  </div>
                  <ThemeSwitch />
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-[10px] text-muted-foreground text-center">
                  InsightLLM v2.0
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RightHamburgerMenu;
