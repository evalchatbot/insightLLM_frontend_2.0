"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import RightNavbar from "./RightNavbar";

const NavigationWrapper = () => {
    const pathname = usePathname();

    // Show RightNavbar (hamburger on right) for chat pages: /app and /app/[chat]
    // Exclude other /app routes like /app/ocr, /app/help, etc.
    const isChatPage = pathname === '/app' || 
        (pathname?.match(/^\/app\/[^/]+$/) && 
         !pathname.includes('/ocr') && 
         !pathname.includes('/factbook') &&
         !pathname.includes('/help') &&
         !pathname.includes('/quiz') &&
         !pathname.includes('/prompt-gallery') &&
         !pathname.includes('/activity'));

    // Show regular Navbar for all other pages
    if (isChatPage) {
        return <RightNavbar />;
    }

    return <Navbar />;
};

export default NavigationWrapper;
