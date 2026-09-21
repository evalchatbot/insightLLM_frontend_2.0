import { beforeEach, describe, expect, it } from "vitest";
import insightZustand from "@/utils/insight-zustand";

const initialState = insightZustand.getState();

beforeEach(() => {
  insightZustand.setState(initialState, true);
});

describe("insightZustand store", () => {
  it("starts with safe defaults (no API key, no conversation, loaders off)", () => {
    const s = insightZustand.getState();
    expect(s).toMatchObject({
      msgLoader: false,
      topLoader: false,
      devToast: null,
      optimisticResponse: null,
      optimisticPrompt: null,
      inputImgName: null,
      geminiApiKey: null,
      selectedGenre: "",
      availableGenres: [],
      autoSend: false,
      conversationID: null,
      customPrompt: { prompt: null, placeholder: null },
      prevChat: { userPrompt: "", llmResponse: "" },
      currChat: { userPrompt: "", llmResponse: "" },
    });
  });

  it.each([
    ["setMsgLoader", "msgLoader", true],
    ["setTopLoader", "topLoader", true],
    ["setToast", "devToast", "Saved!"],
    ["setOptimisticResponse", "optimisticResponse", "partial answer"],
    ["setOptimisticPrompt", "optimisticPrompt", "what is CSS?"],
    ["setInputImgName", "inputImgName", "scan.png"],
    ["setGeminiApiKey", "geminiApiKey", "key-123"],
    ["setSelectedGenre", "selectedGenre", "History"],
    ["setAvailableGenres", "availableGenres", ["History", "Economy"]],
    ["setAutoSend", "autoSend", true],
    ["setConversationID", "conversationID", "conv-1"],
    ["setCustomPrompt", "customPrompt", { prompt: "Summarize", placeholder: "Paste text" }],
    ["setPrevChat", "prevChat", { userPrompt: "q", llmResponse: "a" }],
  ] as const)("%s updates %s", (setter, key, value) => {
    (insightZustand.getState() as any)[setter](value);
    expect((insightZustand.getState() as any)[key]).toEqual(value);
  });

  it("setters accept null to clear values", () => {
    const s = insightZustand.getState();
    s.setToast("x");
    s.setConversationID("c");
    s.setToast(null);
    s.setConversationID(null);
    expect(insightZustand.getState().devToast).toBeNull();
    expect(insightZustand.getState().conversationID).toBeNull();
  });

  it("setCurrChat updates a single field and keeps the other", () => {
    const { setCurrChat } = insightZustand.getState();
    setCurrChat("userPrompt", "Explain federalism");
    setCurrChat("llmResponse", "Federalism is...");
    expect(insightZustand.getState().currChat).toEqual({
      userPrompt: "Explain federalism",
      llmResponse: "Federalism is...",
    });
    setCurrChat("userPrompt", null);
    expect(insightZustand.getState().currChat).toEqual({ userPrompt: null, llmResponse: "Federalism is..." });
  });

  it("notifies subscribers on change", () => {
    const seen: boolean[] = [];
    const unsubscribe = insightZustand.subscribe((state) => seen.push(state.msgLoader));
    insightZustand.getState().setMsgLoader(true);
    insightZustand.getState().setMsgLoader(false);
    unsubscribe();
    expect(seen).toEqual([true, false]);
  });
});
