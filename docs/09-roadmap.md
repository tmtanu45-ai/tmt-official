# TMT OFFICIAL eSports Platform — Roadmap

**Version:** 1.0  
**Date:** 2026-09-05  
**Status:** DRAFT  

---

## 1. Release Phases

### Phase 0: Foundation (Week 1-2) ✅ **COMPLETED**
- [x] Requirements & architecture documentation
- [x] Database schema design (5 Supabase projects)
- [x] API specification
- [x] Threat model & security checklist
- [x] Free tier capacity plan
- [x] Project structure setup

### Phase 1: Core Backend (Week 3-6)
**Goal**: Functional API with authentication, matches, registration, check-in, credentials

#### Week 3: Auth & Profiles
- [ ] Supabase projects setup (5 projects, 3 orgs)
- [ ] Serv00 Node.js project initialization
- [ ] Authentication service (register, login, logout, refresh)
- [ ] Email verification flow (Cloudflare Worker)
- [ ] Password reset flow
- [ ] Role-based access control middleware
- [ ] Profile CRUD (username, display_name, FF UID, avatar)
- [ ] Avatar upload to R2 (signed URLs)
- [ ] Rate limiting (Upstash Redis)
- [ ] Unit tests for auth

#### Week 4: Match System
- [ ] Match CRUD (admin)
- [ ] Match status state machine (server-controlled)
- [ ] Public match list with filters
- [ ] Match detail view
- [ ] Registration eligibility checks
- [ ] Registration with unique constraint
- [ ] Immediate CONFIRMED status (no payment)
- [ ] Registration cancellation
- [ ] Admin registration management
- [ ] Integration tests

#### Week 5: Check-In & Credentials
- [ ] Check-in window logic (server time)
- [ ] Check-in states (NOT_OPEN→OPEN→CHECKED_IN/MISSED)
- [ ] Auto-miss cron job
- [ ] Credential encryption service (AES-256-GCM)
- [ ] Credential storage in DB-CRED
- [ ] Release eligibility checks
- [ ] Credential access endpoint (backend-only decrypt)
- [ ] Access logging (no plaintext)
- [ ] Admin credential override
- [ ] Security tests for credential flow

#### Week 6: Notifications & Audit
- [ ] In-app notifications
- [ ] Email queue + Cloudflare Worker sender
- [ ] Notification preferences
- [ ] Audit logging for all sensitive ops
- [ ] Security event logging
- [ ] Admin dashboard APIs
- [ ] Analytics event tracking (no PII)
- [ ] Integration tests for full flows

### Phase 2: Frontend (Week 7-10)
**Goal**: Complete player & admin dashboards with premium dark UI

#### Week 7: Frontend Foundation
- [ ] Vite + React + TypeScript setup
- [ ] Tailwind CSS with design system
- [ ] Component library (Button, Card, Input, Modal, Table, Charts)
- [ ] Authentication context + hooks
- [ ] API client (TanStack Query)
- [ ] Routing (React Router)
- [ ] Layout components (Sidebar, Header, Mobile Nav)

#### Week 8: Player Dashboard
- [ ] Login/Register pages
- [ ] Email verification page
- [ ] Password reset pages
- [ ] Player dashboard (welcome, upcoming, registered)
- [ ] Profile page (edit, avatar upload, stats)
- [ ] Match list & detail pages
- [ ] Registration flow
- [ ] Check-in page
- [ ] Room credential page (/matches/:id/room)
- [ ] Match history
- [ ] Notifications center
- [ ] Responsive: mobile bottom nav, desktop sidebar

#### Week 9: Admin Dashboard
- [ ] Admin layout with sidebar navigation
- [ ] Dashboard metrics + charts
- [ ] Match management (CRUD, status control)
- [ ] Registration management
- [ ] Player management (suspend/ban)
- [ ] Credential management (release/expire, access logs)
- [ ] Audit log viewer
- [ ] Security dashboard
- [ ] Analytics dashboard
- [ ] Settings page
- [ ] Admin user management (SUPER_ADMIN)
- [ ] High-risk action confirmations

#### Week 10: Polish & Integration
- [ ] End-to-end testing
- [ ] Cross-browser testing
- [ ] Performance optimization
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Dark mode polish (glassmorphism, glows)
- [ ] Loading states, error boundaries
- [ ] SEO meta tags
- [ ] PWA manifest (optional)

### Phase 3: Infrastructure & Launch (Week 11-12)
**Goal**: Production-ready deployment with monitoring

#### Week 11: Infrastructure
- [ ] Cloudflare Pages deployment config
- [ ] Cloudflare Workers deployment (email, cron, rate limiter)
- [ ] Cloudflare R2 buckets + lifecycle
- [ ] Serv00 deployment (PM2, SSL, firewall)
- [ ] Supabase migrations for all 5 projects
- [ ] GitHub Actions CI/CD pipeline
- [ ] Backup automation (3 Google Drives)
- [ ] Keep-alive cron for Supabase
- [ ] Monitoring dashboards (UptimeRobot, custom)

#### Week 12: Launch Preparation
- [ ] Load testing (1000 concurrent)
- [ ] Security audit (penetration test)
- [ ] Security checklist verification
- [ ] Backup/restore drill
- [ ] Documentation (API, deployment, runbooks)
- [ ] Runbook for common operations
- [ ] Incident response playbook
- [ ] Soft launch (invite-only beta)
- [ ] Feedback collection
- [ ] Production launch

---

## 2. Milestone Dates

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Architecture Complete | 2026-09-05 | ✅ |
| Backend Core Complete | 2026-10-03 | ⏳ |
| Frontend Complete | 2026-10-31 | ⏳ |
| Infrastructure Ready | 2026-11-14 | ⏳ |
| Security Audit Pass | 2026-11-21 | ⏳ |
| **Production Launch** | **2026-11-28** | ⏳ |

---

## 3. Resource Allocation

| Role | Phase 1 | Phase 2 | Phase 3 |
|------|---------|---------|---------|
| Backend Developer | 1.0 FTE | 0.5 FTE | 0.5 FTE |
| Frontend Developer | 0.2 FTE | 1.0 FTE | 0.5 FTE |
| DevOps/Infra | 0.2 FTE | 0.2 FTE | 1.0 FTE |
| Security Review | 0.1 FTE | 0.1 FTE | 0.5 FTE |
| QA/Testing | 0.2 FTE | 0.5 FTE | 0.5 FTE |

---

## 4. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Serv00 resource limits unknown | HIGH | HIGH | Test early, have CF Workers fallback |
| Supabase 7-day pause | MEDIUM | HIGH | Keep-alive cron, monitoring |
| Credential encryption bugs | LOW | CRITICAL | Extensive tests, code review, audit |
| Free tier limits exceeded | MEDIUM | MEDIUM | Monitoring, archival, upgrade path |
| Email delivery issues | MEDIUM | MEDIUM | Multiple providers (SendGrid + Resend) |
| Team availability | MEDIUM | HIGH | Cross-training, documentation |

---

## 5. Post-Launch Roadmap (v1.1+)

### v1.1 (Month 1-2 post-launch)
- [ ] Team management (create/join teams for duo/squad)
- [ ] Match waitlist
- [ ] Player statistics improvements
- [ ] Email template customization
- [ ] Webhook for match results (manual entry)

### v1.2 (Month 3-4)
- [ ] Tournament bracket system
- [ ] Live match streaming embed
- [ ] Player ratings/rankings
- [ ] Discord bot integration
- [ ] Mobile push notifications (PWA)

### v2.0 (Month 6+)
- [ ] Multi-game support (BGMI, CODM)
- [ ] Organizer portal (create own tournaments)
- [ ] Sponsorship/branding system
- [ ] Advanced analytics dashboard
- [ ] API for third-party integrations

---

## 6. Definition of Done

### Per Feature
- [ ] Code complete
- [ ] Unit tests (> 80% coverage)
- [ ] Integration tests
- [ ] Code review approved
- [ ] Security review (for sensitive features)
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] QA sign-off

### Per Release
- [ ] All features done
- [ ] Load test passed
- [ ] Security audit passed
- [ ] Backup/restore tested
- [ ] Runbooks complete
- [ ] Stakeholder demo
- [ ] Release notes written

---

*Document Status: DRAFT - Adjust timeline based on team velocity and discoveries.*