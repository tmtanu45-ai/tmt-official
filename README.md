# TMT OFFICIAL eSports Practice-Match Platform

## Project Structure

```
tmt-esports/
├── frontend/                 # React + Vite + TypeScript (Cloudflare Pages)
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/           # Base components (Button, Card, Input, Badge)
│   │   │   ├── auth/         # ProtectedRoute, AdminRoute
│   │   │   └── matches/      # MatchCard
│   │   ├── contexts/         # React contexts (AuthContext)
│   │   ├── layouts/          # Layout components (Layout, AdminLayout)
│   │   ├── pages/            # Page components
│   │   │   ├── auth/         # Login, Register, Forgot/Reset Password
│   │   │   ├── player/       # Dashboard, Matches, Profile, etc.
│   │   │   └── admin/        # Admin Dashboard, Matches, Players, etc.
│   │   ├── services/         # API client (axios)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── utils/            # Utility functions
│   │   ├── types/            # TypeScript types
│   │   ├── App.tsx           # Main app with routing
│   │   ├── main.tsx          # Entry point
│   │   └── index.css         # Global styles + design system
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── index.html
│
├── backend/                   # Node.js + Express + TypeScript (Serv00)
│   ├── src/
│   │   ├── config/           # Supabase client configuration
│   │   ├── middleware/       # Express middleware (auth, rbac, rateLimit, errorHandler)
│   │   ├── routes/           # API routes
│   │   │   ├── auth.ts       # Authentication endpoints
│   │   │   ├── matches.ts    # Match CRUD + public listings
│   │   │   ├── registrations.ts
│   │   │   ├── checkin.ts
│   │   │   ├── credentials.ts # Room credential access (SECURE)
│   │   │   ├── notifications.ts
│   │   │   ├── admin.ts      # Admin dashboard endpoints
│   │   │   ├── cron.ts       # Scheduled jobs
│   │   │   ├── health.ts
│   │   │   └── webhooks.ts
│   │   ├── services/         # Business logic services
│   │   │   ├── email.ts      # Email queue + templates
│   │   │   └── encryption.ts # AES-256-GCM for credentials
│   │   ├── encryption/       # Credential encryption utilities
│   │   ├── utils/            # Logger, helpers
│   │   ├── types/            # TypeScript types per Supabase project
│   │   ├── index.ts          # Entry point
│   │   └── config/supabase.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── supabase/                 # Database migrations (5 projects)
│   ├── auth/                 # DB-AUTH: profiles, admin_users, sessions
│   ├── match/                # DB-MATCH: matches, registrations, checkins, teams
│   ├── cred/                 # DB-CRED: encrypted credentials, access logs
│   ├── audit/                # DB-AUDIT: audit_logs, security_events, analytics
│   └── notif/                # DB-NOTIF: notifications, preferences, email_queue
│
├── docs/                     # Architecture & design documents
│   ├── 01-requirements.md
│   ├── 02-feature-list.md
│   ├── 03-threat-model.md
│   ├── 04-security-checklist.md
│   ├── 05-database-architecture.md
│   ├── 06-api-specification.md
│   ├── 07-architecture-diagrams.md
│   ├── 08-free-tier-plan.md
│   ├── 09-roadmap.md
│   ├── 10-deployment.md
│   ├── 11-storage-backup-dr.md
│   └── 12-compliance.md
│
├── tests/                    # Test files
│   ├── auth/
│   ├── match/
│   ├── registration/
│   ├── credential/
│   └── admin/
│
└── cloudflare-worker/        # Cloudflare Workers (email, cron, rate limiting)
```

## Key Security Features

1. **Credential Encryption**: AES-256-GCM authenticated encryption at rest
2. **Backend-Only Decryption**: Keys never leave Serv00 environment
3. **Server-Authoritative Time**: All temporal controls use server time
4. **RLS on All Tables**: Row Level Security with least privilege
5. **Rate Limiting**: Per-endpoint, per-user, per-IP
6. **Audit Logging**: All sensitive operations logged
7. **No Credentials in Frontend**: Never exposed in APIs, logs, or analytics

## Free Tier Architecture

- **5 Supabase Projects** across 3 organizations (2 projects/org limit)
- **Cloudflare Pages** for frontend hosting
- **Cloudflare Workers** for edge functions (email, cron, rate limiting)
- **Cloudflare R2** for avatar/image storage (10 GB free)
- **3 Google Drive Accounts** for backup rotation (45 GB total)
- **Serv00** for Node.js backend hosting

## Getting Started

### Backend
```bash
cd backend
cp .env.example .env
# Fill in all environment variables
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Supabase Migrations
Run migrations in order for each of the 5 projects:
1. auth/migrations/001_initial_schema.sql
2. match/migrations/001_initial_schema.sql
3. cred/migrations/001_initial_schema.sql
4. audit/migrations/001_initial_schema.sql
5. notif/migrations/001_initial_schema.sql

## Deployment

See [docs/10-deployment.md](docs/10-deployment.md) for detailed deployment instructions.

## Security Checklist

See [docs/04-security-checklist.md](docs/04-security-checklist.md) for pre-launch verification.

## License

Private - TMT OFFICIAL. All rights reserved.# tmt-official
