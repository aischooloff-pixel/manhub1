export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      article_comments: {
        Row: {
          article_id: string
          author_id: string
          body: string
          created_at: string | null
          id: string
          parent_id: string | null
        }
        Insert: {
          article_id: string
          author_id: string
          body: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
        }
        Update: {
          article_id?: string
          author_id?: string
          body?: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "article_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      article_favorites: {
        Row: {
          article_id: string
          created_at: string | null
          id: string
          user_profile_id: string
        }
        Insert: {
          article_id: string
          created_at?: string | null
          id?: string
          user_profile_id: string
        }
        Update: {
          article_id?: string
          created_at?: string | null
          id?: string
          user_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_favorites_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_favorites_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_likes: {
        Row: {
          article_id: string
          created_at: string | null
          id: string
          user_profile_id: string
        }
        Insert: {
          article_id: string
          created_at?: string | null
          id?: string
          user_profile_id: string
        }
        Update: {
          article_id?: string
          created_at?: string | null
          id?: string
          user_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_likes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_likes_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_reports: {
        Row: {
          article_id: string
          created_at: string
          id: string
          reason: string
          reporter_profile_id: string
          reviewed_at: string | null
          reviewed_by_telegram_id: number | null
          status: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          reason: string
          reporter_profile_id: string
          reviewed_at?: string | null
          reviewed_by_telegram_id?: number | null
          status?: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          reason?: string
          reporter_profile_id?: string
          reviewed_at?: string | null
          reviewed_by_telegram_id?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_reports_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_reports_reporter_profile_id_fkey"
            columns: ["reporter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          allow_comments: boolean | null
          author_id: string | null
          body: string
          category_id: string | null
          comments_count: number | null
          created_at: string | null
          edited_at: string | null
          favorites_count: number | null
          id: string
          is_anonymous: boolean | null
          likes_count: number | null
          media_type: string | null
          media_url: string | null
          pending_edit: Json | null
          preview: string | null
          rejection_reason: string | null
          rep_score: number | null
          sources: string[] | null
          status: string | null
          telegram_message_id: number | null
          title: string
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          allow_comments?: boolean | null
          author_id?: string | null
          body: string
          category_id?: string | null
          comments_count?: number | null
          created_at?: string | null
          edited_at?: string | null
          favorites_count?: number | null
          id?: string
          is_anonymous?: boolean | null
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          pending_edit?: Json | null
          preview?: string | null
          rejection_reason?: string | null
          rep_score?: number | null
          sources?: string[] | null
          status?: string | null
          telegram_message_id?: number | null
          title: string
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_comments?: boolean | null
          author_id?: string | null
          body?: string
          category_id?: string | null
          comments_count?: number | null
          created_at?: string | null
          edited_at?: string | null
          favorites_count?: number | null
          id?: string
          is_anonymous?: boolean | null
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          pending_edit?: Json | null
          preview?: string | null
          rejection_reason?: string | null
          rep_score?: number | null
          sources?: string[] | null
          status?: string | null
          telegram_message_id?: number | null
          title?: string
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_logs: {
        Row: {
          action: string
          article_id: string
          created_at: string | null
          id: string
          moderator_telegram_id: number
          reason: string | null
        }
        Insert: {
          action: string
          article_id: string
          created_at?: string | null
          id?: string
          moderator_telegram_id: number
          reason?: string | null
        }
        Update: {
          action?: string
          article_id?: string
          created_at?: string | null
          id?: string
          moderator_telegram_id?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_logs_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_short_ids: {
        Row: {
          article_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          short_id: string
        }
        Insert: {
          article_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          short_id: string
        }
        Update: {
          article_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          short_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_short_ids_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          article_id: string | null
          created_at: string
          from_user_id: string | null
          id: string
          is_read: boolean
          message: string
          type: string
          user_profile_id: string
        }
        Insert: {
          article_id?: string | null
          created_at?: string
          from_user_id?: string | null
          id?: string
          is_read?: boolean
          message: string
          type: string
          user_profile_id: string
        }
        Update: {
          article_id?: string | null
          created_at?: string
          from_user_id?: string | null
          id?: string
          is_read?: boolean
          message?: string
          type?: string
          user_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_rejections: {
        Row: {
          admin_telegram_id: number
          article_id: string
          created_at: string | null
          id: string
          short_id: string
        }
        Insert: {
          admin_telegram_id: number
          article_id: string
          created_at?: string | null
          id?: string
          short_id: string
        }
        Update: {
          admin_telegram_id?: number
          article_id?: string
          created_at?: string | null
          id?: string
          short_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_rejections_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          category: string
          cover_urls: string[] | null
          created_at: string | null
          id: string
          service: string
          title: string
          updated_at: string | null
          url: string
        }
        Insert: {
          category: string
          cover_urls?: string[] | null
          created_at?: string | null
          id?: string
          service: string
          title: string
          updated_at?: string | null
          url: string
        }
        Update: {
          category?: string
          cover_urls?: string[] | null
          created_at?: string | null
          id?: string
          service?: string
          title?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      podcasts: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          youtube_id: string
          youtube_url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          youtube_id: string
          youtube_url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          youtube_id?: string
          youtube_url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          blocked_at: string | null
          created_at: string | null
          first_name: string | null
          id: string
          is_blocked: boolean
          is_premium: boolean | null
          last_name: string | null
          premium_expires_at: string | null
          reputation: number | null
          show_avatar: boolean
          show_name: boolean
          show_username: boolean
          subscription_tier: string
          telegram_channel: string | null
          telegram_id: number | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          blocked_at?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          is_blocked?: boolean
          is_premium?: boolean | null
          last_name?: string | null
          premium_expires_at?: string | null
          reputation?: number | null
          show_avatar?: boolean
          show_name?: boolean
          show_username?: boolean
          subscription_tier?: string
          telegram_channel?: string | null
          telegram_id?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          blocked_at?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          is_blocked?: boolean
          is_premium?: boolean | null
          last_name?: string | null
          premium_expires_at?: string | null
          reputation?: number | null
          show_avatar?: boolean
          show_name?: boolean
          show_username?: boolean
          subscription_tier?: string
          telegram_channel?: string | null
          telegram_id?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      reputation_history: {
        Row: {
          article_id: string | null
          created_at: string | null
          from_user_id: string | null
          id: string
          user_id: string | null
          value: number
        }
        Insert: {
          article_id?: string | null
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          user_id?: string | null
          value: number
        }
        Update: {
          article_id?: string | null
          created_at?: string | null
          from_user_id?: string | null
          id?: string
          user_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "reputation_history_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_history_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reputation_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string
          id: string
          rating: number
          rejection_reason: string | null
          review_text: string
          status: string
          suggestions: string | null
          updated_at: string
          user_profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          rejection_reason?: string | null
          review_text: string
          status?: string
          suggestions?: string | null
          updated_at?: string
          user_profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          rejection_reason?: string | null
          review_text?: string
          status?: string
          suggestions?: string | null
          updated_at?: string
          user_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_questions: {
        Row: {
          admin_message_id: number | null
          answer: string | null
          answered_at: string | null
          answered_by_telegram_id: number | null
          created_at: string
          id: string
          question: string
          status: string
          user_profile_id: string | null
          user_telegram_id: number
        }
        Insert: {
          admin_message_id?: number | null
          answer?: string | null
          answered_at?: string | null
          answered_by_telegram_id?: number | null
          created_at?: string
          id?: string
          question: string
          status?: string
          user_profile_id?: string | null
          user_telegram_id: number
        }
        Update: {
          admin_message_id?: number | null
          answer?: string | null
          answered_at?: string | null
          answered_by_telegram_id?: number | null
          created_at?: string
          id?: string
          question?: string
          status?: string
          user_profile_id?: string | null
          user_telegram_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "support_questions_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_products: {
        Row: {
          created_at: string
          currency: string
          description: string
          id: string
          is_active: boolean
          link: string | null
          media_type: string | null
          media_url: string | null
          price: number
          title: string
          updated_at: string
          user_profile_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description: string
          id?: string
          is_active?: boolean
          link?: string | null
          media_type?: string | null
          media_url?: string | null
          price: number
          title: string
          updated_at?: string
          user_profile_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string
          id?: string
          is_active?: boolean
          link?: string | null
          media_type?: string | null
          media_url?: string | null
          price?: number
          title?: string
          updated_at?: string
          user_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_products_user_profile_id_fkey"
            columns: ["user_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_short_id: { Args: never; Returns: string }
      get_or_create_short_id: {
        Args: { p_article_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
