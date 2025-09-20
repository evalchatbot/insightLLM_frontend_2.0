import React from "react";
import SidebarWrapper from "@/components/sidebar-components/sidebar-wrapper";
import Header from "@/components/header-components/header";
import InputPrompt from "@/components/input-prompt-components/input-prompt";
import DevToast from "@/components/dev-components/dev-toast";
import { SidebarProvider } from "@/context/SidebarContext";

const GeneralLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <main className="h-dvh w-full flex overflow-hidden">
        <SidebarWrapper />
        <div className="flex flex-grow h-full overflow-hidden flex-col justify-between relative">
          <Header />
          <section className="w-full flex-grow overflow-y-auto relative mx-auto">
            {children}
          </section>
            <InputPrompt />
        </div>
        <DevToast/>
      </main>
    </SidebarProvider>
  );
};

export default GeneralLayout;

