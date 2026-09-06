# TMT OFFICIAL eSports Platform — Architecture Diagrams

**Version:** 1.0  
**Date:** 2026-09-05  
**Status:** DRAFT  

---

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                            INTERNET                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        CLOUDFLARE EDGE                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐    │
│  │                            CLOUDFLARE PAGES (Frontend)                                      │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │    │
│  │  │  Player     │ │   Admin     │ │   Auth      │ │   Room      │ │   Static Assets     │   │    │
│  │  │  Dashboard  │ │  Dashboard  │ │   Pages     │ │   Page      │ │   (JS, CSS, Images) │   │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                      │                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐    │
│  │                            CLOUDFLARE WORKERS (Edge API)                                    │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │    │
│  │  │  Email      │ │  Rate       │ │  Auth       │ │  Webhook    │ │  Cron Triggers      │   │    │
│  │  │  Worker     │ │  Limiter    │ │  Proxy      │ │  Receiver   │ │  (Scheduled Jobs)   │   │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                      │                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────┐    │
│  │                            CLOUDFLARE R2 (Object Storage)                                   │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                                           │    │
│  │  │  Avatars    │ │  Match      │ │  Backup     │                                           │    │
│  │  │  (Private)  │ │  Assets     │ │  Exports    │                                           │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘                                           │    │
│  └─────────────────────────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                      │
                    ┌─────────────────────────────────┼─────────────────────────────────┐
                    ▼                                 ▼                                 ▼
        ┌───────────────────────┐         ┌───────────────────────┐         ┌───────────────────────┐
        │      SERV00           │         │      SERV00           │         │      SERV00           │
        │   Node.js API         │         │   Node.js API         │         │   Node.js API         │
        │   (Primary)           │         │   (Worker 1)          │         │   (Worker 2)          │
        │                       │         │                       │         │                       │
        │ ┌───────────────────┐ │         │ ┌───────────────────┐ │         │ ┌───────────────────┐ │
        │ │ Auth Service      │ │         │ │ Match Service     │ │         │ │ Credential Service│ │
        │ │ Profile Service   │ │         │ │ Registration Svc  │ │         │ │ Encryption Svc    │ │
        │ │ Notification Svc  │ │         │ │ Check-in Service  │ │         │ │ Access Log Svc    │ │
        │ │ Admin Service     │ │         │ │ Team Service      │ │         │ │ Release Scheduler │ │
        │ └───────────────────┘ │         │ └───────────────────┘ │         │ └───────────────────┘ │
        └───────────────────────┘         └───────────────────────┘         └───────────────────────┘
                    │                                 │                                 │
                    └─────────────────────────────────┼─────────────────────────────────┘
                                                      │
                    ┌─────────────────────────────────┼─────────────────────────────────┐
                    ▼                                 ▼                                 ▼
        ┌───────────────────────┐         ┌───────────────────────┐         ┌───────────────────────┐
        │      SUPABASE         │         │      SUPABASE         │         │      SUPABASE         │
        │      DB-AUTH          │         │      DB-MATCH         │         │      DB-CRED          │
        │      (Org-1)          │         │      (Org-1)          │         │      (Org-2)          │
        │                       │         │                       │         │                       │
        │  auth.users           │         │  matches              │         │  credentials          │
        │  profiles             │         │  registrations        │         │  credential_access_   │
        │  admin_users          │         │  checkins             │         │  logs                 │
        │  user_sessions        │         │  teams                │         │                       │
        │                       │         │  team_members         │         │                       │
        └───────────────────────┘         └───────────────────────┘         └───────────────────────┘
                    │                                 │                                 │
                    ▼                                 ▼                                 ▼
        ┌───────────────────────┐         ┌───────────────────────┐
        │      SUPABASE         │         │      SUPABASE         │
        │      DB-AUDIT         │         │      DB-NOTIF         │
        │      (Org-2)          │         │      (Org-3)          │
        │                       │         │                       │
        │  audit_logs           │         │  notifications        │
        │  security_events      │         │  notification_        │
        │  analytics_events     │         │  preferences          │
        │                       │         │  email_queue          │
        └───────────────────────┘         └───────────────────────┘
                                                      │
                                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                        EXTERNAL SERVICES                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐       │
│  │  Google     │  │  SendGrid/  │  │  GitHub     │  │  NTP        │  │  Monitoring         │       │
│  │  Drive x3   │  │  Resend     │  │  Actions    │  │  Pool       │  │  (UptimeRobot)      │       │
│  │  (Backup)   │  │  (Email)    │  │  (CI/CD)    │  │  (Time)     │  │                     │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow Diagrams

### 2.1 Player Registration Flow
```
Player                    Frontend              Cloudflare Workers        Serv00 API              Supabase
  │                        │                        │                        │                        │
  │ 1. Browse matches      │                        │                        │                        │
  │───────────────────────>│                        │                        │                        │
  │                        │ 2. GET /matches        │                        │                        │
  │                        │───────────────────────>│                        │                        │
  │                        │                        │ 3. Query DB-MATCH      │                        │
  │                        │                        │───────────────────────>│                        │
  │                        │                        │                        │ 4. Return matches       │
  │                        │                        │<───────────────────────│                        │
  │                        │ 5. Return matches      │                        │                        │
  │<───────────────────────│                        │                        │                        │
  │                        │                        │                        │                        │
  │ 6. Click Register      │                        │                        │                        │
  │───────────────────────>│                        │                        │                        │
  │                        │ 7. POST /matches/:id/  │                        │                        │
  │                        │    register            │                        │                        │
  │                        │    Idempotency-Key     │                        │                        │
  │                        │───────────────────────>│                        │                        │
  │                        │                        │ 8. Validate eligibility│                        │
  │                        │                        │    - Active account    │                        │
  │                        │                        │    - Not banned        │                        │
  │                        │                        │    - Match OPEN        │                        │
  │                        │                        │    - Slots available   │                        │
  │                        │                        │    - Not registered    │                        │
  │                        │                        │───────────────────────>│ (DB-AUTH, DB-MATCH)    │
  │                        │                        │                        │                        │
  │                        │                        │ 9. Insert registration │                        │
  │                        │                        │    (unique constraint) │                        │
  │                        │                        │───────────────────────>│ (DB-MATCH)             │
  │                        │                        │                        │                        │
  │                        │                        │ 10. Create checkin     │                        │
  │                        │                        │    record (NOT_OPEN)   │                        │
  │                        │                        │───────────────────────>│ (DB-MATCH)             │
  │                        │                        │                        │                        │
  │                        │                        │ 11. Audit log          │                        │
  │                        │                        │───────────────────────>│ (DB-AUDIT)             │
  │                        │                        │                        │                        │
  │                        │                        │ 12. Queue notification │                        │
  │                        │                        │───────────────────────>│ (DB-NOTIF)             │
  │                        │                        │                        │                        │
  │                        │ 13. Return success     │                        │                        │
  │                        │<───────────────────────│                        │                        │
  │ 14. Show confirmed     │                        │                        │                        │
  │<───────────────────────│                        │                        │                        │
```

### 2.2 Credential Release & Access Flow
```
System Cron              Serv00 API              Supabase DB-CRED          Player Frontend
  │                        │                        │                        │
  │ 1. Cron triggers       │                        │                        │
  │    credential release  │                        │                        │
  │───────────────────────>│                        │                        │
  │                        │ 2. For each match:     │                        │
  │                        │    - Check release_at  │                        │
  │                        │    - Check match LIVE  │                        │
  │                        │    - Update status     │                        │
  │                        │      LOCKED→AVAILABLE  │                        │
  │                        │───────────────────────>│                        │
  │                        │                        │ 3. Update status       │
  │                        │                        │    released_at = NOW() │
  │                        │                        │───────────────────────>│
  │                        │                        │                        │
  │                        │ 4. Queue notifications │                        │
  │                        │    for registered      │                        │
  │                        │    & checked-in players│                        │
  │                        │───────────────────────>│ (DB-NOTIF)            │
  │                        │                        │                        │
  │                        │                        │                        │
  │                        │                        │                        │ 5. Player visits
  │                        │                        │                        │    /matches/:id/room
  │                        │                        │                        │───────────────────────>
  │                        │                        │                        │
  │                        │                        │                        │ 6. GET /credential/status
  │                        │                        │                        │───────────────────────>
  │                        │                        │                        │
  │                        │ 7. Check eligibility:  │                        │
  │                        │    - Authenticated     │                        │
  │                        │    - Registered        │                        │
  │                        │    - Not banned        │                        │
  │                        │    - Checked in        │                        │
  │                        │    - Release time met  │                        │
  │                        │    - Not expired       │                        │
  │                        │───────────────────────>│ (DB-AUTH, DB-MATCH,    │
  │                        │                        │     DB-CRED)           │
  │                        │                        │                        │
  │                        │                        │                        │
  │                        │ 8. Player clicks       │                        │
  │                        │    "Show Credentials"  │                        │
  │                        │                        │                        │───────────────────────>
  │                        │                        │                        │
  │                        │ 9. POST /credential/   │                        │
  │                        │    access              │                        │
  │                        │    Idempotency-Key     │                        │
  │                        │───────────────────────>│                        │
  │                        │                        │                        │
  │                        │ 10. Re-verify all      │                        │
  │                        │     eligibility        │                        │
  │                        │     (server time!)     │                        │
  │                        │───────────────────────>│                        │
  │                        │                        │                        │
  │                        │ 11. Decrypt credentials│                        │
  │                        │     (AES-256-GCM)      │                        │
  │                        │     Backend ONLY       │                        │
  │                        │                        │                        │
  │                        │ 12. Log access         │                        │
  │                        │     (GRANT, no plain)  │                        │
  │                        │───────────────────────>│ (DB-CRED)             │
  │                        │                        │                        │
  │                        │ 13. Return decrypted   │                        │
  │                        │     room_id + password │                        │
  │                        │<───────────────────────│                        │
  │                        │                        │                        │
  │                        │ 14. Return credentials │                        │
  │                        │     (no cache!)        │                        │
  │                        │<───────────────────────│                        │
  │                        │                        │                        │ 15. Display with
  │                        │                        │                        │     warning + copy btn
  │                        │                        │                        │<───────────────────────
```

### 2.3 Check-In Flow
```
Player                    Frontend              Serv00 API              Supabase DB-MATCH
  │                        │                        │                        │
  │ 1. Match day arrives   │                        │                        │
  │                        │                        │                        │
  │ 2. Check-in opens      │                        │ 3. Cron updates        │
  │    (server time)       │                        │    checkins:           │
  │                        │                        │    NOT_OPEN → OPEN     │
  │                        │                        │───────────────────────>│
  │                        │                        │                        │
  │ 4. Player opens        │                        │                        │
  │    room page           │                        │                        │
  │───────────────────────>│                        │                        │
  │                        │ 5. GET /checkin        │                        │
  │                        │───────────────────────>│                        │
  │                        │                        │ 6. Return status: OPEN │
  │                        │<───────────────────────│                        │
  │                        │                        │                        │
  │ 7. Player clicks       │                        │                        │
  │    "Check In"          │                        │                        │
  │───────────────────────>│                        │                        │
  │                        │ 8. POST /checkin       │                        │
  │                        │    Idempotency-Key     │                        │
  │                        │───────────────────────>│                        │
  │                        │                        │ 9. Verify:             │
  │                        │                        │    - Registration OK   │
  │                        │                        │    - Window OPEN       │
  │                        │                        │    - Not checked in    │
  │                        │                        │───────────────────────>│
  │                        │                        │                        │
  │                        │                        │ 10. Update:            │
  │                        │                        │     CHECKED_IN         │
  │                        │                        │     checked_in_at      │
  │                        │                        │───────────────────────>│
  │                        │                        │                        │
  │                        │                        │ 11. Audit log          │
  │                        │                        │───────────────────────>│ (DB-AUDIT)
  │                        │                        │                        │
  │                        │ 12. Return success     │                        │
  │                        │<───────────────────────│                        │
  │ 13. Show checked in    │                        │                        │
  │<───────────────────────│                        │                        │
  │                        │                        │                        │
  │                        │                        │ 14. Cron (after close) │
  │                        │                        │    Updates MISSED      │
  │                        │                        │    for un-checked-in   │
  │                        │                        │───────────────────────>│
```

---

## 3. Security Architecture

### 3.1 Credential Encryption Flow
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CREDENTIAL LIFECYCLE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

ADMIN CREATES MATCH
        │
        ▼
┌───────────────────┐
│ Admin enters      │
│ Room ID + Password│
│ in admin panel    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Frontend sends    │
│ PLAINTEXT to      │
│ Serv00 API ONLY   │
│ (HTTPS, auth)     │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Serv00:           │
│ 1. Generate random│
│    12-byte IV     │
│ 2. AES-256-GCM    │
│    encrypt(room)  │
│ 3. AES-256-GCM    │
│    encrypt(pass)  │
│ 4. Store ciphertext│
│    in DB-CRED     │
│ 5. ZEROIZE plain  │
│    text in memory │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ DB-CRED stores:   │
│ - room_id_encrypted│
│ - password_encrypted│
│ - encryption_version│
│ - IV (in ciphertext)│
│ - auth_tag        │
│ NO PLAINTEXT!     │
└─────────┬─────────┘
          │
          ▼
     ... TIME PASSES ...
          │
          ▼
┌───────────────────┐
│ RELEASE TIME      │
│ Server cron calls │
│ release_credentials│
│ Updates status:   │
│ LOCKED → AVAILABLE│
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ PLAYER REQUESTS   │
│ Credential access │
│ (eligible check)  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Serv00:           │
│ 1. Verify ALL     │
│    eligibility    │
│ 2. Fetch ciphertext│
│    from DB-CRED   │
│ 3. Decrypt with   │
│    master key     │
│ 4. Log access     │
│    (GRANT, no     │
│    plaintext)     │
│ 5. Return plain   │
│    text to player │
│ 6. ZEROIZE memory │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Frontend displays │
│ Room ID + Password│
│ with warning      │
│ NO persistence!   │
└───────────────────┘
```

### 3.2 Key Management
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENCRYPTION KEY MANAGEMENT                             │
└─────────────────────────────────────────────────────────────────────────────┘

MASTER KEY GENERATION
        │
        ▼
┌───────────────────┐
│ openssl rand      │
│ -base64 32        │
│ (256-bit key)     │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Stored ONLY in    │
│ Serv00 environment│
│ CREDENTIAL_       │
│ ENCRYPTION_KEY    │
│                   │
│ NEVER in:         │
│ - Frontend        │
│ - Supabase        │
│ - GitHub          │
│ - Logs            │
│ - Docker images   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ KEY ROTATION      │
│ (Quarterly)       │
│                   │
│ 1. Generate new   │
│ 2. Add as v2      │
│ 3. Re-encrypt all │
│ 4. Update version │
│ 5. Remove v1      │
└───────────────────┘
```

### 3.3 Authorization Matrix (Runtime)

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    REQUEST FLOW                          │
                    └─────────────────────────────────────────────────────────┘

Client Request
      │
      ▼
┌─────────────────┐
│ Cloudflare WAF  │ ──► Blocks known attacks, DDoS
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Rate Limiter    │ ──► Per-IP, per-user, per-endpoint
│ (Cloudflare/    │
│  Upstash Redis) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Auth Middleware │ ──► Validates JWT, extracts user_id, role
│ (Serv00)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ RBAC Middleware │ ──► Checks role against endpoint requirements
│ (Serv00)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Business Logic  │ ──► Server-side validation, eligibility checks
│ (Serv00)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Database Access │ ──► RLS policies enforce row-level security
│ (Supabase)      │
└─────────────────┘
```

---

## 4. Deployment Architecture

### 4.1 CI/CD Pipeline
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GITHUB ACTIONS WORKFLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

PUSH TO MAIN
      │
      ▼
┌─────────────────┐
│ 1. Install      │
│    Dependencies │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Lint         │ ◄── ESLint, Prettier
│    & Typecheck  │     TypeScript strict mode
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Unit Tests   │ ◄── Vitest/Jest
│    (Coverage)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Build        │ ◄── Vite (frontend), esbuild (backend)
│    Frontend     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Build        │
│    Backend      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. Deploy       │ ◄── Cloudflare Pages (frontend)
│    Frontend     │     wrangler deploy (workers)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 7. Deploy       │ ◄── SSH to Serv00, PM2 restart
│    Backend      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 8. Run          │ ◄── Supabase CLI db push
│    Migrations   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 9. Health       │
│    Checks       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 10. Notify      │ ◄── Slack/Discord webhook
│    Team         │
└─────────────────┘
```

### 4.2 Environment Promotion
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  DEVELOPMENT│────►│   STAGING   │────►│  PRODUCTION │
│  (Local)    │     │  (Preview)  │     │  (Live)     │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      ▼                   ▼                   ▼
Local Supabase      Preview Supabase      Production Supabase
(or Docker)         Projects (5)          Projects (5)
      │                   │                   │
      ▼                   ▼                   ▼
Local Serv00        Staging Serv00        Production Serv00
(or Docker)         (separate account)    (main account)
      │                   │                   │
      ▼                   ▼                   ▼
Local Cloudflare    Preview Cloudflare    Production Cloudflare
Workers/Pages       Workers/Pages         Workers/Pages
```

---

## 5. Backup & Disaster Recovery

### 5.1 Backup Flow
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTOMATED BACKUP (Daily 02:00 UTC)                   │
└─────────────────────────────────────────────────────────────────────────────┘

SUPABASE (5 Projects)
      │
      ▼
┌─────────────────┐
│ pg_dump --data- │
│ only --format=c │
│ --compress=9    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Encrypt with    │
│ age (age-key)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Google Drive 1  │     │ Google Drive 2  │     │ Google Drive 3  │
│ (Primary)       │     │ (Secondary)     │     │ (Tertiary)      │
│                 │     │                 │     │                 │
│ /backups/       │     │ /backups/       │     │ /backups/       │
│  db-auth/       │     │  db-auth/       │     │  db-auth/       │
│  db-match/      │     │  db-match/      │     │  db-match/      │
│  db-cred/       │     │  db-cred/       │     │  db-cred/       │
│  db-audit/      │     │  db-audit/      │     │  db-audit/      │
│  db-notif/      │     │  db-notif/      │     │  db-notif/      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │ Retention Policy        │
                    │ - Daily: 30 days        │
                    │ - Weekly: 12 weeks      │
                    │ - Monthly: 12 months    │
                    │ - Yearly: 5 years       │
                    └─────────────────────────┘
```

### 5.2 Restore Procedure
```
DISASTER DETECTED
      │
      ▼
┌─────────────────┐
│ 1. Identify     │
│    affected DB  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Download     │
│    latest backup│
│    from Drive 1 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Decrypt      │
│    with age key │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. pg_restore   │
│    --clean      │
│    --if-exists  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Verify data  │
│    integrity    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. Update DNS   │
│    if needed    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 7. Post-mortem  │
│    document     │
└─────────────────┘
```

---

## 6. Network Topology

```
                    ┌──────────────────────────────────────────────────────────┐
                    │                    DNS (Cloudflare)                       │
                    │  api.tmtofficial.esports  ──► Cloudflare Workers        │
                    │  app.tmtofficial.esports  ──► Cloudflare Pages          │
                    │  admin.tmtofficial.esports ──► Cloudflare Pages         │
                    └──────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
            ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
            │ Cloudflare    │ │ Cloudflare    │ │ Cloudflare    │
            │ Pages         │ │ Workers       │ │ R2            │
            │ (Frontend)    │ │ (Edge API)    │ │ (Storage)     │
            └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
                    │                 │                 │
                    └─────────────────┼─────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
            ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
            │ Serv00        │ │ Supabase      │ │ External      │
            │ (Node.js API) │ │ (5 Projects)  │ │ Services      │
            │               │ │               │ │               │
            │ Firewall:     │ │ Network:      │ │ - SendGrid    │
            │ Only CF IPs   │ │ Only CF +     │ │ - Google Drive│
            │ + Admin IPs   │ │ Serv00 IPs    │ │ - GitHub      │
            └───────────────┘ └───────────────┘ └───────────────┘
```

---

*Document Status: DRAFT - Architecture diagrams for reference during implementation.*