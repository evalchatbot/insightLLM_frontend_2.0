import { currentUser } from "@clerk/nextjs/server";
import HomeCards from "@/components/temp-components/home-cards";
import OCRCard from "@/components/OCRCard";
import React from "react";


const page = async () => {
  const user = await currentUser();

  return (
    <section className="mt-5 fade-in-section w-full max-w-4xl mx-auto md:p-10 p-5">
      <h2 className="text-animation inline-block bg-gradient-to-r from-[#4E82EE] to-[#D96570] bg-clip-text md:text-5xl text-4xl text-transparent font-medium">
        Hello, {user ? user.firstName : "Guest"}
      </h2>
      <h3 className="md:text-5xl text-4xl text-wrap text-muted-foreground">
        {user ? "How can I help you today?" : "Sign in to get started"}
      </h3>
      
      <div className="mt-8">
        <h4 className="text-lg font-medium text-foreground mb-4">
          💬 Quick Constitutional Law Prompts
        </h4>
        <HomeCards />
      </div>
    </section>
  );
};

export default page;

