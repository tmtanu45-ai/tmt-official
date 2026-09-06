# TMT OFFICIAL eSports Platform — Security Checklist

**Version:** 1.0  
**Date:** 2026-09-05  
**Status:** DRAFT - Use for pre-launch verification  

---

## Checklist Usage
- [ ] = Not started
- [~] = In progress
- [✓] = Completed and verified
- [✗] = Failed/Blocked

---

## 1. Authentication & Authorization

### 1.1 Supabase Auth Configuration
- [ ] Email/password provider enabled
- [ ] Email verification REQUIRED (not optional)
- [ ] Password strength policy: min 12 chars, complexity
- [ ] MFA available (TOTP) for admin roles
- [ ] Session timeout: 15 min access token, 24h refresh
- [ ] Refresh token rotation enabled
- [ ] Leaked password protection enabled
- [ ] Rate limits configured on auth endpoints

### 1.2 Role-Based Access Control
- [ ] Roles defined: PLAYER, MODERATOR, ADMIN, SUPER_ADMIN
- [ ] Role stored in `admin_users` table (not just JWT claims)
- [ ] Middleware verifies role on EVERY protected route
- [ ] RLS policies enforce role on ALL tables
- [ ] SUPER_ADMIN can manage admin_users table
- [ ] ADMIN cannot modify SUPER_ADMIN accounts
- [ ] Role escalation requires SUPER_ADMIN + audit log

### 1.3 Session Security
- [ ] HttpOnly cookies for session
- [ ] Secure flag (HTTPS only)
- [ ] SameSite: Strict or Lax
- [ ] Short access token expiry (≤15 min)
- [ ] Refresh token rotation with reuse detection
- [ ] Concurrent session limit (e.g., 5 per user)
- [ ] Session revocation on password change/role change

---

## 2. Credential Security (CRITICAL)

### 2.1 Encryption Implementation
- [ ] Algorithm: AES-256-GCM (authenticated encryption)
- [ ] Key derivation: PBKDF2 or HKDF from master key
- [ ] Unique IV/nonce per credential (12 bytes random)
- [ ] Associated Authenticated Data (AAD) includes: match_id, version
- [ ] Ciphertext stored as: `iv || ciphertext || auth_tag` (base64)
- [ ] Master key ONLY in Serv00 environment variables
- [ ] Master key NEVER in frontend, Supabase, GitHub, logs
- [ ] Key rotation procedure documented and tested

### 2.2 Decryption Access Control
- [ ] Decryption ONLY in Serv00 Node.js backend
- [ ] Service role key ONLY in Serv00 environment
- [ ] No Supabase Edge Functions decrypt credentials
- [ ] No Cloudflare Workers decrypt credentials
- [ ] Decryption function: single entry point, audit logged
- [ ] Plaintext credentials NEVER written to logs
- [ ] Plaintext credentials NEVER returned in bulk APIs
- [ ] Plaintext credentials NEVER in analytics events

### 2.3 Credential Release Logic
- [ ] Release check: authenticated user
- [ ] Release check: user registered for match
- [ ] Release check: user NOT banned/suspended
- [ ] Release check: server time ≥ release_time
- [ ] Release check: server time < expiry_time
- [ ] Release check: match status = LIVE or COMPLETED
- [ ] All checks in SINGLE transaction/function
- [ ] State transition: LOCKED → AVAILABLE (atomic)
- [ ] Expiry transition: AVAILABLE → EXPIRED (cron job)

### 2.4 Credential Access Logging
- [ ] Log: user_id, match_id, timestamp (UTC)
- [ ] Log: action (REQUEST, GRANT, DENY, EXPIRED)
- [ ] Log: result (SUCCESS, FAIL: reason)
- [ ] Log: IP address, user agent
- [ ] Log: NO plaintext credentials
- [ ] Log: NO Room ID, NO Password
- [ ] Logs immutable (append-only table)
- [ ] Logs accessible only to ADMIN/SUPER_ADMIN

---

## 3. Database Security (Supabase)

### 3.1 Row Level Security (RLS)
- [ ] RLS ENABLED on ALL tables
- [ ] Policies: DEFAULT DENY (explicit GRANT only)
- [ ] Profiles: users read all, update own
- [ ] Matches: public read (no creds), admin write
- [ ] Registrations: user read own, admin read all
- [ ] Credentials: NO direct read policy (backend only)
- [ ] Credential Access Logs: admin read only
- [ ] Audit Logs: admin read only
- [ ] Admin Users: admin read, super_admin write
- [ ] Security Events: admin read only
- [ ] Analytics: admin read, anon insert (no PII)

### 3.2 Data Protection
- [ ] No PII in analytics events
- [ ] No credentials in ANY table except `credentials` (encrypted)
- [ ] Email only in `auth.users` and `profiles` (RLS protected)
- [ ] FF UID validated, not exposed in public APIs
- [ ] Soft deletes for audit trail (deleted_at)
- [ ] Updated_at triggers on all mutable tables

### 3.3 Database Configuration
- [ ] SSL/TLS enforced (Supabase default)
- [ ] Connection pooling enabled (PgBouncer)
- [ ] Point-in-time recovery enabled
- [ ] Automated daily backups
- [ ] Backup encryption verified
- [ ] No public schema access for anon key

---

## 4. API Security

### 4.1 Endpoint Protection
- [ ] All endpoints require authentication (except public match list)
- [ ] Role checks on admin endpoints
- [ ] Rate limiting: per-user, per-IP, per-endpoint
- [ ] Idempotency keys for registration/credential access
- [ ] Request size limits (e.g., 1MB)
- [ ] Timeout limits (e.g., 30s)

### 4.2 Input Validation
- [ ] Zod schemas for ALL request bodies
- [ ] Zod schemas for ALL query parameters
- [ ] Zod schemas for ALL path parameters
- [ ] Validation on client AND server
- [ ] Sanitization for HTML/content fields
- [ ] File upload validation (type, size, magic bytes)

### 4.3 Output Security
- [ ] NO credentials in ANY list/index API
- [ ] NO credentials in match detail API
- [ ] Credential API: single match, authenticated, eligible only
- [ ] Pagination on all list endpoints
- [ ] No sensitive fields in error responses
- [ ] Consistent error format (no stack traces)

---

## 5. Frontend Security

### 5.1 Code & Bundle
- [ ] NO service role key in frontend bundle
- [ ] NO encryption keys in frontend bundle
- [ ] NO credential types exported to frontend
- [ ] TypeScript: separate backend/frontend type packages
- [ ] ESLint rule: forbid `supabaseAdmin` import in client code
- [ ] ESLint rule: forbid `credentials` table access in client code

### 5.2 Runtime Protection
- [ ] CSP header: strict, no `unsafe-inline`, nonces for scripts
- [ ] HSTS header: max-age=31536000, includeSubDomains
- [ ] COOP: same-origin
- [ ] CORP: same-origin
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] Permissions-Policy: minimal
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff

### 5.3 Client-Side Logic
- [ ] No authorization decisions in client (UI hiding only)
- [ ] No credential handling in client (display only when API returns)
- [ ] No localStorage/sessionStorage for tokens (HttpOnly cookies only)
- [ ] Anti-CSRF: SameSite cookies + double-submit cookie for forms

---

## 6. Infrastructure Security

### 6.1 Cloudflare Configuration
- [ ] WAF enabled with OWASP managed rules
- [ ] DDoS protection enabled
- [ ] Bot management enabled (free tier)
- [ ] Rate limiting rules at edge
- [ ] Custom domain with TLS 1.3
- [ ] Pages: build-time env vars only (no secrets)
- [ ] Workers: secrets in encrypted KV, not code

### 6.2 Serv00 / Backend Hosting
- [ ] SSH key authentication only (no passwords)
- [ ] Firewall: only Cloudflare IPs + admin IPs
- [ ] Non-root user for Node.js process
- [ ] Process manager: PM2 with auto-restart
- [ ] Log rotation configured
- [ ] Environment variables: `.env` file (not in repo)
- [ ] `.env.example` committed with placeholder names only

### 6.3 Supabase Configuration
- [ ] 5 projects across multiple organizations
- [ ] Each project: specific purpose (see database architecture)
- [ ] Service role keys: one per project, in Serv00 env only
- [ ] Anon keys: in frontend env (public)
- [ ] Database passwords: strong, rotated
- [ ] Network restrictions: Cloudflare + Serv00 IPs only

### 6.4 Cloudflare R2
- [ ] Private bucket for avatars
- [ ] Signed URLs for upload (TTL: 15 min)
- [ ] Signed URLs for download (TTL: 1 hour)
- [ ] CORS policy: only frontend domain
- [ ] Lifecycle rules: delete temp uploads > 24h

---

## 7. Operational Security

### 7.1 Secrets Management
- [ ] All secrets in environment variables
- [ ] No secrets in code, config files, Docker images
- [ ] Secrets rotated quarterly
- [ ] Rotation procedure documented
- [ ] Emergency rotation procedure documented
- [ ] Access to secrets: need-to-know basis

### 7.2 Logging & Monitoring
- [ ] Structured JSON logging
- [ ] Log levels: ERROR, WARN, INFO, DEBUG
- [ ] NO credentials in logs (verified by grep)
- [ ] NO PII in INFO/DEBUG logs
- [ ] Audit logs: separate table, immutable
- [ ] Security events: alerting on anomalies
- [ ] Uptime monitoring (external)
- [ ] Error rate alerting

### 7.3 Incident Response
- [ ] Credential leak playbook documented
- [ ] Database breach playbook documented
- [ ] Service role key compromise playbook
- [ ] Encryption key compromise playbook
- [ ] Contact list for escalation
- [ ] Communication templates for users

### 7.4 Backup & Recovery
- [ ] Automated daily Supabase backups
- [ ] Weekly manual backup to Google Drive (3 drives)
- [ ] Monthly restore test documented
- [ ] RTO: 4 hours, RPO: 1 hour
- [ ] Backup encryption verified
- [ ] Backup access: admin only

---

## 8. Development Security

### 8.1 Code Review
- [ ] All PRs require 2 approvals
- [ ] Security checklist in PR template
- [ ] No direct pushes to main
- [ ] CI runs: lint, typecheck, tests, security scan

### 8.2 Dependency Management
- [ ] `npm audit` in CI
- [ ] Dependabot/renovate configured
- [ ] License compliance check
- [ ] No unused dependencies
- [ ] Lock files committed

### 8.3 Testing
- [ ] Unit tests for auth, credential logic
- [ ] Integration tests for API endpoints
- [ ] E2E tests for critical flows
- [ ] Security test: credential leak attempt
- [ ] Security test: role escalation attempt
- [ ] Load test with security endpoints

---

## 9. Pre-Launch Verification

### 9.1 Credential Flow (MUST PASS ALL)
- [ ] Register → Match opens → Check-in → Credential release → Access
- [ ] Verify: ciphertext in DB, plaintext only in backend memory
- [ ] Verify: NO credentials in match list API response
- [ ] Verify: NO credentials in match detail API response
- [ ] Verify: NO credentials in frontend network tab
- [ ] Verify: NO credentials in React DevTools state
- [ ] Verify: NO credentials in analytics events
- [ ] Verify: NO credentials in notification payloads
- [ ] Verify: Access log entry created on GRANT
- [ ] Verify: Access log entry created on DENY
- [ ] Verify: Expired credentials return 404/403
- [ ] Verify: Banned user cannot access credentials
- [ ] Verify: Unregistered user cannot access credentials
- [ ] Verify: Early access (before release_time) denied
- [ ] Verify: Late access (after expiry_time) denied

### 9.2 Authorization Tests
- [ ] PLAYER cannot access admin endpoints
- [ ] MODERATOR cannot manage admin users
- [ ] ADMIN cannot modify SUPER_ADMIN
- [ ] Unauthenticated cannot access protected endpoints
- [ ] Expired JWT returns 401
- [ ] Revoked refresh token returns 401

### 9.3 Rate Limiting Tests
- [ ] Auth endpoints: 10 req/min/IP
- [ ] Registration: 5 req/min/user
- [ ] Credential access: 20 req/min/user
- [ ] Admin endpoints: 100 req/min/user
- [ ] Exceeded limit returns 429 with Retry-After

---

## 10. Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Lead Developer | | | |
| Security Reviewer | | | |
| Project Owner | | | |

---

*All items must be [✓] before production deployment. Items marked CRITICAL are release blockers.*