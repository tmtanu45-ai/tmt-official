# TMT OFFICIAL eSports Platform — Feature List

**Version:** 1.0  
**Date:** 2026-09-05  
**Status:** DRAFT  

---

## Feature Catalog

### F1. Authentication & Account Management
| Feature ID | Feature Name | Description | Dependencies | Effort |
|------------|--------------|-------------|--------------|--------|
| F1.1 | User Registration | Email/password signup with validation | Supabase Auth | S |
| F1.2 | Email Verification | Send verification email, handle callback | Cloudflare Worker Email, Supabase Auth | S |
| F1.3 | Login/Logout | Secure session management, HttpOnly cookies | Supabase Auth, Middleware | S |
| F1.4 | Password Reset | Forgot password flow with email token | Cloudflare Worker Email, Supabase Auth | S |
| F1.5 | Role-Based Access Control | PLAYER, MODERATOR, ADMIN, SUPER_ADMIN roles | Supabase Auth, RLS, Middleware | M |
| F1.6 | Session Management | Refresh tokens, secure logout, device tracking | Supabase Auth | S |
| F1.7 | Rate Limiting (Auth) | Prevent brute force, enum attacks | Upstash Redis / Cloudflare Workers | M |

### F2. Player Profile
| Feature ID | Feature Name | Description | Dependencies | Effort |
|------------|--------------|-------------|--------------|--------|
| F2.1 | Profile Creation | Auto-create on first login, extendable fields | Supabase Auth, Profiles Table | S |
| F2.2 | Profile Fields | Username, display name, FF UID, in-game name, avatar, bio | Profiles Table, R2 Storage | M |
| F2.3 | Free Fire UID Validation | Format validation, uniqueness check | Profiles Table | S |
| F2.4 | Avatar Upload | Upload to R2, CDN delivery, optimization | Cloudflare R2, Workers | M |
| F2.5 | Account Status | ACTIVE, SUSPENDED, BANNED with admin controls | Profiles Table, Admin Panel | S |
| F2.6 | Match History | Read-only view of past matches, results | Matches, Registrations Tables | M |
| F2.7 | Statistics Dashboard | Matches played, wins, K/D, avg placement, win rate | Aggregated Views | M |
| F2.8 | Profile Completion | Progress indicator, required field tracking | Profiles Table | S |

### F3. Match Management (Admin)
| Feature ID | Feature Name | Description | Dependencies | Effort |
|------------|--------------|-------------|--------------|--------|
| F3.1 | Match Creation | Title, description, game mode, map, team size | Matches Table | M |
| F3.2 | Scheduling | UTC scheduled time, registration window, check-in window, credential release/expiry | Matches Table, Cron Jobs | M |
| F3.3 | Capacity Management | Max players/teams, waitlist (optional) | Matches Table | S |
| F3.4 | Match Lifecycle | DRAFT → OPEN → FULL → CLOSED → LIVE → COMPLETED/CANCELLED/EXPIRED | Matches Table, Server Cron | M |
| F3.5 | Match Editing | Edit before OPEN, limited edits after | Matches Table, Audit Logs | M |
| F3.6 | Match Cancellation | Admin cancel with notification to registrants | Matches Table, Notifications | S |
| F3.7 | Public Match List | Filterable, paginated, NO credentials | Matches Table, RLS | M |

### F4. Registration System
| Feature ID | Feature Name | Description | Dependencies | Effort |
|------------|--------------|-------------|--------------|--------|
| F4.1 | Eligibility Checks | Active account, not banned, match OPEN, slots available | Profiles, Matches Tables | M |
| F4.2 | Registration Action | One-click register, immediate CONFIRMED status | Registrations Table | S |
| F4.3 | Duplicate Prevention | Unique constraint (user_id, match_id) | Registrations Table | S |
| F4.4 | Registration Cancellation | Player can cancel before check-in | Registrations Table | S |
| F4.5 | Waitlist (Future) | Optional waitlist when full | Registrations Table | M |
| F4.6 | Admin Registration Mgmt | View all, force cancel, manual add | Registrations Table, Admin Panel | M |

### F5. Check-In System
| Feature ID | Feature Name | Description | Dependencies | Effort |
|------------|--------------|-------------|--------------|--------|
| F5.1 | Check-In Window | Server-time enforced open/close | Matches Table, Server Clock | S |
| F5.2 | Check-In Action | Button during window, updates status | Registrations Table | S |
| F5.3 | Status States | NOT_OPEN, OPEN, CHECKED_IN, MISSED, CANCELLED | Registrations Table | S |
| F5.4 | Auto-Missed Transition | Cron job marks MISSED after window | Server Cron, Registrations Table | S |
| F5.5 | Check-In Logs | Audit trail for disputes | Audit Logs Table | S |

### F6. Room Credentials (Core Security)
| Feature ID | Feature Name | Description | Dependencies | Effort |
|------------|--------------|-------------|--------------|--------|
| F6.1 | Encrypted Storage | AES-256-GCM authenticated encryption at rest | Encryption Service, Credentials Table | L |
| F6.2 | Backend-Only Decryption | Service role key decrypts, never in frontend | Backend API, Service Role | L |
| F6.3 | Release Eligibility | Authenticated + Registered + Not Banned + Time Reached + Not Expired | Backend API, Server Clock | M |
| F6.4 | State Machine | LOCKED → AVAILABLE → EXPIRED | Credentials Table, Server Cron | M |
| F6.5 | Zero Leak Guarantee | No credentials in: list APIs, HTML, logs, analytics, notifications | All Layers | L |
| F6.6 | Access Logging | User, match, time, action, result (no plaintext) | Credential Access Logs Table | M |
| F6.7 | Admin Override | Manual release/expire with audit | Admin Panel, Credentials Table | M |
| F6.8 | Copy Protection | Hide/show, copy button, "do not share" warning | Frontend Component | S |

### F7. Admin Dashboard
| Feature ID | Feature Name | Description | Dependencies | Effort |
|------------|--------------|-------------|--------------|--------|
| F7.1 | Navigation Sidebar | 13 sections with role-based visibility | React Router, RBAC | M |
| F7.2 | Metric Cards | Registrations, participants, check-ins, security events | Analytics Views | M |
| F7.3 | Charts/Graphs | Time-series, funnels, distributions | Recharts/Chart.js, Analytics | M |
| F7.4 | Match Management UI | CRUD, status control, bulk actions | Match APIs | L |
| F7.5 | Registration Management | Table view, filters, actions | Registration APIs | M |
| F7.6 | Player Management | Search, suspend/ban, profile view | Profile APIs | M |
| F7.7 | Credential Management | Release/expire, access log viewer | Credential APIs | L |
| F7.8 | Audit Log Viewer | Filterable, searchable, export | Audit Logs Table | M |
| F7.9 | Security Dashboard | Failed logins, suspicious activity, rate limit hits | Security Events Table | M |
| F7.10 | Analytics Dashboard | Registrations, completion rates, player metrics | Analytics Views | M |
| F7.11 | High-Risk Confirmation | Modal with typing confirmation, audit record | All Admin Actions | M |
| F7.12 | Settings Management | Platform config, email templates, limits | Settings Table | M |
| F7.13 | Admin User Management | Invite, role change, revoke (SUPER_ADMIN only) | Admin Users Table | M |

### F8. Player Dashboard
| Feature ID | Feature Name | Description | Dependencies | Effort |
|------------|--------------|-------------|--------------|--------|
| F8.1 | Welcome Section | Personalized greeting, profile completion | Profile Data | S |
| F8.2 | Upcoming Matches | Registered + public matches, filterable | Match APIs | M |
| F8.3 | My Registrations | Status badges, actions (cancel, check-in) | Registration APIs | M |
| F8.4 | Check-In Status | Real-time status per match | Check-In APIs | S |
| F8.5 | Credential Status | Per-match credential state | Credential APIs | M |
| F8.6 | Match History | Past matches with results, stats | History APIs | M |
| F8.7 | Notifications Center | In-app notifications, mark read | Notifications Table | M |
| F8.8 | Security Status | Active sessions, 2FA status (future) | Auth Data | S |

### F9. Room Dashboard
| Feature ID | Feature Name | Description | Dependencies | Effort |
|------------|--------------|-------------|--------------|--------|
| F9.1 | Route /matches/:id/room | Dynamic route, server-side auth check | React Router, Backend | S |
| F9.2 | State Display | NOT_REGISTERED, REGISTERED, WAITING, AVAILABLE, EXPIRED, CANCELLED | Credential APIs | M |
| F9.3 | Credential Reveal | Only when AVAILABLE, with hide/copy/warning | Frontend Component | S |
| F9.4 | Countdown Timer | Time until release/expiry (server-synced) | Server Time API | S |

### F10. Notifications
| Feature ID | Feature Name | Description | Dependencies | Effort |
|------------|--------------|-------------|--------------|--------|
| F10.1 | In-App Notifications | Real-time + persisted, mark read | Notifications Table, Realtime | M |
| F10.2 | Email Notifications | Registration confirmed, match updates, check-in reminder, credential released, cancellation, security alerts | Cloudflare Worker Email | M |
| F10.3 | Notification Preferences | Per-user toggle per type | Notification Preferences Table | S |
| F10.4 | No Credentials in Notifications | Enforced at API layer | All Notification APIs | CRITICAL |

### F11. Audit & Security
| Feature ID | Feature Name | Description | Dependencies | Effort |
|------------|--------------|-------------|--------------|--------|
| F11.1 | Audit Logging | All sensitive ops: who, what, when, entity, metadata | Audit Logs Table | M |
| F11.2 | Security Events | Failed auth, rate limits, suspicious patterns | Security Events Table | M |
| F11.3 | Rate Limiting | Per-endpoint, per-user, per-IP | Upstash Redis / Workers | M |
| F11.4 | Input Validation | Zod schemas on all inputs | All APIs | M |
| F11.5 | Secure Headers | CSP, HSTS, COOP, CORP, Referrer-Policy | Middleware | S |

### F12. Analytics
| Feature ID | Feature Name | Description | Dependencies | Effort |
|------------|--------------|-------------|--------------|--------|
| F12.1 | Event Tracking | Privacy-first, no PII, no credentials | Analytics Events Table | M |
| F12.2 | Admin Analytics | Registrations, check-ins, completions, funnel | Analytics Views | M |
| F12.3 | Player Analytics | Personal stats, progress | Player Views | S |

---

## Feature Prioritization (MVP)

### Phase 1: Core Platform (Weeks 1-4)
- F1.1-F1.7: Auth & RBAC
- F2.1-F2.3, F2.5-F2.6: Basic Profile
- F3.1-F3.4, F3.7: Match Management
- F4.1-F4.4: Registration
- F5.1-F5.4: Check-In
- F6.1-F6.6: **Credentials (CRITICAL)**
- F7.1-F7.5: Basic Admin
- F8.1-F8.5: Basic Player Dashboard
- F9.1-F9.4: Room Dashboard
- F11.1, F11.3-F11.5: Security Basics

### Phase 2: Polish & Admin (Weeks 5-8)
- F2.4, F2.7-F2.8: Enhanced Profile
- F3.5-F3.6: Match Editing/Cancellation
- F4.5-F4.6: Waitlist, Admin Reg Mgmt
- F5.5: Check-In Logs
- F6.7-F6.8: Credential Admin Override, Copy Protection
- F7.6-F7.13: Full Admin Dashboard
- F8.6-F8.8: Full Player Dashboard
- F10.1-F10.4: Notifications
- F11.2: Security Events
- F12.1-F12.3: Analytics

### Phase 3: Scale & Harden (Weeks 9-12)
- Load testing & optimization
- Backup/restore automation
- Penetration testing
- Documentation
- Monitoring & alerting

---

## Effort Legend
- **S** = Small (1-3 days)
- **M** = Medium (4-10 days)
- **L** = Large (11-20 days)

*All estimates assume experienced developer familiar with stack. Multiply by 1.5-2x for learning curve.*