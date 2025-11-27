"use client";
import React from "react";
import TopLoader from "./top-loader";

const Header = () => {
  return (
  <header className="sticky top-0 inset-x-0 w-full h-14 sm:h-16 flex-shrink-0 flex items-center justify-center px-4 sm:px-6 md:px-10 bg-card/95 backdrop-blur-md z-30 border-b border-border/50">
      {/* Genre selector removed - no longer needed */}
      <TopLoader />
    </header>
  );
};

export default Header;

