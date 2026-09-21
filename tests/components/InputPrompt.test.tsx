import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetClerk, signInAs } from "../helpers/clerk";
import { fetchCalls, mockFetch, type Route } from "../helpers/fetch";
import { resetNavigation, router, setLocation } from "../helpers/next-navigation";

vi.mock("@clerk/nextjs", async () => (await import("../helpers/clerk")).clerkClientModule);
vi.mock("next/navigation", async () => (await import("../helpers/next-navigation")).navigationModule);
vi.mock("@/actions/actions", () => ({ createChat: vi.fn(), renameChat: vi.fn() }));
vi.mock("@/components/chat-provider-components/MarkdownRenderer", () => ({
  default: ({ source }: { source?: string | null }) => <div data-testid="markdown">{source}</div>,
}));
vi.mock("@/components/input-prompt-components/input-actions", () => ({
  default: ({ generateMsg }: { generateMsg: () => void }) => <button onClick={generateMsg}>Send</button>,
}));

import InputPrompt from "@/components/input-prompt-components/input-prompt";
import { createChat, renameChat } from "@/actions/actions";
import insightZustand from "@/utils/insight-zustand";

const initialStore = insightZustand.getState();
const STREAM_URL = "http://backend.test/chatbot/ask-stream";

const sse = (event: object) => `data: ${JSON.stringify(event)}\n\n`;
const COMPLETE = {
  type: "complete",
  answer: "Federalism divides power.",
  metadata: { token_usage: { prompt_tokens: 12, completion_tokens: 5 }, suggested_title: "Federalism basics" },
};

function streamResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

function routes(chunks: string[], overrides: Partial<Record<"limit" | "usage", Route["respond"]>> = {}): Route[] {
  return [
    { method: "POST", url: "/api/chat/check-limit", respond: overrides.limit ?? { json: { success: true, can_proceed: true } } },
    { method: "POST", url: STREAM_URL, respond: () => streamResponse(chunks) },
    { method: "POST", url: "/api/chat/usage", respond: overrides.usage ?? { json: { success: true, is_pro: true } } },
  ];
}

async function ask(prompt = "Explain federalism") {
  const user = userEvent.setup();
  render(<InputPrompt />);
  await user.type(screen.getByPlaceholderText("Enter a prompt here"), prompt);
  await user.keyboard("{Enter}");
  return user;
}

beforeEach(() => {
  insightZustand.setState(initialStore, true);
  resetClerk();
  resetNavigation();
  signInAs({ id: "user_chat" });
  setLocation("/app/chat-1", "", { chat: "chat-1" });
  vi.mocked(createChat).mockResolvedValue({ success: true, conversationID: "conv-1" } as any);
  vi.mocked(renameChat).mockResolvedValue({ success: true } as any);
});

describe("InputPrompt (chatbot)", () => {
  it("checks the limit, streams the answer, records usage and saves the chat", async () => {
    const spy = mockFetch(routes([sse({ type: "chunk", content: "Federalism " }), sse({ type: "chunk", content: "divides power." }), sse(COMPLETE)]));
    await ask();

    await waitFor(() => expect(createChat).toHaveBeenCalled());
    expect(createChat).toHaveBeenCalledWith({
      chatID: "chat-1",
      userID: "user_chat",
      imgName: undefined,
      userPrompt: "Explain federalism",
      llmResponse: "Federalism divides power.",
    });
    expect(fetchCalls(spy)).toEqual(["POST /api/chat/check-limit", `POST ${STREAM_URL}`, "POST /api/chat/usage"]);

    const limitBody = JSON.parse(spy.mock.calls[0][1]!.body as string);
    expect(limitBody).toEqual({ input_tokens: Math.ceil("Explain federalism".length / 4), output_tokens: 1500 });
    const streamBody = JSON.parse(spy.mock.calls[1][1]!.body as string);
    expect(streamBody).toMatchObject({ user_id: "user_chat", question: "Explain federalism", genre: "General", mode: "adaptive" });
    const usageBody = JSON.parse(spy.mock.calls[2][1]!.body as string);
    expect(usageBody).toEqual({ input_tokens: 12, output_tokens: 5 });

    await waitFor(() => expect(renameChat).toHaveBeenCalledWith("chat-1", { title: "Federalism basics" }));
    const state = insightZustand.getState();
    expect(state.conversationID).toBe("conv-1");
    expect(state.optimisticResponse).toBe("Federalism divides power.");
    expect(state.currChat.userPrompt).toBeNull();
    expect(state.msgLoader).toBe(false);
  });

  it("blocks the request when the limit check returns 429", async () => {
    const spy = mockFetch(routes([], { limit: { status: 429, json: { message: "Free plan token limit reached.", is_pro: false } } }));
    const listener = vi.fn();
    window.addEventListener("refreshProStatus", listener);
    await ask();
    await waitFor(() => expect(insightZustand.getState().devToast).toBe("Free plan token limit reached."));
    window.removeEventListener("refreshProStatus", listener);
    expect(fetchCalls(spy)).toEqual(["POST /api/chat/check-limit"]);
    expect(listener).toHaveBeenCalled();
    expect(createChat).not.toHaveBeenCalled();
    expect(insightZustand.getState().msgLoader).toBe(false);
  });

  it("blocks the request when can_proceed is false", async () => {
    const spy = mockFetch(routes([], { limit: { json: { can_proceed: false, message: "Upgrade to continue" } } }));
    await ask();
    await waitFor(() => expect(insightZustand.getState().devToast).toBe("Upgrade to continue"));
    expect(fetchCalls(spy)).toHaveLength(1);
  });

  it("surfaces backend HTTP errors", async () => {
    mockFetch([
      { method: "POST", url: "/api/chat/check-limit", respond: { json: { can_proceed: true } } },
      { method: "POST", url: STREAM_URL, respond: { status: 502, text: "bad gateway" } },
    ]);
    await ask();
    await waitFor(() => expect(insightZustand.getState().devToast).toBe("Backend API error: HTTP error! status: 502 - bad gateway"));
    expect(createChat).not.toHaveBeenCalled();
  });

  it("reports stream 'error' events to the user", async () => {
    mockFetch(routes([sse({ type: "error", error: "Model overloaded" })]));
    await ask();
    await waitFor(() => expect(insightZustand.getState().devToast).toBe("Backend error: Model overloaded"));
  });

  it("asks signed-out users to sign in", async () => {
    resetClerk();
    const user = userEvent.setup();
    render(<InputPrompt />);
    await user.type(screen.getByPlaceholderText("Enter a prompt here"), "hi");
    expect(insightZustand.getState().devToast).toBe("Please sign in to use Insight LLM!");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("outside a chat route, opens a new chat and flags auto-send instead of calling the API", async () => {
    setLocation("/app", "", {});
    await ask("New question");
    expect(router.push).toHaveBeenCalledWith(expect.stringMatching(/^\/app\/[\w-]{21}$/));
    expect(insightZustand.getState().autoSend).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  // BUG: the SSE reader splits each network chunk on "\n" and JSON-parses every
  // "data:" line in isolation (src/components/input-prompt-components/input-prompt.tsx:182-192),
  // with no buffering across reads. An event split across two chunks (normal with
  // TCP/proxies) is dropped, here losing the whole answer.
  it.fails("assembles SSE events that are split across network chunks", async () => {
    const event = sse(COMPLETE);
    const cut = event.indexOf("divides");
    mockFetch(routes([event.slice(0, cut), event.slice(cut)]));
    await ask();
    await waitFor(() => expect(createChat).toHaveBeenCalled(), { timeout: 1000 });
    expect(vi.mocked(createChat).mock.calls[0][0]).toMatchObject({ llmResponse: "Federalism divides power." });
  });
});
