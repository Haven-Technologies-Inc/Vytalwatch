# RPM Enhancement Plan

## Implementation Status: ✅ Phase 1 Complete

### New Entities Implemented
1. ✅ **Enrollment** - `src/enrollments/` - Program enrollment tracking (BP|GLUCOSE)
2. ✅ **ThresholdPolicy** - `src/threshold-policies/` - Versioned clinical rules
3. ✅ **Task** - `src/tasks/` - Workflow/inbox management
4. ✅ **TimeEntry** - `src/time-tracking/` - RPM billing time tracking
5. ✅ **AIDraft** - `src/ai-drafts/` - AI content tracking & review
6. ✅ **Claim** - `src/claims/` - Billing/claims management

### Enhanced Entities
1. ✅ **User** - Added Nurse, ClinicalStaff, BillingStaff, ComplianceAuditor roles + license fields
2. ✅ **VitalReading** - Added timestampDevice, timestampReceived, isValid, isOutlier, qualityScore
3. ✅ **CommunicationLog** - Added interactiveFlag, timeEntryId
4. ✅ **AuditLog** - Added hash chaining (actorType, beforeHash, afterHash, prevAuditHash, auditHash)

### Tenovi Integration Status
- ✅ Webhook ingestion with HMAC verification
- ✅ Device sync and fulfillment
- ✅ No conflicts - new entities extend existing implementation

### New API Endpoints
- ✅ `POST/GET/PATCH /enrollments` - Enrollment management
- ✅ `GET/POST /threshold-policies` - Versioned threshold policies
- ✅ `POST/GET/PATCH /tasks` - Task workflow
- ✅ `POST /time/start`, `POST /time/stop` - Time tracking
- ✅ `POST/GET /ai/drafts` - AI draft management
- ✅ `POST /claims/build`, `POST /claims/:id/finalize` - Claims builder

## Phase 2: Frontend Implementation ✅ Complete

### Components Created
- ✅ `TaskCard` - Task display card with priority, status, and actions
- ✅ `MonitoringInbox` - Filterable task inbox with search and tabs
- ✅ `TimeTracker` - Timer with billing progress and category selection
- ✅ `MonthlyNoteGenerator` - AI draft generation with edit/accept workflow
- ✅ `ClaimsDashboard` - Claims management with build/finalize/submit
- ✅ `TaskDetailModal` - Detailed task view with completion flow

### Pages Created
- ✅ `/provider/rpm` - Main RPM monitoring dashboard
- ✅ `/provider/rpm/[id]` - Patient-specific RPM view

### API Services Added
- ✅ `tasksApi` - Task CRUD and workflow
- ✅ `timeTrackingApi` - Timer start/stop and entries
- ✅ `enrollmentsApi` - Enrollment management
- ✅ `claimsApi` - Claims builder and submission
- ✅ `aiDraftsApi` - AI draft generation and review
- ✅ `thresholdPoliciesApi` - Threshold policy management

### Navigation
- ✅ Added "RPM Monitoring" link in provider sidebar

## Phase 3: Advanced Features  Complete
-  AI charting assistant integration
-  Predictive risk scoring model
-  837P claim export generation
-  Audit bundle PDF export

### Backend Services Created
- `ChartingAssistantService` - AI SOAP note, triage summary, outreach script generation
- `RiskScoringService` - Predictive risk scoring with factors, predictions, recommendations
- `Claim837PExportService` - EDI 837P professional claim file generation
- `AuditBundleService` - Compliance audit bundle with hash verification

### Backend Controllers Added
- `AdvancedAIController` - /ai/advanced/* endpoints for SOAP, triage, risk scoring
- `ClaimsExportController` - /claims/export/* endpoints for 837P and audit bundles

### Frontend Components Created
- `RiskScoreCard` - Visual risk score display with factors and predictions
- `AIChartingAssistant` - SOAP note generation with copy/edit functionality
- `ClaimsExportPanel` - Batch 837P export and individual audit bundle downloads

### Frontend API Services Added
- `advancedAIApi` - SOAP notes, triage, outreach, risk scoring
- `claimsExportApi` - 837P preview/download, audit bundle generation

## Implementation Complete 

All three phases of the RPM Enhancement Plan have been successfully implemented:
- **Phase 1**: Backend entities and modules
- **Phase 2**: Frontend UI components and pages
- **Phase 3**: Advanced AI features and compliance exports

## Phase 4: Extended Enhancements  Complete

### Testing
- Unit tests for RiskScoringService, ChartingAssistantService
- Unit tests for Claim837PExportService, AuditBundleService

### Real PDF Generation
- Replaced base64 text with pdfkit library
- Professional audit bundle PDF with sections, signatures, attestation

### Clearinghouse Integration
- `ClearinghouseService` - Availity/Change Healthcare/Trizetto/Waystar support
- `ClearinghouseController` - Submit, check status, get remittance endpoints
- Configurable via environment variables

### RPM Analytics Dashboard
- `RPMAnalyticsService` - Dashboard metrics, productivity, compliance reports
- `RPMAnalyticsController` - /analytics/rpm/* endpoints
- `RPMAnalyticsDashboard` - Frontend component with stat cards and trends

### Batch Processing
- `RPMBatchService` - Scheduled jobs with @nestjs/schedule
- Daily task generation for billing reviews
- Monthly billing period advancement
- Daily compliance alert checks
- Automatic claim building for period-end enrollments

### Frontend API Services Added
- `clearinghouseApi` - Submit, check status, remittance
- `rpmAnalyticsApi` - Dashboard, productivity, compliance
