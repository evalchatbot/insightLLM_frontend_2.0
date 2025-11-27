"use client";
import insightZustand from "@/utils/insight-zustand";
import { FormatOutput } from "@/utils/shadow";
import MarkdownRenderer from "./MarkdownRenderer";
import Image from "next/image";
import React, { useEffect } from "react";
import { FaBrain } from "react-icons/fa";
import root from "react-shadow/styled-components";
import GradientLoader from "./gradient-loader";
import { MdImageSearch, MdOutlineImage } from "react-icons/md";
import { BsImage } from "react-icons/bs";

const MsgLoader = ({
  name,
  image,
}: {
  name: string;
  image: string;
}) => {
  const { currChat, msgLoader, inputImgName } = insightZustand();
  return (
    msgLoader && (
      <div key="loader" className="my-8 sm:my-12 md:my-16 mt-6 sm:mt-8 md:mt-10 fade-in-element">
        <div className="w-full h-fit flex items-start gap-2 sm:gap-3">
          <Image
            src={image}
            alt={name}
            width={32}
            height={32}
            className="rounded-full cursor-pointer w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0"
          />
          <textarea
            className="prompt-area pt-1 max-h-32 sm:max-h-40 text-sm sm:text-base resize-none bg-transparent outline-none rounded-md px-1 w-full touch-manipulation"
            readOnly
            value={currChat.userPrompt}
          />
        </div>
        {inputImgName &&
          <div className="w-full mt-2 sm:mt-3 overflow-hidden">
            <div className="p-3 sm:p-4 max-w-full w-fit bg-rtlLight dark:bg-rtlDark rounded-md flex items-start gap-2">
              <MdOutlineImage className="text-2xl sm:text-3xl md:text-4xl" />
              <p className="text-base sm:text-lg truncate"> {inputImgName}</p></div>
          </div>
        }
        <div className="w-full flex justify-end h-12 sm:h-14 md:h-16 items-center">
        </div>
        <div id="new-chat" className="flex md:flex-row flex-col w-full items-start gap-3 sm:gap-4">
          <div className="relative flex-shrink-0">
            <FaBrain className="text-3xl sm:text-4xl text-emerald-600 dark:text-emerald-400 transition-all duration-500" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
          {!currChat.llmResponse ? (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">AI is thinking</span>
              <span className="inline-block w-0.5 h-5 bg-emerald-600 dark:bg-emerald-400 animate-blink"></span>
            </div>
          ) : (
            <root.div className="w-full -translate-y-4">
              <FormatOutput>
                {/* Use partial heuristic for streaming. If msgLoader is true we keep partial styling */}
                <MarkdownRenderer source={currChat.llmResponse} partial={true} className="text-base" />
                <span className="inline-block w-0.5 h-5 bg-emerald-600 dark:bg-emerald-400 animate-blink ml-1 align-middle"></span>
              </FormatOutput>
            </root.div>
          )}
        </div>
      </div>
    )
  );
};

export default MsgLoader;

