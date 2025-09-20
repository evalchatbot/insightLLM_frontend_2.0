"use client";
import React, { createContext, useContext, ReactNode } from 'react';
import { useSidebarData } from '@/hooks/useSidebarData';

interface SidebarContextType {
  sidebarData: any;
  isLoading: boolean;
  error: string | null;
  refreshSidebar: () => void;
  updateChatInSidebar: (chatID: string, updates: any) => void;
  removeChatFromSidebar: (chatID: string) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const sidebarOperations = useSidebarData();

  return (
    <SidebarContext.Provider value={sidebarOperations}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebarContext = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebarContext must be used within a SidebarProvider');
  }
  return context;
};
