// Audit Database Types
export interface Database {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string;
          admin_id: string | null;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Record<string, unknown> | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Record<string, unknown> | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string | null;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Record<string, unknown> | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_admin_id_fkey',
            columns: ['admin_id'],
            isOneToOne: false,
            referencedRelation: 'admin_users',
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_logs_user_id_fkey',
            columns: ['user_id'],
            isOneToOne: false,
            referencedRelation: 'profiles',
            referencedColumns: ['id']
          }
        ];
      };
      security_events: {
        Row: {
          id: string;
          event_type: 'FAILED_LOGIN' | 'RATE_LIMIT_EXCEEDED' | 'SUSPICIOUS_ACTIVITY' | 
            'PRIVILEGE_ESCALATION_ATTEMPT' | 'CREDENTIAL_ACCESS_DENIED' |
            'UNUSUAL_REGISTRATION_PATTERN' | 'MULTIPLE_ACCOUNTS_SAME_IP';
          user_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          metadata: Record<string, unknown> | null;
          severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
          resolved: boolean;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: 'FAILED_LOGIN' | 'RATE_LIMIT_EXCEEDED' | 'SUSPICIOUS_ACTIVITY' | 
            'PRIVILEGE_ESCALATION_ATTEMPT' | 'CREDENTIAL_ACCESS_DENIED' |
            'UNUSUAL_REGISTRATION_PATTERN' | 'MULTIPLE_ACCOUNTS_SAME_IP';
          user_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Record<string, unknown> | null;
          severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
          resolved?: boolean;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_type?: 'FAILED_LOGIN' | 'RATE_LIMIT_EXCEEDED' | 'SUSPICIOUS_ACTIVITY' | 
            'PRIVILEGE_ESCALATION_ATTEMPT' | 'CREDENTIAL_ACCESS_DENIED' |
            'UNUSUAL_REGISTRATION_PATTERN' | 'MULTIPLE_ACCOUNTS_SAME_IP';
          resolved?: boolean;
          resolved_by?: string | null;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'security_events_user_id_fkey',
            columns: ['user_id'],
            isOneToOne: false,
            referencedRelation: 'profiles',
            referencedColumns: ['id']
          }
        ];
      };
      analytics_events: {
        Row: {
          id: string;
          session_id: string;
          event_type: string;
          page: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          event_type: string;
          page?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          event_type?: string;
          page?: string | null;
          metadata?: Record<string, unknown> | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      log_audit: {
        Args: {
          p_admin_id: string | null;
          p_action: string;
          p_entity_type: string;
          p_entity_id: string | null;
          p_metadata: Record<string, unknown> | null;
        };
        Returns: void;
      };
      log_security_event: {
        Args: {
          p_event_type: string;
          p_user_id: string | null;
          p_ip: string | null;
          p_user_agent: string | null;
          p_metadata: Record<string, unknown> | null;
          p_severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        };
        Returns: void;
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