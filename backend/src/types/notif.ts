// Notif Database Types
export interface Database {
  public: {
    Tables: {
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'REGISTRATION_CONFIRMED' | 'MATCH_UPDATE' | 'CHECKIN_OPEN' | 
            'CHECKIN_REMINDER' | 'CHECKIN_CONFIRMED' | 'CHECKIN_MISSED' |
            'CREDENTIAL_RELEASED' | 'CREDENTIAL_EXPIRED' | 
            'MATCH_CANCELLED' | 'MATCH_COMPLETED' | 'SECURITY_ALERT' |
            'ACCOUNT_SUSPENDED' | 'ACCOUNT_BANNED' | 'ADMIN_MESSAGE';
          title: string;
          message: string;
          match_id: string | null;
          read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'REGISTRATION_CONFIRMED' | 'MATCH_UPDATE' | 'CHECKIN_OPEN' | 
            'CHECKIN_REMINDER' | 'CHECKIN_CONFIRMED' | 'CHECKIN_MISSED' |
            'CREDENTIAL_RELEASED' | 'CREDENTIAL_EXPIRED' | 
            'MATCH_CANCELLED' | 'MATCH_COMPLETED' | 'SECURITY_ALERT' |
            'ACCOUNT_SUSPENDED' | 'ACCOUNT_BANNED' | 'ADMIN_MESSAGE';
          title: string;
          message: string;
          match_id?: string | null;
          read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'REGISTRATION_CONFIRMED' | 'MATCH_UPDATE' | 'CHECKIN_OPEN' | 
            'CHECKIN_REMINDER' | 'CHECKIN_CONFIRMED' | 'CHECKIN_MISSED' |
            'CREDENTIAL_RELEASED' | 'CREDENTIAL_EXPIRED' | 
            'MATCH_CANCELLED' | 'MATCH_COMPLETED' | 'SECURITY_ALERT' |
            'ACCOUNT_SUSPENDED' | 'ACCOUNT_BANNED' | 'ADMIN_MESSAGE';
          title?: string;
          message?: string;
          match_id?: string | null;
          read?: boolean;
          read_at?: string | null;
        };
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          in_app: boolean;
          email: boolean;
          push: boolean;
          registration_alerts: boolean;
          match_alerts: boolean;
          checkin_reminders: boolean;
          credential_alerts: boolean;
          security_alerts: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          in_app?: boolean;
          email?: boolean;
          push?: boolean;
          registration_alerts?: boolean;
          match_alerts?: boolean;
          checkin_reminders?: boolean;
          credential_alerts?: boolean;
          security_alerts?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          in_app?: boolean;
          email?: boolean;
          push?: boolean;
          registration_alerts?: boolean;
          match_alerts?: boolean;
          checkin_reminders?: boolean;
          credential_alerts?: boolean;
          security_alerts?: boolean;
          updated_at?: string;
        };
      };
      email_queue: {
        Row: {
          id: string;
          to_email: string;
          subject: string;
          html_body: string;
          text_body: string | null;
          notification_id: string | null;
          status: 'PENDING' | 'SENT' | 'FAILED';
          attempts: number;
          max_attempts: number;
          scheduled_at: string;
          sent_at: string | null;
          failed_at: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          to_email: string;
          subject: string;
          html_body: string;
          text_body?: string | null;
          notification_id?: string | null;
          status?: 'PENDING' | 'SENT' | 'FAILED';
          attempts?: number;
          max_attempts?: number;
          scheduled_at?: string;
          sent_at?: string | null;
          failed_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          to_email?: string;
          subject?: string;
          html_body?: string;
          text_body?: string | null;
          notification_id?: string | null;
          status?: 'PENDING' | 'SENT' | 'FAILED';
          attempts?: number;
          max_attempts?: number;
          scheduled_at?: string;
          sent_at?: string | null;
          failed_at?: string | null;
          error_message?: string | null;
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