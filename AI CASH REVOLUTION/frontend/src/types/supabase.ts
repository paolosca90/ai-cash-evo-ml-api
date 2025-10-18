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
          error_message: string
          events_fetched: number
          id: string
          status: string
          updated_at: string
          update_type: string
        }
        Insert: {
          api_calls_used?: number
          created_at?: string
          error_message?: string
          events_fetched?: number
          id?: string
          status?: string
          updated_at?: string
          update_type: string
        }
        Update: {
          api_calls_used?: number
          created_at?: string
          error_message?: string
          events_fetched?: number
          id?: string
          status?: string
          updated_at?: string
          update_type?: string
        }
        Relationships: []
      }
      economic_events: {
        Row: {
          actual: number | null
          category: string
          consensus: number | null
          created_at: string
          currency: string
          event_date: string
          event_id: string
          forecast: number | null
          id: string
          impact: string
          previous: number | null
          title: string
          updated_at: string
        }
        Insert: {
          actual?: number | null
          category?: string
          consensus?: number | null
          created_at?: string
          currency: string
          event_date: string
          event_id: string
          forecast?: number | null
          id?: string
          impact?: string
          previous?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          actual?: number | null
          category?: string
          consensus?: number | null
          created_at?: string
          currency?: string
          event_date?: string
          event_id?: string
          forecast?: number | null
          id?: string
          impact?: string
          previous?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          email: string
          error_message: string | null
          id: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          error_message?: string | null
          id?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          error_message?: string | null
          id?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      financial_news: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          published_at: string
          sentiment: string | null
          source: string
          symbol: string | null
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          published_at: string
          sentiment?: string | null
          source: string
          symbol?: string | null
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          published_at?: string
          sentiment?: string | null
          source?: string
          symbol?: string | null
          title?: string
          updated_at?: string
          url?: string
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
      ml_optimized_signals: {
        Row: {
          confidence: number
          created_at: string
          entry_price: number
          id: string
          metadata: Json | null
          stop_loss: number
          symbol: string
          take_profit: number
          timeframe: string
          type: string
          updated_at: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          entry_price: number
          id?: string
          metadata?: Json | null
          stop_loss: number
          symbol: string
          take_profit: number
          timeframe?: string
          type: string
          updated_at?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          entry_price?: number
          id?: string
          metadata?: Json | null
          stop_loss?: number
          symbol?: string
          take_profit?: number
          timeframe?: string
          type?: string
          updated_at?: string
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
      mt5_accounts: {
        Row: {
          account_id: string
          broker: string
          created_at: string
          encrypted_password: string
          id: string
          is_active: boolean
          server: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          broker: string
          created_at?: string
          encrypted_password: string
          id?: string
          is_active?: boolean
          server: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          broker?: string
          created_at?: string
          encrypted_password?: string
          id?: string
          is_active?: boolean
          server?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mt5_signals: {
        Row: {
          confidence: number
          created_at: string
          entry_price: number
          id: string
          metadata: Json | null
          mt5_account_id: string
          sent_at: string | null
          status: string
          stop_loss: number
          symbol: string
          take_profit: number
          timeframe: string
          type: string
          updated_at: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          entry_price: number
          id?: string
          metadata?: Json | null
          mt5_account_id: string
          sent_at?: string | null
          status?: string
          stop_loss: number
          symbol: string
          take_profit: number
          timeframe?: string
          type: string
          updated_at?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          entry_price?: number
          id?: string
          metadata?: Json | null
          mt5_account_id?: string
          sent_at?: string | null
          status?: string
          stop_loss?: number
          symbol?: string
          take_profit?: number
          timeframe?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          subscription_status: string
          subscription_tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          subscription_status?: string
          subscription_tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          subscription_status?: string
          subscription_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      signal_performance: {
        Row: {
          accuracy: number
          created_at: string
          id: string
          profit_loss: number
          signal_id: string
          status: string
          updated_at: string
        }
        Insert: {
          accuracy?: number
          created_at?: string
          id?: string
          profit_loss?: number
          signal_id: string
          status: string
          updated_at?: string
        }
        Update: {
          accuracy?: number
          created_at?: string
          id?: string
          profit_loss?: number
          signal_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
