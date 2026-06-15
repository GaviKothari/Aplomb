# APLOMB — Development Roadmap & Sprint Plan
## From UI Prototype → Production System

**Version:** 1.0  
**Date:** June 2026  
**Total Timeline:** 26 Weeks (6.5 months)  
**Team Size:** 4 engineers recommended

---

## TEAM STRUCTURE

| Role | Count | Responsibility |
|------|-------|----------------|
| Full-Stack Lead | 1 | Architecture, backend core, code review |
| Full-Stack Engineer | 1 | Backend modules, API endpoints |
| Frontend Engineer | 1 | UI integration, React Query, real-time |
| DevOps / Cloud | 0.5 | CI/CD, AWS, monitoring (part-time) |

**Total:** 3.5 FTE

---

## PHASE 0 — FOUNDATION (Weeks 1–2)

**Goal:** Set up the production-grade project structure. Everything future sprints depend on.

### Sprint 0.1 (Week 1)
- [ ] Initialize NestJS backend repository
- [ ] Set up PostgreSQL database (RDS dev instance)
- [ ] Run Prisma schema migrations for core tables
- [ ] Set up Redis (ElastiCache dev instance)
- [ ] Configure Clerk authentication
- [ ] JWT guard + roles guard implementation
- [ ] Global exception filter and request logger
- [ ] Audit log interceptor (auto-fires on all writes)
- [ ] CI pipeline (GitHub Actions: lint → typecheck → test)

### Sprint 0.2 (Week 2)
- [ ] AWS S3 bucket configuration (dev + prod separation)
- [ ] File upload service (pre-signed URLs)
- [ ] BullMQ + Redis queue setup (all queue definitions, no processors yet)
- [ ] Socket.IO gateway (rooms, auth handshake)
- [ ] Sentry integration (backend + frontend)
- [ ] Environment configuration (dev/staging/prod)
- [ ] Connect existing Next.js frontend to backend auth (Clerk webhooks → User table sync)
- [ ] Deploy backend to ECS (staging environment)

**Deliverable:** Backend skeleton running, auth working end-to-end, CI/CD green.

---

## PHASE 1 — CASE MANAGEMENT CORE (Weeks 3–6)

**Goal:** The backbone of the business. Cases from creation to assignment.

### Sprint 1.1 (Week 3) — Case CRUD
- [ ] Case model service (create, read, update, soft delete)
- [ ] Case number auto-generation (`APL/YYYY/MM/NNNN`)
- [ ] Organization (bank) service + CRUD API
- [ ] Rate card management
- [ ] Case status state machine with validation
- [ ] Status history auto-logging on every transition
- [ ] Connect frontend `/operations/cases` list page to real API
- [ ] Connect `/operations/cases/new` form to real API

### Sprint 1.2 (Week 4) — Assignment & Documents
- [ ] Engineer assignment logic (with proximity sort via GPS)
- [ ] Verifier assignment
- [ ] Case document upload (S3 integration)
- [ ] Case media upload (photos, videos)
- [ ] Connect frontend case detail tabs (Overview, Media, History) to real data
- [ ] Duplicate detection (address + pincode + GPS radius)
- [ ] SLA deadline calculation per bank rate card

### Sprint 1.3 (Week 5) — Bulk Import & Kanban
- [ ] Excel/CSV parser service (ExcelJS library)
- [ ] Bulk import BullMQ processor
- [ ] Import preview API (validate without committing)
- [ ] Import history tracking
- [ ] Connect frontend kanban board to real API
- [ ] Real-time status updates via Socket.IO (case:status_changed event)
- [ ] Case filtering (bank, status, engineer, date range, priority)

### Sprint 1.4 (Week 6) — Testing & Polish
- [ ] Integration tests for all case endpoints
- [ ] E2E test: Create case → assign engineer → status flow
- [ ] Performance: Cases list pagination (cursor-based, 50 per page)
- [ ] Full-text search on cases (PostgreSQL FTS)
- [ ] Coordinator dashboard: connect MIS numbers to real data

**Deliverable:** Complete working case management with real data.

---

## PHASE 2 — SITE VISIT & AI REPORTING (Weeks 7–11)

**Goal:** The flagship AI feature. Replaces Report Makers.

### Sprint 2.1 (Week 7) — Site Visit Tracking
- [ ] Site visit log service (GPS in/out, timing)
- [ ] Engineer location tracking API
- [ ] Distance calculation (Haversine for site → property)
- [ ] Site visit duration calculation
- [ ] Connect engineer dashboard to real assigned cases
- [ ] Map integration (Google Maps — navigate to property)
- [ ] Engineer marks: Site Visit In Progress → Site Visit Completed

### Sprint 2.2 (Week 8) — AI Chat Session
- [ ] OpenAI service wrapper (GPT-4o, retry logic, error handling)
- [ ] AI chat session CRUD
- [ ] AI message processing endpoint (text)
- [ ] System prompt builder (inject case context)
- [ ] Session state machine (ACTIVE → COMPLETED)
- [ ] Connect frontend AI chat interface to real API
- [ ] Real-time message streaming (SSE or WebSocket)

### Sprint 2.3 (Week 9) — Voice Input
- [ ] Whisper API integration (audio file transcription)
- [ ] Voice message endpoint (multipart audio upload)
- [ ] Language detection and routing
- [ ] Audio noise removal (FFmpeg pre-processing)
- [ ] Connect frontend voice input component to API
- [ ] Hindi/Hinglish → English normalization in prompts

### Sprint 2.4 (Week 10) — Report Generation
- [ ] AI session completion → structured JSON extraction
- [ ] Report field population from AI output
- [ ] Confidence scoring per field
- [ ] Report CRUD service (create, update, versioning)
- [ ] Report revision system (R1, R2... numbering)
- [ ] Report submission → triggers Under Verification status
- [ ] Connect frontend Report tab to real API

### Sprint 2.5 (Week 11) — Photo Intelligence
- [ ] GPT-4 Vision integration (photo quality scoring)
- [ ] Blur detection + duplicate hashing (perceptual hash)
- [ ] Required angle enforcement (front/back/left/right check)
- [ ] Photo analysis BullMQ processor
- [ ] AI analysis results displayed in Media tab
- [ ] E2E test: Voice → AI report → submit

**Deliverable:** Engineer can complete a full report using voice in Hindi, from site visit to submission.

---

## PHASE 3 — VERIFICATION & PDF (Weeks 12–14)

**Goal:** Quality assurance layer + professional output.

### Sprint 3.1 (Week 12) — Verification Workflow
- [ ] Verification service (create, field-level verdict, decisions)
- [ ] Verifier queue API (pending, assigned)
- [ ] Field comparison logic (engineer vs. bank data diff)
- [ ] Approve/Reject/Request Revision endpoints
- [ ] Comment system on verifications
- [ ] Connect split-screen verifier UI to real API
- [ ] Notify engineer on revision request (Socket.IO + notification)

### Sprint 3.2 (Week 13) — PDF Generation
- [ ] Puppeteer PDF service (headless browser)
- [ ] Report HTML template (1-page summary)
- [ ] Full valuation report HTML template
- [ ] Bank-specific template support
- [ ] PDF generation BullMQ processor
- [ ] S3 storage + CloudFront CDN delivery
- [ ] PDF download endpoint with auth check

### Sprint 3.3 (Week 14) — Report Delivery & Testing
- [ ] "Send to Bank" workflow (status update + email)
- [ ] Report version history UI
- [ ] Verifier dashboard connected to real data
- [ ] E2E test: Report submitted → verified → PDF generated → sent to bank
- [ ] Integration tests for all verification endpoints

**Deliverable:** Complete report lifecycle from AI generation to bank delivery.

---

## PHASE 4 — HR & ATTENDANCE (Weeks 15–17)

**Goal:** People operations integrated with operational data.

### Sprint 4.1 (Week 15) — Employee Management
- [ ] Employee CRUD service
- [ ] KYC document upload (Aadhaar, PAN, driving license → S3)
- [ ] PII encryption (Aadhaar, PAN at application layer)
- [ ] Employee code auto-generation
- [ ] Leave balance management
- [ ] Leave request + approval workflow
- [ ] Connect HR dashboard to real data

### Sprint 4.2 (Week 16) — Attendance & Geofencing
- [ ] Geofence service (office location CRUD, radius config)
- [ ] Punch-in endpoint with GPS validation
- [ ] Punch-out endpoint
- [ ] Work hours calculation
- [ ] Auto-mark absent cron job (11:59 PM daily)
- [ ] Engineer attendance (case-based marking)
- [ ] Connect engineer punch-in-out page to real API
- [ ] Attendance admin view for HR

### Sprint 4.3 (Week 17) — Travel & Expenses
- [ ] Travel log service (GPS routes, distance calculation)
- [ ] Travel expense claim submission
- [ ] Expense approval workflow (Engineer → Coordinator → Accounts)
- [ ] Configurable rate per km (system settings)
- [ ] Connect frontend travel expense pages to real API
- [ ] Batch expense approval for Accounts

**Deliverable:** HR fully operational. Attendance and travel tracked without Excel.

---

## PHASE 5 — FINANCE (Weeks 18–20)

**Goal:** Billing and payroll automation.

### Sprint 5.1 (Week 18) — Billing & Invoicing
- [ ] Invoice generation service (from completed cases + rate cards)
- [ ] Invoice number auto-generation (`INV/YYYY/MM/NNN`)
- [ ] Invoice line items from case data
- [ ] PDF invoice generation (Puppeteer template)
- [ ] Payment recording
- [ ] Outstanding amount calculation
- [ ] Connect billing dashboard to real data

### Sprint 5.2 (Week 19) — Payroll
- [ ] Payroll calculation engine:
  - Base salary + HRA + allowances
  - Travel reimbursements (from approved expenses)
  - Leave deductions
  - PF/ESI/TDS calculations
- [ ] Payslip PDF generation
- [ ] Payroll approval workflow
- [ ] Connect payroll dashboard to real data

### Sprint 5.3 (Week 20) — Finance Testing
- [ ] Integration tests for billing endpoints
- [ ] Payroll calculation unit tests (all deduction scenarios)
- [ ] E2E test: Case completed → Invoice generated → Payment recorded
- [ ] Bank-wise revenue report API

**Deliverable:** Zero-Excel finance operations.

---

## PHASE 6 — MIS, ANALYTICS & DEMOLITION (Weeks 21–23)

**Goal:** Intelligence layer and risk management.

### Sprint 6.1 (Week 21) — MIS Dashboard
- [ ] MIS snapshot service (real-time aggregation)
- [ ] Pre-computed snapshots cron (every 30 minutes)
- [ ] Bank-wise case breakdown API
- [ ] TAT calculation and breach tracking
- [ ] Engineer productivity metrics
- [ ] Connect MIS dashboard to real API
- [ ] Real-time MIS updates via WebSocket

### Sprint 6.2 (Week 22) — Analytics & Market Data
- [ ] Property transaction tracking service
- [ ] Market analytics aggregation (rate per sqft trends)
- [ ] Location-based heat map data API
- [ ] Time series analytics (monthly/quarterly/yearly)
- [ ] AI insights nightly batch job
- [ ] Connect analytics pages to real data

### Sprint 6.3 (Week 23) — Demolition Alert System
- [ ] Demolition list upload service (Excel/CSV parsing)
- [ ] Address + pincode + GPS matching algorithm
- [ ] Confidence scoring for matches
- [ ] Alert during case creation (real-time check)
- [ ] Alert during verification
- [ ] Dismiss workflow for false positives
- [ ] Connect demolition alerts UI to real API

**Deliverable:** Full operational intelligence. No Excel for MIS.

---

## PHASE 7 — NOTIFICATIONS & POLISH (Weeks 24–25)

**Goal:** Complete notification system and production hardening.

### Sprint 7.1 (Week 24) — Notifications
- [ ] Notification service (multi-channel: email, SMS, in-app, push)
- [ ] AWS SES integration (email)
- [ ] MSG91/Twilio integration (SMS)
- [ ] Firebase FCM integration (push)
- [ ] Notification preference management
- [ ] All triggers implemented (assignment, approval, TAT breach)
- [ ] In-app notification panel (connected to real API)
- [ ] TAT breach monitoring cron

### Sprint 7.2 (Week 25) — Security & Hardening
- [ ] Rate limiting (Redis-based, per user)
- [ ] Input sanitization audit
- [ ] CSP headers configuration
- [ ] PII masking in Sentry error reports
- [ ] Row-level security for audit_logs (append-only)
- [ ] VAPT scan and remediation
- [ ] Load testing (k6: 500 concurrent users)
- [ ] Database query optimization (EXPLAIN ANALYZE on slow queries)
- [ ] Error boundary coverage on all pages

---

## PHASE 8 — PRODUCTION LAUNCH (Week 26)

### Launch Checklist
- [ ] Production AWS infrastructure provisioned
- [ ] Domain configuration (app.aplomb.in, api.aplomb.in)
- [ ] SSL certificates (ACM)
- [ ] Database backup policy (daily snapshots, 7-day retention)
- [ ] Monitoring dashboards (CloudWatch + Sentry)
- [ ] Runbook documentation for on-call
- [ ] Data migration from Excel (seed production DB)
- [ ] User training sessions (per role)
- [ ] Soft launch with 1 bank / 5 engineers
- [ ] 2-week hypercare support period
- [ ] Full rollout

---

## BACKLOG — POST-LAUNCH (V2 Features)

| Feature | Priority | Effort |
|---------|---------|--------|
| Bank integration portal (read-only) | HIGH | 2 weeks |
| Mobile native app (React Native) | HIGH | 8 weeks |
| Offline report drafting for engineers | HIGH | 3 weeks |
| Whatsapp notifications | MEDIUM | 1 week |
| Advanced AI market comparison | MEDIUM | 3 weeks |
| Custom report templates per bank | MEDIUM | 2 weeks |
| Engineer performance leaderboard | LOW | 1 week |
| Document OCR (Aadhaar/PAN auto-fill) | LOW | 2 weeks |
| Video call for remote verification | LOW | 4 weeks |

---

## COST ESTIMATION

### Development Cost (India Market Rates)

| Role | Monthly Rate | Duration | Cost |
|------|-------------|---------|------|
| Full-Stack Lead | ₹2,50,000 | 6.5 months | ₹16,25,000 |
| Full-Stack Engineer | ₹1,50,000 | 6.5 months | ₹9,75,000 |
| Frontend Engineer | ₹1,25,000 | 6.5 months | ₹8,12,500 |
| DevOps (part-time) | ₹75,000 | 6.5 months | ₹4,87,500 |
| **Development Total** | | | **₹39,00,000** |

### Infrastructure Cost (Monthly, Production)

| Service | Monthly |
|---------|---------|
| AWS ECS Fargate | ₹13,000 |
| AWS RDS PostgreSQL | ₹17,000 |
| AWS ElastiCache Redis | ₹7,000 |
| AWS S3 + CloudFront | ₹3,500 |
| Vercel Pro | ₹1,700 |
| OpenAI API | ₹12,500 |
| Sentry | ₹2,200 |
| Firebase FCM | Free |
| MSG91 SMS | ₹4,000 |
| **Monthly Total** | **₹60,900** |

### One-Time Costs

| Item | Cost |
|------|------|
| Google Maps API (annual credit) | ₹25,000 |
| Clerk (annual plan) | ₹20,000 |
| Domain + SSL | ₹5,000 |
| VAPT Security Audit | ₹50,000 |
| **One-Time Total** | **₹1,00,000** |

### Total Project Cost (First Year)

| Category | Amount |
|----------|--------|
| Development | ₹39,00,000 |
| Infrastructure (12 months) | ₹7,30,800 |
| One-time costs | ₹1,00,000 |
| **Grand Total (Year 1)** | **₹47,30,800** |

---

## KEY RISKS & MITIGATIONS

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| AI report quality below 80% accuracy | MEDIUM | HIGH | Parallel track: manual form fallback always available |
| OpenAI API rate limits at peak | MEDIUM | MEDIUM | BullMQ queue absorbs burst, max 10 concurrent AI sessions |
| Engineer mobile connectivity in field | HIGH | HIGH | PWA with offline draft, sync on connectivity restored |
| Bank data format inconsistency | HIGH | MEDIUM | Flexible verification system, field mapping config |
| Data breach of PII | LOW | CRITICAL | AES-256 encryption, VAPT audit before launch, DPDP compliance |
| Scope creep delaying launch | HIGH | HIGH | Strict MVP scope, backlog for V2 features |
| Key engineer attrition | LOW | HIGH | Comprehensive documentation, pair programming culture |

---

## DEFINITION OF DONE (Per Sprint)

A sprint task is DONE when:
1. Feature works end-to-end (UI → API → DB)
2. Unit tests written and passing
3. Code reviewed and approved by lead
4. API documented (Swagger)
5. No TypeScript errors (`tsc --noEmit` passes)
6. No ESLint errors
7. Sentry error rate < 0.1% in staging
8. Performance: API endpoint < 200ms P95 in staging
