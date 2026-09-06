# TMT OFFICIAL eSports Platform — API Specification

**Version:** 1.0  
**Date:** 2026-09-05  
**Status:** DRAFT  
**Base URL:** `https://api.tmtofficial.esports` (Serv00) / Cloudflare Workers edge  
**Authentication:** Supabase JWT (HttpOnly cookie) + CSRF token for mutations  

---

## 1. Conventions

### 1.1 HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/expired token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate, state conflict) |
| 422 | Unprocessable Entity (business rule violation) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### 1.2 Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|CONFLICT|RATE_LIMITED|INTERNAL_ERROR",
    "message": "Human-readable message",
    "details": {}, // optional, field-specific errors for validation
    "request_id": "uuid" // for tracing
  }
}
```

### 1.3 Pagination
```json
// Request
GET /matches?page=1&limit=20&status=OPEN

// Response
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

### 1.4 Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699234567
Retry-After: 60 (on 429)
```

### 1.5 Idempotency
```
Idempotency-Key: <uuid> (required for POST /registrations, POST /credentials/access)
```

---

## 2. Authentication Endpoints

### 2.1 Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "player@example.com",
  "password": "securePassword123!",
  "username": "proplayer1",
  "display_name": "Pro Player",
  "ff_uid": "123456789",
  "in_game_name": "ProPlayerFF"
}
```

**Response 201:**
```json
{
  "user": {
    "id": "uuid",
    "email": "player@example.com",
    "email_confirmed_at": null,
    "created_at": "2026-09-05T10:00:00Z"
  },
  "session": null // email verification required
}
```

### 2.2 Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "player@example.com",
  "password": "securePassword123!"
}
```

**Response 200:**
```json
{
  "user": { "id": "uuid", "email": "...", "role": "PLAYER" },
  "session": { "access_token": "...", "refresh_token": "...", "expires_at": 1699234567 }
}
// Sets HttpOnly cookies: sb-access-token, sb-refresh-token
```

### 2.3 Logout
```http
POST /api/v1/auth/logout
```

**Response 204:** Clears cookies

### 2.4 Refresh Token
```http
POST /api/v1/auth/refresh
// Uses HttpOnly refresh token cookie
```

**Response 200:** New access token + refresh token (rotation)

### 2.5 Forgot Password
```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{ "email": "player@example.com" }
```

**Response 200:** `{ "message": "If email exists, reset link sent" }` (anti-enumeration)

### 2.6 Reset Password
```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{ "token": "reset_token_from_email", "password": "newSecurePassword123!" }
```

**Response 200:** `{ "message": "Password updated" }`

### 2.7 Verify Email
```http
GET /api/v1/auth/verify-email?token=verification_token
```

**Response 200:** Redirect to frontend with success message

### 2.8 Get Current User
```http
GET /api/v1/auth/me
```

**Response 200:**
```json
{
  "id": "uuid",
  "email": "player@example.com",
  "role": "PLAYER",
  "profile": { "username": "proplayer1", "display_name": "Pro Player", "ff_uid": "123456789", ... },
  "permissions": ["register", "checkin", "view_credentials"]
}
```

---

## 3. Profile Endpoints

### 3.1 Get Profile
```http
GET /api/v1/profile/me
```

**Response 200:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "username": "proplayer1",
  "display_name": "Pro Player",
  "ff_uid": "123456789",
  "in_game_name": "ProPlayerFF",
  "avatar_url": "https://r2.tmtofficial.esports/avatars/uuid.jpg",
  "bio": "Free Fire competitive player",
  "account_status": "ACTIVE",
  "profile_completion_pct": 85,
  "stats": {
    "matches_played": 42,
    "wins": 12,
    "kills": 340,
    "deaths": 180,
    "kd_ratio": 1.89,
    "avg_placement": 3.2,
    "win_rate": 28.6
  },
  "created_at": "2026-09-01T10:00:00Z",
  "updated_at": "2026-09-04T15:30:00Z"
}
```

### 3.2 Update Profile
```http
PATCH /api/v1/profile/me
Content-Type: application/json

{
  "display_name": "Pro Player Updated",
  "in_game_name": "ProPlayerFF_Updated",
  "bio": "Updated bio"
}
```

**Response 200:** Updated profile object

### 3.3 Upload Avatar
```http
POST /api/v1/profile/avatar
Content-Type: multipart/form-data

file: <image> (max 5MB, JPEG/PNG/WebP)
```

**Response 200:**
```json
{ "avatar_url": "https://r2.tmtofficial.esports/avatars/uuid.jpg?signature=..." }
```

### 3.4 Get Public Profile (by username)
```http
GET /api/v1/profile/:username
```

**Response 200:** Limited public fields (no email, no FF UID)

### 3.5 Get Match History
```http
GET /api/v1/profile/me/matches?page=1&limit=20
```

**Response 200:** Paginated match history with results

---

## 4. Match Endpoints (Public)

### 4.1 List Matches
```http
GET /api/v1/matches?status=OPEN&page=1&limit=20&game_mode=CLASSIC&team_size=SQUAD
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Weekly Squad Championship",
      "description": "Practice match for squad teams",
      "game_mode": "CLASSIC",
      "map": "BERMUDA",
      "team_size": "SQUAD",
      "max_teams": 50,
      "max_players": 200,
      "scheduled_at": "2026-09-10T18:00:00Z",
      "registration_opens_at": "2026-09-05T10:00:00Z",
      "registration_closes_at": "2026-09-10T17:00:00Z",
      "checkin_opens_at": "2026-09-10T17:00:00Z",
      "checkin_closes_at": "2026-09-10T17:30:00Z",
      "credential_release_at": "2026-09-10T17:45:00Z",
      "credential_expires_at": "2026-09-10T20:00:00Z",
      "status": "OPEN",
      "registration_count": 142,
      "teams_registered": 38,
      "created_at": "2026-09-01T10:00:00Z"
      // NO credential fields
    }
  ],
  "pagination": { ... }
}
```

### 4.2 Get Match Detail
```http
GET /api/v1/matches/:id
```

**Response 200:** Full match object (same as list item, no credentials)

### 4.3 Get Match Schedule (Calendar)
```http
GET /api/v1/matches/schedule?from=2026-09-01&to=2026-09-30
```

**Response 200:** Array of matches with minimal fields for calendar view

---

## 5. Registration Endpoints

### 5.1 Register for Match
```http
POST /api/v1/matches/:id/register
Idempotency-Key: <uuid>
Content-Type: application/json

{} // Empty body - eligibility checked server-side
```

**Response 201:**
```json
{
  "registration": {
    "id": "uuid",
    "match_id": "uuid",
    "user_id": "uuid",
    "status": "CONFIRMED",
    "registered_at": "2026-09-05T10:05:00Z"
  },
  "match": { "title": "...", "scheduled_at": "...", "checkin_opens_at": "..." }
}
```

**Errors:**
- 409: Already registered
- 422: Match not open, full, user banned, registration closed

### 5.2 Cancel Registration
```http
DELETE /api/v1/matches/:id/register
```

**Response 200:**
```json
{ "registration": { "id": "uuid", "status": "CANCELLED", "cancelled_at": "..." } }
```

**Errors:**
- 404: Not registered
- 422: Check-in already started

### 5.3 Get My Registrations
```http
GET /api/v1/registrations/me?status=CONFIRMED&page=1&limit=20
```

**Response 200:** Paginated registrations with match details

---

## 6. Check-In Endpoints

### 6.1 Get Check-In Status
```http
GET /api/v1/matches/:id/checkin
```

**Response 200:**
```json
{
  "checkin": {
    "status": "NOT_OPEN", // NOT_OPEN|OPEN|CHECKED_IN|MISSED|CANCELLED
    "opens_at": "2026-09-10T17:00:00Z",
    "closes_at": "2026-09-10T17:30:00Z",
    "server_time": "2026-09-10T16:55:00Z",
    "checked_in_at": null
  },
  "registration": { "id": "uuid", "status": "CONFIRMED" }
}
```

### 6.2 Check In
```http
POST /api/v1/matches/:id/checkin
Idempotency-Key: <uuid>
```

**Response 200:**
```json
{
  "checkin": {
    "status": "CHECKED_IN",
    "checked_in_at": "2026-09-10T17:05:00Z"
  }
}
```

**Errors:**
- 422: Check-in not open, already checked in, registration cancelled

---

## 7. Room Credential Endpoints (SECURE)

### 7.1 Get Credential Status
```http
GET /api/v1/matches/:id/credential/status
```

**Response 200:**
```json
{
  "credential": {
    "status": "LOCKED", // LOCKED|AVAILABLE|EXPIRED
    "released_at": "2026-09-10T17:45:00Z",
    "expires_at": "2026-09-10T20:00:00Z",
    "server_time": "2026-09-10T17:40:00Z"
  },
  "eligible": false,
  "eligibility_reason": "RELEASE_TIME_NOT_REACHED"
}
```

### 7.2 Access Credentials (Get Room ID + Password)
```http
POST /api/v1/matches/:id/credential/access
Idempotency-Key: <uuid>
Content-Type: application/json

{}
```

**Response 200 (GRANTED):**
```json
{
  "granted": true,
  "credential": {
    "room_id": "12345678", // DECRYPTED - ONLY in this response
    "password": "abcdefgh", // DECRYPTED - ONLY in this response
    "expires_at": "2026-09-10T20:00:00Z",
    "warning": "DO NOT SHARE. Sharing credentials may result in disqualification and account suspension."
  }
}
```

**Response 200 (DENIED):**
```json
{
  "granted": false,
  "reason": "NOT_REGISTERED|NOT_CHECKED_IN|BANNED|RELEASE_TIME_NOT_REACHED|EXPIRED|CREDENTIAL_REVOKED",
  "message": "You must check in before accessing room credentials."
}
```

**CRITICAL Security Notes:**
- This is the ONLY endpoint that returns decrypted credentials
- Response MUST NOT be cached (Cache-Control: no-store, private)
- Response MUST NOT appear in analytics
- Access logged in DB-CRED credential_access_logs
- Rate limited: 5 requests/minute per user

---

## 8. Room Dashboard Endpoint (Frontend Route)

### 8.1 Room Page Data
```http
GET /api/v1/matches/:id/room
```

**Response 200:**
```json
{
  "match": { "id": "uuid", "title": "...", "scheduled_at": "..." },
  "registration": { "id": "uuid", "status": "CONFIRMED" },
  "checkin": { "status": "CHECKED_IN" },
  "credential": {
    "state": "AVAILABLE", // NOT_REGISTERED|REGISTERED|WAITING_FOR_RELEASE|AVAILABLE|EXPIRED|CANCELLED
    "room_id": "12345678", // ONLY if AVAILABLE
    "password": "abcdefgh", // ONLY if AVAILABLE
    "expires_at": "2026-09-10T20:00:00Z",
    "countdown_seconds": 1200 // if WAITING_FOR_RELEASE
  }
}
```

---

## 9. Admin Endpoints (Require ADMIN/SUPER_ADMIN)

### 9.1 Dashboard Metrics
```http
GET /api/v1/admin/dashboard/metrics
```

**Response 200:**
```json
{
  "registrations_today": 1250,
  "registrations_this_week": 8420,
  "active_matches": 12,
  "upcoming_matches": 25,
  "checkin_rate_24h": 92.5,
  "credential_access_rate_24h": 98.2,
  "security_events_24h": 3,
  "banned_players": 15,
  "charts": {
    "registrations_7d": [{ "date": "2026-09-01", "count": 1200 }, ...],
    "checkins_7d": [{ "date": "2026-09-01", "rate": 91.2 }, ...],
    "security_events_7d": [{ "date": "2026-09-01", "count": 2 }, ...]
  }
}
```

### 9.2 Match Management

#### List Matches (Admin)
```http
GET /api/v1/admin/matches?status=DRAFT&page=1&limit=50
```

#### Create Match
```http
POST /api/v1/admin/matches
Content-Type: application/json

{
  "title": "Weekly Squad Championship",
  "description": "Practice match...",
  "game_mode": "CLASSIC",
  "map": "BERMUDA",
  "team_size": "SQUAD",
  "max_teams": 50,
  "max_players": 200,
  "scheduled_at": "2026-09-10T18:00:00Z",
  "registration_opens_at": "2026-09-05T10:00:00Z",
  "registration_closes_at": "2026-09-10T17:00:00Z",
  "checkin_opens_at": "2026-09-10T17:00:00Z",
  "checkin_closes_at": "2026-09-10T17:30:00Z",
  "credential_release_at": "2026-09-10T17:45:00Z",
  "credential_expires_at": "2026-09-10T20:00:00Z"
}
```

#### Update Match
```http
PATCH /api/v1/admin/matches/:id
Content-Type: application/json

{ "title": "Updated Title", "max_teams": 60 }
```

#### Delete/Cancel Match
```http
DELETE /api/v1/admin/matches/:id
// Body: { "reason": "Cancelled due to...", "notify_registrants": true }
```

#### Set Match Status
```http
POST /api/v1/admin/matches/:id/status
Content-Type: application/json

{ "status": "OPEN", "confirm": "OPEN" } // High-risk: requires typing confirmation
```

### 9.3 Registration Management
```http
GET /api/v1/admin/matches/:id/registrations?status=CONFIRMED&page=1&limit=50
GET /api/v1/admin/registrations/:id
POST /api/v1/admin/registrations/:id/cancel
POST /api/v1/admin/registrations/:id/force-checkin
```

### 9.4 Player Management
```http
GET /api/v1/admin/players?search=&status=ACTIVE&page=1&limit=50
GET /api/v1/admin/players/:id
POST /api/v1/admin/players/:id/suspend
POST /api/v1/admin/players/:id/ban
POST /api/v1/admin/players/:id/unsuspend
```

### 9.5 Credential Management
```http
GET /api/v1/admin/credentials?status=LOCKED&page=1&limit=50
GET /api/v1/admin/credentials/:matchId
POST /api/v1/admin/credentials/:matchId/release
POST /api/v1/admin/credentials/:matchId/expire
GET /api/v1/admin/credentials/:matchId/access-logs?page=1&limit=100
```

### 9.6 Audit Logs
```http
GET /api/v1/admin/audit-logs?action=credential.release&page=1&limit=100
```

### 9.7 Security Dashboard
```http
GET /api/v1/admin/security/events?severity=HIGH&resolved=false&page=1&limit=50
POST /api/v1/admin/security/events/:id/resolve
```

### 9.8 Admin User Management (SUPER_ADMIN only)
```http
GET /api/v1/admin/users
POST /api/v1/admin/users/invite
PATCH /api/v1/admin/users/:id
DELETE /api/v1/admin/users/:id
```

---

## 10. Notification Endpoints

### 10.1 Get Notifications
```http
GET /api/v1/notifications?unread_only=true&page=1&limit=20
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "CREDENTIAL_RELEASED",
      "title": "Room Credentials Released",
      "message": "Credentials for Weekly Squad Championship are now available",
      "match_id": "uuid",
      "read": false,
      "created_at": "2026-09-10T17:45:00Z"
      // NO credentials in message
    }
  ],
  "pagination": { ... },
  "unread_count": 5
}
```

### 10.2 Mark Read
```http
PATCH /api/v1/notifications/:id/read
PATCH /api/v1/notifications/read-all
```

### 10.3 Get Preferences
```http
GET /api/v1/notifications/preferences
```

### 10.4 Update Preferences
```http
PATCH /api/v1/notifications/preferences
Content-Type: application/json

{ "email": true, "credential_alerts": true, "security_alerts": true }
```

---

## 11. Analytics Endpoints (Admin)

### 11.1 Registration Analytics
```http
GET /api/v1/admin/analytics/registrations?from=2026-09-01&to=2026-09-30&group_by=day
```

### 11.2 Check-In Analytics
```http
GET /api/v1/admin/analytics/checkins?from=2026-09-01&to=2026-09-30
```

### 11.3 Player Analytics
```http
GET /api/v1/admin/analytics/players?metric=retention&period=7d
```

### 11.4 Security Analytics
```http
GET /api/v1/admin/analytics/security?from=2026-09-01&to=2026-09-30
```

---

## 12. Health & Utility

### 12.1 Health Check
```http
GET /api/v1/health
```

**Response 200:**
```json
{ "status": "healthy", "timestamp": "2026-09-05T10:00:00Z", "version": "1.0.0" }
```

### 12.2 Server Time
```http
GET /api/v1/time
```

**Response 200:**
```json
{ "server_time": "2026-09-05T10:00:00.123Z", "timezone": "UTC" }
```

---

## 13. Webhook Endpoints (Internal)

### 13.1 Supabase Auth Webhook
```http
POST /api/v1/webhooks/supabase-auth
// Handles user.created, user.updated, user.deleted
// Creates/updates profile, admin_users records
```

### 13.2 Cron Job Endpoints (Secured with CRON_SECRET)
```http
POST /api/v1/cron/match-status-update
POST /api/v1/cron/credential-release
POST /api/v1/cron/credential-expiry
POST /api/v1/cron/checkin-auto-miss
POST /api/v1/cron/email-queue-process
POST /api/v1/cron/cleanup-expired-sessions
```

---

## 14. Rate Limits Summary

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Auth (login/register) | 10 | minute/IP |
| Auth (password reset) | 3 | hour/IP |
| Match List | 60 | minute/user |
| Match Detail | 120 | minute/user |
| Registration | 5 | minute/user |
| Check-In | 10 | minute/user |
| Credential Status | 30 | minute/user |
| Credential Access | 5 | minute/user |
| Admin Endpoints | 100 | minute/user |
| Notifications | 30 | minute/user |
| Analytics | 20 | minute/user |

---

## 15. Versioning & Deprecation

- Version in URL: `/api/v1/`
- Breaking changes → new version (`/api/v2/`)
- Deprecation notice: 90 days via `Sunset` header
- Changelog maintained in docs

---

*Document Status: DRAFT - Implementation should follow this spec exactly.*