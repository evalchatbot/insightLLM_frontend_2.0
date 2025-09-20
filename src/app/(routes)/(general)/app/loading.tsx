"use client";
import GradientLoader from "@/components/chat-provider-components/gradient-loader";
import insightZustand from "@/utils/insight-zustand";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { BsImage } from "react-icons/bs";
import { MdImageSearch, MdOutlineImage } from "react-icons/md";
import { FaBrain } from "react-icons/fa";

export default function Loading() {
  const { currChat, msgLoader, inputImgName } = insightZustand();
  const { user } = useUser();
  return (
    <section className="w-full h-full">
      {
        msgLoader ? (
          <div className=" mx-auto max-w-3xl w-full p-4">
            <div key="loader" className="my-16 mt-10 fade-in-element">
              <div className="w-full h-fit flex items-start gap-3">
                <Image
                  src={user?.imageUrl || "/default-avatar.png"}
                  alt={user?.fullName || "User"}
                  width={35}
                  height={35}
                  className="rounded-full cursor-pointer"
                />
                <textarea
                  className="prompt-area pt-1 text-base resize-none bg-transparent outline-none rounded-md px-1 w-full"
                  rows={5}
                  readOnly
                  value={currChat.userPrompt}
                />
              </div>
              {inputImgName &&
                <div className="w-full mt-3">
                  <div className="p-4 max-w-full w-fit bg-rtlLight overflow-hidden dark:bg-rtlDark rounded-md flex items-start gap-2">
                    <MdOutlineImage className="text-4xl" />
                    <p className="text-lg truncate"> {inputImgName}</p></div>
                </div>
              }
              <div className="w-full flex justify-end h-16 items-center">
              </div>
              <div id="new-chat" className="flex md:flex-row flex-col w-full items-start gap-4">
                <FaBrain className="text-4xl text-[#4E82EE] animate-spin transition-all duration-500" />
                <GradientLoader />
              </div>
            </div>
          </div>
        ) : (
          <div className="loader" />
        )
      }
    </section>
  )
}

