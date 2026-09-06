# TMT OFFICIAL eSports Platform — Compliance & Legal

**Version:** 1.0  
**Date:** 2026-09-05  
**Status:** DRAFT - REQUIRES PROFESSIONAL LEGAL ADVICE  

---

## 1. Regulatory Scope

### 1.1 Applicable Regulations
| Regulation | Jurisdiction | Applicability | Status |
|------------|--------------|---------------|--------|
| GDPR | EU/EEA | If EU players | REQUIRES REVIEW |
| CCPA/CPRA | California, USA | If CA players | REQUIRES REVIEW |
| COPPA | USA | If players < 13 | REQUIRES REVIEW |
| ePrivacy Directive | EU | Cookies, tracking | REQUIRES REVIEW |
| Local gaming laws | Various | eSports regulations | REQUIRES REVIEW |

### 1.2 Explicitly NOT Applicable
- **PCI DSS**: No payment processing (explicitly out of scope)
- **SOX**: Not a public company
- **HIPAA**: No health data
- **FedRAMP**: Not government contracting

---

## 2. Data Protection Impact Assessment (DPIA)

### 2.1 Processing Activities
| Activity | Legal Basis | Data Categories | Retention |
|----------|-------------|-----------------|-----------|
| Account registration | Contract (ToS) | Email, username, FF UID, IP | 1 yr after deletion |
| Match registration | Contract | User ID, match ID, timestamp | 5 years |
| Check-in | Legitimate interest | User ID, timestamp, IP | 2 years |
| Credential access | Contract | User ID, match ID, timestamp | 7 years (audit) |
| Analytics | Legitimate interest | Session ID, events (no PII) | 2 years |
| Security monitoring | Legitimate interest | IP, user agent, events | 7 years |
| Email notifications | Contract/consent | Email, preferences | Until unsubscribe |

### 2.2 High-Risk Processing
- **Credential encryption/decryption**: Special category? No (not sensitive personal data)
- **Automated decision-making**: No (no profiling with legal effects)
- **Large scale monitoring**: No (< 50k MAU)
- **Cross-border transfers**: Yes (Supabase US, Cloudflare US, Google US) → SCCs needed

### 2.3 DPIA Conclusion
**Risk Level**: MEDIUM  
**Mitigation**: Encryption, minimization, access controls, audit logs, DPA with processors

---

## 3. Privacy by Design

### 3.1 Data Minimization
- ✅ No payment data collected
- ✅ No real names required (username only)
- ✅ No phone numbers
- ✅ No location tracking
- ✅ No device fingerprinting beyond security
- ✅ Analytics: anonymous session IDs only
- ✅ No third-party tracking pixels

### 3.2 Purpose Limitation
- Data used ONLY for match platform operations
- No advertising, no selling, no profiling
- Email only for platform notifications (opt-in)

### 3.3 Storage Limitation
- Retention schedules defined (see Storage/Backup doc)
- Automated deletion/anonymization
- Right to erasure implemented

### 3.4 Integrity & Confidentiality
- AES-256-GCM for credentials
- TLS 1.3 everywhere
- RLS on all tables
- Audit logs for all access

---

## 4. User Rights Implementation

### 4.1 Rights Supported
| Right | Implementation | Endpoint |
|-------|----------------|----------|
| Access | Profile + match history export | `GET /api/v1/profile/me/export` |
| Rectification | Profile edit | `PATCH /api/v1/profile/me` |
| Erasure | Account deletion + anonymization | `DELETE /api/v1/profile/me` |
| Restriction | Account suspension | Admin action |
| Portability | JSON export | `GET /api/v1/profile/me/export` |
| Objection | Notification preferences | `PATCH /api/v1/notifications/preferences` |
| Automated decisions | Not applicable | N/A |

### 4.2 Account Deletion Flow
```
User requests deletion
       │
       ▼
Verify identity (re-auth)
       │
       ▼
Soft delete: anonymize profile, cancel registrations
       │
       ▼
Hard delete (30 days later): Supabase Auth user deletion
       │
       ▼
Confirm via email
```

### 4.3 Consent Management
- Email notifications: Opt-in at registration, manageable in preferences
- Analytics: Opt-out via banner (no cookies used)
- No marketing communications

---

## 5. Security Compliance

### 5.1 Technical Measures
| Measure | Implementation |
|---------|----------------|
| Encryption at rest | Supabase (AES-256), R2 (AES-256), Backups (age) |
| Encryption in transit | TLS 1.3 (Cloudflare), HTTPS enforced |
| Access control | RBAC + RLS + service role isolation |
| Credential protection | AES-256-GCM, backend-only decrypt, zeroize |
| Audit logging | All sensitive operations, immutable |
| Rate limiting | Per-endpoint, per-user, per-IP |
| Input validation | Zod schemas client + server |
| Secure headers | CSP, HSTS, COOP, CORP, Referrer-Policy |
| Vulnerability management | Dependabot, npm audit, annual pen test |

### 5.2 Organizational Measures
- Need-to-know access to production
- Service role keys: 2-person rotation
- Incident response plan documented
- Annual security training
- Background checks for admin access

---

## 6. Third-Party Processor Agreements (DPAs)

### 6.1 Required DPAs
| Processor | Purpose | DPA Status |
|-----------|---------|------------|
| Supabase | Database, Auth, Realtime | REQUIRED |
| Cloudflare | Hosting, Workers, R2, CDN | REQUIRED |
| Google (Drive) | Backup storage | REQUIRED |
| SendGrid/Resend | Email delivery | REQUIRED |
| Upstash | Rate limiting (Redis) | REQUIRED |
| GitHub | Source code, CI/CD | REQUIRED |

### 6.2 DPA Checklist per Processor
- [ ] Data processing agreement signed
- [ ] Sub-processor list reviewed
- [ ] International transfer mechanism (SCCs)
- [ ] Security certifications (SOC 2, ISO 27001)
- [ ] Breach notification terms
- [ ] Data deletion on termination
- [ ] Audit rights

---

## 7. Terms of Service & Privacy Policy

### 7.1 Required ToS Clauses
- [ ] Service description (free practice matches)
- [ ] No payment, no gambling
- [ ] User conduct (no cheating, no credential sharing)
- [ ] Account suspension/termination
- [ ] Intellectual property
- [ ] Disclaimer of warranties
- [ ] Limitation of liability
- [ ] Governing law & dispute resolution
- [ ] Changes to terms

### 7.2 Required Privacy Policy Sections
- [ ] Data controller identity
- [ ] Data collected & purposes
- [ ] Legal bases
- [ ] Recipients (processors)
- [ ] International transfers
- [ ] Retention periods
- [ ] User rights (GDPR/CCPA)
- [ ] Security measures
- [ ] Cookies/tracking (none used)
- [ ] Children's privacy (COPPA)
- [ ] Contact for DPO/privacy inquiries

---

## 8. Age Verification (COPPA)

### 8.1 Requirements
- Minimum age: 13 (or 16 per GDPR)
- Age gate at registration
- Parental consent flow for < 16 (GDPR) / < 13 (COPPA)

### 8.2 Implementation
```typescript
// Registration validation
const registrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  username: z.string().min(3).max(20),
  ff_uid: z.string().regex(/^\d{8,12}$/),
  in_game_name: z.string().min(1).max(30),
  date_of_birth: z.string().date(), // Required
  // Client calculates age, server verifies
});

// Server-side age check
function verifyAge(dob: string): { allowed: boolean; requiresParentalConsent: boolean } {
  const age = calculateAge(new Date(dob));
  if (age < 13) return { allowed: false, requiresParentalConsent: false };
  if (age < 16) return { allowed: true, requiresParentalConsent: true }; // GDPR
  return { allowed: true, requiresParentalConsent: false };
}
```

### 8.3 Parental Consent Flow
1. User enters DOB → under 16 detected
2. Parent email collected
3. Consent email sent to parent
4. Parent clicks verified link
5. Account activated
6. Parent can revoke anytime

---

## 9. eSports & Gaming Regulations

### 9.1 Considerations
- **Gambling laws**: Platform is FREE — no entry fees, no prizes → not gambling
- **Prize laws**: If prizes added later → review required
- **Match fixing**: Terms prohibit, monitoring for suspicious patterns
- **Cheating**: Anti-cheat not in scope (Free Fire handles)
- **Player contracts**: Not applicable (individual players)

### 9.2 Jurisdiction-Specific
| Region | Regulation | Action |
|--------|------------|--------|
| India | IT Rules 2021, gaming laws | Legal review for Indian players |
| EU | eSports not specifically regulated | Standard GDPR |
| USA | State gambling laws vary | Free model avoids most |
| SE Asia | Varies by country | Geo-block if needed |

---

## 10. Accessibility (WCAG 2.1 AA)

### 10.1 Requirements
- [ ] Semantic HTML5
- [ ] Color contrast (4.5:1 normal, 3:1 large)
- [ ] Keyboard navigation
- [ ] Focus indicators
- [ ] ARIA labels
- [ ] Screen reader compatible
- [ ] Reduced motion support
- [ ] Text scaling (200%)
- [ ] Language declaration

### 10.2 Testing
- Automated: axe-core in CI
- Manual: NVDA/VoiceOver testing
- User testing with disabled players

---

## 11. Compliance Checklist (Pre-Launch)

### 11.1 Legal
- [ ] ToS drafted and reviewed by counsel
- [ ] Privacy Policy drafted and reviewed
- [ ] DPAs signed with all processors
- [ ] Age verification implemented
- [ ] COPPA/GDPR age gates active
- [ ] Jurisdiction review for target markets

### 11.2 Technical
- [ ] Data export endpoint working
- [ ] Account deletion endpoint working
- [ ] Consent management working
- [ ] Audit logs capturing all required events
- [ ] Encryption verified (credentials, backups)
- [ ] Rate limiting active
- [ ] Security headers verified
- [ ] Penetration test passed

### 11.3 Operational
- [ ] Incident response plan documented
- [ ] Breach notification procedure (72 hr GDPR)
- [ ] Data retention automation active
- [ ] Backup encryption verified
- [ ] Access review process (quarterly)
- [ ] Staff training completed

---

## 12. Ongoing Compliance

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Privacy policy review | Annual | Legal |
| DPA review | Annual | Legal/Engineering |
| Security audit | Annual | External |
| Penetration test | Annual | External |
| Access review | Quarterly | Engineering |
| Backup restore test | Monthly | Engineering |
| Staff training | Annual | HR/Security |
| Incident response drill | Quarterly | Engineering |

---

## 13. Documentation for Regulators

### 13.1 Records of Processing Activities (ROPA)
Maintained in: `docs/compliance/ropa.md` (update quarterly)

### 13.2 Data Breach Register
Maintained in: DB-AUDIT.security_events (filter: breach-related)

### 13.3 DPIA Record
This document serves as DPIA record. Update on material changes.

---

*Document Status: DRAFT - REQUIRES PROFESSIONAL LEGAL REVIEW before launch. This is not legal advice.*