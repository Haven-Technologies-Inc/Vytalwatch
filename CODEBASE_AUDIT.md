# VytalWatch Codebase Audit Report

**Date:** March 5, 2026
**Scope:** Full-stack production readiness assessment

---

## EXECUTIVE SUMMARY

**Overall Production Readiness: ~35%**

The application has a solid architectural foundation (NestJS + Next.js + PostgreSQL + Redis) and comprehensive type definitions, but **25 of 39 backend modules are disabled**, most frontend admin pages use **hardcoded mock data**, critical integrations are **stubs only**, and there are significant **security, HIPAA, and scalability gaps**.

---

## 1. BACKEND MODULE STATUS

### 1.1 Enabled Modules (8 of 39)
| Module | Status | Notes |
|--------|--------|-------|
| AuthModule | ✅ Active | JWT + refresh tokens working |
| UsersModule | ✅ Active | Basic CRUD |
| AuditModule | ✅ Active | Logging events |
| AIModule | ✅ Active | OpenAI/Grok initialized |
| OrganizationsModule | ✅ Active | Basic CRUD, some try-catch wraps |
| AnalyticsModule | ✅ Active | Hardcoded fallback data |
| AdminModule | ✅ Active | API keys, settings (in-memory) |
| HealthModule | ✅ Active | Basic health check |

### 1.2 DISABLED Modules (31 — ALL commented out in app.module.ts)
| Module | Impact |
|--------|--------|
| **VitalsModule** | ❌ CRITICAL — Core RPM feature, no vital signs processing |
| **AlertsModule** | ❌ CRITICAL — No alert generation/management |
| **DevicesModule** | ❌ CRITICAL — No device management |
| **PatientsModule** | ❌ CRITICAL — No patient CRUD |
| **BillingModule** | ❌ HIGH — No Stripe billing, subscriptions, invoices |
| **NotificationsModule** | ❌ HIGH — No push/email/SMS notifications |
| **IntegrationsModule** | ❌ HIGH — No Stripe/Plaid/Zoho/Twilio endpoints |
| **StaffModule** | ❌ HIGH — No staff roles/permissions |
| **MessagingModule** | ❌ MEDIUM — No provider-patient messaging |
| **ReportsModule** | ❌ MEDIUM — No report generation |
| **AppointmentsModule** | ❌ MEDIUM — No scheduling |
| **MedicationsModule** | ❌ MEDIUM — No medication tracking |
| **ClinicalNotesModule** | ❌ MEDIUM — No SOAP notes |
| **ConsentModule** | ❌ HIGH (HIPAA) — No consent management |
| **ComplianceModule** | ❌ HIGH (HIPAA) — No compliance tracking |
| **EnrollmentsModule** | ❌ MEDIUM — No RPM enrollment workflow |
| **ClaimsModule** | ❌ MEDIUM — No claims/billing codes |
| **TasksModule** | ❌ MEDIUM — No task management |
| **TimeTrackingModule** | ❌ MEDIUM — No RPM time tracking |
| **ThresholdPoliciesModule** | ❌ MEDIUM — No alert thresholds |
| **AIDraftsModule** | ❌ LOW — No AI draft notes |
| **EmailModule** | ❌ HIGH — No actual email sending |
| **SmsModule** | ❌ HIGH — No actual SMS sending |
| **WebRTCModule** | ❌ LOW — No video calls |
| **WebSocketModule** | ❌ MEDIUM — No real-time updates |
| **EnterpriseLoggingModule** | ❌ MEDIUM — No structured API logging |
| **SchedulerModule** | ❌ MEDIUM — No cron jobs |
| **RPMBatchModule** | ❌ LOW — No batch processing |

---

## 2. API ENDPOINT GAPS

### 2.1 Frontend Calls → Missing Backend Endpoints
The frontend `services/api/index.ts` defines API calls for **all** modules, but since 31 modules are disabled, the following endpoints return **404**:

| Frontend API Service | Endpoint Prefix | Backend Status |
|---------------------|-----------------|----------------|
| `vitalsApi` | `/vitals/*` | ❌ Module disabled |
| `alertsApi` | `/alerts/*` | ❌ Module disabled |
| `devicesApi` | `/devices/*` | ❌ Module disabled |
| `patientsApi` | `/patients/*` | ❌ Module disabled |
| `billingApi` | `/billing/*` | ❌ Module disabled |
| `notificationsApi` | `/notifications/*` | ❌ Module disabled |
| `integrationsApi` | `/integrations/*` | ❌ Module disabled |
| `messagingApi` | `/messages/*` | ❌ Module disabled |
| `reportsApi` | `/reports/*` | ❌ Module disabled |
| `staffApi` | `/staff/*` | ❌ Module disabled |
| `clinicalNotesApi` | `/clinical-notes/*` | ❌ Module disabled |
| `consentsApi` | `/consents/*` | ❌ Module disabled |
| `tasksApi` | `/tasks/*` | ❌ Module disabled |
| `timeTrackingApi` | `/time/*` | ❌ Module disabled |
| `enrollmentsApi` | `/enrollments/*` | ❌ Module disabled |
| `claimsApi` | `/claims/*` | ❌ Module disabled |
| `tenoviApi` | `/tenovi/*` | ❌ Module disabled |

### 2.2 Active Endpoint Issues
| Endpoint | Issue |
|----------|-------|
| `/admin/settings` | ⚠️ Settings stored in-memory Map, lost on restart |
| `/admin/logs` | ⚠️ Returns empty array — no real logging backend |
| `/admin/usage` | ⚠️ Returns hardcoded mock data |
| `/admin/health/services` | ⚠️ Returns hardcoded "healthy" — no real checks |
| `/admin/cache/stats` | ⚠️ Returns hardcoded values |
| `/analytics/system` | ⚠️ Wrapped in try-catch returning fallback data |
| `/ai/models` | ⚠️ Returns hardcoded model list, not from DB |
| `/ai/train` | ⚠️ Returns mock job ID, no actual training |
| `/organizations` | ⚠️ Entity mismatch with Prisma schema was fixed |

---

## 3. FRONTEND PAGE AUDIT

### 3.1 Admin Pages
| Page | Status | Issues |
|------|--------|--------|
| **Dashboard** | ⚠️ Partial | Calls multiple disabled endpoints; shows errors on load |
| **API Keys** | ⚠️ Basic | Missing: scopes UI, rate limit config, IP whitelist, environment labels, usage charts, key rotation confirmation |
| **AI Management** | ❌ Mock | Hardcoded model list; no real model config, cost tracking, prompt templates, provider switching |
| **Integrations** | ❌ Mock | Static integration list; no real config forms, health checks, webhook management, connection testing UI |
| **Settings** | ⚠️ Basic | Missing: HIPAA compliance settings, password policy, session management, IP restrictions, data retention, branding, backup scheduling |
| **Organizations** | ⚠️ Partial | Has create/edit but missing: departments, NPI validation, subscription management, onboarding flow, multi-tenant isolation |
| **Users** | ⚠️ Basic | Has list/edit/invite but missing: bulk operations, role hierarchy, permission matrix, activity timeline |
| **Analytics** | ⚠️ Basic | Calls disabled analytics endpoints |
| **Billing** | ❌ Stub | Points to disabled BillingModule |
| **Reports** | ❌ Stub | Points to disabled ReportsModule |
| **Audit Logs** | ⚠️ Basic | Functional but limited filtering |
| **Security** | ⚠️ Basic | Limited to toggle switches, no real enforcement |
| **Devices** | ❌ Stub | Points to disabled DevicesModule |
| **Gateways** | ❌ Stub | Points to disabled Tenovi module |

### 3.2 Provider Pages
| Page | Status | Issues |
|------|--------|--------|
| Dashboard | ❌ Calls disabled endpoints | Vitals, alerts, patients all 404 |
| Patients | ❌ PatientsModule disabled | No patient list/detail |
| Alerts | ❌ AlertsModule disabled | No alert management |
| Devices | ❌ DevicesModule disabled | No device overview |
| Messages | ❌ MessagingModule disabled | No messaging |
| Analytics | ❌ Mostly mock | Limited data |
| Schedule | ❌ AppointmentsModule disabled | No scheduling |
| Billing | ❌ BillingModule disabled | No billing |
| RPM | ❌ Multiple modules disabled | No RPM workflow |

### 3.3 Patient Pages
| Page | Status | Issues |
|------|--------|--------|
| Dashboard | ❌ Calls disabled endpoints | No vitals display |
| Vitals | ❌ VitalsModule disabled | No readings |
| Devices | ❌ DevicesModule disabled | No device status |
| Medications | ❌ MedicationsModule disabled | No medication tracking |
| Messages | ❌ MessagingModule disabled | No messaging |
| Appointments | ❌ AppointmentsModule disabled | No scheduling |
| Education | ⚠️ Static content | May work standalone |

---

## 4. INTEGRATION STATUS

### 4.1 Stripe (Payment Processing)
- **Backend:** BillingModule exists with entities (Subscription, Invoice, BillingRecord) but is **disabled**
- **Frontend:** Full billing API client defined but all calls return 404
- **Prisma:** Subscription model with stripeCustomerId exists
- **Status:** ❌ NOT FUNCTIONAL — Module disabled, no Stripe SDK calls
- **Missing:** Webhook handler validation, checkout flow, subscription lifecycle

### 4.2 Plaid (Banking)
- **Backend:** ❌ NO Plaid module or service exists anywhere
- **Frontend:** ❌ No Plaid API calls defined
- **Status:** ❌ NOT IMPLEMENTED

### 4.3 OpenAI
- **Backend:** ✅ AIService initializes OpenAI client with API key from config
- **Real calls:** ✅ `getCompletion()` makes actual OpenAI API calls
- **Fallback:** ✅ Falls back to Grok, then to rule-based defaults
- **Status:** ⚠️ PARTIALLY FUNCTIONAL — Works if API key is set
- **Missing:** Cost tracking, token usage monitoring, rate limiting per user, prompt management UI

### 4.4 Grok AI
- **Backend:** ✅ AIService initializes Grok client (OpenAI-compatible API)
- **Real calls:** ✅ Used as fallback when OpenAI unavailable
- **Status:** ⚠️ PARTIALLY FUNCTIONAL — Works if API key + base URL set
- **Missing:** Same as OpenAI — no cost tracking or management UI

### 4.5 Zoho SMTP
- **Backend:** IntegrationsService has `sendZohoEmail()` but it's a **stub** (returns mock messageId)
- **EmailModule:** Exists but is **disabled**
- **Status:** ❌ NOT FUNCTIONAL — No actual nodemailer/SMTP implementation
- **Missing:** Real SMTP transport, template engine, bounce handling

### 4.6 Twilio
- **Backend:** IntegrationsService has `sendTwilioSms()` — **stub only**
- **SmsModule:** Exists but is **disabled**
- **Status:** ❌ NOT FUNCTIONAL — No Twilio SDK calls

### 4.7 Tenovi (Medical Devices)
- **Backend:** IntegrationsService has real Tenovi API calls using axios
- **Dedicated Module:** Full TenoviModule exists but module loading is **disabled**
- **Status:** ⚠️ PARTIAL — Direct API calls work in IntegrationsService but module is disabled

---

## 5. SECURITY & HIPAA AUDIT

### 5.1 Authentication ✅ Partial
- JWT with access/refresh tokens ✅
- Password hashing with bcrypt ✅
- Rate limiting on login (AuthSecurityService) ✅
- Account lockout ✅
- Token refresh with concurrent request handling ✅
- **Missing:** MFA is defined but not enforced, no FIDO2/WebAuthn

### 5.2 Authorization ⚠️ Gaps
- Role-based guards (JwtAuthGuard, RolesGuard) ✅
- 4 roles: patient, provider, admin, superadmin ✅
- **Issue:** Many controllers use only `@Roles(UserRole.ADMIN)` without `UserRole.SUPERADMIN`
- **Issue:** IntegrationsController lacks SUPERADMIN role on all endpoints
- StaffModule has granular PermissionsGuard ✅ but is **disabled**
- **Missing:** Resource-level authorization (user can only access their own data)

### 5.3 HIPAA Compliance ❌ Critical Gaps
| Requirement | Status |
|------------|--------|
| Audit logging | ⚠️ AuditService exists, logs events, but AuditLog not queryable by compliance |
| Data encryption at rest | ❌ No column-level encryption for PHI |
| Data encryption in transit | ✅ HTTPS (when deployed) |
| Access controls | ⚠️ Basic RBAC, no resource-level |
| Consent management | ❌ ConsentModule disabled |
| BAA tracking | ❌ Not implemented |
| Data retention policies | ❌ Not enforced |
| Breach notification | ❌ Not implemented |
| Minimum necessary access | ❌ No field-level access control |
| Patient data export (Right of Access) | ❌ Not implemented |
| Session management | ⚠️ SessionTimeoutGuard exists but not enforced |
| ComplianceModule | ❌ Disabled |

### 5.4 Infrastructure Security
- Helmet with CSP ✅
- CORS configured ✅
- Input sanitization middleware ✅
- Rate limiting (ThrottlerModule) ✅
- **Missing:** WAF rules, DDoS protection config, API key authentication middleware

### 5.5 Middleware (Frontend)
- **Critical Issue:** `middleware.ts` does NOTHING — passes all requests through
- Auth is purely client-side via zustand/localStorage
- **Risk:** Any authenticated route is accessible by directly navigating to the URL

---

## 6. DATABASE & SCHEMA

### 6.1 Prisma Schema
- Well-structured with 25+ models
- Proper relations, indexes, and enums
- Snake_case mapping with `@@map` directives ✅

### 6.2 TypeORM Entity Mismatches
- `Organization` entity was rewritten to match Prisma (fixed)
- `ApiKey` entity column names were fixed to match snake_case
- **Risk:** TypeORM entities and Prisma schema can drift — no automated sync

### 6.3 Missing Database Features
- No database migrations checked in (only 1 file in migrations/)
- No seed data scripts
- No connection pooling configuration (PgBouncer)
- No read replicas for scalability
- SystemSettings stored in **in-memory Map** — lost on restart

---

## 7. SCALABILITY (Target: 100,000 concurrent users)

### 7.1 Current Bottlenecks
| Area | Issue | Impact |
|------|-------|--------|
| Settings | In-memory Map | Lost on restart, not shared across instances |
| Maintenance mode | In-memory variable | Not shared across instances |
| AI models | Hardcoded array | Not scalable |
| WebSocket | Module disabled | No real-time updates |
| Job queue | Bull configured but no jobs defined | No async processing |
| Database | No connection pool tuning | Will exhaust connections |
| Redis | Configured but barely used | Not leveraged for caching |
| Session | No Redis session store | Can't scale horizontally |

### 7.2 Missing for 100K Users
- Horizontal scaling strategy (no stateless design — in-memory state)
- Load balancer configuration
- Database read replicas
- CDN for static assets
- Message queue for async operations (Bull exists but unused)
- Connection pooling (PgBouncer)
- Monitoring/alerting (no Prometheus/Grafana)

---

## 8. SEO AUDIT (Frontend)

- `robots.ts` ✅ exists
- `sitemap.ts` ✅ exists
- `opengraph-image.tsx` ✅ exists
- Metadata in `layout.tsx` ✅
- **Missing:** Structured data (JSON-LD), dynamic meta tags per page, canonical URLs, performance optimization (Core Web Vitals)

---

## 9. PRIORITY ACTION ITEMS

### P0 — Blocking Production Launch
1. **Enable core modules:** VitalsModule, AlertsModule, DevicesModule, PatientsModule, BillingModule
2. **Enable StaffModule** for roles/permissions
3. **Enable IntegrationsModule** and fix SUPERADMIN role access
4. **Implement real Zoho SMTP** email sending (replace stubs)
5. **Move system settings to database** (not in-memory)
6. **Enable ConsentModule + ComplianceModule** for HIPAA
7. **Add PHI encryption** at column level
8. **Fix frontend middleware** — add server-side auth checks

### P1 — Required for Production
9. **Enable NotificationsModule** for alerts/emails
10. **Enable MessagingModule** for provider-patient communication
11. **Implement real Stripe billing** with webhooks
12. **Implement Plaid integration** (currently missing entirely)
13. **Add database migrations** workflow
14. **Rebuild admin pages:** API Keys, AI Management, Integrations, Settings with real functionality
15. **Add resource-level authorization** (users can only access own data)
16. **Replace all hardcoded mock data** in AdminService

### P2 — Important for Quality
17. Enable ReportsModule, AppointmentsModule, MedicationsModule
18. Enable ClinicalNotesModule, TasksModule, TimeTrackingModule
19. Add WebSocket for real-time vitals/alerts
20. Implement monitoring (Prometheus + Grafana)
21. Add E2E tests
22. Database connection pooling
23. Redis caching strategy

### P3 — Nice to Have
24. WebRTC video calls
25. AI draft notes
26. RPM batch processing
27. Advanced analytics dashboards

---

## 10. FILE REFERENCE

**Key backend files:**
- `app.module.ts` — 31 modules commented out
- `admin/admin.service.ts` — In-memory settings, mock data
- `ai/ai.service.ts` — Real OpenAI/Grok but mock model management
- `integrations/integrations.service.ts` — Stubs for email/SMS
- `staff/staff.controller.ts` — Full RBAC but module disabled

**Key frontend files:**
- `services/api/index.ts` — 1269 lines of API calls, most to disabled endpoints
- `middleware.ts` — Does nothing (passes all requests)
- `admin/api-keys/page.tsx` — Basic, needs production features
- `admin/ai/page.tsx` — Mock data display
- `admin/integrations/page.tsx` — Static integration cards
- `admin/settings/page.tsx` — Basic tabs, no real enforcement
- `admin/organizations/page.tsx` — Basic CRUD, needs advanced features
