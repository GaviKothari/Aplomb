# APLOMB — Technical Architecture Brief
## Complete System Design for Property Valuation Management Platform

**Version:** 1.0  
**Date:** June 2026  
**Audience:** CTO, Lead Engineers, DevOps Team

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │  Web Browser │  │ Mobile PWA   │  │  Bank Integration Portal │   │
│  │  (Next.js)   │  │ (Engineer)   │  │  (Read-only, API keys)   │   │
│  └──────┬───────┘  └──────┬───────┘  └─────────────┬────────────┘   │
└─────────┼────────────────┼───────────────────────────┼───────────────┘
          │                │                           │
          ▼                ▼                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CDN LAYER (Vercel Edge / CloudFront)           │
│   Static assets │ API edge caching │ Geo-based routing              │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   NEXT.JS FRONTEND (Vercel)                         │
│  App Router │ Server Components │ Client Components │ API Routes    │
│  Auth: Clerk │ Forms: RHF + Zod │ State: React Query │ Realtime: WS│
└─────────────────────────────────────────────────────────────────────┘
          │  HTTP/REST + WebSocket
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  NESTJS BACKEND (AWS ECS Fargate)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  REST API    │  │  WebSocket   │  │   BullMQ Worker           │  │
│  │  (Guards,    │  │  Gateway     │  │   (PDF, AI, Notif,        │  │
│  │  Pipes, RBAC)│  │  (Socket.IO) │  │    Bulk Import)           │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────┬──────────────────────────────────────────────────────────┘
          │
    ┌─────┴──────────────────────────────────────┐
    │                                             │
    ▼                                             ▼
┌──────────────────┐                   ┌───────────────────────────┐
│  PostgreSQL       │                   │   REDIS                   │
│  (AWS RDS)        │                   │   ├── BullMQ Queues       │
│  Primary + 1      │                   │   ├── Session Cache       │
│  Read Replica     │                   │   ├── Rate Limiting       │
│  Prisma ORM       │                   │   └── Real-time Pub/Sub   │
└──────────────────┘                   └───────────────────────────┘
          │
    ┌─────┴─────────────────────────────────────────────────────────┐
    │                  EXTERNAL SERVICES                             │
    │  AWS S3 │ OpenAI │ Whisper │ Google Maps │ Firebase FCM       │
    │  AWS SES │ Twilio/MSG91 │ Sentry │ Puppeteer (PDF)            │
    └───────────────────────────────────────────────────────────────┘
```

---

## 2. FRONTEND ARCHITECTURE

### 2.1 Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 15 App Router | SSR/SSG/ISR hybrid, edge-ready |
| Language | TypeScript 5.7 | Type safety, better DX |
| Styling | Tailwind CSS 4 + OkLch | Perceptual color, utility-first |
| UI Kit | shadcn/ui (Radix) | Accessible, customizable |
| Forms | React Hook Form + Zod | Performance, type-safe validation |
| Data Fetching | React Query (TanStack) | Cache, background refetch, optimistic updates |
| Realtime | Socket.IO Client | Bi-directional events |
| Tables | TanStack Table v8 | Headless, virtualized for large datasets |
| Charts | Recharts | Composable, React-native |
| Maps | Google Maps React | Property location, engineer tracking |
| Animation | Framer Motion | Page transitions, micro-interactions |
| Auth | Clerk | Social auth, MFA, session management |
| PDF Viewer | react-pdf | View generated valuation reports |
| Mobile Camera | react-webcam | Photo capture for engineers |

### 2.2 Folder Structure (Frontend)

```
/app                          ← Next.js App Router
├── (auth)/                   ← Auth pages (unprotected)
│   ├── sign-in/
│   └── sign-up/
├── (dashboard)/              ← Protected dashboard shell
│   ├── layout.tsx            ← Auth guard + AppLayout wrapper
│   ├── dashboard/page.tsx    ← Role-based dashboard
│   ├── operations/
│   │   ├── cases/
│   │   │   ├── page.tsx      ← Cases list
│   │   │   ├── new/page.tsx  ← Create case
│   │   │   └── [caseId]/     ← Case detail (tabs)
│   │   ├── verification/     ← Split-screen verifier
│   │   ├── case-board/       ← Kanban
│   │   └── reports/          ← Reports list
│   ├── ai-tools/
│   │   ├── reporting-assistant/
│   │   └── insights/
│   ├── engineer/
│   │   ├── punch-in-out/
│   │   ├── travel-expenses/
│   │   └── geofence-attendance/
│   ├── hr-team/
│   │   ├── employees/
│   │   ├── attendance/
│   │   └── travel-expenses/
│   ├── finance/
│   │   ├── billing-invoices/
│   │   └── payroll/
│   ├── management/
│   │   ├── property-transactions/
│   │   ├── mis-dashboard/
│   │   └── demolition-alerts/
│   ├── analytics/
│   └── system/settings/
├── api/                      ← Next.js API Routes (thin proxy)
│   └── [...]/
/components
├── ui/                       ← shadcn primitives
├── layout/                   ← AppLayout, Sidebar, TopNav
├── dashboard/                ← Role-specific dashboards
├── cases/                    ← Case list, filters, kanban
├── case-details/             ← Tabs: Overview, Report, Media, Verification
├── ai-chat/                  ← AI reporting assistant
├── verification/             ← Split-screen verifier
├── attendance/               ← Geofence UI
├── analytics/                ← Charts and metrics
├── forms/                    ← Reusable form sections
└── shared/                   ← Permission gate, role badge, etc.
/context                      ← React contexts (Auth, Notifications)
/hooks                        ← Custom hooks
/lib
├── api/                      ← Typed API client (React Query wrappers)
├── roles.ts                  ← RBAC definitions
├── nav-config.ts             ← Role-filtered navigation
├── geofence.ts               ← Haversine, GPS utils
├── mock-data.ts              ← Dev mock data
└── utils.ts                  ← Shared utilities
/types
└── index.ts                  ← All TypeScript types
```

### 2.3 State Management Strategy

| Concern | Solution |
|---------|---------|
| Server state (API data) | React Query — cache, background refresh, pagination |
| Form state | React Hook Form — local, no global store needed |
| Auth/User state | Clerk + custom AuthContext |
| UI state (modals, drawers) | Local useState |
| Real-time state | Socket.IO with local reducer |
| Notifications | Sonner toast + In-app notification panel |

### 2.4 Performance Strategy

- **Server Components** for data-heavy pages (MIS, analytics, reports list)
- **Client Components** only for interactive UI (forms, kanban, AI chat)
- **Infinite Scroll / Virtualization** for cases list (10k+ rows)
- **ISR** for analytics pages (revalidate: 60 seconds)
- **Optimistic Updates** for status changes, quick actions
- **Code Splitting** — each route lazy-loaded
- **Image Optimization** — Next.js Image with S3/CloudFront CDN

---

## 3. BACKEND ARCHITECTURE

### 3.1 NestJS Module Structure

```
/src
├── main.ts                    ← Bootstrap, global pipes, Swagger
├── app.module.ts              ← Root module
├── config/                    ← Environment config, validation
├── common/
│   ├── guards/                ← JwtAuthGuard, RolesGuard
│   ├── decorators/            ← @Roles(), @CurrentUser()
│   ├── pipes/                 ← ZodValidation, FileType
│   ├── interceptors/          ← AuditLog, ResponseTransform
│   ├── filters/               ← GlobalException
│   └── middleware/            ← RequestLogger, RateLimiter
├── modules/
│   ├── auth/                  ← JWT, refresh, Clerk webhook
│   ├── users/                 ← User CRUD
│   ├── organizations/         ← Bank/client management
│   ├── cases/                 ← Full case lifecycle
│   ├── reports/               ← Report CRUD, versioning
│   ├── verification/          ← Verification workflow
│   ├── media/                 ← S3 upload, AI quality check
│   ├── ai-reporting/          ← OpenAI chat, Whisper, Vision
│   ├── employees/             ← HR employee management
│   ├── attendance/            ← Punch-in/out, geofence
│   ├── leave/                 ← Leave requests and balance
│   ├── travel/                ← Travel logs, expense claims
│   ├── billing/               ← Invoices, payments
│   ├── payroll/               ← Monthly payroll processing
│   ├── demolition/            ← Alert upload and matching
│   ├── notifications/         ← Multi-channel notifications
│   ├── analytics/             ← Aggregated reports and charts
│   ├── mis/                   ← MIS dashboard data
│   └── audit/                 ← Immutable audit trail
├── queues/
│   ├── pdf.processor.ts       ← Puppeteer PDF generation
│   ├── ai.processor.ts        ← AI report generation
│   ├── notification.processor.ts
│   ├── bulk-import.processor.ts
│   └── demolition-match.processor.ts
├── gateways/
│   └── events.gateway.ts      ← Socket.IO gateway
└── prisma/
    └── prisma.service.ts
```

### 3.2 API Design

**Base URL:** `https://api.aplomb.in/v1`

**Auth:** Bearer JWT in Authorization header

#### Cases API
```
GET    /cases                 → List cases (paginated, filtered)
POST   /cases                 → Create single case
POST   /cases/bulk            → Bulk import (multipart CSV/Excel)
GET    /cases/:id             → Case detail
PATCH  /cases/:id             → Update case fields
PATCH  /cases/:id/status      → Update case status
PATCH  /cases/:id/assign      → Assign engineer/verifier
DELETE /cases/:id             → Soft delete (admin only)
GET    /cases/:id/history     → Status history
GET    /cases/:id/media       → Media files
GET    /cases/:id/documents   → Documents
GET    /cases/nearby          → Nearby cases by GPS
```

#### Reports API
```
GET    /reports               → List reports
POST   /reports               → Create report (from AI session)
GET    /reports/:id           → Report detail with all fields
PATCH  /reports/:id           → Update report fields
POST   /reports/:id/submit    → Submit for verification
POST   /reports/:id/finalize  → Finalize approved report
POST   /reports/:id/pdf       → Trigger PDF generation
GET    /reports/:id/pdf       → Download PDF
GET    /reports/:id/versions  → Revision history
```

#### AI Reporting API
```
POST   /ai/sessions           → Start AI chat session
GET    /ai/sessions/:id       → Session + messages
POST   /ai/sessions/:id/message → Send message (text)
POST   /ai/sessions/:id/voice → Send voice (multipart audio)
POST   /ai/sessions/:id/complete → Generate report from session
GET    /ai/sessions/:id/report → Preview generated report
POST   /ai/analyze-photo      → Photo quality analysis
```

#### Verification API
```
GET    /verification          → Verification queue
GET    /verification/:id      → Verification detail
POST   /verification/:caseId  → Start verification
PATCH  /verification/:id/fields/:fieldKey → Update field verdict
POST   /verification/:id/approve → Approve
POST   /verification/:id/reject  → Reject
POST   /verification/:id/request-revision → Request changes
POST   /verification/:id/comments → Add comment
```

#### Employees API
```
GET    /employees             → Employee list
POST   /employees             → Create employee
GET    /employees/:id         → Employee detail
PATCH  /employees/:id         → Update employee
POST   /employees/:id/documents → Upload KYC document
GET    /employees/:id/attendance → Attendance records
GET    /employees/:id/payroll → Payroll history
```

#### Attendance API
```
GET    /attendance            → Attendance records (admin/hr view)
POST   /attendance/punch-in   → Punch in (with GPS)
POST   /attendance/punch-out  → Punch out (with GPS)
GET    /attendance/today      → Today's record for current user
PATCH  /attendance/:id        → Override (admin/hr)
```

#### Analytics & MIS API
```
GET    /analytics/overview    → KPI summary
GET    /analytics/cases       → Case trends (date range, bank)
GET    /analytics/engineers   → Engineer performance
GET    /analytics/revenue     → Revenue and TAT
GET    /mis/snapshot          → Real-time MIS dashboard data
GET    /mis/bank-wise         → Bank-wise case breakdown
```

### 3.3 Authentication Flow

```
1. User signs in via Clerk (email/password or Google)
2. Clerk issues JWT
3. Frontend sends JWT to backend via Authorization header
4. Backend JwtAuthGuard validates token with Clerk JWKS
5. User role loaded from database (not just JWT claim)
6. RolesGuard checks permission against RBAC config
7. Request proceeds or returns 403
8. Audit middleware logs every write operation
```

### 3.4 Queue Architecture (BullMQ + Redis)

```
Queues:
├── pdf-generation            → Priority: NORMAL, retries: 3
│   └── Puppeteer renders report PDFs in headless browser
├── ai-report                 → Priority: HIGH, retries: 2
│   └── OpenAI GPT for report field generation
├── notifications             → Priority: HIGH, retries: 5
│   └── Email (SES), SMS (MSG91), Push (FCM)
├── bulk-import               → Priority: LOW, retries: 1
│   └── Parse Excel/CSV, create cases with dedup
├── demolition-match          → Priority: NORMAL, retries: 2
│   └── Match new cases/demolition lists against each other
├── attendance-auto-mark      → Cron: 11:59 PM daily
│   └── Auto-mark absent for no punch-in
└── payroll-calculate         → Manual trigger (accounts)
    └── Calculate monthly payroll for all employees
```

### 3.5 WebSocket Events

```
Server → Client:
  case:status_changed         { caseId, fromStatus, toStatus, changedBy }
  case:assigned               { caseId, engineerId, coordinatorId }
  report:submitted            { caseId, reportId }
  report:approved/rejected    { caseId, reportId, decision }
  notification:new            { notification object }
  mis:updated                 { snapshot }   ← broadcast every 30s

Client → Server:
  subscribe:case              { caseId }     ← join case room
  subscribe:dashboard         { role }       ← join role room
  typing:ai-chat              { sessionId }
```

---

## 4. DATABASE ARCHITECTURE

### 4.1 Schema Summary

The full Prisma schema is at `/prisma/schema.prisma`. Key design decisions:

| Decision | Rationale |
|----------|-----------|
| UUID via `cuid()` | Short, URL-safe, sortable, no collision risk |
| Soft deletes via `isActive` | Preserves audit trail |
| JSON columns for AI output | Flexible, no schema churn for AI fields |
| Encrypted PII fields | Aadhaar, PAN, bank details encrypted at application layer |
| Separate status history table | Immutable timeline of every case state change |
| Report versioning via self-reference | `parentReportId` links revisions to originals |
| Pre-computed MIS snapshots | Avoid expensive aggregations on real-time dashboard |
| GeoJSON for route data | Standard format for map rendering |

### 4.2 Entity Relationship Summary

```
Organization (Bank)
    │
    ├──── RateCard (per property type)
    ├──── Invoice
    │         └── InvoiceLineItem → Case
    └──── Case (many)
              │
              ├── CaseStatusHistory (immutable log)
              ├── CaseDocument
              ├── CaseMedia (photos/videos + AI analysis)
              ├── SiteVisitLog (GPS, timing)
              ├── Report
              │     ├── ReportField (structured fields)
              │     ├── Verification
              │     │     ├── VerificationField (field-level)
              │     │     └── VerificationComment
              │     └── AiChatSession (source AI chat)
              ├── TravelLog (GPS route)
              ├── DemolitionAlert (matches)
              └── AuditLog

Employee
    ├── User (1:1)
    ├── AttendanceRecord (daily)
    ├── LeaveBalance (annual)
    ├── LeaveRequest
    ├── TravelExpense
    ├── TravelLog → Case
    └── PayrollEntry
          └── PayrollDeduction
```

### 4.3 Performance Indexes

Critical indexes for production queries:

```sql
-- Most queried: cases list with filters
CREATE INDEX idx_cases_status_org ON cases(status, organization_id);
CREATE INDEX idx_cases_engineer_status ON cases(engineer_id, status);
CREATE INDEX idx_cases_created_at ON cases(created_at DESC);
CREATE INDEX idx_cases_pincode ON cases(property_pincode);

-- Full text search for cases
CREATE INDEX idx_cases_fts ON cases USING gin(
  to_tsvector('english', property_address || ' ' || owner_name)
);

-- Attendance queries
CREATE INDEX idx_attendance_employee_date ON attendance_records(employee_id, date DESC);

-- Audit log queries (by entity)
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- Demolition matching
CREATE INDEX idx_demolition_pincode ON demolition_properties(pincode);
```

---

## 5. AI ARCHITECTURE

### 5.1 AI Reporting Pipeline

```
Engineer opens AI Assistant
        │
        ▼
[New AiChatSession created]
        │
        ▼
System Prompt injected:
  - Case context (property type, address, bank)
  - Question flow template
  - Language preference
  - Output schema (JSON)
        │
        ▼
Engineer responds (TEXT or VOICE)
        │
     [VOICE]──────────────────────┐
        │                         ▼
        │                  Whisper API
        │                  (transcription)
        │                  Noise removal filter
        │                  Language detection
        │                         │
        └─────────────────────────┘
        │
        ▼
GPT-4o processes:
  1. Interprets Hindi/Hinglish/English
  2. Asks follow-up if unclear
  3. Builds structured field values
  4. Returns next question or completion
        │
        ▼
[Session COMPLETE trigger]
        │
        ▼
Final GPT-4o call:
  - All collected answers → structured JSON
  - Professional English transformation
  - Valuation computation
  - Missing field detection
        │
        ▼
Report auto-populated
  ├── ReportField rows created
  ├── AI confidence score stored
  └── Human review flags for low-confidence fields
```

### 5.2 Photo Intelligence Pipeline

```
Engineer uploads photo
        │
        ▼
S3 upload (pre-signed URL)
        │
        ▼
BullMQ: ai-photo-analysis job
        │
        ▼
GPT-4 Vision analysis:
  - Blur/quality score (0-100)
  - Duplicate detection (perceptual hash)
  - Required angle check
  - Construction stage detection
  - Anomaly detection
        │
        ▼
Results stored in CaseMedia.aiAnalysis
        │
        ├── Quality < 40 → Flag for re-upload
        ├── Duplicate detected → Alert engineer
        └── Required angles missing → Prompt list
```

### 5.3 AI Insights Engine

Runs nightly via BullMQ cron:
- Market trend analysis (rate per sqft by locality)
- Valuation anomaly detection (Z-score vs. locality median)
- Engineer productivity patterns
- TAT prediction for new cases
- Risk scoring for demolition-adjacent properties

### 5.4 AI Cost Controls

| Control | Mechanism |
|---------|-----------|
| Token budget per session | Max 8,000 tokens per AI chat session |
| Photo analysis throttle | Max 20 photos per case per day |
| Insights runs | Nightly batch, not per-request |
| Model selection | GPT-4o-mini for simple Q&A, GPT-4o for final report |
| Caching | Cache identical property type templates for 24h |

---

## 6. SECURITY MODEL

### 6.1 Authentication

- **Provider:** Clerk (OIDC compliant)
- **Tokens:** JWT, 15-minute expiry, RS256 signed
- **Refresh:** 7-day refresh token with rotation
- **MFA:** TOTP (optional, enforced for Admin)
- **Session:** Revocable via Clerk dashboard

### 6.2 Authorization (RBAC)

```
Role            Modules Accessible
──────────────────────────────────────────────────────────────
ADMIN           All modules, all data, all actions
COORDINATOR     Cases (CRUD), Verification (view), MIS, Employees (view)
ENGINEER        Own assigned cases only, AI tools, Attendance, Travel
VERIFIER        Verification queue, Reports (read), Cases (read)
HR              Employees (CRUD), Attendance, Leave, Documents
ACCOUNTS        Billing, Invoices, Payroll, Travel expenses (approve)
```

All RBAC is enforced at the API layer via `RolesGuard`. The frontend merely hides navigation — the backend always re-validates.

### 6.3 Data Security

| Data Category | Protection |
|---------------|------------|
| Aadhaar numbers | AES-256-GCM encrypted in DB, masked in API responses |
| PAN numbers | AES-256-GCM encrypted, last 4 chars shown only |
| Bank account details | AES-256-GCM encrypted |
| Photos/Documents | S3 private bucket, access via pre-signed URLs (expiry: 1 hour) |
| API keys (OpenAI, etc.) | AWS Secrets Manager, not in code |
| Database passwords | AWS RDS IAM auth or Secrets Manager |

### 6.4 API Security

- **Rate Limiting:** 100 requests/minute per user (Redis-based)
- **Auth endpoints:** 10 requests/minute per IP
- **File uploads:** 50MB max per request, mime-type validation
- **SQL Injection:** Prisma parameterized queries (no raw SQL)
- **XSS:** Content Security Policy headers, input sanitization
- **CORS:** Whitelist of known origins only
- **HTTPS:** TLS 1.3 enforced, HSTS with preload

### 6.5 Audit Trail

Every write operation triggers `AuditLog` creation via NestJS interceptor:
- Actor (userId)
- Action (CREATE, UPDATE, STATUS_CHANGE, etc.)
- Entity (type + ID)
- Before/after values (JSON diff)
- IP address + User agent
- Timestamp

Audit logs are **append-only**. No `UPDATE` or `DELETE` on `audit_logs` table. Postgres row-level security enforces this.

---

## 7. DEPLOYMENT ARCHITECTURE

### 7.1 Infrastructure Diagram

```
AWS ap-south-1 (Mumbai — India data residency)

┌────────────────────────────────────────────────────────────────┐
│  VPC (10.0.0.0/16)                                             │
│                                                                │
│  ┌──────────────┐   ┌──────────────────────────────────────┐   │
│  │Public Subnets│   │ Private Subnets                      │   │
│  │              │   │                                      │   │
│  │  ALB         │   │  ECS Fargate Cluster                 │   │
│  │  (HTTPS/WSS) │──▶│  ├── nestjs-api  (2-10 tasks)       │   │
│  │              │   │  ├── nestjs-worker (1-5 tasks)       │   │
│  └──────────────┘   │  └── puppeteer-pdf (1-3 tasks)       │   │
│                     │                                      │   │
│                     │  RDS PostgreSQL (Multi-AZ)           │   │
│                     │  ├── Primary (writes)                │   │
│                     │  └── Read Replica (analytics reads)  │   │
│                     │                                      │   │
│                     │  ElastiCache Redis (cluster mode)    │   │
│                     │  ├── BullMQ queues                   │   │
│                     │  └── App cache + rate limiting       │   │
│                     │                                      │   │
│                     │  S3 Bucket (private)                 │   │
│                     │  └── CloudFront CDN (PDFs, media)    │   │
│                     └──────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘

Vercel (Frontend)
  ├── Next.js deployed on Vercel Edge Network
  ├── Custom domain: app.aplomb.in
  └── API proxy to ALB backend
```

### 7.2 Service Configuration

| Service | Spec | Cost (est.) |
|---------|------|-------------|
| ECS Fargate (API) | 0.5 vCPU, 1GB RAM × 2 tasks, autoscale to 10 | ~$80/mo |
| ECS Fargate (Worker) | 1 vCPU, 2GB RAM × 2 tasks | ~$80/mo |
| RDS PostgreSQL (db.t3.medium) | 2 vCPU, 4GB RAM, 100GB gp3 | ~$100/mo |
| ElastiCache Redis (cache.t3.micro) | 2 shards | ~$40/mo |
| S3 + CloudFront | 100GB storage + transfer | ~$20/mo |
| Vercel Pro | Frontend + CDN | ~$20/mo |
| AWS ALB | Load balancer | ~$20/mo |
| Sentry | Error tracking | ~$26/mo (team) |
| OpenAI API | GPT-4o (~5000 reports/mo) | ~$150/mo |
| **Total** | | **~$536/mo** |

### 7.3 CI/CD Pipeline

```
Developer push to feature branch
        │
        ▼
GitHub Actions:
  1. Lint (ESLint, Prettier)
  2. Type check (tsc --noEmit)
  3. Unit tests (Jest/Vitest)
  4. Build (next build + nest build)
        │
        ▼
PR to main → Integration tests + Preview deploy (Vercel)
        │
        ▼
Merge to main:
  Frontend → Vercel auto-deploy
  Backend → Build Docker image → Push to ECR → ECS rolling deploy
        │
        ▼
Post-deploy:
  Prisma migrations (prisma migrate deploy)
  Smoke tests via Playwright
  Sentry release tracking
```

### 7.4 Environment Strategy

| Environment | URL | Purpose |
|-------------|-----|---------|
| Development | localhost:3000 | Local with mock data |
| Staging | staging.aplomb.in | Full stack, test data |
| Production | app.aplomb.in | Live system |

---

## 8. SCALING STRATEGY

### 8.1 Expected Load

| Metric | Month 1 | Month 6 | Month 12 |
|--------|---------|---------|---------|
| Cases/month | 500 | 2,000 | 10,000 |
| Active users | 20 | 50 | 200 |
| Photos/day | 200 | 1,000 | 5,000 |
| Reports generated | 500 | 2,000 | 10,000 |
| AI API calls/month | 1,000 | 5,000 | 25,000 |

### 8.2 Scaling Levers

| Bottleneck | Solution |
|------------|---------|
| API throughput | ECS autoscaling (target: 70% CPU) |
| Database reads | Read replica for analytics queries |
| File storage | S3 scales infinitely |
| PDF generation | Dedicated Puppeteer ECS service, BullMQ concurrency |
| AI throughput | OpenAI rate limits → queue + retry |
| WebSocket connections | Redis pub/sub allows multi-instance Socket.IO |
| Search | PostgreSQL FTS (sufficient to 10M rows), upgrade to OpenSearch at scale |

### 8.3 Cost Scaling

| Volume | Estimated Monthly Cost |
|--------|----------------------|
| 500 cases/mo | ~$300 |
| 2,000 cases/mo | ~$540 |
| 10,000 cases/mo | ~$1,200 |
| 50,000 cases/mo | ~$4,000 (requires RDS upgrade) |

---

## 9. TESTING STRATEGY

### 9.1 Testing Pyramid

```
         [E2E Tests]
         Playwright
    10 critical user journeys
         /         \
   [Integration Tests]
   NestJS + PostgreSQL
   50 API endpoint tests
         /         \
      [Unit Tests]
    Jest (backend) + Vitest (frontend)
    200+ pure function/component tests
```

### 9.2 Test Categories

**Unit Tests (200+)**
- Utility functions (geofence calculations, report numbering)
- Zod validation schemas
- React components (render + interaction)
- Service methods (mocked dependencies)

**Integration Tests (50+)**
- API endpoints with real PostgreSQL (test DB)
- Auth guard enforcement for each role
- Case status transition rules
- AI service mock responses

**End-to-End Tests (10 critical journeys)**
1. Admin creates a case → assigns engineer
2. Engineer completes AI-assisted report via voice
3. Verifier approves report → case sent to bank
4. Bulk import 50 cases from CSV
5. Engineer punch-in with geofence validation
6. Accounts generates and sends invoice
7. Demolition alert fires during case creation
8. HR approves leave request
9. Payroll calculation and payslip generation
10. Admin revokes engineer access → engineer blocked

### 9.3 AI Test Strategy

- Mock OpenAI in unit/integration tests
- Dedicated AI regression suite (10 property types × 3 language variants)
- Golden file comparison for report output consistency
- Photo quality detection accuracy tests (labeled test set)

---

## 10. AI CHAT SYSTEM PROMPT (Engineering Reference)

```
You are APLOMB's Property Reporting Assistant.

Your job is to help a site engineer complete a structured property valuation report
through a conversational interview.

Context:
- Case ID: {caseId}
- Property Type: {propertyType}
- Bank: {bankName}
- Property Address: {address}
- Engineer Language Preference: {language}

Rules:
1. Ask one question at a time
2. Accept responses in Hindi, English, or Hinglish — interpret all correctly
3. If unclear, ask a clarifying follow-up
4. When all questions are answered, output a JSON object conforming to ReportSchema
5. Convert all responses to professional English in the final output
6. Flag any field where you are less than 70% confident with needs_review: true

Question Flow:
Q1: Construction stage? (Vacant / Foundation / Under Construction / Completed / Old)
Q2: Property configuration? (Floors, units, type)
Q3: Total carpet area / plot area? (accept any unit, convert to sqft)
Q4: Road width in front? (meters)
Q5: Construction quality? (Superior / Good / Average / Below Average)
Q6: Observations about the structure?
Q7: Surrounding area description? (residential / commercial / mixed)
Q8: Amenities present? (list)
Q9: Any encroachments, disputes, or issues?
Q10: Engineer's overall remarks?
```
