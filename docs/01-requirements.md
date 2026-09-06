# TMT OFFICIAL eSports Practice-Match Platform — Requirements Document

**Version:** 1.0  
**Date:** 2026-09-05  
**Status:** DRAFT - REQUIRES VERIFICATION  

---

## 1. Project Overview

### 1.1 Product Vision
Build a production-grade, free-to-play Free Fire eSports practice-match platform where players can register for matches, check in, and receive encrypted room credentials (Room ID + Password) — all without any payment handling.

### 1.2 Core Principles
- **Zero Payment Handling**: No UPI, PhonePe, gateways, orders, fees, invoices, refunds, settlements, or reconciliation
- **Security First**: Encrypted credentials at rest, server-authorized release, audit logging
- **Free Tier Optimized**: 5 Supabase projects, 3 Google Drive backups, Cloudflare free tiers
- **Server-Authoritative Time**: All credential release/expiration/check-in windows controlled by server time
- **Least Privilege**: RLS + role-based access control (PLAYER, MODERATOR, ADMIN, SUPER_ADMIN)

### 1.3 Out of Scope (Explicitly Excluded)
- Any payment gateway integration
- UPI/PhonePe/bank transfer handling
- Order creation, invoicing, billing
- Refunds, settlements, reconciliation
- Payment webhooks or state machines
- Real-money transactions of any kind

---

## 2. Functional Requirements

### 2.1 Authentication & Accounts (Supabase Auth)
| ID | Requirement | Priority | Verification |
|----|-------------|----------|--------------|
| FR-AUTH-01 | User registration with email/password | HIGH | REQUIRES VERIFICATION |
| FR-AUTH-02 | Email verification flow | HIGH | REQUIRES VERIFICATION |
| FR-AUTH-03 | Secure login/logout with session management | HIGH | REQUIRES VERIFICATION |
| FR-AUTH-04 | Password reset via email | HIGH | REQUIRES VERIFICATION |
| FR-AUTH-05 | Role assignment: PLAYER, MODERATOR, ADMIN, SUPER_ADMIN | HIGH | REQUIRES VERIFICATION |
| FR-AUTH-06 | Server-side role enforcement (RLS + middleware) | HIGH | REQUIRES VERIFICATION |
| FR-AUTH-07 | Rate limiting on auth endpoints | HIGH | REQUIRES VERIFICATION |

### 2.2 Player Profile
| ID | Requirement | Priority | Verification |
|----|-------------|----------|--------------|
| FR-PROF-01 | Username (unique), display name, Free Fire UID, in-game name | HIGH | REQUIRES VERIFICATION |
| FR-PROF-02 | Avatar upload (Cloudflare R2) | MEDIUM | REQUIRES VERIFICATION |
| FR-PROF-03 | Account status: ACTIVE, SUSPENDED, BANNED | HIGH | REQUIRES VERIFICATION |
| FR-PROF-04 | Match history (read-only) | HIGH | REQUIRES VERIFICATION |
| FR-PROF-05 | Match statistics: played, won, K/D, avg placement | MEDIUM | REQUIRES VERIFICATION |
| FR-PROF-06 | Profile completion progress indicator | MEDIUM | REQUIRES VERIFICATION |

### 2.3 Match System
| ID | Requirement | Priority | Verification |
|----|-------------|----------|--------------|
| FR-MATCH-01 | Admin CRUD matches: title, description, game mode, map | HIGH | REQUIRES VERIFICATION |
| FR-MATCH-02 | Solo/Duo/Squad team size configuration | HIGH | REQUIRES VERIFICATION |
| FR-MATCH-03 | Scheduled time (UTC), registration open/close times | HIGH | REQUIRES VERIFICATION |
| FR-MATCH-04 | Check-in open time, credential release time, expiration time | HIGH | REQUIRES VERIFICATION |
| FR-MATCH-04 | Max players/teams limit | HIGH | REQUIRES VERIFICATION |
| FR-MATCH-05 | Match statuses: DRAFT, OPEN, FULL, CLOSED, LIVE, COMPLETED, CANCELLED, EXPIRED | HIGH | REQUIRES VERIFICATION |
| FR-MATCH-06 | Server-controlled status transitions | HIGH | REQUIRES VERIFICATION |
| FR-MATCH-07 | Public match list (NO room credentials exposed) | HIGH | REQUIRES VERIFICATION |
| FR-MATCH-08 | Match detail view with registration button | HIGH | REQUIRES VERIFICATION |

### 2.4 Registration (FREE — No Payment)
| ID | Requirement | Priority | Verification |
|----|-------------|----------|--------------|
| FR-REG-01 | Player registers for match (eligibility checks) | HIGH | REQUIRES VERIFICATION |
| FR-REG-02 | Eligibility: active account, not banned, match OPEN, slots available | HIGH | REQUIRES VERIFICATION |
| FR-REG-03 | Duplicate registration prevented by DB unique constraint | HIGH | REQUIRES VERIFICATION |
| FR-REG-04 | Registration status: CONFIRMED immediately (no payment step) | HIGH | REQUIRES VERIFICATION |
| FR-REG-05 | Registration cancellation by player (before check-in) | MEDIUM | REQUIRES VERIFICATION |
| FR-REG-06 | Admin can view/manage all registrations | HIGH | REQUIRES VERIFICATION |

### 2.5 Check-In
| ID | Requirement | Priority | Verification |
|----|-------------|----------|--------------|
| FR-CHECK-01 | Check-in states: NOT_OPEN, OPEN, CHECKED_IN, MISSED, CANCELLED | HIGH | REQUIRES VERIFICATION |
| FR-CHECK-02 | Check-in window enforced by SERVER time only | HIGH | REQUIRES VERIFICATION |
| FR-CHECK-03 | Player check-in action (button) during open window | HIGH | REQUIRES VERIFICATION |
| FR-CHECK-04 | Auto-transition to MISSED after window closes | HIGH | REQUIRES VERIFICATION |
| FR-CHECK-05 | Check-in logs for audit | HIGH | REQUIRES VERIFICATION |

### 2.6 Room Credentials (SECURE — Core Security Feature)
| ID | Requirement | Priority | Verification |
|----|-------------|----------|--------------|
| FR-CRED-01 | Room ID + Password stored ENCRYPTED at rest (authenticated encryption) | CRITICAL | REQUIRES VERIFICATION |
| FR-CRED-02 | Backend-only decryption (service role key never in frontend) | CRITICAL | REQUIRES VERIFICATION |
| FR-CRED-03 | Release governed by: server time + eligibility (authenticated, registered, not banned, release time reached, not expired) | CRITICAL | REQUIRES VERIFICATION |
| FR-CRED-04 | Credential states: LOCKED → AVAILABLE → EXPIRED | CRITICAL | REQUIRES VERIFICATION |
| FR-CRED-05 | NEVER leak credentials in: match-list JSON, HTML, logs, analytics, notifications, GitHub | CRITICAL | REQUIRES VERIFICATION |
| FR-CRED-06 | Credential access logging: user/match/time/action/result (NO plaintext password) | CRITICAL | REQUIRES VERIFICATION |
| FR-CRED-07 | Admin can manually release/expire credentials | HIGH | REQUIRES VERIFICATION |
| FR-CRED-08 | Copy-to-clipboard with "do not share" warning | HIGH | REQUIRES VERIFICATION |

### 2.7 Admin Dashboard
| ID | Requirement | Priority | Verification |
|----|-------------|----------|--------------|
| FR-ADM-01 | Sidebar navigation: Dashboard, Matches, Registrations, Players, Teams, Room Credentials, Analytics, Notifications, Security, Audit Logs, Storage, Settings, Admin Users | HIGH | REQUIRES VERIFICATION |
| FR-ADM-02 | Metric cards + charts: registrations, participants, check-ins, security events | HIGH | REQUIRES VERIFICATION |
| FR-ADM-03 | Match management (create/edit/cancel) | HIGH | REQUIRES VERIFICATION |
| FR-ADM-04 | Registration management (view, cancel, force check-in) | HIGH | REQUIRES VERIFICATION |
| FR-ADM-05 | Player management (suspend/ban, view profile) | HIGH | REQUIRES VERIFICATION |
| FR-ADM-06 | Room credential management (release/expire, view access logs) | CRITICAL | REQUIRES VERIFICATION |
| FR-ADM-07 | Audit log viewer with filters | HIGH | REQUIRES VERIFICATION |
| FR-ADM-08 | Security monitoring dashboard | HIGH | REQUIRES VERIFICATION |
| FR-ADM-09 | High-risk actions require extra confirmation + audit record | CRITICAL | REQUIRES VERIFICATION |

### 2.8 Player Dashboard
| ID | Requirement | Priority | Verification |
|----|-------------|----------|--------------|
| FR-PLY-01 | Welcome section with profile completion | MEDIUM | REQUIRES VERIFICATION |
| FR-PLY-02 | Upcoming matches (registered + public) | HIGH | REQUIRES VERIFICATION |
| FR-PLY-03 | Registered matches with status | HIGH | REQUIRES VERIFICATION |
| FR-PLY-04 | Check-in status per match | HIGH | REQUIRES VERIFICATION |
| FR-PLY-05 | Room credential status per match | HIGH | REQUIRES VERIFICATION |
| FR-PLY-06 | Match history with statistics | MEDIUM | REQUIRES VERIFICATION |
| FR-PLY-07 | Notifications center | MEDIUM | REQUIRES VERIFICATION |
| FR-PLY-08 | Security status (2FA, sessions) | MEDIUM | REQUIRES VERIFICATION |

### 2.9 Room Dashboard
| ID | Requirement | Priority | Verification |
|----|-------------|----------|--------------|
| FR-ROOM-01 | Route: `/matches/:id/room` | HIGH | REQUIRES VERIFICATION |
| FR-ROOM-02 | States: NOT_REGISTERED, REGISTERED, WAITING_FOR_RELEASE, AVAILABLE, EXPIRED, CANCELLED | HIGH | REQUIRES VERIFICATION |
| FR-ROOM-03 | Show Room ID + Password ONLY when AVAILABLE | CRITICAL | REQUIRES VERIFICATION |
| FR-ROOM-04 | Hide/copy buttons + "do not share" warning | HIGH | REQUIRES VERIFICATION |

### 2.10 Auditing, Notifications, Analytics
| ID | Requirement | Priority | Verification |
|----|-------------|----------|--------------|
| FR-AUD-01 | Audit logs for all sensitive operations | HIGH | REQUIRES VERIFICATION |
| FR-NOTIF-01 | Notification types: registration, match updates, check-in, credential release, cancellation, security alerts | HIGH | REQUIRES VERIFICATION |
| FR-NOTIF-02 | Notifications NEVER contain room passwords | CRITICAL | REQUIRES VERIFICATION |
| FR-ANAL-01 | Admin analytics: registrations, check-ins, completions, security events | MEDIUM | REQUIRES VERIFICATION |
| FR-ANAL-02 | Analytics NEVER contain room passwords | CRITICAL | REQUIRES VERIFICATION |

---

## 3. Non-Functional Requirements

### 3.1 Security
| ID | Requirement | Priority | Verification |
|----|-------------|----------|--------------|
| NFR-SEC-01 | Server-side authorization on ALL endpoints | CRITICAL | REQUIRES VERIFICATION |
| NFR-SEC-02 | RLS policies on ALL tables | CRITICAL | REQUIRES VERIFICATION |
| NFR-SEC-03 | Service role key ONLY in backend environment | CRITICAL | REQUIRES VERIFICATION |
| NFR-SEC-04 | Encryption keys ONLY in backend environment | CRITICAL | REQUIRES VERIFICATION |
| NFR-SEC-05 | Server time controls all time-sensitive operations | CRITICAL | REQUIRES VERIFICATION |
| NFR-SEC-06 | Rate limiting: auth, registration, credential access, admin | HIGH | REQUIRES VERIFICATION |
| NFR-SEC-07 | Input validation (Zod) client + server | HIGH | REQUIRES VERIFICATION |
| NFR-SEC-08 | Anti-enumeration on auth endpoints | HIGH | REQUIRES VERIFICATION |
| NFR-SEC-09 | Secure headers (CSP, HSTS, COOP, CORP) | HIGH | REQUIRES VERIFICATION |
| NFR-SEC-10 | HTTPS enforced everywhere | CRITICAL | REQUIRES VERIFICATION |
| NFR-SEC-11 | Idempotency keys for registration/credential access | MEDIUM | REQUIRES VERIFICATION |

### 3.2 Performance
| ID | Requirement | Priority | Verification |
|----|-------------|----------|--------------|
| NFR-PERF-01 | Page load < 3s on 3G | HIGH | REQUIRES VERIFICATION |
| NFR-PERF-02 | API response < 500ms p95 | HIGH | REQUIRES VERIFICATION |
| NFR-PERF-03 | Support 10,000 concurrent players | MEDIUM | REQUIRES VERIFICATION |
| NFR-PERF-04 | Credential release < 1s after release time | HIGH | REQUIRES VERIFICATION |

### 3.3 Reliability
| ID | Requirement | Priority | Verification |
|----|-------------|----------|--------------|
| NFR-REL-01 | 99.9% uptime (excluding maintenance) | HIGH | REQUIRES VERIFICATION |
| NFR-REL-02 | Automated backups to 3 Google Drives | HIGH | REQUIRES VERIFICATION |
| NFR-REL-03 | Point-in-time recovery (Supabase) | HIGH | REQUIRES VERIFICATION |
| NFR-REL-04 | Graceful degradation during high load | MEDIUM | REQUIRES VERIFICATION |

### 3.4 Scalability (Free Tier)
| ID | Requirement | Priority | Verification |
|----|-------------|----------|--------------|
| NFR-SCALE-01 | 5 Supabase projects (2 per org limit workaround) | HIGH | REQUIRES VERIFICATION |
| NFR-SCALE-02 | Cloudflare R2 for avatar storage (10 GB free) | HIGH | REQUIRES VERIFICATION |
| NFR-SCALE-03 | Cloudflare Workers for edge functions | MEDIUM | REQUIRES VERIFICATION |
| NFR-SCALE-04 | Cloudflare Pages for frontend hosting | HIGH | REQUIRES VERIFICATION |

---

## 4. User Roles & Permissions Matrix

| Feature | PLAYER | MODERATOR | ADMIN | SUPER_ADMIN |
|---------|--------|-----------|-------|-------------|
| Register for matches | ✅ | ✅ | ✅ | ✅ |
| View own profile | ✅ | ✅ | ✅ | ✅ |
| Edit own profile | ✅ | ✅ | ✅ | ✅ |
| View match list | ✅ | ✅ | ✅ | ✅ |
| Check-in for matches | ✅ | ✅ | ✅ | ✅ |
| View room credentials (when available) | ✅ | ✅ | ✅ | ✅ |
| View match history | ✅ | ✅ | ✅ | ✅ |
| Receive notifications | ✅ | ✅ | ✅ | ✅ |
| View other player profiles | ❌ | ✅ | ✅ | ✅ |
| Suspend/ban players | ❌ | ✅ | ✅ | ✅ |
| Create/edit/cancel matches | ❌ | ❌ | ✅ | ✅ |
| Manage registrations | ❌ | ❌ | ✅ | ✅ |
| Manage room credentials | ❌ | ❌ | ✅ | ✅ |
| View audit logs | ❌ | ❌ | ✅ | ✅ |
| View security dashboard | ❌ | ❌ | ✅ | ✅ |
| View analytics | ❌ | ❌ | ✅ | ✅ |
| Manage admin users | ❌ | ❌ | ❌ | ✅ |
| Manage system settings | ❌ | ❌ | ❌ | ✅ |
| Access service role operations | ❌ | ❌ | ❌ | ✅ |

---

## 5. Assumptions & Risks

| ID | Assumption/Risk | Type | Impact | Mitigation |
|----|-----------------|------|--------|------------|
| A-01 | Supabase free tier: 2 projects per organization | ASSUMPTION | HIGH | Use 5 projects across multiple orgs |
| A-02 | Supabase DB size: 500 MB soft limit, 1.5 GB pause | ASSUMPTION | HIGH | Archive old matches, use R2 for blobs |
| A-03 | Supabase Auth emails: 2/hour/project limit | ASSUMPTION | MEDIUM | Batch emails, use Cloudflare Worker for email |
| A-04 | Cloudflare Workers: 10ms CPU, 100k req/day free | ASSUMPTION | MEDIUM | Keep edge functions lightweight |
| A-05 | Cloudflare R2: 10 GB storage, 1M Class A ops/month | ASSUMPTION | LOW | Monitor usage, compress avatars |
| A-06 | Google Drive API: 10,000 requests/100 sec/user | ASSUMPTION | MEDIUM | Batch backups, exponential backoff |
| A-07 | Serv00 hosting: unknown resource limits | RISK | HIGH | Test early, have Cloudflare Workers fallback |
| A-08 | Free Fire UID format validation | ASSUMPTION | LOW | Research current format, regex validate |
| R-01 | Credential encryption key rotation | RISK | HIGH | Plan key rotation strategy from start |
| R-02 | Supabase project pause at 7 days inactivity | RISK | MEDIUM | Cron job to ping projects daily |

---

## 6. Acceptance Criteria

### 6.1 MVP Launch Criteria
- [ ] All FR-AUTH requirements implemented and tested
- [ ] All FR-PROF requirements implemented and tested
- [ ] All FR-MATCH requirements implemented and tested
- [ ] All FR-REG requirements implemented and tested
- [ ] All FR-CHECK requirements implemented and tested
- [ ] All FR-CRED requirements implemented and tested (CRITICAL)
- [ ] All FR-ADM requirements implemented and tested
- [ ] All FR-PLY requirements implemented and tested
- [ ] All FR-ROOM requirements implemented and tested
- [ ] All FR-AUD, FR-NOTIF, FR-ANAL requirements implemented
- [ ] All NFR-SEC requirements verified (penetration test)
- [ ] Load test: 1000 concurrent registrations
- [ ] Backup/restore drill successful

### 6.2 Security Audit Criteria
- [ ] No credentials in frontend bundle, logs, or analytics
- [ ] RLS policies tested with all role combinations
- [ ] Encryption verified: ciphertext only in DB, plaintext only in backend memory
- [ ] Rate limiting tested under attack simulation
- [ ] Audit log tamper-evidence verified

---

## 7. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Match registration conversion | > 80% | Registrations / Views |
| Check-in rate | > 90% | Checked In / Registered |
| Credential access success | > 99% | Successful / Attempted |
| Avg credential release latency | < 1s | Server time vs release time |
| Security incidents | 0 | Audit log review |
| Uptime | 99.9% | Monitoring |
| Player retention (7-day) | > 40% | Analytics |

---

*Document Status: DRAFT - All items marked REQUIRES VERIFICATION need stakeholder confirmation before implementation.*