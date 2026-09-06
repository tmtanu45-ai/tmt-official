// Database types for DB-MATCH project
export interface Database {
  public: {
    Tables: {
      matches: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          game_mode: 'CLASSIC' | 'RANKED' | 'CUSTOM';
          map: 'BERMUDA' | 'PURGATORY' | 'KALAHARI' | 'ALPINE' | 'NEOX';
          team_size: 'SOLO' | 'DUO' | 'SQUAD';
          max_teams: number | null;
          max_players: number | null;
          scheduled_at: string;
          registration_opens_at: string;
          registration_closes_at: string;
          checkin_opens_at: string | null;
          checkin_closes_at: string | null;
          credential_release_at: string;
          credential_expires_at: string;
          status: 'DRAFT' | 'OPEN' | 'FULL' | 'CLOSED' | 'LIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          game_mode?: 'CLASSIC' | 'RANKED' | 'CUSTOM';
          map: 'BERMUDA' | 'PURGATORY' | 'KALAHARI' | 'ALPINE' | 'NEOX';
          team_size?: 'SOLO' | 'DUO' | 'SQUAD';
          max_teams?: number | null;
          max_players?: number | null;
          scheduled_at: string;
          registration_opens_at: string;
          registration_closes_at: string;
          checkin_opens_at?: string | null;
          checkin_closes_at?: string | null;
          credential_release_at: string;
          credential_expires_at: string;
          status?: 'DRAFT' | 'OPEN' | 'FULL' | 'CLOSED' | 'LIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          game_mode?: 'CLASSIC' | 'RANKED' | 'CUSTOM';
          map?: 'BERMUDA' | 'PURGATORY' | 'KALAHARI' | 'ALPINE' | 'NEOX';
          team_size?: 'SOLO' | 'DUO' | 'SQUAD';
          max_teams?: number | null;
          max_players?: number | null;
          scheduled_at?: string;
          registration_opens_at?: string;
          registration_closes_at?: string;
          checkin_opens_at?: string | null;
          checkin_closes_at?: string | null;
          credential_release_at?: string;
          credential_expires_at?: string;
          status?: 'DRAFT' | 'OPEN' | 'FULL' | 'CLOSED' | 'LIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
          updated_at?: string;
        };
      };
      registrations: {
        Row: {
          id: string;
          match_id: string;
          user_id: string;
          team_id: string | null;
          status: 'CONFIRMED' | 'CANCELLED' | 'WAITLISTED';
          registered_at: string;
          cancelled_at: string | null;
          cancellation_reason: string | null;
        };
        Insert: {
          id?: string;
          match_id: string;
          user_id: string;
          team_id?: string | null;
          status?: 'CONFIRMED' | 'CANCELLED' | 'WAITLISTED';
          registered_at?: string;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
        };
        Update: {
          id?: string;
          match_id?: string;
          user_id?: string;
          team_id?: string | null;
          status?: 'CONFIRMED' | 'CANCELLED' | 'WAITLISTED';
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
        };
      };
      checkins: {
        Row: {
          id: string;
          registration_id: string;
          status: 'NOT_OPEN' | 'OPEN' | 'CHECKED_IN' | 'MISSED' | 'CANCELLED';
          checked_in_at: string | null;
          checked_in_by: string | null;
        };
        Insert: {
          id?: string;
          registration_id: string;
          status?: 'NOT_OPEN' | 'OPEN' | 'CHECKED_IN' | 'MISSED' | 'CANCELLED';
          checked_in_at?: string | null;
          checked_in_by?: string | null;
        };
        Update: {
          id?: string;
          registration_id?: string;
          status?: 'NOT_OPEN' | 'OPEN' | 'CHECKED_IN' | 'MISSED' | 'CANCELLED';
          checked_in_at?: string | null;
          checked_in_by?: string | null;
        };
      };
      teams: {
        Row: {
          id: string;
          match_id: string;
          name: string;
          captain_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          name: string;
          captain_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          name?: string;
          captain_id?: string;
        };
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          user_id?: string;
        };
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_player_stats: {
        Args: { p_user_id: string };
        Returns: {
          matches_played: number;
          wins: number;
          kills: number;
          deaths: number;
          kd_ratio: number;
          avg_placement: number;
          win_rate: number;
        };
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}