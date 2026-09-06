# TMT OFFICIAL eSports Platform — Free Tier Capacity Plan

**Version:** 1.0  
**Date:** 2026-09-05  
**Status:** DRAFT - REQUIRES VERIFICATION  

---

## 1. Free Tier Limits Summary (Verified 2026-08-27)

| Service | Metric | Free Limit | Scope | Our Usage | Headroom |
|---------|--------|------------|-------|-----------|----------|
| **Cloudflare Pages** | Builds/month | 500 | Account | ~50 | 90% |
| | Build timeout | 20 min | Per build | 5 min | 75% |
| | Files per project | 20,000 | Project | ~5,000 | 75% |
| | Max file size | 25 MiB | Per file | < 5 MiB | 80% |
| | Bandwidth | Unlimited | Account | N/A | 100% |
| | Custom domains | 100 | Project | 3 | 97% |
| **Cloudflare Workers** | Requests/day | 100,000 | Account | ~30,000 | 70% |
| | CPU time/request | 10 ms | Per request | < 5 ms | 50% |
| | Memory | 128 MB | Per isolate | < 64 MB | 50% |
| | Cron triggers | 5 | Account | 5 | 0% ⚠️ |
| | Subrequests | 50/request | Per invocation | < 10 | 80% |
| **Cloudflare R2** | Storage | 10 GB/month | Account | ~2 GB | 80% |
| | Class A ops | 1M/month | Account | ~100k | 90% |
| | Class B ops | 10M/month | Account | ~500k | 95% |
| | Egress | Free | Account | N/A | 100% |
| **Supabase (per project)** | DB size | 500 MB soft / 1.5 GB pause | Project | See below | Varies |
| | Storage | 1 GB | Project | 0 (using R2) | 100% |
| | MAU | 50,000 | Project | ~10,000 | 80% |
| | Edge Functions | 2M invocations/month | Project | Minimal | 99% |
| | Realtime | 200 concurrent | Project | < 50 | 75% |
| | Auth emails | 2/hour | Project | Via Workers | N/A |
| | Projects | 2 | Organization | 5 across 3 orgs | N/A |
| **GitHub Actions** | Minutes/month | 2,000 | Account | ~500 | 75% |
| | Storage | 500 MB | Account | < 100 MB | 80% |
| **Google Drive** | Storage | 15 GB/account | Per account | 3 × 15 GB = 45 GB | N/A |
| | API requests | 10,000/100 sec | Per user | Batched | 90% |

---

## 2. Supabase Project Capacity Analysis

### 2.1 Project Allocation
| Project | Purpose | Est. Monthly Growth | 500 MB Limit | Months to Soft Limit | Action at 80% |
|---------|---------|---------------------|--------------|---------------------|---------------|
| **DB-AUTH** | Users, profiles, admin | 5 MB | 500 MB | 80 months | Archive inactive users (>1 yr) |
| **DB-MATCH** | Matches, registrations | 20 MB | 500 MB | 20 months | Archive completed seasons |
| **DB-CRED** | Credentials, access logs | 5 MB | 500 MB | 80 months | Minimal growth |
| **DB-AUDIT** | Audit, security, analytics | 50 MB | 500 MB | 8 months | Partition analytics, archive |
| **DB-NOTIF** | Notifications, email queue | 10 MB | 500 MB | 40 months | Delete read > 30 days |

### 2.2 Mitigation Strategies

#### DB-AUDIT (Highest Risk - 8 months)
```sql
-- Partition analytics_events by month
CREATE TABLE analytics_events_2026_09 PARTITION OF analytics_events
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

-- Automated archival (pg_cron)
-- Move events > 90 days to archive table
-- Compress and export to R2 yearly
```

#### DB-MATCH (20 months)
```sql
-- Archive completed matches > 90 days
-- Move to archive_matches table (same schema, different project or R2)
-- Keep only: id, title, scheduled_at, status, winner_id for stats
```

#### General
- **Monitoring**: Weekly Supabase dashboard check
- **Alerts**: At 300 MB (60%) → warning, 400 MB (80%) → action required
- **Emergency**: If pause imminent → emergency archive script

---

## 3. Cloudflare Workers Optimization

### 3.1 Cron Trigger Allocation (5 max)
| Cron Job | Schedule | Purpose | Project |
|----------|----------|---------|---------|
| 1 | Every 5 min | Match status transitions (DRAFT→OPEN, OPEN→FULL, etc.) | DB-MATCH |
| 2 | Every 1 min | Credential release check (near release_at) | DB-CRED |
| 3 | Every 5 min | Check-in auto-miss (after checkin_closes_at) | DB-MATCH |
| 4 | Every 10 min | Credential expiry (AVAILABLE→EXPIRED) | DB-CRED |
| 5 | Every 15 min | Email queue processing | DB-NOTIF |

**Optimization**: Combine #2 and #4 into single cron (check both release and expiry)

### 3.2 Request Optimization
- **Email Worker**: Batch sends (10 per invocation)
- **Auth Proxy**: Minimal - validate JWT, forward to Serv00
- **Rate Limiter**: Upstash Redis (free: 10k requests/day) or CF Workers KV
- **Webhook Receiver**: Lightweight, async processing

### 3.3 CPU Budget (10 ms/request)
| Operation | Est. CPU | Optimization |
|-----------|----------|--------------|
| JWT validation | 1 ms | Edge cache JWKS |
| Rate limit check | 0.5 ms | Workers KV |
| Request forwarding | 2 ms | Keep alive |
| Email send (batched) | 3 ms | Async, don't await |
| **Total per request** | **~6.5 ms** | **Under 10 ms ✓** |

---

## 4. Cloudflare R2 Usage Plan

### 4.1 Storage Allocation
| Bucket | Purpose | Est. Size | Growth |
|--------|---------|-----------|--------|
| `avatars` | Player avatars (WebP, max 500KB) | 500 MB | 50 MB/mo |
| `match-assets` | Match banners, maps | 200 MB | 10 MB/mo |
| `backups` | Encrypted DB dumps (age) | 1 GB | 200 MB/mo |
| `exports` | CSV/JSON exports for admin | 100 MB | 20 MB/mo |
| **Total** | | **~1.8 GB** | **< 10 GB limit ✓** |

### 4.2 Lifecycle Rules
```json
{
  "rules": [
    {
      "id": "cleanup-temp-uploads",
      "prefix": "temp/",
      "expirationDays": 1,
      "status": "Enabled"
    },
    {
      "id": "archive-old-backups",
      "prefix": "backups/",
      "expirationDays": 90,
      "status": "Enabled"
    }
  ]
}
```

---

## 5. GitHub Actions Optimization

### 5.1 Workflow Matrix
| Workflow | Trigger | Est. Minutes | Frequency | Monthly |
|----------|---------|--------------|-----------|---------|
| CI (lint, test, build) | Push/PR | 8 | 20/mo | 160 |
| Deploy Frontend | Main push | 5 | 10/mo | 50 |
| Deploy Backend | Main push | 3 | 10/mo | 30 |
| Deploy Workers | Main push | 2 | 5/mo | 10 |
| Run Migrations | Main push | 2 | 10/mo | 20 |
| Nightly Backup | Schedule | 10 | 30/mo | 300 |
| **Total** | | | | **~570 min** |

**Headroom**: 2,000 - 570 = 1,430 min (71% free)

### 5.2 Optimization
- Cache `node_modules` and build outputs
- Use `actions/cache` v4
- Self-hosted runner for heavy builds (optional)
- Parallel jobs where possible

---

## 6. Google Drive Backup Strategy

### 6.1 Three-Account Rotation
| Drive | Purpose | Credentials | Rotation |
|-------|---------|-------------|----------|
| Drive 1 (Primary) | Daily backups | Service Account 1 | Active |
| Drive 2 (Secondary) | Weekly mirror | Service Account 2 | Weekly sync |
| Drive 3 (Tertiary) | Monthly archive | Service Account 3 | Monthly sync |

### 6.2 Backup Script (Serv00 Cron)
```bash
#!/bin/bash
# /home/user/backup.sh - Runs daily 02:00 UTC

DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Dump each Supabase project
for PROJECT in auth match cred audit notif; do
  PGPASSWORD=$DB_PASSWORD pg_dump \
    -h $DB_HOST -U postgres -d postgres \
    --data-only --format=custom --compress=9 \
    -t "public.*" \
    > /tmp/${PROJECT}_${TIMESTAMP}.dump
  
  # Encrypt with age
  age -r $AGE_PUBLIC_KEY -o /tmp/${PROJECT}_${TIMESTAMP}.dump.age \
    /tmp/${PROJECT}_${TIMESTAMP}.dump
  
  # Upload to Google Drive (rclone)
  rclone copy /tmp/${PROJECT}_${TIMESTAMP}.dump.age \
    gdrive${DRIVE_NUM}:backups/${PROJECT}/ \
    --drive-service-account-file=/home/user/sa${DRIVE_NUM}.json
  
  # Cleanup local
  rm /tmp/${PROJECT}_${TIMESTAMP}.dump*
done
```

### 6.3 API Quota Management
- **Batch uploads**: Single rclone call per project
- **Rate limiting**: `--tpslimit 10` for Drive API
- **Exponential backoff**: Built into rclone
- **Monitoring**: Log upload success/failure to audit log

---

## 7. Supabase 7-Day Auto-Pause Mitigation

### 7.1 Keep-Alive Cron (Cloudflare Workers)
```typescript
// cron-keepalive.ts - Runs every 6 hours
export default {
  async scheduled(event, env, ctx) {
    const projects = [
      { name: 'auth', url: env.SUPABASE_AUTH_URL },
      { name: 'match', url: env.SUPABASE_MATCH_URL },
      { name: 'cred', url: env.SUPABASE_CRED_URL },
      { name: 'audit', url: env.SUPABASE_AUDIT_URL },
      { name: 'notif', url: env.SUPABASE_NOTIF_URL },
    ];
    
    for (const p of projects) {
      try {
        // Simple query to keep project active
        await fetch(`${p.url}/rest/v1/profiles?select=id&limit=1`, {
          headers: {
            'apikey': env[`SUPABASE_${p.name.toUpperCase()}_ANON_KEY`],
            'Authorization': `Bearer ${env[`SUPABASE_${p.name.toUpperCase()}_ANON_KEY`]}`
          }
        });
        console.log(`Keep-alive: ${p.name} OK`);
      } catch (e) {
        console.error(`Keep-alive failed: ${p.name}`, e);
        // Alert admin
      }
    }
  }
};
```

---

## 8. Cost Projection (If Exceeding Free Tier)

| Service | Paid Tier Trigger | Estimated Cost | Mitigation |
|---------|-------------------|----------------|------------|
| Supabase DB | > 1.5 GB (pause) | $25/mo (Pro) | Archive aggressively |
| Supabase MAU | > 50,000 | $25/mo (Pro) | Unlikely at scale |
| Cloudflare Workers | > 100k req/day | $5/mo per 1M | Optimize, cache |
| Cloudflare R2 | > 10 GB | $0.015/GB | Lifecycle rules |
| GitHub Actions | > 2,000 min | $0.008/min | Self-hosted runner |

**Estimated Monthly Cost at Scale**: $0 (free tier sufficient for 10k MAU)

---

## 9. Monitoring & Alerts

### 9.1 Free Tier Monitoring Stack
| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| Supabase DB size | Supabase Dashboard | > 300 MB (60%) |
| Supabase MAU | Supabase Dashboard | > 35,000 (70%) |
| CF Workers requests | CF Dashboard | > 70,000/day (70%) |
| CF Workers CPU | CF Dashboard | > 8 ms avg |
| R2 Storage | CF Dashboard | > 7 GB (70%) |
| GitHub Actions min | GitHub Settings | > 1,400 min (70%) |
| Backup success | Custom (audit log) | Failure > 0 |
| Serv00 uptime | UptimeRobot (free) | Down > 1 min |

### 9.2 Alert Channels
- **Primary**: Discord webhook (free)
- **Secondary**: Email via Cloudflare Worker
- **Escalation**: Telegram bot (free)

---

## 10. Capacity Checklist (Pre-Launch)

- [ ] All 5 Supabase projects created across 3 organizations
- [ ] Cloudflare Pages project connected to GitHub
- [ ] Cloudflare Workers deployed (email, cron, rate limiter)
- [ ] Cloudflare R2 buckets created with lifecycle rules
- [ ] GitHub Actions workflows configured with caching
- [ ] Google Drive service accounts created (3)
- [ ] rclone configured for all 3 drives
- [ ] Backup script tested and scheduled on Serv00
- [ ] Keep-alive cron deployed to Cloudflare Workers
- [ ] Monitoring dashboards created
- [ ] Alert webhooks configured
- [ ] Load test completed (1000 concurrent users)
- [ ] Free tier limits documented in team wiki

---

*Document Status: DRAFT - All capacity estimates based on 10,000 MAU projection. Verify with actual usage post-launch.*