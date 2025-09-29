"use client";

import { MessageProps } from "@/types/types";
import React, { useEffect, useOptimistic, startTransition } from "react";
import dynamic from "next/dynamic";

const ChatProvider = dynamic(
  () => import("./chat-provider"),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-sm opacity-70">Loading editor…</div>
    ),
  }
);
import ChatActionsBtns from "./chat-actions-btns";
import insightZustand from "@/utils/insight-zustand";

const OptimisticChat = ({
  message,
  name,
  image,
}: {
  message: MessageProps[];
  name: string;
  image: string;
}) => {
  const [optimisticChats, addOptimisticChat] = useOptimistic(
    message,
    (state, newChat: MessageProps) => [...state, newChat]
  );
  const { currChat, setPrevChat, setCurrChat, optimisticPrompt, optimisticResponse, inputImgName, setOptimisticResponse } = insightZustand();

  useEffect(() => {
    if (optimisticResponse) {
      startTransition(() => {
        addOptimisticChat({
          id: Date.now().toString(),
          user_prompt: optimisticPrompt ?? "",
          llm_response: optimisticResponse ?? "",
          img_name: inputImgName ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });
    }
    // setCurrChat("userPrompt", null);
    if (message && message.length > 0) {
      setPrevChat({
        userPrompt: message[message.length - 1].user_prompt ?? "",
        llmResponse: message[message.length - 1].llm_response ?? "",
        imgName: message[message.length - 1].img_name ?? undefined
      })
    }
  }, [optimisticResponse, message]);

  return (
    <>
      {optimisticChats.map((chat: MessageProps) => (
        <div key={chat.id} className="my-16 mt-10">
          <ChatProvider
            chatUniqueId={chat.id}
            imgInfo={{ imgSrc: image, imgAlt: name }}
            imgName={chat.img_name ?? undefined}
            llmResponse={chat.llm_response ?? ""}
            userPrompt={chat.user_prompt ?? ""}
          />
        </div>
      ))}
    </>
  );
};

export default OptimisticChat;

