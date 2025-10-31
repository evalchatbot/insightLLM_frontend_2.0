// Legacy Message type for compatibility (maps to new schema)
export type Message = {
    userPrompt: string;
    llmResponse: string;
    imgName?: string;
}

export type SessionProps = {
    email: string;
    id: string;
    name: string;
    image: string;
}

// Updated types for new Supabase schema
export type MessageProps = {
    id: string; // UUID instead of _id
    user_prompt: string | null;
    llm_response: string | null;
    img_name: string | null;
    created_at: string;
    updated_at: string;
}

export type ConversationProps = {
    id: string;
    user_id: string;
    chat_id: string;
    title: string | null;
    icon: string | null;
    is_pinned: boolean;
    created_at: string;
    updated_at: string;
}

export type ChatSectionProps = {
    data: {
        messages?: MessageProps[]
    },
    image: string,
    name: string
}

// Helper types for API responses
export type CreateChatRequest = Message & { 
    userID: string; 
    chatID: string; 
    imgName?: string;
}

export type ApiResponse<T = any> = {
    success: boolean;
    message?: T;
    error?: string;
    conversationID?: string;
}

export type KeyVerificationResponse = {
  success: boolean;
  message: string;
  expiryDate?: string;
  durationDays?: number;
}

export type KeyVerificationRequest = {
  key: string;
  userId: string;
}

export type ProAccessState = {
    active: boolean;
    expiryDate?: string;
    durationDays?: number;
}

