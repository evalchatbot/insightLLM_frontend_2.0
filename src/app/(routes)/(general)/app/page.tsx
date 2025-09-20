import { currentUser } from "@clerk/nextjs/server";
import HomeCards from "@/components/temp-components/home-cards";
import React from "react";


const page = async () => {
  const user = await currentUser();

  return (
    <section className="mt-5 fade-in-section w-full max-w-4xl mx-auto md:p-10 p-5">
      <h2 className="text-animation inline-block bg-gradient-to-r from-[#4E82EE] to-[#D96570] bg-clip-text md:text-5xl text-4xl text-transparent font-medium">
        Hello, {user ? user.firstName : "Guest"}
      </h2>
      <h3 className="md:text-5xl text-4xl text-wrap text-accentGray/50">
        {user ? "How can I help you today?" : "Sign in to get started"}
      </h3>
      <HomeCards />
    </section>
  );
};

export default page;

