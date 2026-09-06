# TMT OFFICIAL eSports Platform — Deployment Guide

**Version:** 1.0  
**Date:** 2026-09-05  
**Status:** DRAFT  

---

## 1. Prerequisites

### 1.1 Accounts Required
- [ ] GitHub (organization for repos)
- [ ] Cloudflare (Pages, Workers, R2)
- [ ] Supabase (3 organizations, 5 projects)
- [ ] Serv00 (VPS/hosting account)
- [ ] Google Cloud (3 service accounts for Drive)
- [ ] SendGrid/Resend/Mailgun (email)
- [ ] Upstash (Redis for rate limiting) - optional
- [ ] UptimeRobot (monitoring)

### 1.2 Local Development Tools
- Node.js 20+
- pnpm (recommended) or npm
- Git
- Supabase CLI
- Cloudflare Wrangler CLI
- rclone (for Google Drive)
- age (for backup encryption)

---

## 2. Supabase Setup (5 Projects)

### 2.1 Create Organizations & Projects
```bash
# Org 1: tmt-esports-auth-match
#   Project 1: tmt-esports-db-auth
#   Project 2: tmt-esports-db-match

# Org 2: tmt-esports-cred-audit
#   Project 3: tmt-esports-db-cred
#   Project 4: tmt-esports-db-audit

# Org 3: tmt-esports-notif
#   Project 5: tmt-esports-db-notif
```

### 2.2 Configure Each Project
```bash
# For each project:
supabase login
supabase link --project-ref <ref>

# Run migrations (in order)
supabase db push

# Enable Realtime (if needed)
# Auth settings:
#   - Email confirm: ON
#   - Email change confirm: ON
#   - Secure password: ON
#   - Leaked password protection: ON
```

### 2.3 Collect Credentials
For each project, save:
- `SUPABASE_<PROJECT>_URL`
- `SUPABASE_<PROJECT>_ANON_KEY`
- `SUPABASE_<PROJECT>_SERVICE_ROLE_KEY` (BACKEND ONLY!)

---

## 3. Cloudflare Setup

### 3.1 Pages (Frontend)
```bash
# Connect GitHub repo to Cloudflare Pages
# Build command: pnpm run build
# Output directory: dist
# Root directory: /frontend

# Environment variables (in Pages dashboard):
NEXT_PUBLIC_SUPABASE_AUTH_URL=
NEXT_PUBLIC_SUPABASE_AUTH_ANON_KEY=
NEXT_PUBLIC_SUPABASE_MATCH_URL=
NEXT_PUBLIC_SUPABASE_MATCH_ANON_KEY=
NEXT_PUBLIC_API_URL=https://api.tmtofficial.esports
```

### 3.2 Workers (Edge API)
```bash
cd cloudflare-worker
wrangler login
wrangler deploy

# Secrets (wrangler secret put):
EMAIL_API_TOKEN=
SENDGRID_API_KEY=  # or RESEND_API_KEY
EMAIL_FROM=
EMAIL_FROM_NAME=
```

### 3.3 R2 Buckets
```bash
# Create buckets
wrangler r2 bucket create tmt-esports-avatars
wrangler r2 bucket create tmt-esports-match-assets
wrangler r2 bucket create tmt-esports-backups
wrangler r2 bucket create tmt-esports-exports

# Set CORS for avatars bucket
wrangler r2 bucket cors put tmt-esports-avatars --rules '[{"AllowedOrigins":["https://app.tmtofficial.esports"],"AllowedMethods":["GET","PUT"],"AllowedHeaders":["*"]}]'
```

### 3.4 Cron Triggers (5 max)
```toml
# wrangler.toml
[triggers]
crons = [
  "*/5 * * * *",   # Match status updates
  "* * * * *",     # Credential release check
  "*/5 * * * *",   # Check-in auto-miss
  "*/10 * * * *",  # Credential expiry
  "*/15 * * * *",  # Email queue
]
```

---

## 4. Serv00 Backend Deployment

### 4.1 Server Preparation
```bash
# SSH into Serv00
ssh user@serv00.com

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install PostgreSQL client (for migrations)
sudo apt-get install -y postgresql-client

# Create app directory
mkdir -p /home/user/tmt-esports-backend
cd /home/user/tmt-esports-backend
```

### 4.2 Environment Configuration
```bash
# Create .env file (NEVER commit this)
cat > .env << 'EOF'
# Server
NODE_ENV=production
PORT=3000
API_URL=https://api.tmtofficial.esports

# Supabase - DB-AUTH
SUPABASE_AUTH_URL=https://xxx.supabase.co
SUPABASE_AUTH_ANON_KEY=xxx
SUPABASE_AUTH_SERVICE_KEY=xxx

# Supabase - DB-MATCH
SUPABASE_MATCH_URL=https://xxx.supabase.co
SUPABASE_MATCH_ANON_KEY=xxx
SUPABASE_MATCH_SERVICE_KEY=xxx

# Supabase - DB-CRED
SUPABASE_CRED_URL=https://xxx.supabase.co
SUPABASE_CRED_ANON_KEY=xxx
SUPABASE_CRED_SERVICE_KEY=xxx

# Supabase - DB-AUDIT
SUPABASE_AUDIT_URL=https://xxx.supabase.co
SUPABASE_AUDIT_ANON_KEY=xxx
SUPABASE_AUDIT_SERVICE_KEY=xxx

# Supabase - DB-NOTIF
SUPABASE_NOTIF_URL=https://xxx.supabase.co
SUPABASE_NOTIF_ANON_KEY=xxx
SUPABASE_NOTIF_SERVICE_KEY=xxx

# Encryption (CRITICAL - generate once, never rotate without procedure)
CREDENTIAL_ENCRYPTION_KEY=$(openssl rand -base64 32)

# Email (Cloudflare Worker)
EMAIL_WORKER_URL=https://email-worker.tmtofficial.workers.dev
EMAIL_API_TOKEN=xxx

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Cron Secret (for internal cron endpoints)
CRON_SECRET=$(openssl rand -base64 32)

# Admin API Secret
ADMIN_API_SECRET=$(openssl rand -base64 32)

# Google Drive Backup
GDRIVE_SA1_KEY_FILE=/home/user/sa1.json
GDRIVE_SA2_KEY_FILE=/home/user/sa2.json
GDRIVE_SA3_KEY_FILE=/home/user/sa3.json
AGE_PUBLIC_KEY=age1xxx...
EOF
```

### 4.3 Deploy Application
```bash
# Clone repo
git clone https://github.com/yourorg/tmt-esports.git
cd tmt-esports/backend

# Install dependencies
pnpm install --production

# Build
pnpm run build

# Run migrations (against each Supabase project)
pnpm run db:migrate

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 config
pm2 save
pm2 startup
```

### 4.4 PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'tmt-esports-api',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    },
    error_file: '/home/user/logs/api-error.log',
    out_file: '/home/user/logs/api-out.log',
    log_file: '/home/user/logs/api-combined.log',
    time: true,
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=512',
  }]
};
```

### 4.5 Nginx Reverse Proxy (SSL)
```nginx
# /etc/nginx/sites-available/tmt-esports-api
server {
    listen 443 ssl http2;
    server_name api.tmtofficial.esports;

    ssl_certificate /etc/letsencrypt/live/api.tmtofficial.esports/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.tmtofficial.esports/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy strict-origin-when-cross-origin;
    add_header Content-Security-Policy "default-src 'none'; frame-ancestors 'none';";

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
    limit_req zone=api burst=200 nodelay;
}
```

### 4.6 Firewall (UFW)
```bash
# Only allow Cloudflare IPs + Admin IPs
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh

# Cloudflare IPv4
for ip in $(curl -s https://www.cloudflare.com/ips-v4); do
  ufw allow from $ip to any port 443
done

# Cloudflare IPv6
for ip in $(curl -s https://www.cloudflare.com/ips-v6); do
  ufw allow from $ip to any port 443
done

# Admin IPs (replace with your IPs)
ufw allow from YOUR_ADMIN_IP to any port 22
ufw allow from YOUR_ADMIN_IP to any port 3000

ufw enable
```

---

## 5. Google Drive Backup Setup

### 5.1 Create Service Accounts (3)
```bash
# In Google Cloud Console:
# 1. Create project "tmt-esports-backup"
# 2. Enable Drive API
# 3. Create 3 service accounts: backup-primary, backup-secondary, backup-tertiary
# 4. Grant "Drive File Stream" access
# 5. Create keys (JSON) and download
# 6. Share backup folders with each service account email
```

### 5.2 Configure rclone
```bash
# On Serv00
rclone config

# Create 3 remotes: gdrive1, gdrive2, gdrive3
# Type: drive
# Service Account File: /home/user/sa1.json (etc.)
# Root Folder ID: (get from Drive folder URL)
```

### 5.3 Test Backup
```bash
# Run backup script manually
/home/user/backup.sh

# Verify in Google Drive
```

---

## 6. Frontend Deployment (Cloudflare Pages)

### 6.1 Build Configuration
```json
// frontend/package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx",
    "typecheck": "tsc --noEmit"
  }
}
```

### 6.2 Vite Config
```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js', '@supabase/ssr'],
          charts: ['recharts'],
        },
      },
    },
  },
});
```

### 6.3 Deploy
```bash
# Automatic via GitHub push to main
# Or manual:
cd frontend
pnpm run build
wrangler pages deploy dist --project-name=tmt-esports-frontend
```

---

## 7. DNS Configuration (Cloudflare)

| Record | Type | Name | Content | Proxy |
|--------|------|------|---------|-------|
| 1 | A | @ | 192.0.2.1 (dummy) | Proxied |
| 2 | CNAME | www | @ | Proxied |
| 3 | CNAME | app | tmt-esports-frontend.pages.dev | Proxied |
| 4 | CNAME | admin | tmt-esports-frontend.pages.dev | Proxied |
| 5 | CNAME | api | api.tmtofficial.esports | Proxied |
| 6 | TXT | @ | v=spf1 include:_spf.google.com ~all | DNS Only |

---

## 8. SSL/TLS (Cloudflare)

- **SSL/TLS Mode**: Full (Strict)
- **Always Use HTTPS**: On
- **Automatic HTTPS Rewrites**: On
- **Minimum TLS Version**: 1.2
- **HSTS**: Enabled (max-age=31536000, includeSubDomains, preload)

---

## 9. Monitoring Setup

### 9.1 UptimeRobot
```bash
# Create monitors:
# 1. https://api.tmtofficial.esports/health (every 1 min)
# 2. https://app.tmtofficial.esports (every 5 min)
# 3. https://admin.tmtofficial.esports (every 5 min)
# Alert contacts: Discord webhook, Email
```

### 9.2 Custom Health Endpoint
```typescript
// backend/src/routes/health.ts
export async function healthCheck(req, res) {
  const checks = await Promise.allSettled([
    checkSupabase('auth'),
    checkSupabase('match'),
    checkSupabase('cred'),
    checkSupabase('audit'),
    checkSupabase('notif'),
    checkRedis(),
  ]);

  const healthy = checks.every(c => c.status === 'fulfilled');
  
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: checks.map((c, i) => ({
      service: ['auth', 'match', 'cred', 'audit', 'notif', 'redis'][i],
      status: c.status === 'fulfilled' ? 'up' : 'down',
      error: c.status === 'rejected' ? c.reason.message : undefined,
    })),
  });
}
```

---

## 10. Post-Deployment Verification

### 10.1 Smoke Tests
```bash
# Run against production
curl https://api.tmtofficial.esports/health
curl https://api.tmtofficial.esports/time
curl https://api.tmtofficial.esports/api/v1/matches

# Test auth flow
curl -X POST https://api.tmtofficial.esports/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","username":"testuser","ff_uid":"123456789"}'
```

### 10.2 Security Verification
- [ ] No service role keys in frontend bundle
- [ ] No encryption keys in frontend bundle
- [ ] Credentials not in any API response except `/credential/access`
- [ ] RLS policies verified with test users
- [ ] Rate limiting active
- [ ] CSP headers present
- [ ] HSTS enabled
- [ ] Backup encryption verified

### 10.3 Load Test
```bash
# Using k6 or artillery
# Target: 1000 concurrent users
# Scenarios:
# - Browse matches
# - Register for match
# - Check-in
# - Access credentials (at release time)
```

---

## 11. Rollback Procedure

### 11.1 Frontend (Cloudflare Pages)
```bash
# In Pages dashboard: Deployments → Rollback to previous
# Or via CLI:
wrangler pages deployment list --project-name=tmt-esports-frontend
wrangler pages deployment rollback <deployment-id> --project-name=tmt-esports-frontend
```

### 11.2 Backend (Serv00)
```bash
# PM2 rollback
pm2 list
pm2 stop tmt-esports-api
# Deploy previous version
git checkout <previous-tag>
pnpm install --production
pnpm run build
pm2 start ecosystem.config.js --env production
```

### 11.3 Database (Supabase)
```bash
# Point-in-time recovery (Supabase Dashboard)
# Or restore from backup:
# 1. Download latest backup from Google Drive
# 2. Decrypt with age
# 3. pg_restore --clean --if-exists -d postgres backup.dump
```

---

## 12. Maintenance Windows

| Task | Frequency | Window | Duration |
|------|-----------|--------|----------|
| Supabase maintenance | As needed | Supabase scheduled | N/A |
| OS updates | Monthly | Sunday 04:00 UTC | 30 min |
| Dependency updates | Weekly | Sunday 05:00 UTC | 1 hour |
| Backup verification | Monthly | 1st Sunday | 2 hours |
| Security audit | Quarterly | Scheduled | 1 day |

---

## 13. Emergency Contacts

| Role | Name | Phone | Email | Discord |
|------|------|-------|-------|---------|
| Primary On-Call | | | | |
| Secondary On-Call | | | | |
| Security Lead | | | | |
| Infrastructure Lead | | | | |

---

## 14. Runbooks (Quick Reference)

### 14.1 Match Stuck in DRAFT
```bash
# Check cron logs
# Manual trigger:
curl -X POST https://api.tmtofficial.esports/api/v1/cron/match-status-update \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 14.2 Credentials Not Releasing
```bash
# Check DB-CRED credentials table
# Verify match status = LIVE
# Manual release:
curl -X POST https://api.tmtofficial.esports/api/v1/admin/credentials/<matchId>/release \
  -H "Authorization: Bearer $ADMIN_API_SECRET"
```

### 14.3 High Rate Limit Hits
```bash
# Check Cloudflare Workers logs
# Check Upstash Redis metrics
# Temporarily increase limits if legitimate traffic
```

### 14.4 Supabase Project Paused
```bash
# Check Supabase dashboard
# If paused: upgrade to Pro or wait for auto-resume
# Run keep-alive manually
```

---

*Document Status: DRAFT - Update with actual values during deployment.*