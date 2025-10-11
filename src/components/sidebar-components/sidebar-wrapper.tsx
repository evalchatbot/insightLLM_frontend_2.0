"use client";
import React from 'react';
import { useSidebarContext } from '@/context/SidebarContext';
import SideBar from './sidebar';

const SidebarWrapper = () => {
  const { sidebarData, isLoading, error } = useSidebarContext();

  // Show loading state
  if (isLoading) {
    return (
      <section className="h-full md:flex-shrink-0 bg-card md:transform-none transition-[width] md:w-[70px] w-0 opacity-0 pointer-events-none md:pointer-events-auto md:opacity-100 fixed inset-0 p-3 w-[300px] flex flex-col justify-between z-10 md:relative overflow-hidden md:z-0">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-6 bg-muted rounded"></div>
            <div className="h-6 bg-muted rounded"></div>
            <div className="h-6 bg-muted rounded"></div>
          </div>
        </div>
      </section>
    );
  }

  // Show error state
  if (error) {
    return (
      <section className="h-full md:flex-shrink-0 bg-card md:transform-none transition-[width] md:w-[70px] w-0 opacity-0 pointer-events-none md:pointer-events-auto md:opacity-100 fixed inset-0 p-3 w-[300px] flex flex-col justify-between z-10 md:relative overflow-hidden md:z-0">
        <div className="text-destructive text-sm p-4">
          Error loading sidebar: {error}
        </div>
      </section>
    );
  }

  return <SideBar sidebarList={sidebarData} />;
};

export default SidebarWrapper;
