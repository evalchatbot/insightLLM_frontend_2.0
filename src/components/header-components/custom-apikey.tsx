"use client";
import React, { useEffect, useState } from "react";
import DevPopover from "../dev-components/dev-popover";
import DevButton from "../dev-components/dev-button";
import { FaBrain } from "react-icons/fa";
import DevInput from "../dev-components/dev-input";
import { IoMdArrowForward } from "react-icons/io";
import { MdArrowOutward } from "react-icons/md";
import { MdDelete } from "react-icons/md";
import insightZustand from "@/utils/insight-zustand";

const CustomApiKey = () => {
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const { setGeminiApiKey, setToast } = insightZustand();

  useEffect(() => {
    const storedKey = localStorage.getItem("geminiApiKey");
    if (storedKey) {
      setApiKey(storedKey);
      setGeminiApiKey(storedKey);
      setHasKey(true);
    } else {
      setGeminiApiKey(process.env.NEXT_PUBLIC_API_KEY as string);
    }
  }, []);

  const handleAddApiKey = () => {
    if (apiKey) {
      setGeminiApiKey(apiKey);
      localStorage.setItem("geminiApiKey", apiKey);
      setToast("API Key added successfully");
      setHasKey(true);
    }
  };

  const handleRemoveApiKey = () => {
    setGeminiApiKey(process.env.NEXT_PUBLIC_API_KEY as string);
    localStorage.removeItem("geminiApiKey");
    setToast("API Key removed successfully");
    setApiKey("");
    setHasKey(false);
  };

  return (
    <DevPopover
      contentClick={false}
      popButton={
        <DevButton variant="v1" className="gap-2 text-sm md:!flex !hidden">
          <FaBrain className="text-lg text-[#4E82EE]" />
          Try Insight LLM Pro
        </DevButton>
      }
    >
      <div className="w-60 h-fit p-2 space-y-2">
        <a
          className="text-sm opacity-80 hover:underline hover:text-accentBlue"
          target="_blank"
          href="https://aistudio.google.com/app/apikey"
        >
          Add Your API Key <MdArrowOutward className="inline text-lg" />
        </a>

        <div
          className="flex gap-2"
        >
          <DevInput
            type="password"
            placeholder="Enter API Key"
            rounded="md"
            size="sm"
            value={apiKey}
          onKeyDown={(e) => e.key === "Enter" && handleAddApiKey()}
            onChange={(e) => setApiKey(e.target.value)}
            reverseIcon
            icon={
              <DevButton onClick={hasKey ? handleRemoveApiKey : handleAddApiKey} type="submit" variant="v1" asIcon>
                {hasKey ? (
                  <MdDelete className="text-red-500" />
                ) : (
                  <IoMdArrowForward />
                )}
              </DevButton>
            }
          />
        </div>
      </div>
    </DevPopover>
  );
};

export default CustomApiKey;

