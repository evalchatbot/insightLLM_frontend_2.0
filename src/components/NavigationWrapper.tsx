"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

const NavigationWrapper = () => {
    const pathname = usePathname();

    // No navbar on the login screen.
    if (pathname === "/login") return null;

    return <Navbar />;
};

export default NavigationWrapper;
