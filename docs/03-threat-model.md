# TMT OFFICIAL eSports Platform — Threat Model

**Version:** 1.0  
**Date:** 2026-09-05  
**Status:** DRAFT - REQUIRES PROFESSIONAL ADVICE  
**Methodology:** STRIDE + Attack Trees  

---

## 1. System Overview

### 1.1 Trust Boundaries
```
┌─────────────────────────────────────────────────────────────────────┐
│                        INTERNET (UNTRUSTED)                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE EDGE (SEMI-TRUSTED)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐  │
│  │   Pages     │  │  Workers    │  │     R2      │  │   WAF    │  │
│  │  (Frontend) │  │ (Edge API)  │  │  (Storage)  │  │  (DDoS)  │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌─────────────────────────┐  ┌─────────────────────────────────────┐
│   SERV00 (TRUSTED)      │  │         SUPABASE (TRUSTED)          │
│  ┌───────────────────┐  │  │  ┌─────────┐ ┌─────────┐ ┌───────┐ │
│  │   Node.js API     │  │  │  │ Postgres│ │  Auth   │ │ Realtime│ │
│  │  (Business Logic) │  │  │  │  (5 DBs)│ │         │ │        │ │
│  └───────────────────┘  │  │  └─────────┘ └─────────┘ └───────┘ │
└─────────────────────────┘  └─────────────────────────────────────┘
```

### 1.2 Data Flow Summary
1. **Player** → Cloudflare Pages (React) → Cloudflare Workers (Edge API) → Serv00 Node.js → Supabase
2. **Admin** → Same path, elevated privileges via JWT claims
3. **Credentials** → Encrypted in Supabase → Decrypted ONLY in Serv00 memory → Returned via HTTPS

---

## 2. Asset Inventory

| Asset | Classification | Location | Protection |
|-------|----------------|----------|------------|
| Room Credentials (Room ID + Password) | **CRITICAL** | Supabase (encrypted), Serv00 memory (decrypted) | AES-256-GCM, backend-only decrypt |
| User PII (email, FF UID, IP) | HIGH | Supabase Auth, Profiles Table | RLS, encryption at rest |
| Authentication Tokens | HIGH | HttpOnly cookies, Supabase Auth | Secure, SameSite, short expiry |
| Admin Service Role Key | **CRITICAL** | Serv00 env vars only | Never in frontend, rotation policy |
| Encryption Keys | **CRITICAL** | Serv00 env vars only | Never in frontend, rotation policy |
| Audit Logs | HIGH | Supabase | Append-only, RLS |
| Avatar Images | MEDIUM | Cloudflare R2 | Signed URLs, private bucket |

---

## 3. STRIDE Analysis

### 3.1 Spoofing Identity

| Threat | Target | Likelihood | Impact | Mitigation |
|--------|--------|------------|--------|------------|
| T-SP-01 | Attacker uses stolen JWT to impersonate player | MEDIUM | HIGH | Short JWT expiry (15m), refresh token rotation, device fingerprinting |
| T-SP-02 | Attacker forges admin JWT claims | LOW | CRITICAL | JWT signed by Supabase, claims verified server-side, role in DB not just JWT |
| T-SP-03 | Attacker spoofs server time to access credentials early | LOW | CRITICAL | Server-only time checks, NTP synchronized, no client time trust |
| T-SP-04 | Attacker registers multiple accounts for same match | MEDIUM | MEDIUM | Email verification, rate limiting, device fingerprinting, unique constraint |

### 3.2 Tampering

| Threat | Target | Likelihood | Impact | Mitigation |
|--------|--------|------------|--------|------------|
| T-TM-01 | Attacker modifies match data in transit | LOW | HIGH | HTTPS/TLS 1.3, CSP, HSTS |
| T-TM-02 | Attacker tampers with registration data | LOW | HIGH | Server-side validation, RLS, signed requests |
| T-TM-03 | Attacker modifies encrypted credential ciphertext | LOW | CRITICAL | Authenticated encryption (AES-GCM), integrity check on decrypt |
| T-TM-04 | Attacker tampers with audit logs | LOW | HIGH | Append-only table, no UPDATE/DELETE policies, external log shipping |
| T-TM-05 | Admin modifies match results after completion | MEDIUM | HIGH | Audit trail, immutable completed matches, SUPER_ADMIN only |

### 3.3 Repudiation

| Threat | Target | Likelihood | Impact | Mitigation |
|--------|--------|------------|--------|------------|
| T-RP-01 | Player denies registering for match | MEDIUM | MEDIUM | Audit log with user_id, timestamp, IP, user agent |
| T-RP-02 | Admin denies releasing credentials | LOW | HIGH | Audit log with admin_id, action, timestamp, MFA for high-risk |
| T-RP-03 | System cannot prove credential access | LOW | CRITICAL | Credential access log: user, match, time, action, result (success/denied) |

### 3.4 Information Disclosure

| Threat | Target | Likelihood | Impact | Mitigation |
|--------|--------|------------|--------|------------|
| T-ID-01 | **Credentials leaked in match list API** | LOW | **CRITICAL** | **NEVER include in list API**, separate credential endpoint with auth |
| T-ID-02 | **Credentials in frontend bundle/logs** | LOW | **CRITICAL** | **Backend-only decryption**, no credential fields in TypeScript types for frontend |
| T-ID-03 | **Credentials in analytics/notifications** | LOW | **CRITICAL** | **Explicit filtering** at API layer, code review rule |
| T-ID-04 | Player PII exposed via API | MEDIUM | HIGH | RLS policies, minimal fields in public APIs, no email in player list |
| T-ID-05 | Database credentials in GitHub | LOW | CRITICAL | GitHub secret scanning, .env.example only, pre-commit hooks |
| T-ID-06 | Service role key in frontend | LOW | CRITICAL | **Never import supabaseAdmin in client code**, lint rule |
| T-ID-07 | Encryption key in frontend | LOW | CRITICAL | **Backend-only module**, no export to client |

### 3.5 Denial of Service

| Threat | Target | Likelihood | Impact | Mitigation |
|--------|--------|------------|--------|------------|
| T-DOS-01 | Registration flood at match open | HIGH | HIGH | Rate limiting per user/IP, queue system, CAPTCHA |
| T-DOS-02 | Credential access hammer at release time | HIGH | HIGH | Rate limiting, cache-control, CDN edge caching |
| T-DOS-03 | Auth endpoint brute force | MEDIUM | HIGH | Rate limiting, CAPTCHA, account lockout |
| T-DOS-04 | Supabase connection exhaustion | MEDIUM | HIGH | Connection pooling, rate limiting, read replicas |
| T-DOS-05 | Cloudflare Workers CPU limit (10ms) | MEDIUM | MEDIUM | Lightweight edge functions, offload heavy work to Serv00 |

### 3.6 Elevation of Privilege

| Threat | Target | Likelihood | Impact | Mitigation |
|--------|--------|------------|--------|------------|
| T-EP-01 | Player accesses admin endpoints | LOW | CRITICAL | RBAC middleware, RLS policies, role verification on every request |
| T-EP-02 | Moderator escalates to admin | LOW | HIGH | Role changes only by SUPER_ADMIN, audit trail |
| T-EP-03 | SQL injection via match search | LOW | CRITICAL | Parameterized queries, Supabase client, no raw SQL in app |
| T-EP-04 | Path traversal in avatar upload | LOW | HIGH | R2 signed upload URLs, validation, no user-controlled paths |

---

## 4. Attack Trees

### 4.1 Attack Tree: Steal Room Credentials
```
ROOT: Attacker obtains Room ID + Password in plaintext
│
├── A1: Intercept in transit
│   ├── A1.1: MITM on HTTPS → Mitigated by TLS 1.3, HSTS
│   └── A1.2: Compromise Cloudflare → Mitigated by CF security, no credentials at edge
│
├── A2: Extract from database
│   ├── A2.1: SQL injection → Mitigated by parameterized queries, RLS
│   ├── A2.2: Compromise Supabase service role → Mitigated: key only in Serv00, rotation
│   └── A2.3: Decrypt ciphertext → Mitigated: AES-256-GCM, key only in Serv00 memory
│
├── A3: Extract from backend memory
│   ├── A3.1: Memory dump Serv00 → Mitigated: minimal time in memory, zeroize after use
│   └── A3.2: Log injection → Mitigated: structured logging, no credentials in logs
│
├── A4: Extract from frontend
│   ├── A4.1: Credential in API response → Mitigated: separate endpoint, auth check
│   ├── A4.2: Credential in TypeScript types → Mitigated: separate backend types
│   ├── A4.3: Credential in React DevTools → Mitigated: never in frontend state
│   └── A4.4: Credential in analytics → Mitigated: explicit filter at API layer
│
├── A5: Social engineering
│   ├── A5.1: Phishing admin → Mitigated: MFA, training
│   └── A5.2: Trick player to share → Mitigated: "do not share" warning, copy tracking
│
└── A6: Timing attack
    ├── A6.1: Predict release time → Mitigated: server time, jitter, rate limiting
    └── A6.2: Race condition at release → Mitigated: atomic state transition
```

### 4.2 Attack Tree: Unauthorized Match Registration
```
ROOT: Attacker registers for match without eligibility
│
├── B1: Bypass eligibility checks
│   ├── B1.1: Client-side only checks → Mitigated: ALL checks server-side
│   ├── B1.2: Race condition on slots → Mitigated: DB unique constraint + transaction
│   └── B1.3: Impersonate eligible user → Mitigated: auth required, JWT verification
│
├── B2: Exceed capacity
│   ├── B2.1: Concurrent registrations → Mitigated: DB constraint, advisory lock
│   └── B2.2: Admin bypass → Mitigated: audit log, SUPER_ADMIN only
│
└── B3: Register banned/suspended account
    └── B3.1: Status check bypass → Mitigated: RLS policy includes status check
```

---

## 5. Risk Assessment Matrix

| Threat ID | Threat | Likelihood | Impact | Risk Level | Mitigation Status |
|-----------|--------|------------|--------|------------|-------------------|
| T-ID-01 | Credentials in match list | LOW | CRITICAL | HIGH | DESIGNED OUT |
| T-ID-02 | Credentials in frontend | LOW | CRITICAL | HIGH | DESIGNED OUT |
| T-ID-03 | Credentials in analytics/notif | LOW | CRITICAL | HIGH | DESIGNED OUT |
| T-SP-03 | Time spoofing for credentials | LOW | CRITICAL | HIGH | DESIGNED OUT |
| T-TM-03 | Ciphertext tampering | LOW | CRITICAL | HIGH | AES-GCM |
| T-EP-01 | Player → Admin escalation | LOW | CRITICAL | HIGH | RBAC + RLS |
| T-DOS-01 | Registration flood | HIGH | HIGH | HIGH | Rate limiting |
| T-DOS-02 | Credential hammer | HIGH | HIGH | HIGH | Rate limiting + cache |
| T-SP-01 | Stolen JWT reuse | MEDIUM | HIGH | HIGH | Short expiry, rotation |
| T-RP-01 | Registration repudiation | MEDIUM | MEDIUM | MEDIUM | Audit logging |
| T-ID-04 | PII exposure | MEDIUM | HIGH | MEDIUM | RLS + minimal APIs |
| T-TM-05 | Result tampering | MEDIUM | HIGH | MEDIUM | Immutable + audit |
| A-07 | Serv00 resource limits | UNKNOWN | HIGH | MEDIUM | TESTING NEEDED |

---

## 6. Security Controls Summary

### 6.1 Preventive Controls
- ✅ AES-256-GCM authenticated encryption for credentials
- ✅ Backend-only decryption (service role key isolation)
- ✅ Server-authoritative time for all temporal controls
- ✅ RLS on ALL tables with least-privilege policies
- ✅ Rate limiting on all public endpoints
- ✅ Input validation (Zod) on client + server
- ✅ Secure headers (CSP, HSTS, COOP, CORP)
- ✅ HttpOnly, Secure, SameSite cookies
- ✅ Short JWT expiry (15 min) + refresh rotation

### 6.2 Detective Controls
- ✅ Audit logging for all sensitive operations
- ✅ Credential access logging (no plaintext)
- ✅ Security event logging (failed auth, rate limits)
- ✅ Anomaly detection on registration/check-in patterns

### 6.3 Corrective Controls
- ✅ Credential rotation procedure
- ✅ Service role key rotation procedure
- ✅ Incident response playbook (credential leak)
- ✅ Automated backup to 3 Google Drives
- ✅ Point-in-time recovery (Supabase)

---

## 7. Compliance Considerations

| Requirement | Applicable | Implementation |
|-------------|------------|----------------|
| GDPR (EU players) | YES | Data minimization, right to deletion, DPA with Supabase |
| CCPA (CA players) | YES | Opt-out, data access, deletion |
| COPPA (under 13) | YES | Age gate, parental consent flow |
| PCI DSS | NO | **No payment handling** — explicitly out of scope |

---

## 8. Residual Risks (Accepted)

| Risk | Justification | Monitoring |
|------|---------------|------------|
| Serv00 unknown limits | Cost constraint, free tier requirement | Load test pre-launch, Cloudflare Workers fallback |
| Supabase 7-day auto-pause | Free tier limitation | Daily cron ping to keep alive |
| Email rate limit (2/hr) | Supabase Auth limit | Cloudflare Worker email for notifications |
| No WAF on Serv00 | Free hosting | Cloudflare WAF at edge, rate limiting |

---

## 9. Security Testing Requirements

### 9.1 Pre-Launch
- [ ] Penetration test (credential flow focus)
- [ ] Load test: 1000 concurrent registrations
- [ ] Load test: 5000 concurrent credential access
- [ ] RLS policy test matrix (all roles × all tables)
- [ ] Encryption verification: ciphertext only in DB
- [ ] Audit log tamper test
- [ ] Rate limiting effectiveness test

### 9.2 Ongoing
- [ ] Monthly dependency vulnerability scan
- [ ] Quarterly penetration test
- [ ] Annual threat model review
- [ ] Incident response drill (quarterly)

---

*Document Status: DRAFT - REQUIRES PROFESSIONAL SECURITY REVIEW before production deployment.*