import { beforeEach, describe, expect, it, vi } from "vitest";
import { currentUser, resetServerClerk, serverState } from "../helpers/clerk";
import { supabaseMock as sb } from "../helpers/supabase-mock";

vi.mock("@clerk/nextjs/server", async () => (await import("../helpers/clerk")).clerkServerModule);
vi.mock("@supabase/supabase-js", async () => (await import("../helpers/supabase-mock")).supabaseModule);
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

const actions = await import("@/actions/actions");

beforeEach(() => {
  sb.reset();
  resetServerClerk();
  serverState.userId = "user_clerk_1";
});

describe("createChat (server action)", () => {
  const chat = { chatID: "chat-1", userPrompt: "What is federalism?", llmResponse: "It is...", imgName: undefined } as any;

  it("appends a message to an existing conversation", async () => {
    sb.onQuery((q) => {
      if (q.table === "conversations") return { data: { id: "conv-1" } };
      return { data: { id: "msg-1", conversation_id: "conv-1" } };
    });
    await expect(actions.createChat(chat)).resolves.toEqual({
      message: { id: "msg-1", conversation_id: "conv-1" },
      success: true,
      conversationID: "conv-1",
    });
    const lookup = sb.queriesFor("conversations")[0];
    expect(lookup.has("eq", "chat_id", "chat-1")).toBe(true);
    expect(lookup.has("eq", "user_id", "user_clerk_1")).toBe(true);
    expect(sb.queriesFor("messages")[0].arg("insert")).toEqual({
      conversation_id: "conv-1",
      user_prompt: "What is federalism?",
      llm_response: "It is...",
      img_name: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/app/chat-1");
  });

  it("creates the conversation first when it does not exist (PGRST116)", async () => {
    sb.onQuery((q) => {
      if (q.table === "conversations" && q.op() === "select") return { error: { code: "PGRST116", message: "0 rows" } };
      if (q.table === "conversations") return { data: { id: "conv-new" } };
      return { data: { id: "msg-1" } };
    });
    const res = await actions.createChat({ ...chat, imgName: "scan.png" });
    expect(res).toMatchObject({ success: true, conversationID: "conv-new" });
    const insert = sb.queriesFor("conversations").find((q) => q.op() === "insert")!;
    expect(insert.arg("insert")).toEqual({ user_id: "user_clerk_1", chat_id: "chat-1", title: null, icon: null, is_pinned: false });
    expect(sb.queriesFor("messages")[0].arg("insert").img_name).toBe("scan.png");
  });

  it("retries currentUser once, then fails without touching the database", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    serverState.userId = null;
    const pending = actions.createChat(chat);
    await vi.advanceTimersByTimeAsync(100);
    await expect(pending).resolves.toEqual({
      success: false,
      error: "User not authenticated. Please refresh the page and try again.",
    });
    expect(currentUser).toHaveBeenCalledTimes(2);
    expect(sb.from).not.toHaveBeenCalled();
  });

  it("reports database errors", async () => {
    sb.onQuery((q) => (q.table === "conversations" ? { error: { code: "XX000", message: "db down" } } : { data: null }));
    await expect(actions.createChat(chat)).resolves.toEqual({ success: false, error: "Failed to fetch conversation: db down" });
  });
});

describe("sidebar/chat history actions", () => {
  it("getSidebarChat maps conversations for the sidebar (pinned first, newest first)", async () => {
    sb.onQuery(() => ({
      data: [{ chat_id: "c1", title: "T", icon: "book", is_pinned: true, created_at: "a", updated_at: "b" }],
    }));
    await expect(actions.getSidebarChat("user_clerk_1")).resolves.toEqual({
      success: true,
      message: [{ chatID: "c1", chatInfo: { title: "T", icon: "book" }, isPinned: true, created_at: "a", updated_at: "b" }],
    });
    const q = sb.queriesFor("conversations")[0];
    expect(q.calls.filter((c) => c.method === "order").map((c) => c.args[0])).toEqual(["is_pinned", "updated_at"]);
  });

  it("getChatHistory returns messages in order, or a not-found error", async () => {
    sb.onQuery((q) => (q.table === "conversations" ? { data: { id: "conv-1" } } : { data: [{ id: "m1" }, { id: "m2" }] }));
    await expect(actions.getChatHistory({ userID: "user_clerk_1", chatID: "c1" })).resolves.toEqual({
      success: true,
      message: [{ id: "m1" }, { id: "m2" }],
      conversationID: "conv-1",
    });
    sb.onQuery(() => ({ data: null }));
    await expect(actions.getChatHistory({ userID: "user_clerk_1", chatID: "nope" })).resolves.toEqual({
      success: false,
      error: "No conversation found for chat ID: nope",
    });
  });

  // BUG (security): getSidebarChat/getChatHistory are exported server actions that
  // trust a caller-supplied userID and query with the service-role client, so any
  // visitor can read anyone's chats (src/actions/actions.ts:89 and :121).
  // They should derive the user from the Clerk session instead.
  it.fails("getSidebarChat refuses to list another user's conversations", async () => {
    serverState.userId = "user_attacker";
    sb.onQuery(() => ({ data: [{ chat_id: "victim-chat", title: "Private", icon: null, is_pinned: false }] }));
    const res = await actions.getSidebarChat("user_victim");
    expect(res.success).toBe(false);
    expect(sb.from).not.toHaveBeenCalled();
  });

  it("deleteChat, renameChat and pinChat are scoped to the signed-in user", async () => {
    sb.onQuery(() => ({ data: [{ chat_id: "c1" }] }));
    await actions.deleteChat("c1");
    await actions.renameChat("c1", { title: "New title" });
    await actions.pinChat("c1", true);
    const [del, rename, pin] = sb.queriesFor("conversations");
    for (const q of [del, rename, pin]) {
      expect(q.has("eq", "user_id", "user_clerk_1")).toBe(true);
      expect(q.has("eq", "chat_id", "c1")).toBe(true);
    }
    expect(del.op()).toBe("delete");
    expect(rename.arg("update")).toEqual({ title: "New title" });
    expect(pin.arg("update")).toEqual({ is_pinned: true });
  });

  it("rename/pin report 'not found' when nothing was updated, and require a session", async () => {
    sb.onQuery(() => ({ data: [] }));
    await expect(actions.renameChat("c1", { icon: "fire" })).resolves.toEqual({ success: false, error: "Chat not found or user not authorized" });
    await expect(actions.pinChat("c1", false)).resolves.toEqual({ success: false, error: "Chat not found or user not authorized" });
    serverState.userId = null;
    await expect(actions.deleteChat("c1")).resolves.toEqual({ success: false, error: "User not authenticated" });
    await expect(actions.renameChat("c1", {})).resolves.toMatchObject({ success: false });
    await expect(actions.pinChat("c1", true)).resolves.toMatchObject({ success: false });
  });

  it("updateResponse updates the message text", async () => {
    sb.onQuery(() => ({ data: { id: "m1", llm_response: "edited" } }));
    await expect(actions.updateResponse({ messageId: "m1", updatedResponse: "edited" })).resolves.toEqual({
      success: true,
      message: { id: "m1", llm_response: "edited" },
    });
  });

  // BUG (security): updateResponse is a server action with no authentication or
  // ownership check; it updates any message by id with the service-role client
  // (src/actions/actions.ts:274-311).
  it.fails("updateResponse rejects unauthenticated callers", async () => {
    serverState.userId = null;
    sb.onQuery(() => ({ data: { id: "m1" } }));
    const res = await actions.updateResponse({ messageId: "someone-elses-message", updatedResponse: "defaced" });
    expect(res.success).toBe(false);
    expect(sb.from).not.toHaveBeenCalled();
  });
});
