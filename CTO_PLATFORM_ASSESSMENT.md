# VytalWatch AI — CTO Platform Assessment

**Date:** March 2, 2026
**Scope:** Full-stack codebase audit — frontend, backend, integrations, security, compliance, SEO, infrastructure
**Assessed by:** CTO Office, Haven Technologies Inc.

---

## EXECUTIVE SUMMARY

VytalWatch is architecturally sound with **30 backend modules, 376+ API endpoints, and 61 frontend pages**. The NestJS backend has genuine business logic across auth, billing, devices, and AI. However, the platform is **not production-ready**. The single most critical finding is that **94% of frontend pages run on hardcoded mock data** with no backend API calls — the UI is a shell. On the backend, several services also return mock data, scheduled jobs are absent, and test coverage is under 5%. Security foundations are strong (AES-256-GCM encryption, audit logging, RBAC) but have critical gaps in state management (in-memory instead of Redis) and configuration defaults.

### Overall Health Score: 5.5 / 10

| Layer | Score | Verdict |
|-------|-------|---------|
| Architecture & Structure | 9/10 | Excellent module design |
| Backend API Coverage | 8/10 | 376+ endpoints, comprehensive |
| Backend Business Logic | 6/10 | Mix of real + mock/stub logic |
| Frontend UI/UX | 8/10 | Professional, responsive |
| Frontend-Backend Integration | 1/10 | **94% disconnected** |
| Auth & Security | 8/10 | Strong, 4 critical gaps |
| HIPAA Compliance | 7/10 | Foundations solid, gaps in key mgmt |
| Third-Party Integrations | 7/10 | Functional, some stubs |
| SEO | 2/10 | No sitemap, no per-page metadata |
| Testing | 1/10 | 5 test files total |
| Cron Jobs / Automation | 1/10 | Almost nothing scheduled |
| Logging & Monitoring | 3/10 | Basic stdout, no Sentry/ELK |
| Deployment / Docker | 8/10 | Production-grade compose files |
| Database Design | 8/10 | Well-normalized Prisma schema |

---

## 1. BACKEND API AUDIT

### 1.1 Module Structure (30 modules)

All modules follow NestJS convention. 25/29 controllers have proper JwtAuthGuard + RolesGuard. Complete module list:

| Module | Controller | Service | Entities | DTOs | Endpoints | Status |
|--------|-----------|---------|----------|------|-----------|--------|
| admin | Yes | Yes | 1 | Inline | 29 | Complete |
| ai | Yes | Yes | — | — | 15 | **Partial mock** |
| alerts | Yes | Yes | 1 | Inline | 11 | Complete |
| analytics | Yes | Yes | — | — | 7 | **Mock data** |
| appointments | Yes | Yes | 1 | File | 10 | Complete |
| audit | Yes | Yes | 1 | Inline | 6 | Complete |
| auth | Yes | Yes | 1 | Inline | 16 | Complete |
| billing | 2 ctrl | Yes | 3 | Inline | 23 | Complete |
| clinical-notes | Yes | Yes | 1 | File | 12 | Complete |
| consent | Yes | Yes | 1 | File | 16 | Complete |
| devices | 2 ctrl | 2 svc | 3 | File | 51 | Complete |
| email | Yes | Yes | — | — | 2 | Complete |
| health | Yes | Yes | — | — | 4 | Complete |
| influxdb | — | Yes | — | — | 0 | **No controller** |
| integrations | Yes | Yes | — | Inline | 16 | Complete |
| medications | Yes | Yes | 1 | File | 12 | Complete |
| messaging | Yes | Yes | 1 | Inline | 10 | **Missing RBAC** |
| notifications | Yes | Yes | 1 | Inline | 3 | **Missing RBAC** |
| organizations | Yes | Yes | 1 | Inline | 14 | Complete |
| patients | Yes | Yes | — | Inline | 23 | **Partial mock** |
| reports | Yes | Yes | 1 | Inline | 13 | Complete |
| sms | Yes | Yes | — | — | 5 | Complete |
| users | Yes | Yes | 1 | Inline | 9 | Complete |
| vitals | Yes | Yes | 1 | Inline | 10 | Complete |
| webrtc | Yes | Yes | — | — | 1 | Minimal |
| websocket | Gateway | Yes | — | — | — | Gateway |

### 1.2 Critical Backend Issues

**SECURITY — Must fix before production:**

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | Emergency access `validate` and `revoke` endpoints missing @Roles guard | CRITICAL | auth/emergency-access.controller.ts |
| 2 | Messaging controller has no RolesGuard — users can access other users' threads | CRITICAL | messaging/messaging.controller.ts |
| 3 | Notifications controller missing RolesGuard | HIGH | notifications/notifications.controller.ts |
| 4 | Billing webhook needs explicit Stripe signature verification check | HIGH | billing/billing-webhook.controller.ts |
| 5 | CORS defaults to `'*'` if FRONTEND_URL not set | CRITICAL | main.ts |

**MISSING ENDPOINTS:**

| Module | Missing | Impact |
|--------|---------|--------|
| vitals | No UPDATE endpoint (PUT/PATCH) | Can't correct erroneous readings |
| vitals | No batch import | Can't bulk-load historical data |
| medications | No DELETE endpoint (only discontinue) | Can't remove erroneous entries |
| influxdb | No controller at all | Time-series queries unavailable to frontend |
| appointments | No bulk operations | Scheduling inefficiency |
| messaging | No search/filter | Can't find old messages |

**MOCK/STUB SERVICES:**

| Service | Mock Behavior |
|---------|---------------|
| analytics.service.ts | Condition prevalence, medication adherence, appointment adherence all return hardcoded arrays |
| patients.service.ts | `getAppointments()` returns mock data with TODO comment |
| ai.service.ts | `getRecommendations()`, `getModels()`, `getPerformanceMetrics()` return hardcoded data |
| websocket.gateway.ts | TODO: patient room subscription not implemented |

**DTO ORGANIZATION:**
40+ DTOs are defined inline in controllers instead of separate files. Should be extracted for reusability and Swagger documentation.

**PAGINATION:**
No global pagination pattern. Each controller implements its own approach inconsistently (some use DTO, some use raw @Query params).

**BUSINESS LOGIC GAPS:**
- No duplicate vital reading prevention (same patient, same time, same type)
- No appointment overlap detection for patients (only checks provider)
- No medication-allergy cross-checking
- No medication refill limit enforcement
- Multi-step operations (appointment + notification, billing + invoice) lack transactional safety

---

## 2. FRONTEND AUDIT

### 2.1 Page Inventory (61 pages)

All sidebar navigation links resolve to real pages. Routes:
- **Patient:** 9 pages (dashboard, vitals, devices, medications, appointments, messages, education, profile, settings)
- **Provider:** 10+ pages (dashboard, patients, patients/[id], patients/enroll, alerts, devices, messages, analytics, billing, schedule, profile, settings)
- **Admin:** 18 pages (dashboard, users, organizations, devices, devices/orders, gateways, integrations, billing, analytics, ai, api-keys, api-logs, audit-logs, security, reports, profile, settings)
- **Auth:** 6 pages (login, register, forgot-password, reset-password, verify-email)
- **Public/Marketing:** 12+ pages (landing, about, blog, careers, case-studies, contact, demo, docs, features, help, hipaa, integrations, privacy, terms)

### 2.2 The Mock Data Problem (CRITICAL)

**Only 4 out of 61 pages make real API calls.** Everything else uses hardcoded arrays.

Pages with real API integration:
1. `/provider/patients/[id]` — calls 7 API services (patientsApi, tenoviApi, aiApi, alertsApi, clinicalNotesApi, consentsApi, integrationsApi)
2. `/provider/devices` — calls tenoviApi.listDevices()
3. `/admin/users` — calls usersAdminApi.getAll()
4. `/admin/dashboard` — partial

**57 pages** render hardcoded mock data that is lost on refresh. This includes all patient pages, most provider pages, and most admin pages.

The frontend has well-built `apiClient`, `useApi`, and `useMutation` hooks that are barely used. The wiring simply hasn't been done.

### 2.3 Dead Action Buttons

Buttons that do nothing meaningful (toast-only or local-state-only):

| Page | Button | Behavior |
|------|--------|----------|
| Patient Dashboard | "Message Care Team" | router.push() only |
| Patient Medications | "Mark as Taken" | Local state, lost on refresh |
| Patient Medications | "Set Reminder" | Toast only |
| Patient Medications | "Request Refill" | Toast only |
| Patient Appointments | Schedule/Reschedule/Cancel | Local state only |
| Patient Profile | "Save Profile" | Fake setTimeout(), no API |
| Provider Dashboard | "Add Patient" | router.push() only |
| Provider Dashboard | "Call Patient" | Toast only |
| Provider Alerts | Acknowledge/Resolve | Local state only |
| Provider Profile | "Save Profile" | Fake setTimeout(), no API |

### 2.4 Missing Error/Loading/Empty States

- No loading spinners on most pages (only `/provider/devices` and `/admin/users` have them)
- No skeleton screens anywhere
- No error fallback UI on API failure
- No "empty state" messages (no appointments, no alerts, no patients)
- No network error recovery

### 2.5 State Management

- **authStore** (Zustand + persist) — Production-ready. Makes real API calls.
- **appStore** — Theme/sidebar/toasts. Fine.
- **No data stores** for vitals, patients, alerts, appointments, etc. Pages use local useState with mock data.

### 2.6 Auth Protection

- All dashboard routes protected via DashboardLayout (checks isAuthenticated + role)
- Protection is client-side only (no Next.js middleware)
- No automatic token refresh on API 401 responses

---

## 3. INTEGRATIONS AUDIT

### 3.1 Tenovi Device Integration — 85/100

**Strengths:**
- Webhook handler with HMAC-SHA256 signature validation
- Dual auth: signature-based + header auth key
- Measurement processing maps to 6+ vital types
- Device provisioning, assignment, sync, replacement workflows
- Shipping status tracking with 10 states
- Audit logging on all device operations

**Gaps:**
- Data flows to PostgreSQL only — InfluxDB integration exists as a service but no controller exposes it
- Device sync has partial fallback if Tenovi API fails (creates incomplete records)

### 3.2 AI Integration (OpenAI + Grok) — 70/100

**Strengths:**
- OpenAI fully integrated with proper client
- Grok as OpenAI-compatible alternative
- 81-line clinical system prompt with evidence-based guidelines (ACC/AHA, ADA, GOLD references)
- Temperature/token tuning per endpoint

**Gaps:**
- `getRecommendations()`, `getModels()`, `getPerformanceMetrics()` return hardcoded mock data
- Fallback to `getDefaultAnalysis()` is silent — providers don't know they're getting fallback
- No response schema validation (JSON.parse with no structure check)
- No token counting before API call
- No cost tracking per organization
- No rate limiting per user
- No content filtering on AI outputs

### 3.3 WebRTC — 75/100

**Strengths:**
- Backend provides TURN credentials with configurable TTL
- STUN/TURN/TLS fallback (ports 3478, 5349)
- Frontend: ICE candidate pooling, media constraints (echo/noise cancellation), 720p video
- Signaling via Socket.io (call:initiate, call:accept, webrtc:offer/answer/ice-candidate)
- Proper media stream cleanup on call end

**Gaps:**
- Default TURN credential hardcoded: `'VitalWatch2024!'` — must change
- Signaling server implementation is implicit (in WebSocket module)
- No call recording capability
- Mobile WebRTC UI unverified

### 3.4 Twilio SMS — 90/100

**Strengths:**
- 13+ template types (2FA, alerts, appointments, medications, billing, device shipping, security)
- Proper dev-mode fallback
- Audit logging with phone masking

**Gaps:**
- 2FA codes stored in-memory only — **lost on server restart**
- No rate limiting per phone number (SMS bombing possible)
- No delivery confirmation tracking
- No message deduplication

### 3.5 ZeptoMail Email — 85/100

**Strengths:**
- 10 professional HTML email templates with consistent branding
- Color-coded alert emails (blue/warning/critical)
- Responsive design with CTAs

**Gaps:**
- No SMTP fallback implementation (configured but not coded)
- No bounce/complaint handling
- No unsubscribe links in templates
- No template versioning

### 3.6 Stripe Billing — 88/100

**Strengths:**
- Full subscription lifecycle (create, cancel, refresh)
- CPT code billing with eligibility validation (99453, 99454, 99457, 99458)
- Webhook handling (subscription.updated/deleted, invoice.paid/failed)
- Stripe signature verification

**Gaps:**
- `invoice.payment_action_required` not handled
- Price IDs default to empty strings in PLAN_CONFIGS
- No retry logic for failed transactions
- No automated billing cycle cron job

---

## 4. SECURITY & HIPAA COMPLIANCE

### 4.1 Authentication — 92/100

| Feature | Status |
|---------|--------|
| JWT access + refresh tokens | 15min / 7day, properly implemented |
| bcrypt (12 rounds) | Industry standard |
| OAuth (Google, Microsoft, Apple) | Implemented |
| Magic link login | Implemented |
| SMS 2FA | Implemented (in-memory codes) |
| Account lockout | 5 attempts, 15min lockout |
| Password policy | 12+ chars, mixed case, numbers, special |
| Password history | Last 12 passwords checked |
| Session management | 15min timeout, max 3 concurrent |

**Critical issue:** Apple OAuth token verification only does `jwtService.decode()` — no signature verification against Apple's public keys.

### 4.2 Encryption — AES-256-GCM

- Algorithm: AES-256-GCM (authenticated encryption)
- IV: 16 random bytes per operation
- Key derivation: PBKDF2 (100,000 iterations, SHA-256)
- PHI fields encrypted: phone, DOB, SSN, insurance numbers, emergency contacts, medication notes

**Gaps:**
- ENCRYPTION_KEY in environment variable (no HSM)
- No key rotation mechanism
- Silent fallback on decryption failure (returns original data)

### 4.3 Audit Logging

- 20+ action types logged (login, password change, device assignment, data access, emergency access, etc.)
- Captures userId, resourceType, resourceId, details, IP, userAgent
- 6-year retention (HIPAA compliant)
- Organization-scoped queries

**Gap:** `details` field is `Record<string, any>` — no schema validation, could accidentally log PHI in cleartext.

### 4.4 Rate Limiting

- Global: 100 requests / 60 seconds (ThrottlerModule)
- Login: 5 attempts / 15 minute window with progressive lockout
- Nginx: 10 req/s API, 5 req/min login

### 4.5 In-Memory State Problem (CRITICAL)

The following critical security state is stored **in-memory only** and will be lost on server restart or across multiple replicas:

| State | Impact if Lost |
|-------|---------------|
| SMS verification codes | 2FA breaks, users can't verify |
| Login attempt counters | Brute-force protection disabled |
| Token blacklist | Revoked tokens still work |
| Rate limit windows | Rate limiting disabled |

**Fix:** All must move to Redis, which is already deployed but not used for these.

### 4.6 HIPAA Compliance Summary

| Requirement | Status |
|-------------|--------|
| PHI encryption at rest | Yes (AES-256-GCM) |
| Encryption in transit | Yes (TLS 1.2+) |
| Access controls (RBAC) | Yes |
| Audit trail | Yes (6-year retention) |
| Emergency access (break-glass) | Yes, with logging |
| Account lockout | Yes |
| Password policy enforcement | Yes |
| BAA framework | Not visible in code |
| Key management (HSM) | Not implemented |
| Audit log immutability | Not enforced |
| Data retention policies | Not documented |
| Breach notification | Not implemented |

---

## 5. SEO AUDIT

| Check | Status |
|-------|--------|
| Root metadata (title, description, OG, Twitter) | Present in layout.tsx |
| Per-page metadata exports | **Missing on all 43+ pages** |
| sitemap.ts / sitemap.xml | **Missing** |
| robots.ts / robots.txt | **Missing** |
| Canonical URLs | **Missing** |
| Dynamic OG images | **Missing** |
| Heading hierarchy (h1/h2/h3) | Good |
| Image alt tags | Partial |
| Structured data (JSON-LD) | **Missing** |
| Meta descriptions per page | **Missing** |

**Impact:** Search engines have no structured crawl instructions. All pages use the same generic meta description. No sitemap means Google has to discover pages by crawling links.

---

## 6. INFRASTRUCTURE & DEVOPS

### 6.1 Docker & Deployment — 8/10

- Multi-stage Dockerfiles for both frontend and backend (node:20-alpine)
- Non-root users (nextjs:1001, nestjs:1001)
- Production compose: 2 replicas, rolling updates, resource limits, health checks
- Nginx reverse proxy with security headers, rate limiting, WebSocket upgrade
- Hetzner deployment scripts, SSL automation, backup script

### 6.2 Cron Jobs / Scheduled Tasks — 1/10

**Only one scheduled task exists:** Token blacklist cleanup every 1 hour (setInterval).

**Missing scheduled tasks (all critical for production RPM):**

| Task | Impact |
|------|--------|
| Billing cycle automation | No automated subscription renewals |
| Invoice generation | No scheduled invoice creation |
| CPT billing cycle closure | Monthly CPT claims not auto-generated |
| Alert aggregation | No batch alert notifications |
| Medication reminders | Schedule field exists, no cron sends |
| Report generation | Schedule API exists, no execution |
| Expired session cleanup | Only manual token blacklist cleanup |
| Audit log archival | 6-year logs with no archival strategy |
| Device health check | No periodic device connectivity checks |

Bull queue is in package.json but never imported or configured.

### 6.3 Logging & Monitoring — 3/10

- NestJS built-in Logger to stdout (15+ services use it)
- No structured JSON logging
- No correlation IDs / request tracing
- No Sentry or error aggregation
- Health checks exist but don't test Redis, InfluxDB, or external APIs

### 6.4 Testing — 1/10

**Backend:** 5 test files, ~382 lines total (app.controller.spec, emergency-access.service.spec, password.validator.spec, encryption.service.spec, health.service.spec). Coverage < 5%.

**Frontend:** Zero test files.

**E2E:** Single placeholder test checking "Hello World!" response.

### 6.5 Next.js Configuration Issues

```typescript
typescript: { ignoreBuildErrors: true }  // DANGEROUS
eslint: { ignoreDuringBuilds: true }     // DANGEROUS
```

No CSP headers, no image domain whitelist, no redirects configured.

---

## 7. DATABASE

### 7.1 Prisma Schema — 8/10

Well-normalized with comprehensive tables: User, PatientProfile, ProviderProfile, Vital, Alert, TenoviDevice, Subscription, Invoice, AuditLog, Appointment, Medication, Consent, ClinicalNote, EmergencyAccessLog.

Proper enums: UserRole, UserStatus, AlertSeverity, DeviceStatus, SubscriptionStatus, BillingStatus.

**Gaps:**
- No explicit indexes on frequently queried fields (userId, organizationId, createdAt)
- No composite indexes (patientId + type for vitals)
- No soft-delete pattern for HIPAA retention
- Dual ORM usage (TypeORM + Prisma) — should consolidate

### 7.2 InfluxDB

Service exists with write/query/delete operations but has no controller. Time-series data capability is architecturally present but not exposed to the frontend.

---

## 8. PRIORITIZED REMEDIATION ROADMAP

### P0 — CRITICAL (Block production deployment)

1. **Move in-memory state to Redis** — SMS codes, login attempts, token blacklist, rate limits
2. **Fix CORS default** — reject if FRONTEND_URL not set, never default to `'*'`
3. **Add missing RBAC guards** — emergency-access validate/revoke, messaging, notifications
4. **Fix Apple OAuth** — verify JWT signature against Apple's public keys, not just decode
5. **Wire frontend to backend** — connect the 57 disconnected pages to real API calls using existing useApi/useMutation hooks

### P1 — HIGH (First 2 weeks)

6. **Implement Bull queue + cron jobs** — billing cycles, medication reminders, alert aggregation, report generation
7. **Add sitemap.ts and robots.ts** — enable search engine indexing
8. **Add per-page metadata** — unique title/description/OG for every public page
9. **Replace mock data in backend services** — analytics, patients.getAppointments(), AI mock endpoints
10. **Add loading/error/empty states** to all frontend pages
11. **Extract 40+ inline DTOs** to separate files
12. **Add missing endpoints** — vitals UPDATE, InfluxDB controller, medications DELETE
13. **Enable TypeScript + ESLint** in Next.js builds

### P2 — MEDIUM (Month 1)

14. **Implement global pagination interceptor**
15. **Add transactional safety** to multi-step operations (Prisma transactions)
16. **Add structured logging** (Winston/Pino with JSON format + correlation IDs)
17. **Integrate Sentry** for error tracking
18. **Add health checks** for Redis, InfluxDB, external APIs
19. **Add database indexes** on high-query columns
20. **Implement business logic** — duplicate vital prevention, appointment overlap detection, medication-allergy checks
21. **Add token refresh interceptor** on frontend (auto-refresh on 401)

### P3 — POLISH (Month 2-3)

22. **Write unit tests** — target 60%+ coverage on backend services
23. **Write E2E tests** — auth flows, billing flows, device webhook processing
24. **Frontend component tests** — critical user flows
25. **Implement key rotation** for ENCRYPTION_KEY
26. **Add dynamic OG images** for marketing pages
27. **Add JSON-LD structured data** (Organization, MedicalBusiness, Product)
28. **Database replication** — PostgreSQL read replicas
29. **Redis Sentinel/Cluster** for HA
30. **CI/CD pipeline** with test gates

---

## 9. WHAT'S WORKING WELL

Despite the gaps, several areas demonstrate strong engineering:

- **Auth system** — JWT + refresh + OAuth + MFA + emergency access + lockout + password history is enterprise-grade
- **Tenovi integration** — webhook signature validation, measurement processing, device lifecycle is production-ready
- **Billing / CPT codes** — proper eligibility validation per CPT code with Stripe integration
- **Audit logging** — comprehensive HIPAA-ready audit trail with 6-year retention
- **PHI encryption** — AES-256-GCM with PBKDF2 key derivation is bank-grade
- **Docker/deployment** — multi-stage builds, non-root users, health checks, rolling updates
- **Nginx security** — HSTS, CSP, rate limiting, proper TLS configuration
- **Architecture** — clean module separation, proper NestJS patterns, well-organized frontend

---

## 10. BOTTOM LINE

VytalWatch has the **skeleton of a best-in-class RPM platform** — the architecture, module design, security foundations, and integration patterns are genuinely strong. But the platform is currently a **high-fidelity prototype**, not production software. The frontend is 94% disconnected from the backend. Critical security state lives in-memory. There are zero meaningful tests. No cron jobs automate the billing, alerting, or reporting workflows that make RPM sustainable.

**To ship:** Fix the 5 P0 security items, wire the frontend to the backend, add Redis state management, and implement the core cron jobs. That's approximately 4-6 weeks of focused engineering work to reach a production-viable state.

**To be best-in-market:** Layer on comprehensive testing, structured observability, SEO, and the business logic refinements in P2/P3. That's an additional 6-8 weeks.

---

*Assessment conducted via automated code analysis of all source files across the full monorepo.*
