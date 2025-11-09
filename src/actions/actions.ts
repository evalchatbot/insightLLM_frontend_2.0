"use server";
import supabaseAdmin from "../utils/db";
import { CreateChatRequest, ApiResponse, KeyVerificationResponse } from "../types/types";
import type { ConversationInsert, MessageInsert } from "../types/database.types";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";


export const createChat = async (
  chat: CreateChatRequest
): Promise<ApiResponse> => {
  try {
    // Retry logic for transient auth issues (race conditions during hot reload)
    let user = await currentUser();
    if (!user) {
      // Retry once after a short delay (handles race conditions)
      await new Promise(resolve => setTimeout(resolve, 100));
      user = await currentUser();
      if (!user) {
        throw new Error("User not authenticated. Please refresh the page and try again.");
      }
    }

    const { userPrompt, llmResponse, chatID, imgName } = chat;
    
    // First, check if conversation exists, if not create it
    let { data: conversation, error: conversationError } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('chat_id', chatID)
      .eq('user_id', user.id)
      .single();
    
    if (conversationError && conversationError.code === 'PGRST116') {
      // Conversation doesn't exist, create it
      const conversationData: ConversationInsert = {
        user_id: user.id,
        chat_id: chatID,
        title: null,
        icon: null,
        is_pinned: false
      };
      
      const { data: newConversation, error: createError } = await supabaseAdmin
        .from('conversations')
        .insert(conversationData)
        .select('id')
        .single();
      
      if (createError) {
        throw new Error(`Failed to create conversation: ${createError.message}`);
      }
      
      conversation = newConversation;
    } else if (conversationError) {
      throw new Error(`Failed to fetch conversation: ${conversationError.message}`);
    }
    
    if (!conversation) {
      throw new Error("Failed to get conversation");
    }
    
    // Create the message
    const messageData: MessageInsert = {
      conversation_id: conversation.id,
      user_prompt: userPrompt,
      llm_response: llmResponse,
      img_name: imgName || null
    };
    
    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert(messageData)
      .select('*')
      .single();
    
    if (messageError) {
      throw new Error(`Failed to create message: ${messageError.message}`);
    }
    
    revalidatePath(`/app/${chatID}`);
    return { message, success: true, conversationID: conversation.id };
  } catch (error: any) {
    console.error('Error in createChat:', error);
    return { success: false, error: error.message };
  }
};

export const getSidebarChat = async (userID: string): Promise<ApiResponse> => {
  try {
    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('user_id', userID)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch conversations: ${error.message}`);
    }
    
    // Map the data to match frontend expectations
    const mappedConversations = conversations?.map(conv => ({
      chatID: conv.chat_id,
      chatInfo: {
        title: conv.title,
        icon: conv.icon
      },
      isPinned: conv.is_pinned,
      created_at: conv.created_at,
      updated_at: conv.updated_at
    })) || [];
    
    return { success: true, message: mappedConversations };
  } catch (error: any) {
    console.error("Error in getSidebarChat:", error);
    return { success: false, error: error.message };
  }
};

export const getChatHistory = async ({
  userID,
  chatID,
}: {
  userID: string;
  chatID: string;
}): Promise<ApiResponse> => {
  try {
    console.log(`Fetching chat history for userID: ${userID} and chatID: ${chatID}`);
    // First get the conversation
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('user_id', userID)
      .eq('chat_id', chatID)
      .maybeSingle();
    
    if (conversationError) {
      throw new Error(`Failed to fetch conversation: ${conversationError.message}`);
    }
    
    if (!conversation) {
      return { success: false, error: `No conversation found for chat ID: ${chatID}` };
    }
    console.log(`Found conversation with ID: ${conversation.id}`);
    
    // Then get all messages for this conversation
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });
    
    if (messagesError) {
      throw new Error(`Failed to fetch messages: ${messagesError.message}`);
    }
    
    return { success: true, message: messages, conversationID: conversation.id };
  } catch (error: any) {
    console.error("Error in getChatHistory:", error);
    return { success: false, error: error.message };
  }
};

export const deleteChat = async (chatID: string): Promise<ApiResponse> => {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    
    // Delete the conversation (this will cascade delete all messages)
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .delete()
      .eq('user_id', user.id)
      .eq('chat_id', chatID)
      .select('*');
    
    if (error) {
      throw new Error(`Failed to delete conversation: ${error.message}`);
    }
    
    return { success: true, message: data };
  } catch (error: any) {
    console.error("Error in deleteChat:", error);
    return { success: false, error: error.message };
  }
};

export const renameChat = async (
  chatID: string,
  updates: Partial<{ title: string | null; icon: string | null }>
): Promise<ApiResponse> => {
  try {
    console.log('renameChat called with:', { chatID, updates });
    
    const user = await currentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const updateData: Partial<{ title: string | null; icon: string | null }> = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    
    console.log('updateData prepared:', updateData);

    const { data, error } = await supabaseAdmin
      .from('conversations')
      .update(updateData)
      .eq('user_id', user.id)
      .eq('chat_id', chatID)
      .select('*');
    
    console.log('Supabase update result:', { data, error });

    if (error) {
      throw new Error(`Failed to update conversation: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        error: "Chat not found or user not authorized",
      };
    }
    
    return { success: true, message: data[0] };
  } catch (error: any) {
    console.error("Error in renameChat:", error);
    return {
      success: false,
      error: "An error occurred while renaming the chat",
    };
  }
};

export const pinChat = async (chatID: string, pinStatus: boolean): Promise<ApiResponse> => {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabaseAdmin
      .from('conversations')
      .update({ is_pinned: pinStatus })
      .eq('user_id', user.id)
      .eq('chat_id', chatID)
      .select('*');
      
    if (error) {
      throw new Error(`Failed to pin/unpin conversation: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      return {
        success: false,
        error: "Chat not found or user not authorized",
      };
    }
    
    return { success: true, message: data[0] };
  } catch (error: any) {
    console.error("Error in pinChat:", error);
    return {
      success: false,
      error: "An error occurred while pinning the chat",
    };
  }
};

export const updateResponse = async ({
  messageId,
  updatedResponse,
}: {
  messageId: string;
  updatedResponse: string;
}): Promise<ApiResponse> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .update({ llm_response: updatedResponse })
      .eq('id', messageId)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update message: ${error.message}`);
    }

    if (!data) {
      return {
        success: false,
        error: "Message not found",
      };
    }
    
    return {
      success: true,
      message: data,
    };
  } catch (error: any) {
    console.error("Error updating response:", error);
    return {
      success: false,
      error: "An error occurred while updating response",
    };
  }
};

export const verifyProKey = async (key: string): Promise<KeyVerificationResponse> => {
  try {
    const user = await currentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check if key exists and is unused
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('keys')
      .select('*')
      .eq('key', key)
      .single();

    if (keyError || !keyData) {
      return { 
        success: false, 
        message: "Invalid key" 
      };
    }

    if (keyData.is_used) {
      return { 
        success: false, 
        message: "This key has already been used" 
      };
    }

    if (new Date(keyData.expiry_date) < new Date()) {
      return { 
        success: false, 
        message: "This key has expired" 
      };
    }

    // Activate key for user
    const { error: updateError } = await supabaseAdmin
      .from('keys')
      .update({ 
        is_used: true,
        used_by: user.id,
      })
      .eq('id', keyData.id);

    if (updateError) {
      throw updateError;
    }

    return {
      success: true,
      message: "Pro access activated successfully!",
      expiryDate: keyData.expiry_date,
      durationDays: keyData.duration_days
    };
  } catch (error: any) {
    console.error("Error verifying pro key:", error);
    return {
      success: false,
      message: error.message || "Failed to verify key"
    };
  }
};
