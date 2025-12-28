"use client";
import React from "react";
import { usePathname } from "next/navigation";
import SidebarWrapper from "@/components/sidebar-components/sidebar-wrapper";
import Header from "@/components/header-components/header";
import InputPrompt from "@/components/input-prompt-components/input-prompt";
import DevToast from "@/components/dev-components/dev-toast";
// import RenewalNotificationBanner from "@/components/header-components/renewal-notification-banner"; // DISABLED: Renewal functionality is currently disabled
import { SidebarProvider } from "@/context/SidebarContext";

const GeneralLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  // Show input prompt only on /app (home) and /app/[chatid] (chat pages)
  // Exclude: /app/ocr, /app/help, /app/activity, /app/prompt-gallery
  const showInputPrompt = pathname === '/app' ||
    (pathname?.match(/^\/app\/[^/]+$/) &&
      !pathname.includes('/ocr') &&
      !pathname.includes('/help') &&
      !pathname.includes('/activity') &&
      !pathname.includes('/prompt-gallery'));

  // Hide sidebar on OCR and Help pages
  const showSidebar = !pathname?.includes('/ocr') && !pathname?.includes('/help');

  // Check if this is a chat page (for styling adjustments)
  const isChatPage = pathname === '/app' || 
    (pathname?.match(/^\/app\/[^/]+$/) && 
     !pathname.includes('/ocr') && 
     !pathname.includes('/help') &&
     !pathname.includes('/quiz') &&
     !pathname.includes('/prompt-gallery') &&
     !pathname.includes('/activity'));

  return (
    <SidebarProvider>
      {/* <RenewalNotificationBanner /> */} {/* DISABLED: Renewal functionality is currently disabled */}
      <main className={`h-dvh w-full flex overflow-hidden ${
        isChatPage 
          ? 'bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 dark:from-zinc-950 dark:via-emerald-950/20 dark:to-zinc-950' 
          : 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background'
      }`}>
        {showSidebar && <SidebarWrapper />}
        <div className="flex flex-1 min-w-0 h-full flex-col relative">
          {/* Header removed to use global Navbar/RightNavbar */}
          <section className="flex-1 overflow-y-auto overflow-x-hidden w-full">
            {children}
          </section>
          {showInputPrompt && <InputPrompt />}
        </div>
        <DevToast />
      </main>
    </SidebarProvider>
  );
};

export default GeneralLayout;

