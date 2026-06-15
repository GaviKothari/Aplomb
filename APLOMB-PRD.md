# APLOMB — Property Valuation Management Platform
## Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** June 2026  
**Status:** Production-Ready Specification  
**Prepared by:** Engineering & Product Architecture Team

---

## 1. EXECUTIVE SUMMARY

APLOMB is a full-stack enterprise SaaS platform replacing Excel-based workflows for a property valuation company that serves multiple banks and financial institutions. The system manages the complete lifecycle of property valuation cases — from bank intake through site inspection, AI-assisted report generation, verification, and final delivery — while integrating HR, payroll, travel, billing, and analytics.

**Business Problem:**  
- Manual Excel coordination between banks → coordinators → engineers → report makers → banks
- No real-time visibility into case status or TAT (Turnaround Time)
- Engineer reports require dedicated "Report Makers" to format professional output
- Zero integration between operations, HR, and finance
- No audit trail or compliance capability

**Solution:**  
- End-to-end case lifecycle management with real-time status tracking
- AI-assisted voice/text reporting that eliminates Report Makers
- Unified platform for all departments
- Bank-wise MIS with real-time dashboards
- Immutable audit trail for compliance

---

## 2. STAKEHOLDERS & USER ROLES

### 2.1 Admin
Full system access. Manages users, settings, billing, analytics, and all operational data.

**Core jobs-to-be-done:**
- Monitor overall system health and KPIs
- Configure system settings (office locations, geofences, billing rates)
- Manage user accounts and permissions
- Access all reports and audit trails
- Override any workflow step

### 2.2 Coordinator
Operational hub. Receives bank requests, creates cases, assigns engineers/verifiers.

**Core jobs-to-be-done:**
- Create cases individually or via bulk CSV/Excel upload
- Assign field engineers based on location proximity
- Assign verifiers to completed reports
- Track case status and TAT breaches
- Communicate with banks
- View bank-wise MIS dashboard

### 2.3 Site Engineer (Mobile-first)
Field operative. Visits sites, collects data, generates reports using AI assistant.

**Core jobs-to-be-done:**
- View assigned cases with location and priority
- Navigate to site via integrated maps
- Mark site visit start/end
- Use AI chat to generate report via voice or text (Hindi/English/Hinglish)
- Upload photos/videos with AI quality validation
- Submit completed report for verification
- Mark daily attendance (geofence-based)
- Log travel expenses

### 2.4 Verifier
Quality controller. Reviews engineer reports against bank-provided data.

**Core jobs-to-be-done:**
- View pending verification queue
- Compare engineer report data vs. bank data (split-screen)
- Approve, reject, or request revision on reports
- Add field-level comments
- Track approval history

### 2.5 HR Manager
People operations. Manages employee records, attendance, leaves.

**Core jobs-to-be-done:**
- Maintain employee master records with KYC documents
- Track attendance (office staff: geofence; engineers: case-based)
- Approve/reject leave requests
- Generate HR reports

### 2.6 Accounts Manager
Finance operations. Manages billing, invoices, and payroll.

**Core jobs-to-be-done:**
- Generate bank-wise invoices based on completed cases
- Track payment status
- Process monthly payroll
- Approve travel reimbursements
- Generate financial reports

---

## 3. PRODUCT SCOPE & MODULES

### Module 1: Case Management
The operational core of the platform.

**Features:**
- Case creation (single and bulk)
- Case lifecycle tracking (11 statuses)
- Bank/client management
- Engineer and verifier assignment
- Document management
- Duplicate detection
- Demolition alert integration
- Case board (Kanban view)
- Case history and audit trail

**Case Statuses:**
```
New → Assigned → Site Visit Scheduled → Site Visit In Progress
→ Site Visit Completed → Under Verification → Revision Requested
→ Finalized → Sent to Bank → On Hold → Closed
```

**Case Numbering Format:** `APL/YYYY/MM/NNNN`  
**Report Revision Format:** `APL/YYYY/MM/NNNN-R1`, `-R2`, etc.

### Module 2: AI Reporting Assistant
Flagship feature. Eliminates Report Makers.

**Features:**
- Conversational AI asks structured questions
- Voice input with Whisper transcription
- Multi-language support: Hindi, English, Hinglish, local dialects
- AI converts responses to professional English
- Generates structured report fields automatically
- Photo/video analysis with quality validation
- Report preview before submission

**AI Questions Flow:**
```
1. Property type → 2. Floors/configuration → 3. Construction stage
→ 4. Road width and access → 5. Surrounding area → 6. Site observations
→ 7. Structural condition → 8. Amenities → 9. Market comparables
→ 10. Final remarks
```

### Module 3: Verification System
Quality assurance layer.

**Features:**
- Split-screen: Bank data (left) vs. Engineer report (right)
- Field-level discrepancy highlighting
- Approve/Reject/Request Revision workflow
- Comment system with mentions
- Version control for revisions
- Verifier dashboard with queue management

### Module 4: Photo & Video Management
Evidence management for site visits.

**Features:**
- Structured upload: Front, Back, Left, Right, Interior, Surroundings, Documents
- AI quality validation (blur detection, duplicate detection, required angle checking)
- Video upload with thumbnail extraction
- Document categorization
- AWS S3 storage with CDN delivery
- EXIF data extraction (GPS, timestamp)

### Module 5: GPS & Field Tracking
Real-time field operations management.

**Features:**
- Live engineer location tracking during site visits
- Distance-to-property calculation
- Site visit duration tracking
- Route history
- Auto-calculate travel distance for reimbursement
- Nearby case suggestions based on location

### Module 6: Attendance & Geofencing
Multi-type attendance management.

**Features:**
- **Office staff:** GPS radius validation against office coordinates (Super Mart 2, DLF Phase 4, Gurgaon)
- **Engineers:** Case activity-based attendance
- Punch-in/out with timestamp
- Work hours calculation
- Late arrival / early departure tracking
- Configurable office locations and geofence radius

### Module 7: HR Management
People operations hub.

**Features:**
- Employee master with KYC documents (Aadhaar, PAN, Driving License, Agreement)
- Document upload to S3
- Leave management (Annual, Sick, Casual, Compensatory, Unpaid)
- Leave approval workflow
- Employment history
- Emergency contacts
- Department/designation management

### Module 8: Travel & Expense Management
Expense tracking and reimbursement.

**Features:**
- Auto-calculate distance using GPS logs
- Configurable reimbursement rate (₹ per km)
- Expense submission with receipts
- Approval workflow (Engineer → Coordinator → Accounts)
- Batch approval
- Integration with payroll

### Module 9: Billing & Invoicing
Client billing automation.

**Features:**
- Rate card per bank/case type
- Auto-generate invoices from completed cases
- Invoice line items: case reference, property type, amount
- PDF invoice generation
- Payment tracking
- Outstanding amount dashboard
- Bank-wise revenue reports

### Module 10: Payroll
Automated payroll processing.

**Features:**
- Calculate from: base salary + attendance + leaves + travel reimbursements - deductions
- Monthly payroll generation
- Payslip PDF generation
- Deduction types: TDS, PF, ESI, loans, advances
- Payroll history

### Module 11: MIS Dashboard
Real-time operational intelligence.

**Features:**
- Bank-wise case volume
- TAT tracking (average, breaches)
- Engineer productivity metrics
- Revenue trends
- Pending case aging
- Real-time updates via WebSocket

### Module 12: Property Analytics
Market intelligence layer.

**Features:**
- Valuation trend tracking
- Rate per sq ft by location
- Bank-wise comparison
- Time series: Monthly, Quarterly, Half-Yearly, Yearly
- Heat maps (requires Google Maps integration)
- Anomaly detection

### Module 13: Demolition Alert System
Risk management integration.

**Features:**
- Upload demolition authority lists (Excel/CSV)
- Match algorithm: address + pincode + GPS coordinates
- Alert during case creation
- Alert during reporting
- Alert during verification
- Match confidence scoring

### Module 14: Reporting & Documents
Report generation and management.

**Features:**
- 1-page property summary PDF
- Full valuation report PDF (multi-page)
- Puppeteer-based PDF rendering
- Custom templates per bank
- Revision tracking with version history
- Digital delivery to banks

### Module 15: Notifications
Multi-channel communication.

**Channels:** Email, SMS, In-app, Push (mobile)

**Triggers:**
- Case assigned to engineer
- Case ready for verification
- Report approved/rejected
- TAT breach warning (80% of SLA)
- TAT breach (100% of SLA)
- Demolition alert match
- Leave approved/rejected
- Invoice generated/paid
- Payroll processed

### Module 16: Audit Trail
Immutable system log.

**Logged Events:**
- Case status changes
- Report edits
- Assignment changes
- Approval/rejection decisions
- Document downloads
- User login/logout
- Settings changes
- Data exports

---

## 4. NON-FUNCTIONAL REQUIREMENTS

### Performance
- Page load: < 2s (P95)
- API response: < 200ms (P95) for reads, < 500ms for writes
- Report PDF generation: < 30s
- AI response first token: < 3s
- Support 1,000 concurrent users
- Process 10,000+ cases/month

### Availability
- 99.9% uptime SLA
- Graceful degradation if AI services are down
- Offline capability for engineer mobile app (critical path only)

### Security
- RBAC with principle of least privilege
- JWT with refresh token rotation (15 min access, 7 day refresh)
- All file storage encrypted at rest (AES-256)
- All traffic encrypted in transit (TLS 1.3)
- Rate limiting: 100 req/min per user, 10 req/min for auth
- PII fields encrypted in database (Aadhaar, PAN, bank details)
- Complete audit trail (immutable)
- VAPT compliance before production

### Compliance
- Data residency: India (AWS Mumbai ap-south-1)
- Aadhaar/PAN handling per UIDAI guidelines
- DPDP Act 2023 compliance
- Document retention policy (7 years for financial records)

### Scalability
- Horizontal scaling via ECS Fargate
- Database read replicas for analytics queries
- CDN for static assets and report PDFs
- Queue-based report generation (BullMQ)
- Cache layer (Redis) for frequently accessed data

---

## 5. INTEGRATION REQUIREMENTS

| Integration | Purpose | Provider |
|-------------|---------|----------|
| Maps | Property location, GPS, routing | Google Maps API |
| Storage | Photos, videos, documents, PDFs | AWS S3 |
| Email | Notifications | AWS SES or SendGrid |
| SMS | OTP and alerts | Twilio or MSG91 |
| Push | Mobile push notifications | Firebase FCM |
| AI Chat | Conversational reporting | OpenAI GPT-4o |
| Voice | Speech-to-text transcription | OpenAI Whisper |
| Vision | Photo quality analysis | OpenAI GPT-4 Vision |
| PDF | Report generation | Puppeteer |
| Queue | Background job processing | BullMQ + Redis |
| Realtime | Live status, notifications | Socket.IO |
| Monitoring | Error tracking | Sentry |
| Analytics | Usage analytics | Vercel Analytics |

---

## 6. ACCEPTANCE CRITERIA

### Case Management
- [ ] Case can be created in < 2 minutes with all required fields
- [ ] Bulk import of 500 cases from Excel completes without errors
- [ ] All status transitions are logged with timestamp and user
- [ ] Duplicate detection flags matching address + pincode within 500m

### AI Reporting
- [ ] Engineer can submit a report using only voice in Hindi
- [ ] AI generates a professional English report in < 60 seconds
- [ ] Report requires no manual editing for 80% of standard cases
- [ ] Photo quality validation rejects blurry images (< 50 sharpness score)

### Verification
- [ ] Verifier can approve or reject a report in < 5 minutes
- [ ] All discrepancies are highlighted field-by-field
- [ ] Revision request reaches engineer within 30 seconds

### Performance
- [ ] Dashboard loads in < 2 seconds on 4G mobile connection
- [ ] PDF generation completes in < 30 seconds

### Security
- [ ] User cannot access any resource outside their permitted modules
- [ ] All PII fields are masked in logs and error traces
- [ ] Audit log shows every state change with actor and timestamp
