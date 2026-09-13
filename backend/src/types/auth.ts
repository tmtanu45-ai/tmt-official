// Auth Database Types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          username: string | null;
          display_name: string | null;
          ff_uid: string | null;
          in_game_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          account_status: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
          profile_completion_pct: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          username?: string | null;
          display_name?: string | null;
          ff_uid?: string | null;
          in_game_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          account_status?: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
          profile_completion_pct?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          username?: string | null;
          display_name?: string | null;
          ff_uid?: string | null;
          in_game_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          account_status?: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
          profile_completion_pct?: number;
          updated_at?: string;
        };
      };
      admin_users: {
        Row: {
          id: string;
          user_id: string;
          role: 'PLAYER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
          permissions: Record<string, unknown>;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role?: 'PLAYER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
          permissions?: Record<string, unknown>;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: 'PLAYER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
          permissions?: Record<string, unknown>;
          last_login?: string | null;
          updated_at?: string;
        };
      };
      user_sessions: {
        Row: {
          id: string;
          user_id: string;
          device_fingerprint: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
          expires_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          device_fingerprint?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
          expires_at: string;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          revoked_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}