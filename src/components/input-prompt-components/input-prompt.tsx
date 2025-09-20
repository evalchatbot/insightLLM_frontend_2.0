"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import insightZustand from "@/utils/insight-zustand";
import { useParams, useRouter } from "next/navigation";
import { createChat } from "@/actions/actions";
import { nanoid } from "nanoid";
import { useMeasure } from "react-use";
import { useUser } from "@clerk/nextjs";
import InputActions from "./input-actions";
import Link from "next/link";
import { MdImageSearch } from "react-icons/md";
import { IoMdClose } from "react-icons/io";

const InputPrompt = () => {
  const { user, isLoaded } = useUser();
  const { currChat, setCurrChat, setToast, customPrompt, setInputImgName, inputImgName, setMsgLoader, prevChat, msgLoader, optimisticResponse, setOptimisticResponse, setOptimisticPrompt, geminiApiKey } =
    insightZustand();
  const [inputImg, setInputImg] = useState<File | null>(null)

  const { chat } = useParams();
  const router = useRouter();
  const [inputRref, { height }] = useMeasure<HTMLTextAreaElement>();
  const chatID = (chat as string) || nanoid();
  // Gemini proxy will be called via server route /api/llm
  const cancelRef = useRef(false);

  const generateMsg = useCallback(async () => {
    if (!currChat.userPrompt?.trim() || !user) return;
    router.push(`/app/${chatID}#new-chat`);
    const date = new Date().toISOString().split("T")[0];
    // const userName = user?.name?.split(" ")[0] || "User";
    let rawPrompt = currChat.userPrompt;
    let rawImage = inputImgName;
    const detailedPrompt = `
      Date: ${date}

      ${customPrompt.prompt ? customPrompt : `User, is seeking a wise and impressive response. Consider including necessary details, context, and thoughtful insights. Aim to provide a comprehensive, well-structured, and articulate answer. Respond in a friendly and natural manner, using terms like "buddy" or other friendly expressions. Provide a complete and final response without asking any further questions.`}

      Previous chats:
      User: ${prevChat.userPrompt}
      LLM Response: ${prevChat.llmResponse}

      Current User Query:
      ${rawPrompt}
    `;

    const fileToGenerativePart = (file: File) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({
          inlineData: {
            data: typeof reader?.result === 'string' ? reader?.result.split(',')[1] : undefined,
            mimeType: file.type
          },
        });
        reader.readAsDataURL(file);
      });
    };

    try {
      setMsgLoader(true);
      let text = "";
      try {
        const body: any = { prompt: detailedPrompt };
        if (inputImg) {
          const imagePart = await fileToGenerativePart(inputImg);
          body.image = { data: (imagePart as any).inlineData.data, mimeType: inputImg.type };
        }
        const res = await fetch("/api/llm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        text = json.text;
        setCurrChat("llmResponse", text);
      } catch (err: any) {
        console.error("LLM proxy error:", err);
        setToast(`Error: ${err?.message || "LLM error"}`);
      }
      if (!text) return;
      setOptimisticPrompt(rawPrompt);
      setOptimisticResponse(text);
      setMsgLoader(false);
      setCurrChat("userPrompt", null);

      await createChat({
        chatID,
        userID: user?.id as string,
        imgName: rawImage ?? undefined,
        userPrompt: rawPrompt,
        llmResponse: text,
      });
    } catch (error) {
      console.error("Error generating message:", error);
    } finally {
      setMsgLoader(false);
      setInputImg(null)
      setInputImgName(null)
      setCurrChat("userPrompt", null);
      setCurrChat("llmResponse", null);
      setOptimisticResponse(null);
      setOptimisticPrompt(null);

    }
  }, [
    currChat.userPrompt,
    user,
    chat,
    prevChat,
    setCurrChat,
    setMsgLoader,
    router,
  ]);

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCurrChat("userPrompt", e.target.value);
    },
    [setCurrChat]
  );
  const handleCancel = useCallback(() => {
    cancelRef.current = true;
    setOptimisticResponse("User has aborted the request");
    setMsgLoader(false);
  }, [setOptimisticResponse, setMsgLoader]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!user) { setToast('Please sign in to use Insight LLM!') }
      if (e.key === "Enter" && !e.shiftKey) {
        cancelRef.current = false;
        generateMsg();
      }
    },
    [generateMsg]
  );

  // Note: User data is now accessed directly via useUser() hook instead of storing in Zustand

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target && event.target.files) {
      const file = event.target.files[0];
      setInputImg(file);
      setInputImgName(file.name);
    }
  };

  return (
    <div className=" flex-shrink-0 w-full md:px-10 px-5 pb-2 space-y-2 bg-white dark:bg-[#131314]">
      {inputImgName &&
        <div className="max-w-4xl overflow-hidden w-full mx-auto">
          <div className="p-5 w-fit relative max-w-full overflow-hidden bg-rtlLight group dark:bg-rtlDark rounded-t-3xl flex items-start gap-2">
            <MdImageSearch className="text-4xl" />
            <p className="text-lg font-semibold truncate"> {inputImgName}</p>
            <IoMdClose onClick={() => { setInputImgName(null); setInputImg(null) }} className="absolute top-1 right-1 text-2xl rounded-full cursor-pointer hover:opacity-100 hidden group-hover:block opacity-80 bg-accentGray/40 p-1" />
          </div>
        </div>
      }
      <div
        className={`w-full md:border-8 border-4 relative border-rtlLight dark:border-rtlDark max-w-4xl mx-auto min-h-16 md:rounded-[50px] rounded-2xl ${inputImgName && " !rounded-tl-none "} overflow-hidden bg-rtlLight dark:bg-rtlDark flex gap-1 md:items-center md:justify-between md:flex-row flex-col `}
      >

        <textarea
          name="prompt"
          ref={inputRref}
          disabled={msgLoader}
          placeholder={customPrompt.placeholder ? customPrompt.placeholder : "Enter a prompt here"}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          value={optimisticResponse || msgLoader ? "" : currChat.userPrompt || ""}
          className={`flex-1 bg-transparent rounded-4xl p-2 pl-6 outline-none text-lg max-h-56 resize-none`}
        />
        <InputActions handleCancel={handleCancel} handleImageUpload={handleImageUpload} generateMsg={generateMsg} />

      </div>
      <p className="text-xs font-light opacity-80 text-center">Insight LLM may display inaccurate info, including about people, so double-check its responses. <Link className="underline" href="/">Your privacy & AI Apps</Link></p>
    </div>
  );
};

export default InputPrompt;

