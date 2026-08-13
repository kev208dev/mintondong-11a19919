export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      apple_auth_account_states: {
        Row: {
          account_deletion_required: boolean;
          apple_sub_hash: string;
          authorization_status: string;
          email_forwarding_enabled: boolean | null;
          last_event_at: string;
          last_event_type: string;
          last_notification_jti: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          account_deletion_required?: boolean;
          apple_sub_hash: string;
          authorization_status?: string;
          email_forwarding_enabled?: boolean | null;
          last_event_at: string;
          last_event_type: string;
          last_notification_jti: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          account_deletion_required?: boolean;
          apple_sub_hash?: string;
          authorization_status?: string;
          email_forwarding_enabled?: boolean | null;
          last_event_at?: string;
          last_event_type?: string;
          last_notification_jti?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      apple_auth_notifications: {
        Row: {
          apple_sub_hash: string;
          event_time: string;
          event_type: string;
          id: string;
          jti: string;
          processed_at: string;
          received_at: string;
          status: string;
          user_id: string | null;
        };
        Insert: {
          apple_sub_hash: string;
          event_time: string;
          event_type: string;
          id?: string;
          jti: string;
          processed_at?: string;
          received_at?: string;
          status: string;
          user_id?: string | null;
        };
        Update: {
          apple_sub_hash?: string;
          event_time?: string;
          event_type?: string;
          id?: string;
          jti?: string;
          processed_at?: string;
          received_at?: string;
          status?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          checked_in: boolean;
          club_id: string;
          created_at: string;
          id: string;
          member_id: string;
          session_date: string;
          status: Database["public"]["Enums"]["attendance_status"];
          updated_at: string;
        };
        Insert: {
          checked_in?: boolean;
          club_id: string;
          created_at?: string;
          id?: string;
          member_id: string;
          session_date?: string;
          status?: Database["public"]["Enums"]["attendance_status"];
          updated_at?: string;
        };
        Update: {
          checked_in?: boolean;
          club_id?: string;
          created_at?: string;
          id?: string;
          member_id?: string;
          session_date?: string;
          status?: Database["public"]["Enums"]["attendance_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "club_members";
            referencedColumns: ["id"];
          },
        ];
      };
      club_members: {
        Row: {
          club_id: string;
          created_at: string;
          games: number;
          gender: string;
          id: string;
          invited_by: string | null;
          is_guest: boolean;
          joined_at: string;
          level: number;
          name: string;
          role: string;
          status: string;
          updated_at: string;
          user_id: string | null;
          wins: number;
        };
        Insert: {
          club_id: string;
          created_at?: string;
          games?: number;
          gender?: string;
          id?: string;
          invited_by?: string | null;
          is_guest?: boolean;
          joined_at?: string;
          level?: number;
          name: string;
          role?: string;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
          wins?: number;
        };
        Update: {
          club_id?: string;
          created_at?: string;
          games?: number;
          gender?: string;
          id?: string;
          invited_by?: string | null;
          is_guest?: boolean;
          joined_at?: string;
          level?: number;
          name?: string;
          role?: string;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
          wins?: number;
        };
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_members_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "club_members";
            referencedColumns: ["id"];
          },
        ];
      };
      club_roles: {
        Row: {
          club_id: string;
          color: string;
          created_at: string;
          id: string;
          is_default: boolean;
          name: string;
          permissions: string[];
          updated_at: string;
        };
        Insert: {
          club_id: string;
          color?: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          name: string;
          permissions?: string[];
          updated_at?: string;
        };
        Update: {
          club_id?: string;
          color?: string;
          created_at?: string;
          id?: string;
          is_default?: boolean;
          name?: string;
          permissions?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "club_roles_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      clubs: {
        Row: {
          court_count: number;
          cover_image_url: string | null;
          created_at: string;
          default_target: number;
          description: string | null;
          emoji: string;
          id: string;
          invite_code: string;
          is_public: boolean;
          lessons_enabled: boolean;
          location: string;
          member_count: number;
          monthly_dues: number;
          name: string;
          owner_id: string;
          profile_image_url: string | null;
          session_label: string;
          session_time: string;
          updated_at: string;
        };
        Insert: {
          court_count?: number;
          cover_image_url?: string | null;
          created_at?: string;
          default_target?: number;
          description?: string | null;
          emoji?: string;
          id?: string;
          invite_code: string;
          is_public?: boolean;
          lessons_enabled?: boolean;
          location?: string;
          member_count?: number;
          monthly_dues?: number;
          name: string;
          owner_id: string;
          profile_image_url?: string | null;
          session_label?: string;
          session_time?: string;
          updated_at?: string;
        };
        Update: {
          court_count?: number;
          cover_image_url?: string | null;
          created_at?: string;
          default_target?: number;
          description?: string | null;
          emoji?: string;
          id?: string;
          invite_code?: string;
          is_public?: boolean;
          lessons_enabled?: boolean;
          location?: string;
          member_count?: number;
          monthly_dues?: number;
          name?: string;
          owner_id?: string;
          profile_image_url?: string | null;
          session_label?: string;
          session_time?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      coaches: {
        Row: {
          club_id: string;
          created_at: string;
          duration_min: number;
          end_hour: number;
          id: string;
          intro: string;
          is_active: boolean;
          level_label: string;
          name: string;
          price: number;
          settlement_account: string;
          specialties: string[];
          start_hour: number;
          updated_at: string;
          weekdays: number[];
        };
        Insert: {
          club_id: string;
          created_at?: string;
          duration_min?: number;
          end_hour?: number;
          id?: string;
          intro?: string;
          is_active?: boolean;
          level_label?: string;
          name: string;
          price?: number;
          settlement_account?: string;
          specialties?: string[];
          start_hour?: number;
          updated_at?: string;
          weekdays?: number[];
        };
        Update: {
          club_id?: string;
          created_at?: string;
          duration_min?: number;
          end_hour?: number;
          id?: string;
          intro?: string;
          is_active?: boolean;
          level_label?: string;
          name?: string;
          price?: number;
          settlement_account?: string;
          specialties?: string[];
          start_hour?: number;
          updated_at?: string;
          weekdays?: number[];
        };
        Relationships: [
          {
            foreignKeyName: "coaches_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      finance_entries: {
        Row: {
          amount: number;
          club_id: string;
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["finance_kind"];
          label: string;
          updated_at: string;
        };
        Insert: {
          amount: number;
          club_id: string;
          created_at?: string;
          id?: string;
          kind: Database["public"]["Enums"]["finance_kind"];
          label: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          club_id?: string;
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["finance_kind"];
          label?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "finance_entries_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_bookings: {
        Row: {
          club_id: string;
          coach_id: string;
          created_at: string;
          depositor_name: string | null;
          end_at: string;
          failure_code: string | null;
          failure_message: string | null;
          id: string;
          member_id: string;
          order_id: string | null;
          paid_at: string | null;
          payment_key: string | null;
          payment_method: Database["public"]["Enums"]["payment_method"];
          payment_status: Database["public"]["Enums"]["payment_status"];
          price: number;
          provider: Database["public"]["Enums"]["payment_provider"];
          start_at: string;
          status: Database["public"]["Enums"]["booking_status"];
          transaction_ref: string | null;
          updated_at: string;
        };
        Insert: {
          club_id: string;
          coach_id: string;
          created_at?: string;
          depositor_name?: string | null;
          end_at: string;
          failure_code?: string | null;
          failure_message?: string | null;
          id?: string;
          member_id: string;
          order_id?: string | null;
          paid_at?: string | null;
          payment_key?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          price: number;
          provider?: Database["public"]["Enums"]["payment_provider"];
          start_at: string;
          status?: Database["public"]["Enums"]["booking_status"];
          transaction_ref?: string | null;
          updated_at?: string;
        };
        Update: {
          club_id?: string;
          coach_id?: string;
          created_at?: string;
          depositor_name?: string | null;
          end_at?: string;
          failure_code?: string | null;
          failure_message?: string | null;
          id?: string;
          member_id?: string;
          order_id?: string | null;
          paid_at?: string | null;
          payment_key?: string | null;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          price?: number;
          provider?: Database["public"]["Enums"]["payment_provider"];
          start_at?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          transaction_ref?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_bookings_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_bookings_coach_id_fkey";
            columns: ["coach_id"];
            isOneToOne: false;
            referencedRelation: "coaches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_bookings_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "club_members";
            referencedColumns: ["id"];
          },
        ];
      };
      match_videos: {
        Row: {
          club_id: string;
          created_at: string;
          duration_sec: number | null;
          id: string;
          match_id: string | null;
          size_bytes: number | null;
          status: Database["public"]["Enums"]["video_status"];
          storage_path: string;
          updated_at: string;
          uploaded_by: string | null;
        };
        Insert: {
          club_id: string;
          created_at?: string;
          duration_sec?: number | null;
          id?: string;
          match_id?: string | null;
          size_bytes?: number | null;
          status?: Database["public"]["Enums"]["video_status"];
          storage_path: string;
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Update: {
          club_id?: string;
          created_at?: string;
          duration_sec?: number | null;
          id?: string;
          match_id?: string | null;
          size_bytes?: number | null;
          status?: Database["public"]["Enums"]["video_status"];
          storage_path?: string;
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "match_videos_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_videos_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          club_id: string;
          court_index: number;
          created_at: string;
          ended_at: string | null;
          id: string;
          score_a: number;
          score_b: number;
          started_at: string;
          status: Database["public"]["Enums"]["match_status"];
          target: number;
          team_a: string[];
          team_b: string[];
          updated_at: string;
          winner: Database["public"]["Enums"]["match_side"] | null;
        };
        Insert: {
          club_id: string;
          court_index: number;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          score_a?: number;
          score_b?: number;
          started_at?: string;
          status?: Database["public"]["Enums"]["match_status"];
          target?: number;
          team_a?: string[];
          team_b?: string[];
          updated_at?: string;
          winner?: Database["public"]["Enums"]["match_side"] | null;
        };
        Update: {
          club_id?: string;
          court_index?: number;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          score_a?: number;
          score_b?: number;
          started_at?: string;
          status?: Database["public"]["Enums"]["match_status"];
          target?: number;
          team_a?: string[];
          team_b?: string[];
          updated_at?: string;
          winner?: Database["public"]["Enums"]["match_side"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "matches_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      member_roles: {
        Row: {
          club_id: string;
          created_at: string;
          id: string;
          member_id: string;
          role_id: string;
        };
        Insert: {
          club_id: string;
          created_at?: string;
          id?: string;
          member_id: string;
          role_id: string;
        };
        Update: {
          club_id?: string;
          created_at?: string;
          id?: string;
          member_id?: string;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_roles_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_roles_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "club_members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_roles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "club_roles";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          account_deleted_at: string | null;
          amount: number;
          booking_id: string | null;
          cancel_idempotency_key: string | null;
          cancel_requested_at: string | null;
          cancelled_amount: number;
          cancelled_at: string | null;
          club_id: string;
          coach_id: string | null;
          created_at: string;
          currency: string;
          depositor_name: string | null;
          failure_code: string | null;
          failure_message: string | null;
          id: string;
          method: Database["public"]["Enums"]["payment_method"];
          order_id: string | null;
          order_name: string | null;
          paid_at: string | null;
          payment_key: string | null;
          portone_channel_key: string | null;
          portone_payment_id: string | null;
          portone_status: string | null;
          portone_store_id: string | null;
          portone_transaction_id: string | null;
          provider: Database["public"]["Enums"]["payment_provider"];
          receipt_url: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          transaction_ref: string;
          updated_at: string;
          user_id: string | null;
          verified_at: string | null;
        };
        Insert: {
          account_deleted_at?: string | null;
          amount: number;
          booking_id?: string | null;
          cancel_idempotency_key?: string | null;
          cancel_requested_at?: string | null;
          cancelled_amount?: number;
          cancelled_at?: string | null;
          club_id: string;
          coach_id?: string | null;
          created_at?: string;
          currency?: string;
          depositor_name?: string | null;
          failure_code?: string | null;
          failure_message?: string | null;
          id?: string;
          method: Database["public"]["Enums"]["payment_method"];
          order_id?: string | null;
          order_name?: string | null;
          paid_at?: string | null;
          payment_key?: string | null;
          portone_channel_key?: string | null;
          portone_payment_id?: string | null;
          portone_status?: string | null;
          portone_store_id?: string | null;
          portone_transaction_id?: string | null;
          provider?: Database["public"]["Enums"]["payment_provider"];
          receipt_url?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          transaction_ref?: string;
          updated_at?: string;
          user_id?: string | null;
          verified_at?: string | null;
        };
        Update: {
          account_deleted_at?: string | null;
          amount?: number;
          booking_id?: string | null;
          cancel_idempotency_key?: string | null;
          cancel_requested_at?: string | null;
          cancelled_amount?: number;
          cancelled_at?: string | null;
          club_id?: string;
          coach_id?: string | null;
          created_at?: string;
          currency?: string;
          depositor_name?: string | null;
          failure_code?: string | null;
          failure_message?: string | null;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          order_id?: string | null;
          order_name?: string | null;
          paid_at?: string | null;
          payment_key?: string | null;
          portone_channel_key?: string | null;
          portone_payment_id?: string | null;
          portone_status?: string | null;
          portone_store_id?: string | null;
          portone_transaction_id?: string | null;
          provider?: Database["public"]["Enums"]["payment_provider"];
          receipt_url?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          transaction_ref?: string;
          updated_at?: string;
          user_id?: string | null;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "lesson_bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_coach_id_fkey";
            columns: ["coach_id"];
            isOneToOne: false;
            referencedRelation: "coaches";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          onboarding_completed_at: string | null;
          role: string;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          onboarding_completed_at?: string | null;
          role?: string;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          onboarding_completed_at?: string | null;
          role?: string;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      queue_entries: {
        Row: {
          club_id: string;
          created_at: string;
          id: string;
          member_id: string;
          since: string;
        };
        Insert: {
          club_id: string;
          created_at?: string;
          id?: string;
          member_id: string;
          since?: string;
        };
        Update: {
          club_id?: string;
          created_at?: string;
          id?: string;
          member_id?: string;
          since?: string;
        };
        Relationships: [
          {
            foreignKeyName: "queue_entries_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "queue_entries_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "club_members";
            referencedColumns: ["id"];
          },
        ];
      };
      score_events: {
        Row: {
          club_id: string;
          confidence: number | null;
          confirmed: boolean;
          corrected: boolean;
          created_at: string;
          id: string;
          match_id: string;
          occurred_at: string;
          side: Database["public"]["Enums"]["match_side"];
          source: Database["public"]["Enums"]["score_source"];
        };
        Insert: {
          club_id: string;
          confidence?: number | null;
          confirmed?: boolean;
          corrected?: boolean;
          created_at?: string;
          id?: string;
          match_id: string;
          occurred_at?: string;
          side: Database["public"]["Enums"]["match_side"];
          source?: Database["public"]["Enums"]["score_source"];
        };
        Update: {
          club_id?: string;
          confidence?: number | null;
          confirmed?: boolean;
          corrected?: boolean;
          created_at?: string;
          id?: string;
          match_id?: string;
          occurred_at?: string;
          side?: Database["public"]["Enums"]["match_side"];
          source?: Database["public"]["Enums"]["score_source"];
        };
        Relationships: [
          {
            foreignKeyName: "score_events_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "score_events_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
        ];
      };
      tournament_favorites: {
        Row: {
          created_at: string;
          id: string;
          tournament_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          tournament_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          tournament_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tournament_favorites_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
        ];
      };
      tournament_sources: {
        Row: {
          bracket_url: string | null;
          created_at: string;
          external_id: string;
          id: string;
          last_synced_at: string;
          raw_data: Json;
          registration_url: string | null;
          result_url: string | null;
          source: string;
          source_url: string | null;
          tournament_id: string;
          updated_at: string;
        };
        Insert: {
          bracket_url?: string | null;
          created_at?: string;
          external_id: string;
          id?: string;
          last_synced_at?: string;
          raw_data?: Json;
          registration_url?: string | null;
          result_url?: string | null;
          source: string;
          source_url?: string | null;
          tournament_id: string;
          updated_at?: string;
        };
        Update: {
          bracket_url?: string | null;
          created_at?: string;
          external_id?: string;
          id?: string;
          last_synced_at?: string;
          raw_data?: Json;
          registration_url?: string | null;
          result_url?: string | null;
          source?: string;
          source_url?: string | null;
          tournament_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tournament_sources_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
        ];
      };
      tournament_sync_runs: {
        Row: {
          error_code: string | null;
          fetched_count: number;
          finished_at: string;
          id: string;
          imported_count: number;
          source: string;
          started_at: string;
          success: boolean;
        };
        Insert: {
          error_code?: string | null;
          fetched_count?: number;
          finished_at?: string;
          id?: string;
          imported_count?: number;
          source: string;
          started_at: string;
          success: boolean;
        };
        Update: {
          error_code?: string | null;
          fetched_count?: number;
          finished_at?: string;
          id?: string;
          imported_count?: number;
          source?: string;
          started_at?: string;
          success?: boolean;
        };
        Relationships: [];
      };
      tournaments: {
        Row: {
          bracket_url: string | null;
          city: string | null;
          created_at: string;
          deactivated_at: string | null;
          description: string | null;
          end_date: string;
          entry_fee: number | null;
          host: string | null;
          id: string;
          is_active: boolean;
          last_synced_at: string | null;
          normalized_title: string;
          organizer: string | null;
          poster_url: string | null;
          region: string | null;
          registration_end_date: string | null;
          registration_start_date: string | null;
          registration_url: string | null;
          result_url: string | null;
          scope: string;
          start_date: string;
          title: string;
          updated_at: string;
          venue: string | null;
          venue_address: string | null;
        };
        Insert: {
          bracket_url?: string | null;
          city?: string | null;
          created_at?: string;
          deactivated_at?: string | null;
          description?: string | null;
          end_date: string;
          entry_fee?: number | null;
          host?: string | null;
          id?: string;
          is_active?: boolean;
          last_synced_at?: string | null;
          normalized_title: string;
          organizer?: string | null;
          poster_url?: string | null;
          region?: string | null;
          registration_end_date?: string | null;
          registration_start_date?: string | null;
          registration_url?: string | null;
          result_url?: string | null;
          scope?: string;
          start_date: string;
          title: string;
          updated_at?: string;
          venue?: string | null;
          venue_address?: string | null;
        };
        Update: {
          bracket_url?: string | null;
          city?: string | null;
          created_at?: string;
          deactivated_at?: string | null;
          description?: string | null;
          end_date?: string;
          entry_fee?: number | null;
          host?: string | null;
          id?: string;
          is_active?: boolean;
          last_synced_at?: string | null;
          normalized_title?: string;
          organizer?: string | null;
          poster_url?: string | null;
          region?: string | null;
          registration_end_date?: string | null;
          registration_start_date?: string | null;
          registration_url?: string | null;
          result_url?: string | null;
          scope?: string;
          start_date?: string;
          title?: string;
          updated_at?: string;
          venue?: string | null;
          venue_address?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      account_deletion_preflight: {
        Args: { p_user_id: string };
        Returns: {
          blocker_code: string;
          can_delete: boolean;
          owned_club_count: number;
        }[];
      };
      assert_valid_username: { Args: { _username: string }; Returns: string };
      auth_email_for_username: { Args: { p_username: string }; Returns: string };
      can_manage_club_images: { Args: { _path: string }; Returns: boolean };
      claim_username: {
        Args: { p_display_name?: string; p_username: string };
        Returns: string;
      };
      create_club_with_owner: {
        Args: {
          p_description?: string;
          p_is_public?: boolean;
          p_location?: string;
          p_name: string;
          p_profile_image_url?: string;
        };
        Returns: {
          court_count: number;
          cover_image_url: string | null;
          created_at: string;
          default_target: number;
          description: string | null;
          emoji: string;
          id: string;
          invite_code: string;
          is_public: boolean;
          lessons_enabled: boolean;
          location: string;
          member_count: number;
          monthly_dues: number;
          name: string;
          owner_id: string;
          profile_image_url: string | null;
          session_label: string;
          session_time: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "clubs";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_manual_tournament: {
        Args: {
          p_bracket_url: string;
          p_city: string;
          p_description: string;
          p_end_date: string;
          p_entry_fee: number;
          p_host: string;
          p_normalized_title: string;
          p_organizer: string;
          p_poster_url: string;
          p_region: string;
          p_registration_end_date: string;
          p_registration_start_date: string;
          p_registration_url: string;
          p_result_url: string;
          p_scope: string;
          p_source_url: string;
          p_start_date: string;
          p_title: string;
          p_venue: string;
          p_venue_address: string;
        };
        Returns: string;
      };
      generate_club_invite_code: { Args: never; Returns: string };
      is_club_member: { Args: { _club_id: string }; Returns: boolean };
      is_club_owner: { Args: { _club_id: string }; Returns: boolean };
      is_username_available: { Args: { p_username: string }; Returns: boolean };
      normalize_username: { Args: { _username: string }; Returns: string };
      process_apple_auth_notification: {
        Args: {
          p_apple_sub: string;
          p_apple_sub_hash: string;
          p_event_time: string;
          p_event_type: string;
          p_jti: string;
        };
        Returns: {
          is_duplicate: boolean;
          notification_id: string;
          resolved_user_id: string;
          result_status: string;
        }[];
      };
      request_club_join: {
        Args: { p_club_id: string };
        Returns: {
          club_id: string;
          created_at: string;
          games: number;
          gender: string;
          id: string;
          invited_by: string | null;
          is_guest: boolean;
          joined_at: string;
          level: number;
          name: string;
          role: string;
          status: string;
          updated_at: string;
          user_id: string | null;
          wins: number;
        };
        SetofOptions: {
          from: "*";
          to: "club_members";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_club_member_state: {
        Args: { p_member_id: string; p_role?: string; p_status?: string };
        Returns: {
          club_id: string;
          created_at: string;
          games: number;
          gender: string;
          id: string;
          invited_by: string | null;
          is_guest: boolean;
          joined_at: string;
          level: number;
          name: string;
          role: string;
          status: string;
          updated_at: string;
          user_id: string | null;
          wins: number;
        };
        SetofOptions: {
          from: "*";
          to: "club_members";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_manual_tournament_active: {
        Args: { p_is_active: boolean; p_tournament_id: string };
        Returns: string;
      };
      update_manual_tournament: {
        Args: {
          p_bracket_url: string;
          p_city: string;
          p_description: string;
          p_end_date: string;
          p_entry_fee: number;
          p_host: string;
          p_normalized_title: string;
          p_organizer: string;
          p_poster_url: string;
          p_region: string;
          p_registration_end_date: string;
          p_registration_start_date: string;
          p_registration_url: string;
          p_result_url: string;
          p_scope: string;
          p_source_url: string;
          p_start_date: string;
          p_title: string;
          p_tournament_id: string;
          p_venue: string;
          p_venue_address: string;
        };
        Returns: string;
      };
      username_is_reserved: { Args: { _username: string }; Returns: boolean };
    };
    Enums: {
      attendance_status: "ATTEND" | "LATE" | "MAYBE" | "ABSENT" | "NONE";
      booking_status: "BOOKED" | "CANCELLED" | "COMPLETED";
      finance_kind: "INCOME" | "EXPENSE";
      match_side: "A" | "B";
      match_status: "LIVE" | "DONE";
      payment_method: "BANK_TRANSFER" | "CARD";
      payment_provider: "DEMO_BANK" | "TOSS" | "PORTONE";
      payment_status: "PENDING" | "PAID" | "CANCELLED" | "REFUNDED" | "FAILED";
      score_source: "MANUAL" | "GESTURE" | "AI";
      video_status: "UPLOADING" | "READY" | "FAILED";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      attendance_status: ["ATTEND", "LATE", "MAYBE", "ABSENT", "NONE"],
      booking_status: ["BOOKED", "CANCELLED", "COMPLETED"],
      finance_kind: ["INCOME", "EXPENSE"],
      match_side: ["A", "B"],
      match_status: ["LIVE", "DONE"],
      payment_method: ["BANK_TRANSFER", "CARD"],
      payment_provider: ["DEMO_BANK", "TOSS", "PORTONE"],
      payment_status: ["PENDING", "PAID", "CANCELLED", "REFUNDED", "FAILED"],
      score_source: ["MANUAL", "GESTURE", "AI"],
      video_status: ["UPLOADING", "READY", "FAILED"],
    },
  },
} as const;
