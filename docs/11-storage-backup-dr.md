# TMT OFFICIAL eSports Platform — Storage, Backup & Disaster Recovery

**Version:** 1.0  
**Date:** 2026-09-05  
**Status:** DRAFT  

---

## 1. Storage Architecture

### 1.1 Storage Tiers

| Tier | Service | Purpose | Capacity | Cost |
|------|---------|---------|----------|------|
| **Hot** | Supabase PostgreSQL (5 projects) | Operational data | 2.5 GB total | Free (within limits) |
| **Warm** | Cloudflare R2 | Avatars, match assets, exports | 10 GB | Free |
| **Cold** | Google Drive (3 accounts) | Encrypted backups | 45 GB total | Free |
| **Archive** | Cloudflare R2 (IA class) | Yearly backups | Unlimited* | $0.01/GB/mo |

*IA class has no free tier - use Standard class only

### 1.2 Data Classification

| Data Type | Primary Storage | Backup | Retention | Encryption |
|-----------|-----------------|--------|-----------|------------|
| User Auth (Supabase Auth) | Supabase Auth | Supabase managed | Per Supabase | At rest (Supabase) |
| Profiles, Admin Users | DB-AUTH | Daily to Drive | 5 years | At rest + Backup encrypted |
| Matches, Registrations | DB-MATCH | Daily to Drive | 5 years | At rest + Backup encrypted |
| **Room Credentials** | **DB-CRED (encrypted)** | **Daily to Drive** | **2 years** | **AES-256-GCM + Backup encrypted** |
| Audit Logs | DB-AUDIT | Daily to Drive | 7 years | At rest + Backup encrypted |
| Security Events | DB-AUDIT | Daily to Drive | 7 years | At rest + Backup encrypted |
| Analytics Events | DB-AUDIT | Monthly to Drive | 2 years | At rest + Backup encrypted |
| Notifications | DB-NOTIF | Daily to Drive | 1 year | At rest + Backup encrypted |
| Email Queue | DB-NOTIF | Daily to Drive | 30 days | At rest + Backup encrypted |
| Avatars | Cloudflare R2 | Weekly to Drive | 2 years | At rest (R2) + Backup encrypted |
| Match Assets | Cloudflare R2 | Monthly to Drive | 5 years | At rest (R2) + Backup encrypted |

---

## 2. Backup Strategy

### 2.1 Backup Schedule

| Frequency | Scope | Destination | Retention |
|-----------|-------|-------------|-----------|
| **Daily** (02:00 UTC) | All 5 Supabases (pg_dump --data-only) | Drive 1 (Primary) | 30 days |
| **Weekly** (Sunday 03:00) | Full schema + data | Drive 2 (Secondary) | 12 weeks |
| **Monthly** (1st 04:00) | Full schema + data + R2 assets | Drive 3 (Tertiary) | 12 months |
| **Yearly** (Jan 1 05:00) | Complete archive | R2 (Standard) | 5 years |

### 2.2 Backup Procedure (Daily)

```bash
#!/bin/bash
# /home/user/scripts/daily-backup.sh

set -euo pipefail

DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/backup_${TIMESTAMP}"
mkdir -p "${BACKUP_DIR}"

# Age encryption key (public key for encryption)
AGE_PUBLIC_KEY="age1xxx..."

# Supabase projects configuration
declare -A PROJECTS=(
  ["auth"]="SUPABASE_AUTH_URL SUPABASE_AUTH_SERVICE_KEY"
  ["match"]="SUPABASE_MATCH_URL SUPABASE_MATCH_SERVICE_KEY"
  ["cred"]="SUPABASE_CRED_URL SUPABASE_CRED_SERVICE_KEY"
  ["audit"]="SUPABASE_AUDIT_URL SUPABASE_AUDIT_SERVICE_KEY"
  ["notif"]="SUPABASE_NOTIF_URL SUPABASE_NOTIF_SERVICE_KEY"
)

# Function to dump and encrypt
backup_project() {
  local name=$1
  local url_var=$2
  local key_var=$3
  
  local url="${!url_var}"
  local key="${!key_var}"
  
  # Extract host from URL
  local host=$(echo $url | sed 's|https://||' | sed 's|/.*||')
  
  echo "Backing up ${name}..."
  
  # Data-only dump (schema managed via migrations)
  PGPASSWORD=$(echo $key | cut -d'.' -f3 | base64 -d 2>/dev/null || echo $key) \
    pg_dump \
    -h "${host}" \
    -U postgres \
    -d postgres \
    --data-only \
    --format=custom \
    --compress=9 \
    --no-owner \
    --no-privileges \
    > "${BACKUP_DIR}/${name}_${TIMESTAMP}.dump"
  
  # Encrypt with age
  age -r "${AGE_PUBLIC_KEY}" \
    -o "${BACKUP_DIR}/${name}_${TIMESTAMP}.dump.age" \
    "${BACKUP_DIR}/${name}_${TIMESTAMP}.dump"
  
  # Verify encryption
  if ! age -d -i /home/user/age-private-key.txt \
    "${BACKUP_DIR}/${name}_${TIMESTAMP}.dump.age" > /dev/null 2>&1; then
    echo "ERROR: Encryption verification failed for ${name}"
    return 1
  fi
  
  # Upload to Google Drive (Primary)
  rclone copy "${BACKUP_DIR}/${name}_${TIMESTAMP}.dump.age" \
    "gdrive1:backups/daily/${name}/" \
    --drive-service-account-file=/home/user/sa1.json \
    --tpslimit 10 \
    --retries 3 \
    --low-level-retries 10
  
  # Cleanup
  rm "${BACKUP_DIR}/${name}_${TIMESTAMP}.dump" \
     "${BACKUP_DIR}/${name}_${TIMESTAMP}.dump.age"
  
  echo "✓ ${name} backed up successfully"
}

# Backup all projects
for project in auth match cred audit notif; do
  backup_project "$project" \
    "SUPABASE_${project^^}_URL" \
    "SUPABASE_${project^^}_SERVICE_KEY"
done

# Backup R2 assets (weekly only - check day of week)
if [ "$(date +%u)" -eq 7 ]; then
  echo "Weekly R2 backup..."
  rclone sync "r2:tmt-esports-avatars" "gdrive1:backups/weekly/r2/avatars/" \
    --drive-service-account-file=/home/user/sa1.json
  rclone sync "r2:tmt-esports-match-assets" "gdrive1:backups/weekly/r2/match-assets/" \
    --drive-service-account-file=/home/user/sa1.json
fi

# Cleanup old local backups
find /tmp -name "backup_*" -type d -mtime +1 -exec rm -rf {} \;

# Log completion
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Daily backup completed" >> /home/user/logs/backup.log

# Alert on failure (handled by script exit code)
```

### 2.3 Backup Verification

```bash
#!/bin/bash
# /home/user/scripts/verify-backup.sh

# Monthly verification (1st of month)
# Download latest backup, decrypt, verify integrity

LATEST=$(rclone lsf "gdrive1:backups/daily/auth/" --format "p" | sort | tail -1)

if [ -z "$LATEST" ]; then
  echo "ERROR: No backup found"
  exit 1
fi

# Download
rclone copy "gdrive1:backups/daily/auth/${LATEST}" /tmp/verify/ \
  --drive-service-account-file=/home/user/sa1.json

# Decrypt
age -d -i /home/user/age-private-key.txt \
  -o /tmp/verify/auth.dump \
  /tmp/verify/${LATEST}

# Verify pg_dump format
pg_restore --list /tmp/verify/auth.dump > /dev/null

# Check table counts match (sample)
# pg_restore --data-only --table=profiles /tmp/verify/auth.dump | wc -l

echo "Backup verification PASSED"
```

---

## 3. Disaster Recovery Plan

### 3.1 Recovery Scenarios

| Scenario | RTO | RPO | Procedure |
|----------|-----|-----|-----------|
| Single table corruption | 30 min | 24 hr | Restore table from daily backup |
| Single Supabase project loss | 2 hr | 24 hr | Restore project from daily backup |
| All Supabase projects loss | 4 hr | 24 hr | Restore all 5 from daily backup |
| Serv00 server failure | 1 hr | 0 | Deploy to new Serv00, restore DB |
| Cloudflare outage | 30 min | 0 | Failover to backup domain/pages |
| R2 data loss | 2 hr | 1 week | Restore from Google Drive |
| Google Drive account loss | 1 hr | 1 week | Use secondary/tertiary drive |
| **Complete regional outage** | **8 hr** | **24 hr** | **Full rebuild from yearly archive** |

### 3.2 Recovery Procedures

#### 3.2.1 Restore Single Supabase Project
```bash
#!/bin/bash
# restore-project.sh <project> <backup-date>

PROJECT=$1
BACKUP_DATE=$2  # YYYY-MM-DD or "latest"

# Find backup file
if [ "$BACKUP_DATE" = "latest" ]; then
  BACKUP_FILE=$(rclone lsf "gdrive1:backups/daily/${PROJECT}/" --format "p" | sort | tail -1)
else
  BACKUP_FILE=$(rclone lsf "gdrive1:backups/daily/${PROJECT}/" --format "p" | grep "^${PROJECT}_${BACKUP_DATE}" | sort | tail -1)
fi

if [ -z "$BACKUP_FILE" ]; then
  echo "Backup not found for ${PROJECT} on ${BACKUP_DATE}"
  exit 1
fi

# Download
rclone copy "gdrive1:backups/daily/${PROJECT}/${BACKUP_FILE}" /tmp/restore/ \
  --drive-service-account-file=/home/user/sa1.json

# Decrypt
age -d -i /home/user/age-private-key.txt \
  -o /tmp/restore/${PROJECT}.dump \
  /tmp/restore/${BACKUP_FILE}

# Get target Supabase URL and key
URL_VAR="SUPABASE_${PROJECT^^}_URL"
KEY_VAR="SUPABASE_${PROJECT^^}_SERVICE_KEY"
HOST=$(echo ${!URL_VAR} | sed 's|https://||' | sed 's|/.*||')
KEY=${!KEY_VAR}

# Restore (WARNING: --clean drops objects)
PGPASSWORD=$(echo $KEY | cut -d'.' -f3 | base64 -d 2>/dev/null || echo $KEY) \
  pg_restore \
  -h "${HOST}" \
  -U postgres \
  -d postgres \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  /tmp/restore/${PROJECT}.dump

# Verify
echo "Restored ${PROJECT} from ${BACKUP_FILE}"
```

#### 3.2.2 Full Platform Recovery
```bash
#!/bin/bash
# full-recovery.sh - Run on fresh Serv00 instance

# 1. Provision new Serv00
# 2. Install dependencies (Node, PM2, pg_client, rclone, age)
# 3. Clone repo
git clone https://github.com/yourorg/tmt-esports.git
cd tmt-esports/backend

# 4. Restore all 5 databases (parallel)
for project in auth match cred audit notif; do
  ./scripts/restore-project.sh $project latest &
done
wait

# 5. Restore R2 assets from Google Drive
rclone sync "gdrive1:backups/weekly/r2/avatars/" "r2:tmt-esports-avatars"
rclone sync "gdrive1:backups/weekly/r2/match-assets/" "r2:tmt-esports-match-assets"

# 6. Deploy backend
pnpm install --production
pnpm run build
pm2 start ecosystem.config.js --env production

# 7. Deploy frontend (trigger Pages build)
# 8. Deploy Workers
# 9. Update DNS if needed
# 10. Run smoke tests
./scripts/smoke-tests.sh

echo "Full recovery completed"
```

---

## 4. R2 Asset Backup

### 4.1 Asset Backup Script
```bash
#!/bin/bash
# /home/user/scripts/backup-r2.sh

# Monthly full sync of R2 to Google Drive
rclone sync "r2:tmt-esports-avatars" "gdrive1:backups/monthly/r2/avatars/" \
  --drive-service-account-file=/home/user/sa1.json \
  --tpslimit 10 \
  --progress

rclone sync "r2:tmt-esports-match-assets" "gdrive1:backups/monthly/r2/match-assets/" \
  --drive-service-account-file=/home/user/sa1.json \
  --tpslimit 10 \
  --progress

# Also sync to secondary drive
rclone sync "r2:tmt-esports-avatars" "gdrive2:backups/monthly/r2/avatars/" \
  --drive-service-account-file=/home/user/sa2.json

rclone sync "r2:tmt-esports-match-assets" "gdrive2:backups/monthly/r2/match-assets/" \
  --drive-service-account-file=/home/user/sa2.json
```

---

## 5. Backup Monitoring & Alerting

### 5.1 Success Metrics
- Daily backup: 100% success rate
- Backup size growth: < 20% month-over-month
- Restore test: Monthly (automated), Quarterly (manual full)

### 5.2 Alert Rules
```yaml
# Alerting rules (implemented in backup script + monitoring)
alerts:
  - name: backup_failed
    condition: backup_script_exit_code != 0
    severity: critical
    channels: [discord, email]
    
  - name: backup_size_anomaly
    condition: backup_size > 1.5 * avg_last_7_days
    severity: warning
    channels: [discord]
    
  - name: backup_missing
    condition: no_backup_in_last_36_hours
    severity: critical
    channels: [discord, email, telegram]
    
  - name: restore_test_failed
    condition: monthly_restore_test != success
    severity: critical
    channels: [discord, email]
```

### 5.3 Backup Dashboard Data
```sql
-- Stored in DB-AUDIT.backup_logs table
CREATE TABLE backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL, -- daily, weekly, monthly, yearly
  project TEXT NOT NULL,     -- auth, match, cred, audit, notif, r2
  status TEXT NOT NULL,      -- success, failed, partial
  size_bytes BIGINT,
  duration_seconds INT,
  error_message TEXT,
  drive_destination TEXT,    -- gdrive1, gdrive2, gdrive3, r2
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Data Retention & Deletion

### 6.1 Retention Policies

| Data | Retention | Deletion Method |
|------|-----------|-----------------|
| Auth users (inactive) | 1 year | Anonymize (keep ID, hash email) |
| Completed matches | 5 years | Archive to R2, drop from DB |
| Registrations | 5 years | Archive with match |
| Check-ins | 2 years | Delete |
| **Room credentials** | **2 years** | **Secure delete (overwrite)** |
| Credential access logs | 7 years | Archive |
| Audit logs | 7 years | Archive |
| Security events | 7 years | Archive |
| Analytics events | 2 years | Aggregate + delete raw |
| Notifications (read) | 30 days | Delete |
| Notifications (unread) | 1 year | Archive |
| Email queue (sent) | 30 days | Delete |
| Avatars (inactive user) | 1 year | Delete from R2 |

### 6.2 GDPR/CCPA Deletion
```sql
-- Function for right to erasure
CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Anonymize profiles
  UPDATE public.profiles 
  SET username = 'deleted_' || substr(id::text, 1, 8),
      display_name = 'Deleted User',
      ff_uid = NULL,
      in_game_name = NULL,
      avatar_url = NULL,
      bio = NULL,
      account_status = 'DELETED'
  WHERE user_id = p_user_id;
  
  -- Delete registrations (cascade to checkins)
  DELETE FROM public.registrations WHERE user_id = p_user_id;
  
  -- Delete notifications
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  
  -- Delete sessions
  DELETE FROM public.user_sessions WHERE user_id = p_user_id;
  
  -- Anonymize audit logs (keep for integrity)
  UPDATE public.audit_logs 
  SET user_id = NULL, metadata = jsonb_set(metadata, '{user}', '"REDACTED"')
  WHERE user_id = p_user_id;
  
  -- Delete from Supabase Auth (via admin API)
  -- Requires service role key
END;
$$;
```

---

## 7. Testing Schedule

| Test | Frequency | Method | Success Criteria |
|------|-----------|--------|------------------|
| Daily backup verification | Daily | Automated script | Exit code 0, file exists in Drive |
| Weekly restore test (single table) | Weekly | CI job | Table restored, row count matches |
| Monthly full project restore | Monthly | Manual | All 5 projects restored, app functional |
| Quarterly full platform DR | Quarterly | Scheduled drill | RTO < 4hr, RPO < 24hr, all tests pass |
| Annual backup integrity audit | Yearly | Manual | All backups decrypt, valid pg_dump |

---

## 8. Key Management for Backups

### 8.1 Age Key Pair
```bash
# Generate once, store securely
age-keygen -o age-keys.txt

# Public key (for encryption) - store in Serv00 env
AGE_PUBLIC_KEY=age1xxx...

# Private key (for decryption) - store OFFLINE
# Print and store in physical safe
# Also store in password manager (Bitwarden/1Password)
```

### 8.2 Key Rotation (Annual)
1. Generate new key pair
2. Update `AGE_PUBLIC_KEY` in Serv00
3. Re-encrypt last 30 days of backups with new key
4. Update verification scripts
5. Archive old private key
6. Test restore with new key

---

## 9. Compliance Documentation

### 9.1 Backup Records (for audit)
- Backup logs in DB-AUDIT (7 years)
- Restore test reports (stored in Drive)
- DR drill reports (stored in Drive)
- Key rotation records

### 9.2 Data Processing Addendum
- Supabase DPA signed
- Cloudflare DPA signed
- Google Drive DPA (via Workspace)
- Serv00: Verify data processing terms

---

*Document Status: DRAFT - Implement backup scripts and test before production.*