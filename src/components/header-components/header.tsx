"use client";
import React from "react";
import SignInNow from "@/components/header-components/signin-now";
import TopLoader from "./top-loader";
import InsightLogo from "./insight-logo";
import { IoMdAdd } from "react-icons/io";
import DevButton from "../dev-components/dev-button";


const Header = () => {
  return (
  <header className="absolute inset-x-0 top-0 w-full h-fit flex-shrink-0 flex items-center p-3 md:px-10 px-5 md:justify-between justify-end bg-transparent z-50" style={{backgroundColor: 'transparent'}}>
      <div className="md:block hidden">
        <InsightLogo />
      </div>
     
      <SignInNow />
      <TopLoader />
    </header>
  );
};

export default Header;

