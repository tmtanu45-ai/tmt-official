# TMT OFFICIAL eSports Platform — Database Architecture

**Version:** 1.0  
**Date:** 2026-09-05  
**Status:** DRAFT - REQUIRES VERIFICATION  

---

## 1. Five Supabase Project Split Strategy

### 1.1 Rationale
Supabase free tier: **2 projects per organization**. We need **5 projects** for isolation and free-tier optimization.

| Project | Purpose | Org | Tables | Est. Size |
|---------|---------|-----|--------|-----------|
| **DB-AUTH** | Authentication & User Management | Org-1 | auth.users, profiles, admin_users, sessions | 50 MB |
| **DB-MATCH** | Matches, Registrations, Check-ins | Org-1 | matches, registrations, checkins, teams | 200 MB |
| **DB-CRED** | Room Credentials (Encrypted) + Access Logs | Org-2 | credentials, credential_access_logs | 100 MB |
| **DB-AUDIT** | Audit Logs, Security Events, Analytics | Org-2 | audit_logs, security_events, analytics_events | 150 MB |
| **DB-NOTIF** | Notifications, Preferences, Email Queue | Org-3 | notifications, notification_preferences, email_queue | 100 MB |

### 1.2 Cross-Project References
- Use **UUIDs** as primary keys (globally unique)
- Reference other projects by UUID only (no foreign keys across projects)
- Application layer enforces referential integrity
- Serv00 backend connects to all 5 projects via separate clients

### 1.3 Connection Management
```typescript
// Serv00 backend: 5 Supabase clients
const supabaseAuth = createClient(AUTH_URL, AUTH_SERVICE_KEY);
const supabaseMatch = createClient(MATCH_URL, MATCH_SERVICE_KEY);
const supabaseCred = createClient(CRED_URL, CRED_SERVICE_KEY);
const supabaseAudit = createClient(AUDIT_URL, AUDIT_SERVICE_KEY);
const supabaseNotif = createClient(NOTIF_URL, NOTIF_SERVICE_KEY);
```

### 1.4 Free Tier Compliance
| Limit | Strategy |
|-------|----------|
| 2 projects/org | 3 organizations (Org-1, Org-2, Org-3) |
| 500 MB DB/project | Archive old matches, partition by season |
| 1 GB storage/project | Avatars in R2, not Supabase Storage |
| 50k MAU/project | Single auth project, others service-to-service |
| 2M Edge Functions | Use Serv00 for heavy logic, minimal Edge Functions |
| 7-day auto-pause | Daily cron ping to each project |

---

## 2. Entity Relationship Diagram (Text)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DB-AUTH (Org-1)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  auth.users (Supabase Auth)                                                 │
│  ├─ id (PK) ◄──────────────────────────────────────────────────────────┐   │
│  ├─ email, encrypted_password, email_confirmed_at, ...                 │   │
│  └─ raw_app_meta_data: { role: 'PLAYER'|'MODERATOR'|'ADMIN'|'SUPER_ADMIN' }│
│                                                                          │   │
│  profiles                                                               │   │
│  ├─ id (PK)                                                             │   │
│  ├─ user_id (FK → auth.users.id, UNIQUE) ──────────────────────────────┘   │
│  ├─ username (UNIQUE)                                                   │
│  ├─ display_name                                                        │
│  ├─ ff_uid (UNIQUE)                                                     │
│  ├─ in_game_name                                                        │
│  ├─ avatar_url (R2 signed URL)                                          │
│  ├─ bio                                                                 │
│  ├─ account_status: ACTIVE|SUSPENDED|BANNED                             │
│  ├─ profile_completion_pct                                              │
│  ├─ created_at, updated_at                                              │
│                                                                          │
│  admin_users                                                            │
│  ├─ id (PK)                                                             │
│  ├─ user_id (FK → auth.users.id, UNIQUE) ──────────────────────────┐   │
│  ├─ role: PLAYER|MODERATOR|ADMIN|SUPER_ADMIN                          │   │
│  ├─ permissions (JSONB)                                               │   │
│  ├─ last_login                                                        │   │
│  ├─ created_at, updated_at                                            │   │
│                                                                          │
│  user_sessions (optional, for device tracking)                        │
│  ├─ id (PK)                                                            │
│  ├─ user_id (FK → auth.users.id)                                       │
│  ├─ device_fingerprint                                                │
│  ├─ ip_address                                                        │
│  ├─ user_agent                                                        │
│  ├─ created_at, expires_at, revoked_at                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DB-MATCH (Org-1)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  matches                                                                  │
│  ├─ id (PK)                                                               │
│  ├─ title, description                                                    │
│  ├─ game_mode: CLASSIC|RANKED|CUSTOM                                      │
│  ├─ map: BERMUDA|PURGATORY|KALAHARI|...                                   │
│  ├─ team_size: SOLO|DUO|SQUAD                                             │
│  ├─ max_teams, max_players                                                │
│  ├─ scheduled_at (UTC)                                                    │
│  ├─ registration_opens_at, registration_closes_at                         │
│  ├─ checkin_opens_at, checkin_closes_at                                   │
│  ├─ credential_release_at, credential_expires_at                          │
│  ├─ status: DRAFT|OPEN|FULL|CLOSED|LIVE|COMPLETED|CANCELLED|EXPIRED       │
│  ├─ created_by (FK → auth.users.id)                                       │
│  ├─ created_at, updated_at                                                │
│                                                                          │
│  registrations                                                            │
│  ├─ id (PK)                                                               │
│  ├─ match_id (FK → matches.id)                                            │
│  ├─ user_id (FK → auth.users.id) ◄──────────────────────────────────┐    │
│  ├─ team_id (FK → teams.id, nullable)                                  │    │
│  ├─ status: CONFIRMED|CANCELLED|WAITLISTED                             │    │
│  ├─ registered_at                                                      │    │
│  ├─ cancelled_at, cancellation_reason                                  │    │
│  ├─ UNIQUE(match_id, user_id)  ◄────────────────────────────────────┘    │
│                                                                          │
│  checkins                                                                 │
│  ├─ id (PK)                                                              │
│  ├─ registration_id (FK → registrations.id, UNIQUE)                     │
│  ├─ status: NOT_OPEN|OPEN|CHECKED_IN|MISSED|CANCELLED                   │
│  ├─ checked_in_at                                                        │
│  ├─ checked_in_by (FK → auth.users.id)  // for admin force check-in     │
│                                                                          │
│  teams (for duo/squad)                                                  │
│  ├─ id (PK)                                                              │
│  ├─ match_id (FK → matches.id)                                           │
│  ├─ name                                                                 │
│  ├─ captain_id (FK → auth.users.id)                                      │
│  ├─ created_at                                                           │
│                                                                          │
│  team_members                                                            │
│  ├─ id (PK)                                                              │
│  ├─ team_id (FK → teams.id)                                              │
│  ├─ user_id (FK → auth.users.id)                                         │
│  ├─ joined_at                                                            │
│  ├─ UNIQUE(team_id, user_id)                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DB-CRED (Org-2) — HIGH SECURITY                │
├─────────────────────────────────────────────────────────────────────────────┤
│  credentials                                                              │
│  ├─ id (PK)                                                               │
│  ├─ match_id (FK → matches.id in DB-MATCH, UNIQUE)                        │
│  ├─ room_id_encrypted (TEXT)  // AES-256-GCM ciphertext (base64)          │
│  ├─ password_encrypted (TEXT) // AES-256-GCM ciphertext (base64)          │
│  ├─ encryption_version (INT)  // for key rotation                         │
│  ├─ status: LOCKED|AVAILABLE|EXPIRED                                       │
│  ├─ released_at, expires_at                                               │
│  ├─ created_at, updated_at                                                │
│                                                                          │
│  credential_access_logs                                                   │
│  ├─ id (PK)                                                               │
│  ├─ credential_id (FK → credentials.id)                                   │
│  ├─ user_id (FK → auth.users.id in DB-AUTH)                               │
│  ├─ match_id (FK → matches.id in DB-MATCH)                                │
│  ├─ action: REQUEST|GRANT|DENY|EXPIRED|REVOKED                            │
│  ├─ result: SUCCESS|FAILURE                                               │
│  ├─ failure_reason (TEXT, nullable)                                       │
│  ├─ ip_address, user_agent                                                │
│  ├─ requested_at (UTC)                                                    │
│  ├─ granted_at (UTC, nullable)                                            │
│  // NO plaintext room_id or password HERE                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DB-AUDIT (Org-2)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  audit_logs                                                               │
│  ├─ id (PK)                                                               │
│  ├─ admin_id (FK → admin_users.id in DB-AUTH, nullable)                   │
│  ├─ user_id (FK → auth.users.id in DB-AUTH, nullable)                     │
│  ├─ action (TEXT)  // e.g., 'match.create', 'credential.release'          │
│  ├─ entity_type (TEXT)  // e.g., 'match', 'credential', 'player'          │
│  ├─ entity_id (UUID, nullable)                                            │
│  ├─ metadata (JSONB)  // context, before/after                            │
│  ├─ ip_address, user_agent                                                │
│  ├─ created_at (UTC)                                                      │
│  // APPEND ONLY - no UPDATE/DELETE policies                               │
│                                                                          │
│  security_events                                                          │
│  ├─ id (PK)                                                               │
│  ├─ event_type: FAILED_LOGIN|RATE_LIMIT|SUSPICIOUS_ACTIVITY|...           │
│  ├─ user_id (FK → auth.users.id, nullable)                                │
│  ├─ ip_address                                                            │
│  ├─ user_agent                                                            │
│  ├─ metadata (JSONB)                                                      │
│  ├─ severity: LOW|MEDIUM|HIGH|CRITICAL                                    │
│  ├─ resolved: BOOLEAN DEFAULT FALSE                                       │
│  ├─ created_at (UTC)                                                      │
│                                                                          │
│  analytics_events                                                         │
│  ├─ id (PK)                                                               │
│  ├─ session_id (TEXT, anon)                                               │
│  ├─ event_type (TEXT)                                                     │
│  ├─ page (TEXT, nullable)                                                 │
│  ├─ metadata (JSONB)  // NO PII, NO credentials                           │
│  ├─ created_at (UTC)                                                      │
│  // Partitioned by month for performance                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DB-NOTIF (Org-3)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  notifications                                                            │
│  ├─ id (PK)                                                               │
│  ├─ user_id (FK → auth.users.id in DB-AUTH)                               │
│  ├─ type: REGISTRATION|MATCH_UPDATE|CHECKIN|CREDENTIAL_RELEASE|...         │
│  ├─ title, message                                                        │
│  ├─ match_id (FK → matches.id in DB-MATCH, nullable)                      │
│  ├─ read: BOOLEAN DEFAULT FALSE                                           │
│  ├─ read_at (nullable)                                                    │
│  ├─ created_at (UTC)                                                      │
│  // NO room credentials in message                                        │
│                                                                          │
│  notification_preferences                                                 │
│  ├─ id (PK)                                                               │
│  ├─ user_id (FK → auth.users.id in DB-AUTH, UNIQUE)                       │
│  ├─ in_app: BOOLEAN DEFAULT TRUE                                          │
│  ├─ email: BOOLEAN DEFAULT TRUE                                           │
│  ├─ push: BOOLEAN DEFAULT FALSE  // future                                │
│  ├─ registration_alerts: BOOLEAN DEFAULT TRUE                             │
│  ├─ match_alerts: BOOLEAN DEFAULT TRUE                                    │
│  ├─ checkin_reminders: BOOLEAN DEFAULT TRUE                               │
│  ├─ credential_alerts: BOOLEAN DEFAULT TRUE                               │
│  ├─ security_alerts: BOOLEAN DEFAULT TRUE                                 │
│  ├─ created_at, updated_at                                                │
│                                                                          │
│  email_queue                                                              │
│  ├─ id (PK)                                                               │
│  ├─ to_email, subject, html_body, text_body                              │
│  ├─ notification_id (FK → notifications.id, nullable)                     │
│  ├─ status: PENDING|SENT|FAILED                                           │
│  ├─ attempts, max_attempts                                                │
│  ├─ scheduled_at, sent_at, failed_at                                      │
│  ├─ error_message                                                         │
│  ├─ created_at                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Schema (SQL)

### 3.1 DB-AUTH: Authentication & Profiles
```sql
-- auth.users is managed by Supabase Auth

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL, -- references auth.users(id)
  username TEXT UNIQUE,
  display_name TEXT,
  ff_uid TEXT UNIQUE, -- Free Fire UID
  in_game_name TEXT,
  avatar_url TEXT, -- R2 signed URL
  bio TEXT,
  account_status TEXT NOT NULL DEFAULT 'ACTIVE' 
    CHECK (account_status IN ('ACTIVE', 'SUSPENDED', 'BANNED')),
  profile_completion_pct INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users (role management)
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL, -- references auth.users(id)
  role TEXT NOT NULL DEFAULT 'PLAYER' 
    CHECK (role IN ('PLAYER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN')),
  permissions JSONB DEFAULT '{}',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions (device tracking)
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- references auth.users(id)
  device_fingerprint TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_ff_uid ON public.profiles(ff_uid);
CREATE INDEX idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX idx_admin_users_role ON public.admin_users(role);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON public.user_sessions(expires_at);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE 
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view admin users" ON public.admin_users FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
CREATE POLICY "Super admins manage admin users" ON public.admin_users FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'));

CREATE POLICY "Users view own sessions" ON public.user_sessions FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Admins view all sessions" ON public.user_sessions FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
```

### 3.2 DB-MATCH: Matches & Registrations
```sql
-- Matches
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  game_mode TEXT NOT NULL DEFAULT 'CLASSIC' 
    CHECK (game_mode IN ('CLASSIC', 'RANKED', 'CUSTOM')),
  map TEXT NOT NULL 
    CHECK (map IN ('BERMUDA', 'PURGATORY', 'KALAHARI', 'ALPINE', 'NEOX')),
  team_size TEXT NOT NULL DEFAULT 'SQUAD' 
    CHECK (team_size IN ('SOLO', 'DUO', 'SQUAD')),
  max_teams INT,
  max_players INT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  registration_opens_at TIMESTAMPTZ NOT NULL,
  registration_closes_at TIMESTAMPTZ NOT NULL,
  checkin_opens_at TIMESTAMPTZ,
  checkin_closes_at TIMESTAMPTZ,
  credential_release_at TIMESTAMPTZ,
  credential_expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'DRAFT' 
    CHECK (status IN ('DRAFT', 'OPEN', 'FULL', 'CLOSED', 'LIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED')),
  created_by UUID NOT NULL, -- references auth.users(id) in DB-AUTH
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registrations
CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- references auth.users(id) in DB-AUTH
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'CONFIRMED' 
    CHECK (status IN ('CONFIRMED', 'CANCELLED', 'WAITLISTED')),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT
);

-- Check-ins
CREATE TABLE public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID UNIQUE NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'NOT_OPEN' 
    CHECK (status IN ('NOT_OPEN', 'OPEN', 'CHECKED_IN', 'MISSED', 'CANCELLED')),
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID -- references auth.users(id) for admin force check-in
);

-- Teams (for duo/squad)
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  captain_id UUID NOT NULL, -- references auth.users(id) in DB-AUTH
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- references auth.users(id) in DB-AUTH
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraints
CREATE UNIQUE INDEX uq_registration_match_user ON public.registrations(match_id, user_id);
CREATE UNIQUE INDEX uq_team_member ON public.team_members(team_id, user_id);

-- Indexes
CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_matches_scheduled ON public.matches(scheduled_at);
CREATE INDEX idx_registrations_match ON public.registrations(match_id);
CREATE INDEX idx_registrations_user ON public.registrations(user_id);
CREATE INDEX idx_registrations_status ON public.registrations(status);
CREATE INDEX idx_checkins_registration ON public.checkins(registration_id);
CREATE INDEX idx_teams_match ON public.teams(match_id);
CREATE INDEX idx_teams_captain ON public.teams(captain_id);

-- RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Policies
-- Matches: public read (no credentials), admin write
CREATE POLICY "Matches public read" ON public.matches FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage matches" ON public.matches FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')));

-- Registrations: user read own, admin read all, user insert own (if eligible)
CREATE POLICY "Users view own registrations" ON public.registrations FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Admins view all registrations" ON public.registrations FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
CREATE POLICY "Users register for matches" ON public.registrations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users cancel own registration" ON public.registrations FOR UPDATE 
  USING (auth.uid() = user_id AND status = 'CONFIRMED');
CREATE POLICY "Admins manage registrations" ON public.registrations FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Check-ins: user read own, admin read all, user update during window
CREATE POLICY "Users view own checkins" ON public.checkins FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.registrations WHERE id = registration_id AND user_id = auth.uid()));
CREATE POLICY "Admins view all checkins" ON public.checkins FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
CREATE POLICY "Users check in" ON public.checkins FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.registrations WHERE id = registration_id AND user_id = auth.uid()));
CREATE POLICY "Admins manage checkins" ON public.checkins FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Teams: public read for match, captain manages
CREATE POLICY "Teams public read" ON public.teams FOR SELECT USING (TRUE);
CREATE POLICY "Captain manages team" ON public.teams FOR ALL 
  USING (captain_id = auth.uid());
CREATE POLICY "Admins manage teams" ON public.teams FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

-- Team members: team members read, captain manages
CREATE POLICY "Team members view" ON public.team_members FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND (captain_id = auth.uid() OR user_id = auth.uid())));
CREATE POLICY "Captain manages members" ON public.team_members FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.teams WHERE id = team_id AND captain_id = auth.uid()));
CREATE POLICY "Admins manage members" ON public.team_members FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
```

### 3.3 DB-CRED: Credentials (High Security)
```sql
-- Credentials (ENCRYPTED at rest)
CREATE TABLE public.credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID UNIQUE NOT NULL, -- references matches.id in DB-MATCH
  room_id_encrypted TEXT NOT NULL, -- AES-256-GCM ciphertext (base64)
  password_encrypted TEXT NOT NULL, -- AES-256-GCM ciphertext (base64)
  encryption_version INT NOT NULL DEFAULT 1, -- for key rotation
  status TEXT NOT NULL DEFAULT 'LOCKED' 
    CHECK (status IN ('LOCKED', 'AVAILABLE', 'EXPIRED')),
  released_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credential Access Logs (NO plaintext credentials)
CREATE TABLE public.credential_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES public.credentials(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- references auth.users(id) in DB-AUTH
  match_id UUID NOT NULL, -- references matches.id in DB-MATCH
  action TEXT NOT NULL 
    CHECK (action IN ('REQUEST', 'GRANT', 'DENY', 'EXPIRED', 'REVOKED')),
  result TEXT NOT NULL 
    CHECK (result IN ('SUCCESS', 'FAILURE')),
  failure_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  granted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_credentials_match ON public.credentials(match_id);
CREATE INDEX idx_credentials_status ON public.credentials(status);
CREATE INDEX idx_cred_access_credential ON public.credential_access_logs(credential_id);
CREATE INDEX idx_cred_access_user ON public.credential_access_logs(user_id);
CREATE INDEX idx_cred_access_match ON public.credential_access_logs(match_id);
CREATE INDEX idx_cred_access_requested ON public.credential_access_logs(requested_at DESC);

-- RLS - CRITICAL: NO direct read policy for credentials
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credential_access_logs ENABLE ROW LEVEL SECURITY;

-- Credentials: NO SELECT policy for anon/authenticated users
-- ONLY backend (service role) can read/write
CREATE POLICY "Backend only - credentials" ON public.credentials FOR ALL 
  USING (false)  -- No direct access via PostgREST
  WITH CHECK (false);

-- Credential Access Logs: admin read only
CREATE POLICY "Admins view credential access logs" ON public.credential_access_logs FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
-- Backend inserts
CREATE POLICY "Backend inserts credential access logs" ON public.credential_access_logs FOR INSERT 
  WITH CHECK (true); -- Service role bypasses RLS
```

### 3.4 DB-AUDIT: Audit & Security
```sql
-- Audit Logs (append-only)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID, -- references admin_users.id in DB-AUTH
  user_id UUID, -- references auth.users(id) in DB-AUTH
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Events
CREATE TABLE public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL 
    CHECK (event_type IN ('FAILED_LOGIN', 'RATE_LIMIT_EXCEEDED', 'SUSPICIOUS_ACTIVITY', 
                          'PRIVILEGE_ESCALATION_ATTEMPT', 'CREDENTIAL_ACCESS_DENIED',
                          'UNUSUAL_REGISTRATION_PATTERN', 'MULTIPLE_ACCOUNTS_SAME_IP')),
  user_id UUID, -- references auth.users(id) in DB-AUTH
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  severity TEXT NOT NULL DEFAULT 'MEDIUM' 
    CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID, -- references admin_users.id
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Events (NO PII, NO credentials)
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL, -- anonymous session ID
  event_type TEXT NOT NULL,
  page TEXT,
  metadata JSONB, -- NO user_id, NO email, NO credentials
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partition analytics by month (performance)
-- CREATE TABLE public.analytics_events_2026_09 PARTITION OF public.analytics_events 
--   FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

-- Indexes
CREATE INDEX idx_audit_logs_admin ON public.audit_logs(admin_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_security_events_type ON public.security_events(event_type);
CREATE INDEX idx_security_events_user ON public.security_events(user_id);
CREATE INDEX idx_security_events_severity ON public.security_events(severity);
CREATE INDEX idx_security_events_created ON public.security_events(created_at DESC);
CREATE INDEX idx_analytics_session ON public.analytics_events(session_id);
CREATE INDEX idx_analytics_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_created ON public.analytics_events(created_at DESC);

-- RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins view audit logs" ON public.audit_logs FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
CREATE POLICY "Backend inserts audit logs" ON public.audit_logs FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Admins view security events" ON public.security_events FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
CREATE POLICY "Backend inserts security events" ON public.security_events FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Admins view analytics" ON public.analytics_events FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
CREATE POLICY "Anyone inserts analytics" ON public.analytics_events FOR INSERT 
  WITH CHECK (true);
```

### 3.5 DB-NOTIF: Notifications
```sql
-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- references auth.users(id) in DB-AUTH
  type TEXT NOT NULL 
    CHECK (type IN ('REGISTRATION_CONFIRMED', 'MATCH_UPDATE', 'CHECKIN_OPEN', 
                    'CHECKIN_REMINDER', 'CHECKIN_CONFIRMED', 'CHECKIN_MISSED',
                    'CREDENTIAL_RELEASED', 'CREDENTIAL_EXPIRED', 
                    'MATCH_CANCELLED', 'MATCH_COMPLETED', 'SECURITY_ALERT',
                    'ACCOUNT_SUSPENDED', 'ACCOUNT_BANNED', 'ADMIN_MESSAGE')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  match_id UUID, -- references matches.id in DB-MATCH
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Preferences
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL, -- references auth.users(id) in DB-AUTH
  in_app BOOLEAN DEFAULT TRUE,
  email BOOLEAN DEFAULT TRUE,
  push BOOLEAN DEFAULT FALSE,
  registration_alerts BOOLEAN DEFAULT TRUE,
  match_alerts BOOLEAN DEFAULT TRUE,
  checkin_reminders BOOLEAN DEFAULT TRUE,
  credential_alerts BOOLEAN DEFAULT TRUE,
  security_alerts BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Queue (for Cloudflare Worker)
CREATE TABLE public.email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' 
    CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX idx_email_queue_status ON public.email_queue(status);
CREATE INDEX idx_email_queue_scheduled ON public.email_queue(scheduled_at);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Admins view all notifications" ON public.notifications FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
CREATE POLICY "Backend inserts notifications" ON public.notifications FOR INSERT 
  WITH CHECK (true);
CREATE POLICY "Users update own notifications (read)" ON public.notifications FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own preferences" ON public.notification_preferences FOR ALL 
  USING (auth.uid() = user_id);
CREATE POLICY "Admins view all preferences" ON public.notification_preferences FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));

CREATE POLICY "Admins view email queue" ON public.email_queue FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()));
CREATE POLICY "Backend manages email queue" ON public.email_queue FOR ALL 
  WITH CHECK (true);
```

---

## 4. Updated_at Triggers (All Projects)
```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at
-- Run in each project for relevant tables
```

---

## 5. Server-Side Functions (DB-CRED Project)

### 5.1 Credential Release Function
```sql
-- Called by backend (service role) via RPC
CREATE OR REPLACE FUNCTION public.release_credentials(p_match_id UUID)
RETURNS TABLE(credential_id UUID, released BOOLEAN) 
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cred RECORD;
  v_match RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Fetch credential record
  SELECT * INTO v_cred FROM public.credentials WHERE match_id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, FALSE;
    RETURN;
  END IF;

  -- Fetch match details (cross-project reference via application)
  -- Application must verify match status = LIVE/COMPLETED
  
  -- Check release conditions
  IF v_cred.status != 'LOCKED' THEN
    RETURN QUERY SELECT v_cred.id, FALSE;
    RETURN;
  END IF;
  
  IF v_now < v_cred.released_at THEN
    RETURN QUERY SELECT v_cred.id, FALSE;
    RETURN;
  END IF;
  
  IF v_now >= v_cred.expires_at THEN
    UPDATE public.credentials SET status = 'EXPIRED', updated_at = NOW() WHERE id = v_cred.id;
    RETURN QUERY SELECT v_cred.id, FALSE;
    RETURN;
  END IF;

  -- All checks passed - release
  UPDATE public.credentials 
  SET status = 'AVAILABLE', released_at = v_now, updated_at = NOW()
  WHERE id = v_cred.id;
  
  RETURN QUERY SELECT v_cred.id, TRUE;
END;
$$;

-- Revoke credentials (admin action)
CREATE OR REPLACE FUNCTION public.revoke_credentials(p_match_id UUID, p_admin_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.credentials 
  SET status = 'EXPIRED', updated_at = NOW()
  WHERE match_id = p_match_id AND status = 'AVAILABLE';
  
  -- Log audit
  PERFORM public.log_audit(p_admin_id, 'credential.revoke', 'credential', p_match_id, 
    jsonb_build_object('reason', 'admin_revoke'));
  
  RETURN TRUE;
END;
$$;
```

### 5.2 Credential Access Function
```sql
-- Called by backend to verify eligibility and log access
CREATE OR REPLACE FUNCTION public.access_credential(
  p_user_id UUID,
  p_match_id UUID,
  p_ip INET,
  p_user_agent TEXT
)
RETURNS TABLE(
  granted BOOLEAN,
  room_id_encrypted TEXT,
  password_encrypted TEXT,
  encryption_version INT,
  expires_at TIMESTAMPTZ,
  failure_reason TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_cred RECORD;
  v_reg RECORD;
  v_profile RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_granted BOOLEAN := FALSE;
  v_reason TEXT;
BEGIN
  -- Log request attempt
  INSERT INTO public.credential_access_logs 
    (credential_id, user_id, match_id, action, result, ip_address, user_agent)
  SELECT id, p_user_id, p_match_id, 'REQUEST', 'FAILURE', p_ip, p_user_agent
  FROM public.credentials WHERE match_id = p_match_id
  RETURNING credential_id INTO v_cred;

  -- Fetch credential
  SELECT * INTO v_cred FROM public.credentials WHERE match_id = p_match_id;
  IF NOT FOUND THEN
    v_reason := 'CREDENTIAL_NOT_FOUND';
    GOTO log_deny;
  END IF;

  -- Check credential status
  IF v_cred.status != 'AVAILABLE' THEN
    v_reason := 'CREDENTIAL_NOT_AVAILABLE';
    GOTO log_deny;
  END IF;

  -- Check expiry
  IF v_now >= v_cred.expires_at THEN
    UPDATE public.credentials SET status = 'EXPIRED', updated_at = NOW() WHERE id = v_cred.id;
    v_reason := 'CREDENTIAL_EXPIRED';
    GOTO log_deny;
  END IF;

  -- Verify registration (cross-project - app must check)
  -- This is a simplified check; full eligibility in application layer
  
  -- Check user not banned (cross-project - app must check)
  
  -- All checks passed
  v_granted := TRUE;
  
  -- Log success
  UPDATE public.credential_access_logs
  SET action = 'GRANT', result = 'SUCCESS', granted_at = v_now
  WHERE credential_id = v_cred.id AND user_id = p_user_id AND granted_at IS NULL;
  
  RETURN QUERY SELECT 
    TRUE,
    v_cred.room_id_encrypted,
    v_cred.password_encrypted,
    v_cred.encryption_version,
    v_cred.expires_at,
    NULL::TEXT;
  RETURN;

  <<log_deny>>
  -- Log denial
  UPDATE public.credential_access_logs
  SET action = 'DENY', result = 'FAILURE', failure_reason = v_reason
  WHERE credential_id = v_cred.id AND user_id = p_user_id AND granted_at IS NULL;
  
  RETURN QUERY SELECT FALSE, NULL, NULL, NULL, NULL, v_reason;
END;
$$;
```

---

## 6. Migration Strategy

### 6.1 Migration Order
1. DB-AUTH (profiles, admin_users, user_sessions)
2. DB-MATCH (matches, registrations, checkins, teams, team_members)
3. DB-CRED (credentials, credential_access_logs) — **CRITICAL: encryption setup first**
4. DB-AUDIT (audit_logs, security_events, analytics_events)
5. DB-NOTIF (notifications, notification_preferences, email_queue)

### 6.2 Encryption Key Setup (Pre-Migration)
```bash
# Generate master encryption key (run once, store in Serv00 env)
openssl rand -base64 32
# Store as CREDENTIAL_ENCRYPTION_KEY in Serv00 .env
```

### 6.3 Key Rotation Procedure
1. Generate new key (version N+1)
2. Add to Serv00 env as `CREDENTIAL_ENCRYPTION_KEY_V2`
3. Backend: decrypt with old key, re-encrypt with new key, update `encryption_version`
4. Remove old key from env after verification
5. Update `encryption_version` default in credentials table

---

## 7. Capacity Planning (Free Tier)

| Project | Est. Rows/Month | Est. Size/Month | 500 MB Limit | Months Before Action |
|---------|-----------------|-----------------|--------------|---------------------|
| DB-AUTH | 10,000 users | 5 MB | 100 months | Archive inactive users |
| DB-MATCH | 500 matches, 50k regs | 20 MB | 25 months | Archive completed seasons |
| DB-CRED | 500 matches | 5 MB | 100 months | Minimal growth |
| DB-AUDIT | 1M events | 50 MB | 10 months | Partition analytics, archive |
| DB-NOTIF | 100k notifications | 10 MB | 50 months | Archive read notifications |

**Action Items:**
- Implement automated archival for completed matches (> 90 days)
- Partition analytics_events by month
- Delete read notifications > 30 days
- Monitor via Supabase dashboard weekly

---

## 8. Cross-Project Query Patterns

### 8.1 Application Layer Joins (Serv00 Backend)
```typescript
// Example: Get match with registration count and user's registration status
async function getMatchWithUserStatus(matchId: string, userId: string) {
  // Parallel queries to different projects
  const [match, registration, checkin, credential] = await Promise.all([
    supabaseMatch.from('matches').select('*').eq('id', matchId).single(),
    supabaseMatch.from('registrations').select('*').eq('match_id', matchId).eq('user_id', userId).maybeSingle(),
    supabaseMatch.from('checkins').select('*').eq('registration_id', registration?.id).maybeSingle(),
    supabaseCred.from('credentials').select('status, released_at, expires_at').eq('match_id', matchId).maybeSingle()
  ]);
  
  return { match, registration, checkin, credential };
}
```

### 8.2 Transactional Consistency
- No distributed transactions across projects
- Use **eventual consistency** with compensation logic
- Critical operations (registration, credential release) use **application-level locks** (Redis/PostgreSQL advisory locks)

---

*Document Status: DRAFT - Schema requires review and verification before migration.*