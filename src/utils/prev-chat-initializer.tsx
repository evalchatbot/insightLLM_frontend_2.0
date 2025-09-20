'use client' //Not in use now *for zustand in server side

import insightZustand from "@/utils/insight-zustand"

export default function PrevChatInitializer({ prevChat, children }:{prevChat:any, children:any}) {
  insightZustand.setState({prevChat:prevChat || {userPrompt: "", llmResponse: ""}})
  return children
}
