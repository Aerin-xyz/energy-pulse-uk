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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      api_cache: {
        Row: {
          cache_key: string
          created_at: string
          data: Json
          expires_at: string
          id: string
          updated_at: string
        }
        Insert: {
          cache_key: string
          created_at?: string
          data: Json
          expires_at: string
          id?: string
          updated_at?: string
        }
        Update: {
          cache_key?: string
          created_at?: string
          data?: Json
          expires_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      energy_data_history: {
        Row: {
          as_of: string
          created_at: string | null
          id: string
          payload: Json
        }
        Insert: {
          as_of: string
          created_at?: string | null
          id?: string
          payload: Json
        }
        Update: {
          as_of?: string
          created_at?: string | null
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      newsletter_issues: {
        Row: {
          approved_at: string | null
          created_at: string | null
          html_content: string | null
          id: string
          sent_at: string | null
          snapshot_id: string | null
          status: string
          subject: string | null
          text_content: string | null
          week: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string | null
          html_content?: string | null
          id?: string
          sent_at?: string | null
          snapshot_id?: string | null
          status?: string
          subject?: string | null
          text_content?: string | null
          week: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string | null
          html_content?: string | null
          id?: string
          sent_at?: string | null
          snapshot_id?: string | null
          status?: string
          subject?: string | null
          text_content?: string | null
          week?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_issues_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "snapshot_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      ranked_items: {
        Row: {
          id: string
          is_included: boolean | null
          ranked_at: string | null
          raw_item_id: string | null
          score: number
          score_factors: Json | null
          week: string
        }
        Insert: {
          id?: string
          is_included?: boolean | null
          ranked_at?: string | null
          raw_item_id?: string | null
          score: number
          score_factors?: Json | null
          week: string
        }
        Update: {
          id?: string
          is_included?: boolean | null
          ranked_at?: string | null
          raw_item_id?: string | null
          score?: number
          score_factors?: Json | null
          week?: string
        }
        Relationships: [
          {
            foreignKeyName: "ranked_items_raw_item_id_fkey"
            columns: ["raw_item_id"]
            isOneToOne: false
            referencedRelation: "raw_items"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          client_ip: string
          created_at: string
          function_name: string
          id: string
          request_count: number
          window_start: string
          window_type: string
        }
        Insert: {
          client_ip: string
          created_at?: string
          function_name: string
          id?: string
          request_count?: number
          window_start?: string
          window_type: string
        }
        Update: {
          client_ip?: string
          created_at?: string
          function_name?: string
          id?: string
          request_count?: number
          window_start?: string
          window_type?: string
        }
        Relationships: []
      }
      raw_items: {
        Row: {
          collected_at: string | null
          content_hash: string | null
          id: string
          published_at: string
          raw_data: Json | null
          source: string
          summary: string | null
          title: string
          type: string
          url: string
        }
        Insert: {
          collected_at?: string | null
          content_hash?: string | null
          id?: string
          published_at: string
          raw_data?: Json | null
          source: string
          summary?: string | null
          title: string
          type: string
          url: string
        }
        Update: {
          collected_at?: string | null
          content_hash?: string | null
          id?: string
          published_at?: string
          raw_data?: Json | null
          source?: string
          summary?: string | null
          title?: string
          type?: string
          url?: string
        }
        Relationships: []
      }
      send_logs: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          error_message: string | null
          id: string
          provider: string | null
          response_data: Json | null
          status: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          error_message?: string | null
          id?: string
          provider?: string | null
          response_data?: Json | null
          status: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          id?: string
          provider?: string | null
          response_data?: Json | null
          status?: string
        }
        Relationships: []
      }
      snapshot_metrics: {
        Row: {
          avg_ci: number | null
          avg_gas: number | null
          avg_solar: number | null
          avg_wind: number | null
          biggest_swing: string | null
          chart_url: string | null
          computed_at: string | null
          id: string
          metrics_data: Json | null
          week: string
        }
        Insert: {
          avg_ci?: number | null
          avg_gas?: number | null
          avg_solar?: number | null
          avg_wind?: number | null
          biggest_swing?: string | null
          chart_url?: string | null
          computed_at?: string | null
          id?: string
          metrics_data?: Json | null
          week: string
        }
        Update: {
          avg_ci?: number | null
          avg_gas?: number | null
          avg_solar?: number | null
          avg_wind?: number | null
          biggest_swing?: string | null
          chart_url?: string | null
          computed_at?: string | null
          id?: string
          metrics_data?: Json | null
          week?: string
        }
        Relationships: []
      }
      social_posts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          newsletter_id: string | null
          platform: string
          post_type: string
          scheduled_for: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          newsletter_id?: string | null
          platform?: string
          post_type: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          newsletter_id?: string | null
          platform?: string
          post_type?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_newsletter_id_fkey"
            columns: ["newsletter_id"]
            isOneToOne: false
            referencedRelation: "newsletter_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      summaries: {
        Row: {
          generated_at: string | null
          id: string
          model_used: string | null
          ranked_item_id: string | null
          summary_text: string
          word_count: number | null
        }
        Insert: {
          generated_at?: string | null
          id?: string
          model_used?: string | null
          ranked_item_id?: string | null
          summary_text: string
          word_count?: number | null
        }
        Update: {
          generated_at?: string | null
          id?: string
          model_used?: string | null
          ranked_item_id?: string | null
          summary_text?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "summaries_ranked_item_id_fkey"
            columns: ["ranked_item_id"]
            isOneToOne: false
            referencedRelation: "ranked_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_cache: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      get_latest_energy_data: {
        Args: never
        Returns: {
          payload: Json
        }[]
      }
      get_latest_energy_data_id: { Args: never; Returns: string }
      increment_rate_limit: {
        Args: {
          p_client_ip: string
          p_function_name: string
          p_window_start: string
          p_window_type: string
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
