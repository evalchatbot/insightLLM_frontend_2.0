"use client";
import React from "react";
import DevToast from "@/components/dev-components/dev-toast";

const QuizLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {children}
      <DevToast />
    </div>
  );
};

export default QuizLayout;
