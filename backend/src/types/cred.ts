// Cred Database Types
export interface Database {
  public: {
    Tables: {
      credentials: {
        Row: {
          id: string;
          match_id: string;
          room_id_encrypted: string;
          password_encrypted: string;
          encryption_version: number;
          status: 'LOCKED' | 'AVAILABLE' | 'EXPIRED';
          released_at: string | null;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          room_id_encrypted: string;
          password_encrypted: string;
          encryption_version?: number;
          status?: 'LOCKED' | 'AVAILABLE' | 'EXPIRED';
          released_at?: string | null;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          room_id_encrypted?: string;
          password_encrypted?: string;
          encryption_version?: number;
          status?: 'LOCKED' | 'AVAILABLE' | 'EXPIRED';
          released_at?: string | null;
          expires_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'credentials_match_id_fkey',
            columns: ['match_id'],
            isOneToOne: true,
            referencedRelation: 'matches',
            referencedColumns: ['id']
          }
        ];
      };
      credential_access_logs: {
        Row: {
          id: string;
          credential_id: string;
          user_id: string;
          match_id: string;
          action: 'REQUEST' | 'GRANT' | 'DENY' | 'EXPIRED' | 'REVOKED';
          result: 'SUCCESS' | 'FAILURE';
          failure_reason: string | null;
          ip_address: string | null;
          user_agent: string | null;
          requested_at: string;
          granted_at: string | null;
        };
        Insert: {
          id?: string;
          credential_id: string;
          user_id: string;
          match_id: string;
          action: 'REQUEST' | 'GRANT' | 'DENY' | 'EXPIRED' | 'REVOKED';
          result: 'SUCCESS' | 'FAILURE';
          failure_reason?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          requested_at?: string;
          granted_at?: string | null;
        };
        Update: {
          id?: string;
          credential_id?: string;
          user_id?: string;
          match_id?: string;
          action?: 'REQUEST' | 'GRANT' | 'DENY' | 'EXPIRED' | 'REVOKED';
          result?: 'SUCCESS' | 'FAILURE';
          failure_reason?: string | null;
          granted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'credential_access_logs_credential_id_fkey',
            columns: ['credential_id'],
            isOneToOne: false,
            referencedRelation: 'credentials',
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'credential_access_logs_user_id_fkey',
            columns: ['user_id'],
            isOneToOne: false,
            referencedRelation: 'profiles',
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'credential_access_logs_match_id_fkey',
            columns: ['match_id'],
            isOneToOne: false,
            referencedRelation: 'matches',
            referencedColumns: ['id']
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      release_credentials: {
        Args: { p_match_id: string };
        Returns: { credential_id: string | null; released: boolean }[];
      };
      access_credential: {
        Args: { p_user_id: string; p_match_id: string; p_ip: string; p_user_agent: string };
        Returns: {
          granted: boolean;
          room_id_encrypted: string | null;
          password_encrypted: string | null;
          encryption_version: number | null;
          expires_at: string | null;
          failure_reason: string | null;
        }[];
      };
      revoke_credentials: {
        Args: { p_match_id: string; p_admin_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}