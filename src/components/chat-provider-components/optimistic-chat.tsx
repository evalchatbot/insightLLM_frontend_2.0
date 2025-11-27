"use client";

import { MessageProps } from "@/types/types";
import React, { useEffect, useOptimistic, startTransition } from "react";
import dynamic from "next/dynamic";
import ChatProvider from "./chat-provider";
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
  const optimisticIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (optimisticResponse) {
      // Check if this optimistic message already exists in the actual messages
      const alreadyExists = message.some(
        (msg) => msg.user_prompt === optimisticPrompt && msg.llm_response === optimisticResponse
      );
      
      // Only add optimistic chat if it doesn't exist in actual messages
      if (!alreadyExists) {
        const newId = Date.now().toString();
        // Only add if we haven't added this exact response before
        if (optimisticIdRef.current !== optimisticResponse) {
          optimisticIdRef.current = optimisticResponse;
          startTransition(() => {
            addOptimisticChat({
              id: newId,
              user_prompt: optimisticPrompt ?? "",
              llm_response: optimisticResponse ?? "",
              img_name: inputImgName ?? null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          });
        }
      } else {
        // Message exists in DB, clear optimistic state
        setOptimisticResponse(null);
        optimisticIdRef.current = null;
      }
    } else {
      // Reset ref when optimistic response is cleared
      optimisticIdRef.current = null;
    }
    
    if (message && message.length > 0) {
      setPrevChat({
        userPrompt: message[message.length - 1].user_prompt ?? "",
        llmResponse: message[message.length - 1].llm_response ?? "",
        imgName: message[message.length - 1].img_name ?? undefined
      })
    }
  }, [optimisticResponse, message, optimisticPrompt, inputImgName, setOptimisticResponse, setPrevChat]);

  return (
    <>
      {optimisticChats.map((chat: MessageProps) => (
        <div key={chat.id} className="my-8 sm:my-12 md:my-16 mt-6 sm:mt-8 md:mt-10">
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

