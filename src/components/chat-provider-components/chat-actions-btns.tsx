"use client";
import React, { useState } from "react";
import { BiDislike, BiLike } from "react-icons/bi";
import DevButton from "../dev-components/dev-button";
import ReactTooltip from "../dev-components/react-tooltip";
import ModifyResponse from "./modify-response";
import ShareChat from "./share-chat";
import { FiMoreVertical } from "react-icons/fi";
import DevPopover from "../dev-components/dev-popover";
import { MdContentCopy, MdOutlineFlag } from "react-icons/md";
import insightZustand from "@/utils/insight-zustand";
import { MdSearch } from "react-icons/md";
// Link intentionally unused here
import { IoMdSearch } from "react-icons/io";


const ChatActionsBtns = ({
  chatID,
  llmResponse,
  userPrompt,
  shareMsg,
}: {
  chatID: string;
  llmResponse: string;
  userPrompt: string;
  shareMsg: string;
}) => {
  const { devToast, setToast } = insightZustand();
  // Use server proxy at /api/llm instead of SDK in browser
  const [searchRes, setSearchRes] = useState<string[] | null>(null)
  const [loader, setLoader] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareMsg);
      setToast('Copied to clipboard')
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleDoubleCheck = async () => {
    const prompt = `
      Generate a list of at least 5 different search queries based strictly on the user prompt. Provide the queries in an array json format without any unnecessary responses. Ensure the queries are relevant and varied but aligned with the user's prompt.
      Previous chats:
      Current User Query:
      ${userPrompt}`
    try {
      setLoader(true);
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = await res.json();
      const text = json.text;
      const searchResArray = JSON.parse(text.replace(/^```json\s*|\s*```$/gm, "").trim());
      setSearchRes(searchResArray);
    } catch (error) {
      console.log(error);
    } finally {
      setLoader(false);
    }
  }
  return (
    <>
      <div className="w-full flex items-center gap-1.5 sm:gap-2 !text-xl sm:!text-2xl mt-2 flex-wrap">
        {[
          { icon: BiLike, tipdata: "Good job" },
          { icon: BiDislike, tipdata: "Bad job" },
        ].map((item, index) => (
          <ReactTooltip key={index} tipData={item.tipdata}>
            <DevButton
              asIcon
              rounded="full"
              size="lg"
              variant="v2"
              className="opacity-80 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] touch-manipulation active:scale-95"
            >
              <item.icon />
            </DevButton>
          </ReactTooltip>
        ))}
        <ModifyResponse chatUniqueId={chatID} llmResponse={llmResponse} />
        <ShareChat shareMsg={shareMsg} />
        <ReactTooltip tipData="Double-check response">
          <DevButton
            asIcon
            rounded="full"
            onClick={handleDoubleCheck}
            size="lg"
            variant="v2"
            className="opacity-80 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] touch-manipulation active:scale-95"
          >
            {loader ? <span className="modal-loader"></span> : <MdSearch />}
          </DevButton>
        </ReactTooltip>
        <DevPopover
          place="top-start"
          popButton={
            <ReactTooltip tipData="more">
              <DevButton
                asIcon
                rounded="full"
                size="lg"
                variant="v2"
                className="opacity-80 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] touch-manipulation active:scale-95"
              >
                <FiMoreVertical />
              </DevButton>
            </ReactTooltip>
          }
        >
          <div className="w-52 py-2">
            <DevButton
              onClick={copyToClipboard}
              variant="v3"
              className="w-full !justify-start gap-3 group"
              rounded="none"
            >
              <MdContentCopy className="text-xl" />
              Copy
            </DevButton>
            <DevButton
              variant="v3"
              className="w-full !justify-start gap-3 group"
              rounded="none"
            >
              <MdOutlineFlag className="text-xl" />
              Report legal issue
            </DevButton>
          </div>
        </DevPopover>
      </div>

      {searchRes && searchRes.length > 0 && <div className="w-full md:w-[90%] mt-4 sm:mt-5 mx-auto overflow-hidden p-4 sm:p-5 rounded-xl sm:rounded-2xl space-y-2 sm:space-y-3 bg-accentGray/10">
        <h3 className="text-base sm:text-lg font-medium">Search related topics</h3>
        <div className="space-y-1">
          {
            searchRes.map((item, index) => <DevButton target="_blank" variant="v2" href={`https://www.google.com/search?q=${item}`} className="text-accentBlue/80 w-full !justify-start text-left flex items-center gap-2 hover:!bg-accentBlue/15 min-h-[44px] touch-manipulation active:scale-[0.98] text-sm sm:text-base" key={index}>
              <IoMdSearch className="text-lg sm:text-xl flex-shrink-0" />
              <p className="truncate">{item}</p>
            </DevButton>)
          }
        </div>
      </div>}
    </>
  );
};

export default ChatActionsBtns;

