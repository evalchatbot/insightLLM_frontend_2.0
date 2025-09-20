"use client";
import { create } from "zustand";
import { Message } from "../types/types";

interface GeminiState {
  msgLoader: boolean;
  setMsgLoader: (msgLoader: boolean) => void;
  setPrevChat: (newChat: Message) => void;
  prevChat: Message;
  topLoader: boolean;
  setTopLoader: (topLoader: boolean) => void;
  currChat: Message;
  setCurrChat: (name: string | null, value: string | null) => void;
  optimisticResponse:string | null,
  setOptimisticResponse:(optimisticResponse:string | null)=>void,
  setToast:(toast:string|null)=>void,
  devToast:string | null,
  inputImgName:string | null,
  setInputImgName:(inputImgName:string | null)=>void,
  optimisticPrompt:string | null,
  setOptimisticPrompt:(optimisticPrompt:string | null)=>void
  customPrompt:{prompt:string|null, placeholder:string|null},
  setCustomPrompt:(value:{prompt:string|null, placeholder:string|null})=>void
  geminiApiKey:string | null,
  setGeminiApiKey:(geminiApiKey:string | null)=>void
}

const insightZustand = create<GeminiState>()((set) => ({
  msgLoader: false,
  devToast:null,
  prevChat: { userPrompt: "", llmResponse: "" },
  topLoader: false,
  setToast:(value:string|null)=>set({devToast:value}),
  optimisticResponse:null,
  optimisticPrompt:null,
  inputImgName:null,
  customPrompt:{prompt:null, placeholder:null},
  setCustomPrompt:(value:{prompt:string|null, placeholder:string|null})=>set({customPrompt:value}),
  setOptimisticPrompt:(value:string|null)=>set({optimisticPrompt:value}),
  setInputImgName:(value:string|null)=>set({inputImgName:value}),
  currChat: { userPrompt: "", llmResponse: "" },
  setTopLoader: (topLoader) => set({ topLoader }),
  setMsgLoader: (msgLoader) => set({ msgLoader }),
  setOptimisticResponse:(optimisticResponse:string | null)=>set({optimisticResponse}),
  setPrevChat: (newChat: Message) => set({ prevChat: newChat }),
  geminiApiKey:process.env.NEXT_PUBLIC_API_KEY as string,
  setGeminiApiKey:(geminiApiKey:string | null)=>set({geminiApiKey}),
  setCurrChat: (name: string | null, value: string | null) =>
    set((state) => ({
      currChat: { ...state.currChat, [name as string]: value },
    })),
}));

export default insightZustand;


