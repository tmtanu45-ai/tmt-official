// Core types used across the application
export interface User {
  id: string;
  email: string;
  role: 'PLAYER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
}

export interface Profile {
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
  stats?: {
    matches_played: number;
    wins: number;
    kills: number;
    deaths: number;
    kd_ratio: number;
    avg_placement: number;
    win_rate: number;
  };
}

export interface Match {
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
  credential_release_at: string | null;
  credential_expires_at: string | null;
  status: 'DRAFT' | 'OPEN' | 'FULL' | 'CLOSED' | 'LIVE' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  registration_count: number;
  created_at: string;
}

export interface Registration {
  id: string;
  match_id: string;
  user_id: string;
  team_id: string | null;
  status: 'CONFIRMED' | 'CANCELLED' | 'WAITLISTED';
  registered_at: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  matches?: Match;
  checkins?: { status: string; checked_in_at: string | null } | null;
}

export interface Checkin {
  id: string;
  registration_id: string;
  status: 'NOT_OPEN' | 'OPEN' | 'CHECKED_IN' | 'MISSED' | 'CANCELLED';
  checked_in_at: string | null;
  checked_in_by: string | null;
}

export interface Team {
  id: string;
  match_id: string;
  name: string;
  captain_id: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  joined_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  match_id: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
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
}

export interface Credential {
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
}

export interface CredentialAccessLog {
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
}

export interface AuditLog {
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
}

export interface SecurityEvent {
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
}

export interface AdminUser {
  id: string;
  user_id: string;
  role: 'PLAYER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
  permissions: Record<string, unknown>;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string | null;
    display_name: string | null;
    email: string | null;
  };
}

export interface EmailQueue {
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
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  request_id: string;
}