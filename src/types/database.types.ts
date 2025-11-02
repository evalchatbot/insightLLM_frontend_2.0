export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string
          user_id: string
          chat_id: string
          title: string | null
          icon: string | null
          is_pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          chat_id: string
          title?: string | null
          icon?: string | null
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          chat_id?: string
          title?: string | null
          icon?: string | null
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          user_prompt: string | null
          llm_response: string | null
          img_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_prompt?: string | null
          llm_response?: string | null
          img_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_prompt?: string | null
          llm_response?: string | null
          img_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          }
        ]
      }
      keys: {
        Row: {
          id: string
          key: string
          is_used: boolean
          used_by: string | null
          expiry_date: string
          duration_days: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          key: string
          is_used?: boolean
          used_by?: string | null
          expiry_date: string
          duration_days: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          key?: string
          is_used?: boolean
          used_by?: string | null
          expiry_date?: string
          duration_days?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          key_id: string | null
          start_date: string
          end_date: string
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          key_id?: string | null
          start_date?: string
          end_date?: string
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          key_id?: string | null
          start_date?: string
          end_date?: string
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}

// Helper types for easier use
export type Conversation = Database['public']['Tables']['conversations']['Row']
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert']
export type ConversationUpdate = Database['public']['Tables']['conversations']['Update']

export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type MessageUpdate = Database['public']['Tables']['messages']['Update']

// Combined types for joins
export type ConversationWithMessages = Conversation & {
  messages: Message[]
}

export type MessageWithConversation = Message & {
  conversation: Conversation
}

export type KeyRow = Database['public']['Tables']['keys']['Row']
export type KeyInsert = Database['public']['Tables']['keys']['Insert']
export type KeyUpdate = Database['public']['Tables']['keys']['Update']

export type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row']
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert']
export type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update']
