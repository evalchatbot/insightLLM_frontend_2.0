import React from "react";

/**
 * Minimal layout for the two standalone feature routes (`/app/ocr`,
 * `/app/factbook`). The original chat sidebar / header / input-prompt
 * scaffolding was removed since this build only ships Evaluations + Fact Book.
 */
const GeneralLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="h-dvh w-full flex overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background">
      <div className="flex flex-1 min-w-0 h-full flex-col relative">
        <section className="flex-1 overflow-y-auto overflow-x-hidden w-full">
          {children}
        </section>
      </div>
    </main>
  );
};

export default GeneralLayout;
