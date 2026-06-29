"use client";

import LoadingState from "@/components/ui/loading-state";

export default function Loading() {
  return (
    <section className="w-full h-full flex items-center justify-center bg-[#F8FAFC] dark:bg-zinc-950 animate-in fade-in duration-300">
      <LoadingState />
    </section>
  );
}

