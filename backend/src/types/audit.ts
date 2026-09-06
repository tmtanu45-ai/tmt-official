// Database types for DB-AUDIT project
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
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}