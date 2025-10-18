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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      daily_signal_usage: {
        Row: {
          created_at: string
          date: string
          id: string
          signals_limit: number
          signals_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          signals_limit?: number
          signals_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          signals_limit?: number
          signals_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      economic_calendar_updates: {
        Row: {
          api_calls_used: number
          created_at: string
          error_message: string | null
          events_count: number
          id: string
          source: string
          status: string
          update_type: string
        }
        Insert: {
          api_calls_used?: number
          created_at?: string
          error_message?: string | null
          events_count?: number
          id?: string
          source?: string
          status?: string
          update_type: string
        }
        Update: {
          api_calls_used?: number
          created_at?: string
          error_message?: string | null
          events_count?: number
          id?: string
          source?: string
          status?: string
          update_type?: string
        }
        Relationships: []
      }
      economic_events: {
        Row: {
          actual: string | null
          category: string
          country: string
          created_at: string
          currency: string
          date: string
          event_id: string
          event_name: string
          forecast: string | null
          id: string
          impact: string
          importance: number
          previous: string | null
          source: string
          time: string
          updated_at: string
        }
        Insert: {
          actual?: string | null
          category: string
          country: string
          created_at?: string
          currency: string
          date: string
          event_id: string
          event_name: string
          forecast?: string | null
          id?: string
          impact: string
          importance: number
          previous?: string | null
          source?: string
          time: string
          updated_at?: string
        }
        Update: {
          actual?: string | null
          category?: string
          country?: string
          created_at?: string
          currency?: string
          date?: string
          event_id?: string
          event_name?: string
          forecast?: string | null
          id?: string
          impact?: string
          importance?: number
          previous?: string | null
          source?: string
          time?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          recipient: string
          resend_id: string | null
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          recipient: string
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          recipient?: string
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      financial_news: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          market_type: string | null
          published_at: string
          source: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          market_type?: string | null
          published_at: string
          source: string
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          market_type?: string | null
          published_at?: string
          source?: string
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      ml_optimized_signals: {
        Row: {
          actual_outcome: string | null
          actual_profit_percent: number | null
          actual_profit_pips: number | null
          atr_percent_normalized: number | null
          breakout_strength: number | null
          confidence_score: number | null
          created_at: string
          day_of_week: number
          distance_from_resistance: number | null
          distance_from_support: number | null
          feature_vector: Json | null
          has_bos: boolean | null
          has_choc: boolean | null
          hour_of_day: number
          id: string
          institutional_bias: string | null
          is_news_time: boolean | null
          liquidity_swept: boolean | null
          m1_entry_quality: number | null
          m15_trend: string | null
          m5_area: string | null
          macd_normalized: number | null
          market_session: string
          market_structure_score: number | null
          max_adverse_excursion: number | null
          max_favorable_excursion: number | null
          news_impact_score: number | null
          news_sentiment_score: number | null
          price_position_in_range: number | null
          relevant_news_count: number | null
          risk_reward_ratio: number | null
          rsi_normalized: number | null
          session_bias: string | null
          signal_id: string | null
          signal_type: string
          symbol: string
          time_to_major_news_minutes: number | null
          timestamp: string
          trade_duration_minutes: number | null
          trend_alignment_score: number | null
          updated_at: string
          volatility_rank: number | null
          volume_ratio_normalized: number | null
          win_probability: number | null
        }
        Insert: {
          actual_outcome?: string | null
          actual_profit_percent?: number | null
          actual_profit_pips?: number | null
          atr_percent_normalized?: number | null
          breakout_strength?: number | null
          confidence_score?: number | null
          created_at?: string
          day_of_week: number
          distance_from_resistance?: number | null
          distance_from_support?: number | null
          feature_vector?: Json | null
          has_bos?: boolean | null
          has_choc?: boolean | null
          hour_of_day: number
          id?: string
          institutional_bias?: string | null
          is_news_time?: boolean | null
          liquidity_swept?: boolean | null
          m1_entry_quality?: number | null
          m15_trend?: string | null
          m5_area?: string | null
          macd_normalized?: number | null
          market_session: string
          market_structure_score?: number | null
          max_adverse_excursion?: number | null
          max_favorable_excursion?: number | null
          news_impact_score?: number | null
          news_sentiment_score?: number | null
          price_position_in_range?: number | null
          relevant_news_count?: number | null
          risk_reward_ratio?: number | null
          rsi_normalized?: number | null
          session_bias?: string | null
          signal_id?: string | null
          signal_type: string
          symbol: string
          time_to_major_news_minutes?: number | null
          timestamp: string
          trade_duration_minutes?: number | null
          trend_alignment_score?: number | null
          updated_at?: string
          volatility_rank?: number | null
          volume_ratio_normalized?: number | null
          win_probability?: number | null
        }
        Update: {
          actual_outcome?: string | null
          actual_profit_percent?: number | null
          actual_profit_pips?: number | null
          atr_percent_normalized?: number | null
          breakout_strength?: number | null
          confidence_score?: number | null
          created_at?: string
          day_of_week?: number
          distance_from_resistance?: number | null
          distance_from_support?: number | null
          feature_vector?: Json | null
          has_bos?: boolean | null
          has_choc?: boolean | null
          hour_of_day?: number
          id?: string
          institutional_bias?: string | null
          is_news_time?: boolean | null
          liquidity_swept?: boolean | null
          m1_entry_quality?: number | null
          m15_trend?: string | null
          m5_area?: string | null
          macd_normalized?: number | null
          market_session?: string
          market_structure_score?: number | null
          max_adverse_excursion?: number | null
          max_favorable_excursion?: number | null
          news_impact_score?: number | null
          news_sentiment_score?: number | null
          price_position_in_range?: number | null
          relevant_news_count?: number | null
          risk_reward_ratio?: number | null
          rsi_normalized?: number | null
          session_bias?: string | null
          signal_id?: string | null
          signal_type?: string
          symbol?: string
          time_to_major_news_minutes?: number | null
          timestamp?: string
          trade_duration_minutes?: number | null
          trend_alignment_score?: number | null
          updated_at?: string
          volatility_rank?: number | null
          volume_ratio_normalized?: number | null
          win_probability?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_optimized_signals_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "mt5_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      mt5_accounts: {
        Row: {
          account_name: string | null
          account_number: string
          created_at: string
          ea_version: string | null
          id: string
          is_active: boolean
          last_heartbeat: string
          server_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number: string
          created_at?: string
          ea_version?: string | null
          id?: string
          is_active?: boolean
          last_heartbeat?: string
          server_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string
          created_at?: string
          ea_version?: string | null
          id?: string
          is_active?: boolean
          last_heartbeat?: string
          server_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mt5_signals: {
        Row: {
          actual_profit: number | null
          ai_analysis: Json | null
          batch_update_count: number | null
          client_id: string
          close_price: number | null
          close_reason: string | null
          closed_at: string | null
          confidence: number | null
          created_at: string
          entry: number
          execution_latency_ms: number | null
          id: string
          last_tick_timestamp: string | null
          ml_confidence_score: number | null
          opened_at: string | null
          optimized_parameters: Json | null
          pattern_detected: string | null
          pips_gained: number | null
          risk_amount: number | null
          sent: boolean
          signal: string
          status: string | null
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          timestamp: string
          trade_duration_minutes: number | null
          user_id: string | null
        }
        Insert: {
          actual_profit?: number | null
          ai_analysis?: Json | null
          batch_update_count?: number | null
          client_id: string
          close_price?: number | null
          close_reason?: string | null
          closed_at?: string | null
          confidence?: number | null
          created_at?: string
          entry: number
          execution_latency_ms?: number | null
          id?: string
          last_tick_timestamp?: string | null
          ml_confidence_score?: number | null
          opened_at?: string | null
          optimized_parameters?: Json | null
          pattern_detected?: string | null
          pips_gained?: number | null
          risk_amount?: number | null
          sent?: boolean
          signal: string
          status?: string | null
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          timestamp: string
          trade_duration_minutes?: number | null
          user_id?: string | null
        }
        Update: {
          actual_profit?: number | null
          ai_analysis?: Json | null
          batch_update_count?: number | null
          client_id?: string
          close_price?: number | null
          close_reason?: string | null
          closed_at?: string | null
          confidence?: number | null
          created_at?: string
          entry?: number
          execution_latency_ms?: number | null
          id?: string
          last_tick_timestamp?: string | null
          ml_confidence_score?: number | null
          opened_at?: string | null
          optimized_parameters?: Json | null
          pattern_detected?: string | null
          pips_gained?: number | null
          risk_amount?: number | null
          sent?: boolean
          signal?: string
          status?: string | null
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          timestamp?: string
          trade_duration_minutes?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          last_renewal_reminder_sent: string | null
          payment_details: Json | null
          payment_method: string | null
          payment_type: string | null
          subscription_expires_at: string | null
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan_type"]
            | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          last_renewal_reminder_sent?: string | null
          payment_details?: Json | null
          payment_method?: string | null
          payment_type?: string | null
          subscription_expires_at?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan_type"]
            | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          last_renewal_reminder_sent?: string | null
          payment_details?: Json | null
          payment_method?: string | null
          payment_type?: string | null
          subscription_expires_at?: string | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan_type"]
            | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          can_access_premium_features: boolean
          can_download_ea: boolean
          created_at: string
          description: string | null
          features: Json | null
          id: string
          max_signals_per_day: number
          name: string
          plan_type: Database["public"]["Enums"]["subscription_plan_type"]
          price_annual: number
          price_monthly: number
          updated_at: string
        }
        Insert: {
          can_access_premium_features?: boolean
          can_download_ea?: boolean
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          max_signals_per_day?: number
          name: string
          plan_type: Database["public"]["Enums"]["subscription_plan_type"]
          price_annual: number
          price_monthly: number
          updated_at?: string
        }
        Update: {
          can_access_premium_features?: boolean
          can_download_ea?: boolean
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          max_signals_per_day?: number
          name?: string
          plan_type?: Database["public"]["Enums"]["subscription_plan_type"]
          price_annual?: number
          price_monthly?: number
          updated_at?: string
        }
        Relationships: []
      }
      trade_events_log: {
        Row: {
          client_id: string
          close_reason: string | null
          comment: string | null
          created_at: string
          event_type: string
          id: string
          magic_number: number | null
          modified_fields: string[] | null
          order_type: string | null
          price: number | null
          profit: number | null
          raw_data: Json | null
          stop_loss: number | null
          swap: number | null
          symbol: string | null
          take_profit: number | null
          ticket: number | null
          timestamp: string
          user_id: string
          volume: number | null
        }
        Insert: {
          client_id: string
          close_reason?: string | null
          comment?: string | null
          created_at?: string
          event_type: string
          id?: string
          magic_number?: number | null
          modified_fields?: string[] | null
          order_type?: string | null
          price?: number | null
          profit?: number | null
          raw_data?: Json | null
          stop_loss?: number | null
          swap?: number | null
          symbol?: string | null
          take_profit?: number | null
          ticket?: number | null
          timestamp: string
          user_id: string
          volume?: number | null
        }
        Update: {
          client_id?: string
          close_reason?: string | null
          comment?: string | null
          created_at?: string
          event_type?: string
          id?: string
          magic_number?: number | null
          modified_fields?: string[] | null
          order_type?: string | null
          price?: number | null
          profit?: number | null
          raw_data?: Json | null
          stop_loss?: number | null
          swap?: number | null
          symbol?: string | null
          take_profit?: number | null
          ticket?: number | null
          timestamp?: string
          user_id?: string
          volume?: number | null
        }
        Relationships: []
      }
      trading_analytics: {
        Row: {
          best_confidence_range: Json | null
          best_time_ranges: Json | null
          created_at: string
          id: string
          overall_win_rate: number | null
          profitable_patterns: Json | null
          symbol: string
          symbol_avg_profit: number | null
          symbol_total_trades: number | null
          symbol_win_rate: number | null
          total_loss: number | null
          total_profit: number | null
          total_profitable: number | null
          total_signals: number | null
          updated_at: string
        }
        Insert: {
          best_confidence_range?: Json | null
          best_time_ranges?: Json | null
          created_at?: string
          id?: string
          overall_win_rate?: number | null
          profitable_patterns?: Json | null
          symbol: string
          symbol_avg_profit?: number | null
          symbol_total_trades?: number | null
          symbol_win_rate?: number | null
          total_loss?: number | null
          total_profit?: number | null
          total_profitable?: number | null
          total_signals?: number | null
          updated_at?: string
        }
        Update: {
          best_confidence_range?: Json | null
          best_time_ranges?: Json | null
          created_at?: string
          id?: string
          overall_win_rate?: number | null
          profitable_patterns?: Json | null
          symbol?: string
          symbol_avg_profit?: number | null
          symbol_total_trades?: number | null
          symbol_win_rate?: number | null
          total_loss?: number | null
          total_profit?: number | null
          total_profitable?: number | null
          total_signals?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          api_key: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          priority: string
          read: boolean
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          priority?: string
          read?: boolean
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          priority?: string
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_info: string | null
          id: string
          ip_address: string | null
          is_active: boolean
          last_seen: string
          session_token: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_seen?: string
          session_token?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_seen?: string
          session_token?: string | null
          user_id?: string
        }
        Relationships: []
      }
      market_data_cache: {
        Row: {
          created_at: string
          data: Json
          id: string
          symbol: string
          timeframe: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          symbol: string
          timeframe?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          symbol?: string
          timeframe?: string
          updated_at?: string
        }
        Relationships: []
      }
      ml_model_versions: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          model_data: string | null
          model_type: string
          performance_metrics: Json | null
          trained_at: string
          updated_at: string
          version: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          model_data?: string | null
          model_type: string
          performance_metrics?: Json | null
          trained_at?: string
          updated_at?: string
          version: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          model_data?: string | null
          model_type?: string
          performance_metrics?: Json | null
          trained_at?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      ml_training_metrics: {
        Row: {
          created_at: string
          epoch: number
          id: string
          loss: number
          metrics: Json
          model_version: string
          updated_at: string
          validation_loss: number | null
        }
        Insert: {
          created_at?: string
          epoch: number
          id?: string
          loss: number
          metrics?: Json
          model_version: string
          updated_at?: string
          validation_loss?: number | null
        }
        Update: {
          created_at?: string
          epoch?: number
          id?: string
          loss?: number
          metrics?: Json
          model_version?: string
          updated_at?: string
          validation_loss?: number | null
        }
        Relationships: []
      }
      ml_training_samples: {
        Row: {
          action: string
          created_at: string
          done: boolean
          features: Json
          id: string
          log_probability: number | null
          next_features: Json
          reward: number
          symbol: string
          timestamp: string
          updated_at: string
          value_estimate: number | null
        }
        Insert: {
          action: string
          created_at?: string
          done?: boolean
          features: Json
          id?: string
          log_probability?: number | null
          next_features: Json
          reward: number
          symbol: string
          timestamp: string
          updated_at?: string
          value_estimate?: number | null
        }
        Update: {
          action?: string
          created_at?: string
          done?: boolean
          features?: Json
          id?: string
          log_probability?: number | null
          next_features?: Json
          reward?: number
          symbol?: string
          timestamp?: string
          updated_at?: string
          value_estimate?: number | null
        }
        Relationships: []
      }
      ml_weight_optimization: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          performance_metrics: Json
          updated_at: string
          weights: Json
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          performance_metrics?: Json
          updated_at?: string
          weights: Json
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          performance_metrics?: Json
          updated_at?: string
          weights?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      armor: {
        Args: { "": string }
        Returns: string
      }
      can_generate_signal: {
        Args: { user_id_input: string }
        Returns: boolean
      }
      cleanup_old_economic_events: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      dearmor: {
        Args: { "": string }
        Returns: string
      }
      ensure_single_session: {
        Args: {
          device_info_input: string
          ip_address_input: string
          user_id_input: string
        }
        Returns: string
      }
      gen_random_bytes: {
        Args: { "": number }
        Returns: string
      }
      gen_random_uuid: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      gen_salt: {
        Args: { "": string }
        Returns: string
      }
      generate_api_key: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_signal_usage: {
        Args: { user_id_input: string }
        Returns: boolean
      }
      pgp_armor_headers: {
        Args: { "": string }
        Returns: Record<string, unknown>[]
      }
      pgp_key_id: {
        Args: { "": string }
        Returns: string
      }
      register_mt5_account: {
        Args: {
          account_name_input?: string
          account_number_input: string
          ea_version_input?: string
          server_name_input?: string
          user_id_input: string
        }
        Returns: boolean
      }
      validate_api_key: {
        Args: { api_key_input: string }
        Returns: string
      }
      validate_email_api_key: {
        Args: { email_input: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
      subscription_plan_type: "essenziale" | "professional" | "enterprise"
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
      app_role: ["admin", "user"],
      subscription_plan_type: ["essenziale", "professional", "enterprise"],
    },
  },
} as const
