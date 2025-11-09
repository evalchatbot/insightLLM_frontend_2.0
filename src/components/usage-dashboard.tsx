"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { UsageDisplay } from "./header-components/usage-display";
import { useUser } from "@clerk/nextjs";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { FaChartBar } from "react-icons/fa";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SheetPrimitive.Portal>
    <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <SheetPrimitive.Content
      ref={ref}
      className={`fixed z-50 gap-4 bg-[#1a1625] p-6 shadow-2xl transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 right-0 inset-y-0 h-full w-full sm:w-[420px] border-l border-purple-900/30 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right ${className}`}
      {...props}
    >
      <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
        <svg
          className="h-5 w-5 text-purple-200 hover:text-purple-100"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
      {children}
    </SheetPrimitive.Content>
  </SheetPrimitive.Portal>
));
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col space-y-2 text-center sm:text-left ${className}`} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={`text-xl font-bold text-purple-100 ${className}`}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

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
  };
  isPro: boolean;
  hasAccess?: boolean;
  daysLeft?: number;
  end_date?: string;
}

interface Usage {
  tokens_input: number;
  tokens_output: number;
  period_start: string;
}

interface Limits {
  input_tokens: number;
  output_tokens: number;
}

export default function UsageDashboard() {
  const { user } = useUser();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [isPro, setIsPro] = useState(false);

  const fetchUsageData = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/pro/status', { 
        method: 'GET', 
        credentials: 'include',
        cache: 'no-cache' // Don't cache the response
      });
      
      if (!res.ok) {
        console.error('Failed to fetch usage data:', await res.text());
        return;
      }

      const data: APIResponse = await res.json();
      if (data?.success) {
        // Handle the case where usage might be null for new users
        const usageData = data.usage || {
          tokens_input_used: 0,
          tokens_output_used: 0,
          period_start: new Date().toISOString().slice(0, 7) + "-01"
        };

        setUsage({
          tokens_input: usageData.tokens_input_used || 0,
          tokens_output: usageData.tokens_output_used || 0,
          period_start: usageData.period_start,
        });
        
        // Set limits from the API response or use defaults
        setLimits({
          input_tokens: data.limits?.input_tokens || (data.isPro ? 1000000 : 250000),
          output_tokens: data.limits?.output_tokens || (data.isPro ? 3000000 : 500000),
        });
        setIsPro(data.isPro || false);
      }
    } catch (err) {
      console.error('Failed to fetch usage data:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsageData();
      // Refresh usage data every 2 minutes (reduced frequency)
      const interval = setInterval(fetchUsageData, 120000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <FaChartBar className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-[#1a1625] border-l border-purple-900/30 overflow-y-auto">
        <SheetHeader className="pr-8">
          <SheetTitle className="text-purple-100">
            {isPro ? "Pro Usage Dashboard" : "Free Usage Dashboard"}
          </SheetTitle>
          <p className="text-sm text-purple-300/70 mt-1">
            Track your monthly token usage
          </p>
        </SheetHeader>
        {usage && limits ? (
          <div className="mt-6 pr-2">
            <UsageDisplay usage={usage} limits={limits} />
          </div>
        ) : (
          <div className="mt-6 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent"></div>
            <p className="text-purple-200/70 mt-4">Loading usage data...</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}