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
      usage_free: {
        Row: {
          user_id: string
          tokens_input_used: number
          tokens_output_used: number
          pages_used: number
          period_start: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          user_id: string
          tokens_input_used?: number
          tokens_output_used?: number
          pages_used?: number
          period_start?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          tokens_input_used?: number
          tokens_output_used?: number
          pages_used?: number
          period_start?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      usage_pro: {
        Row: {
          user_id: string
          tokens_input_used: number
          tokens_output_used: number
          pages_used: number
          period_start: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          user_id: string
          tokens_input_used?: number
          tokens_output_used?: number
          pages_used?: number
          period_start?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          user_id?: string
          tokens_input_used?: number
          tokens_output_used?: number
          pages_used?: number
          period_start?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          id: string
          user_id: string | null
          user_email: string | null
          page_url: string
          feedback_type: 'bug' | 'feature' | 'improvement' | 'general'
          subject: string
          message: string
          rating: number | null
          user_agent: string | null
          created_at: string
          updated_at: string
          status: 'pending' | 'reviewed' | 'resolved' | 'closed'
          admin_notes: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          user_email?: string | null
          page_url: string
          feedback_type: 'bug' | 'feature' | 'improvement' | 'general'
          subject: string
          message: string
          rating?: number | null
          user_agent?: string | null
          created_at?: string
          updated_at?: string
          status?: 'pending' | 'reviewed' | 'resolved' | 'closed'
          admin_notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          user_email?: string | null
          page_url?: string
          feedback_type?: 'bug' | 'feature' | 'improvement' | 'general'
          subject?: string
          message?: string
          rating?: number | null
          user_agent?: string | null
          created_at?: string
          updated_at?: string
          status?: 'pending' | 'reviewed' | 'resolved' | 'closed'
          admin_notes?: string | null
        }
        Relationships: []
      }
      past_paper_subjects: {
        Row: {
          id: string
          exam_type: 'CSS' | 'PMS'
          name: string
          slug: string
          subject_group: 'compulsory' | 'optional'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          exam_type: 'CSS' | 'PMS'
          name: string
          slug: string
          subject_group?: 'compulsory' | 'optional'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          exam_type?: 'CSS' | 'PMS'
          name?: string
          slug?: string
          subject_group?: 'compulsory' | 'optional'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      past_paper_questions: {
        Row: {
          id: string
          subject_id: string
          exam_type: 'CSS' | 'PMS'
          year: number
          question_number: string
          question_text: string
          answer_text: string
          marks: number | null
          display_order: number
          uploaded_by_email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subject_id: string
          exam_type: 'CSS' | 'PMS'
          year: number
          question_number: string
          question_text: string
          answer_text: string
          marks?: number | null
          display_order?: number
          uploaded_by_email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subject_id?: string
          exam_type?: 'CSS' | 'PMS'
          year?: number
          question_number?: string
          question_text?: string
          answer_text?: string
          marks?: number | null
          display_order?: number
          uploaded_by_email?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "past_paper_questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "past_paper_subjects"
            referencedColumns: ["id"]
          }
        ]
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

export type UsageFreeRow = Database['public']['Tables']['usage_free']['Row']
export type UsageFreeInsert = Database['public']['Tables']['usage_free']['Insert']
export type UsageFreeUpdate = Database['public']['Tables']['usage_free']['Update']

export type UsageProRow = Database['public']['Tables']['usage_pro']['Row']
export type UsageProInsert = Database['public']['Tables']['usage_pro']['Insert']
export type UsageProUpdate = Database['public']['Tables']['usage_pro']['Update']

export type FeedbackRow = Database['public']['Tables']['feedback']['Row']
export type FeedbackInsert = Database['public']['Tables']['feedback']['Insert']
export type FeedbackUpdate = Database['public']['Tables']['feedback']['Update']

export type PastPaperSubjectRow = Database['public']['Tables']['past_paper_subjects']['Row']
export type PastPaperSubjectInsert = Database['public']['Tables']['past_paper_subjects']['Insert']
export type PastPaperSubjectUpdate = Database['public']['Tables']['past_paper_subjects']['Update']

export type PastPaperQuestionRow = Database['public']['Tables']['past_paper_questions']['Row']
export type PastPaperQuestionInsert = Database['public']['Tables']['past_paper_questions']['Insert']
export type PastPaperQuestionUpdate = Database['public']['Tables']['past_paper_questions']['Update']
