# KFED Competition Platform Requirements

**Client:** Khalifa Fund for Enterprise Development (KFED)
**Competition:** Tri-Campus Entrepreneurship Competition (April – Q3 2026)
**Document Created:** 2026-03-15
**Status:** Feature Complete (UAT Ready)

---

## Competition Flow

```
500-1,000 Applications
    ↓ Screening & Selection
~150 Bootcamp Cohort (75 AD, 50 AA, 25 DHA)
    ↓ 3-Day Bootcamp Pitches (Jury Scored)
15 Finalists (5 per campus)
    ↓ Final Pitch Event (Weighted Scorecard)
5 Sector Winners + 3 Innovation Awards
```

---

## 1. APPLICATION INTAKE & FORM MANAGEMENT

### 1.1 Application Form Engine
- [x] **Configurable form schema system** — JSON-based field definitions (text, textarea, select, multi-select, checkbox, radio, number, email, phone, URL, date, file upload)
- [x] **Dynamic form renderer** — Renders forms from schema with validation
- [x] **Multi-step form wizard** — Break long applications into logical sections
- [x] **Field validation rules** — Required, min/max length, regex patterns, conditional visibility
- [x] **Conditional logic** — Show/hide fields based on other field values
- [x] **File upload support** — PDF, PPT, DOC for pitch decks, trade licenses (up to 10MB) via Cloudinary (authenticated access for raw files, public for images/video)
- [x] **Draft saving** — Auto-save and manual save of incomplete applications
- [x] **Application preview** — Applicants can review before final submission
- [x] **Application confirmation** — Email confirmation on successful submission (via Resend)
- [x] **Application editing** — Allow edits until deadline (configurable)
- [x] **Public application landing page** — Branded page with competition info + embedded form

### 1.2 Application Management (Admin)
- [x] **Application list view** — Sortable, filterable table of all applications (with expand for detail)
- [x] **Application detail view** — Full read-only view of any application (expanded row with all form fields)
- [x] **Application status pipeline** — draft → pending → under_review → eligible → ineligible → accepted → waitlisted → rejected → confirmed → declined → withdrawn → cancelled
- [x] **Bulk status updates** — Select multiple and change status
- [x] **Application search** — Full-text search across name/email
- [x] **Application filters** — By status (dropdown filter)
- [x] **Application notes** — Internal reviewer notes per application

### 1.3 Database
- [x] `competition_forms` table — Form schema definitions
- [x] `competition_applications` table — Submitted application data
- [x] `application_files` table — Uploaded file references
- [x] Supabase Storage bucket for application files
- [x] RLS policies for applications

---

## 2. SCREENING & SELECTION

### 2.1 Automated Eligibility Checks
- [x] **Rule engine** — Configurable pass/fail rules on structured fields (14 operators, rejection-condition paradigm)
- [x] **Hard eligibility filters:** (all configurable via screening rules UI)
  - [x] Age verification (18+) — via greater_equal/less_than operators
  - [x] Residency check (Abu Dhabi / Al Ain / Al Dhafra) — via equals/not_equals/in operators
  - [x] Ownership confirmation (Emirati ownership/co-ownership) — via is_true/equals operators
  - [x] Startup stage filter (≥ prototype/MVP) — via in/not_in operators
  - [x] Availability confirmation (bootcamp + final pitch) — via is_true operator
- [x] **Completeness check** — Completeness score (0-100) calculated per application
- [x] **Duplicate detection:**
  - [x] Matching email addresses
  - [x] Matching phone numbers (normalized)
  - [x] Matching LinkedIn URLs (normalized)
  - [x] Matching startup names (fuzzy match >80% character overlap)
  - [x] Flag duplicates for review (don't auto-reject)
- [x] **Soft flags** (reviewer awareness, not disqualification):
  - [x] Configurable soft rules — any field + operator combination
  - [x] Quota-based soft flags — per-option soft flag on linked form field
  - [x] Soft flags trigger `under_review` status for organizer review

### 2.2 Quota Enforcement
- [x] **Campus-based quotas** — Configurable per-option quotas linked to any radio/select form field
- [x] **3-state quota options** — Applicable / Soft Flag (review required) / Not Applicable (auto-reject)
- [x] **Fill tracking** — Real-time fill counts per option with progress bars
- [x] **Smart form handling** — Full options show "Waitlisted" badge (still selectable, auto-waitlisted on submit), N/A options disabled, soft-flagged options show warning
- [x] **FCFS overflow ranking** — When eligible exceeds quota, first-come-first-served by registration date (`created_at ASC`); accepted within quota, waitlisted overflow
  - [x] First-come-first-served as tiebreaker
  - [x] Application completeness score as additional ranking factor
- [x] **Waitlist management** — Auto-waitlist applicants who select a full quota option at registration
- [x] **Quota enforcement toggle** — Organizer chooses "During Registration" (show fills, auto-waitlist on form) vs "During Screening" (enforce quotas when screening runs)
- [x] **Automatic waitlist backfill** — When an accepted user leaves, the next waitlisted person from the same campus is auto-promoted to accepted with email notification

### 2.3 Screening Dashboard
- [x] **Summary cards** — Total applications, Screened (with %), Eligible, Ineligible/Rejected, Accepted
- [x] **Campus breakdown** — Counts by campus with quota progress bars (in Campus Quotas section)
- [x] **Sector distribution** — Applications by sector
- [x] **Eligibility breakdown** — Per-application screening results with rule-by-rule pass/fail in expanded view
- [x] **Duplicate flags list** — Flagged applications with flag count badges
- [x] **Soft flags list** — Applications with soft flag badges (yellow warning) visible inline + in detail view

### 2.4 Audit Trail
- [x] **Eligibility decision logging** — Every pass/fail recorded with rule reference (screening_results JSONB per registration)
- [x] **Manual override logging** — When admin overrides automated decision
- [x] **Screening completion timestamp** — `screening_completed_at` stored per registration

### 2.5 Database
- [x] `screening_rules` table — Configurable eligibility rules
- [x] `screening_results` table — Per-application eligibility outcomes
- [x] `screening_flags` table — Duplicate and soft flag records
- [x] `campus_quotas` table — Configurable per-campus quotas
- [x] `application_campus_summary` view — Aggregated stats by campus

---

## 3. APPLICANT COMMUNICATIONS

### 3.1 Email Templates
- [x] **Automated status emails** — Eligible, ineligible, under review, accepted, rejected, waitlisted (via Resend, only sent on status change)
- [x] **Template editor** — Rich text editor for email templates with placeholders
- [x] **Template library** — Save/reuse templates (acceptance, waitlist, rejection, reminder)
- [x] **Dynamic placeholders** — {applicant_name}, {startup_name}, {campus}, {competition_name}, {deadline}, etc.
- [x] **Template preview** — Preview with sample data before sending

### 3.2 Bulk Communications
- [x] **Segment-based sending** — Send to: all, accepted, waitlisted, rejected, by campus, by sector
- [x] **Bulk email dispatch** — Send customized template to filtered recipients
- [x] **Email scheduling** — Schedule send for future date/time
- [x] **Reminder automation** — Auto-reminders for: incomplete applications, approaching deadline, attendance confirmation

### 3.3 Attendance Confirmation
- [x] **RSVP collection** — Accepted applicants confirm/decline attendance
- [x] **RSVP deadline** — Configurable deadline for confirmation
- [x] **Waitlist promotion** — Auto-advance waitlisted when accepted leaves/cancels (same-campus FCFS backfill)
- [x] **RSVP dashboard** — Confirmed vs. pending vs. declined counts

### 3.4 Database
- [x] `email_templates` table — Saved email templates
- [x] `scheduled_emails` table — Queued emails with send_at timestamp
- [x] `email_log` table — Delivery tracking (sent, opened, bounced)

---

## 4. POST-BOOTCAMP FINALIST SELECTION (150 → 15)

### 4.1 Configurable Scorecard
- [x] **Custom criteria** — Configurable scoring criteria per competition phase (JSONB array on competition_phases)
- [x] **Flexible scale** — Support 0-3, 0-5, 0-10 scales per criteria (scoring_scale_max 1-100)
- [x] **Criteria descriptions** — Help text for each criteria to guide reviewers
- [x] **KFED Bootcamp Scorecard:**
  - [x] Problem-Solution Fit (0–3)
  - [x] Execution Readiness (0–3)
  - [x] Traction & Validation (0–3)

### 4.2 Reviewer Assignments
- [x] **Assignment matrix** — Map specific reviewers to specific applications/startups (reviewer_assignments table)
- [x] **3 reviewers per startup** — Configurable reviewer count per phase
- [x] **Blind review** — Reviewers see only own scores (enforced at API level + RLS)
- [x] **Conflict of interest** — Flag/prevent reviewer from scoring own startup or declared conflicts
- [x] **Load balancing** — Round-robin auto-assignment distributes evenly across reviewers
- [x] **Auto-assignment** — Algorithm to assign reviewers with campus filtering and load balancing

### 4.3 Binary Recommendation
- [x] **Recommend / Do Not Recommend toggle** — Per reviewer, per registration (recommendation field on phase_scores)
- [x] **Mandatory before submission** — API enforces recommendation when phase.require_recommendation = true

### 4.4 Decision Logic
- [x] **Majority rule engine:**
  - [x] 3/3 Recommend → Advances
  - [x] 2/3 Recommend → Advances
  - [x] 1/3 Recommend → Borderline (triggers calibration review)
  - [x] 0/3 Recommend → Does not advance
- [x] **Borderline detection** — 1/N recommendations flagged as borderline for calibration
- [x] **Calibration mode** — Admin can review and override decisions (is_override flag)
- [x] **Finalist quota enforcement** — 15 total (configurable per campus)

### 4.5 Parallel Scoring Support
- [x] **Campus-based sessions** — Independent phases per campus with campus_filter
- [x] **Pitch room management** — Multiple parallel rooms with separate jury panels
- [x] **Real-time aggregation** — Live score/assignment/decision counts per phase

### 4.6 Reviewer Dashboard
- [x] **Progress tracker** — Score count vs assignment count per phase (organizer view)
- [x] **Quick-score interface** — Optimized for rapid scoring during live pitches (2-4 min per scorecard)
- [x] **Score history** — View and edit own submitted scores
- [x] **Flagged submissions** — Mark for calibration review (flagged field on phase_scores)

### 4.7 Database
- [x] `competition_phases` table — Phase definitions with scoring config, campus filter, reviewer count, blind review
- [x] `reviewer_assignments` table — Judge-to-application mapping with phase scope
- [x] `phase_scores` table — Scores per phase with recommendation field, criteria_scores JSONB
- [x] `phase_decisions` table — Advancement decisions with rationale, override tracking

---

## 5. FINAL EVENT SCORING & WINNER SELECTION (15 → 8)

### 5.1 Weighted Scorecard
- [x] **KFED Final Scorecard:**
  - [x] Sectoral Impact (30%)
  - [x] Market Potential & Scalability (25%)
  - [x] Team Assessment (25%)
  - [x] Technical Feasibility & Execution (20%)
- [x] **Configurable weights** — Admin can adjust weights per phase (is_weighted + weight field on criteria)

### 5.2 Multi-Phase Jury Management
- [x] **Separate jury panels** — Different phase_reviewers per phase
- [x] **Jury invitation per phase** — Invite judges to specific competition phase (phase_reviewers table)
- [x] **Phase-gated access** — RLS policies restrict reviewers to assigned phases only

### 5.3 Award-Specific Scoring
- [x] **Innovation award tracks:**
  - [x] AI Innovation Award
  - [x] Robotics Innovation Award
  - [x] Sustainability Innovation Award
- [x] **Track-specific criteria** — Separate scorecard per award category
- [x] **Track jury assignment** — Assign specific judges to specific award tracks
- [x] **Track winner selection** — Independent ranking per award track

### 5.4 Winner Selection Workflow
- [x] **Calibration step** — Jury discussion phase before final lock-in
- [x] **Score review dashboard** — Side-by-side comparison of finalists
- [x] **Winner confirmation** — Admin confirms winners before announcement
- [x] **Result lock** — Lock results to prevent accidental changes
- [x] **Output:** 5 sector winners + 3 innovation award recipients

### 5.5 Database
- [x] `award_tracks` table — Award/prize category definitions
- [x] `phase_scores` table — Scores per phase (also used for award track scoring via phase association)
- [x] `competition_winners` table — Confirmed winners with award type

---

## 6. REPORTING & ANALYTICS

### 6.1 Real-Time Dashboards
- [x] **Application volume** — Total, daily trend, cumulative chart
- [x] **Sector distribution** — Pie/bar chart by sector
- [x] **Campus distribution** — Breakdown by AD / AA / DHA with quota progress
- [x] **Screening progress** — Eligible / ineligible / incomplete / pending
- [x] **Scoring progress** — Per phase: scored / remaining / flagged

### 6.2 Exportable Reports
- [x] **CSV export** — Full application data with all fields
- [x] **CSV export** — Eligibility outcomes with rule-by-rule results
- [x] **CSV export** — Bootcamp attendance records
- [x] **CSV export** — Jury scores with per-criteria breakdown
- [x] **CSV export** — Finalist outcomes and winner list
- [x] **PDF report** — Competition summary with charts and KPIs (jsPDF + jspdf-autotable)

### 6.3 Post-Competition Analytics
- [x] **Demographics** — Age, gender, nationality distribution (extracted from form_data)
- [x] **Sector distribution** — Applications and winners by sector
- [x] **Campus performance** — Completion rates, advancement rates per campus
- [x] **KPI tracking** — Configurable KPIs with targets and actuals (competition_kpis table + dashboard)
- [x] **Funnel visualization** — Applied → Screened → Bootcamp → Finalist → Winner

### 6.4 Database
- [x] `competition_kpis` table — KPI tracking with targets and actuals
- [x] PDF report generation via jsPDF (no persisted report table needed)

---

## 7. TECHNICAL & OPERATIONAL

### 7.1 Data & Security
- [ ] **UAE data hosting** — Supabase project in Bahrain region (closest)
- [x] **Dashboard access control** — Server-side API auth on all endpoints (RBAC via checkHackathonAccess) + client-side ownership guard for UX
- [x] **UUID validation** — All API route handlers validate path params with `UUID_RE.test()` before any DB query
- [x] **Input validation** — Deep validation of scoring criteria, boolean fields, numeric ranges on all phase/score endpoints
- [x] **Read-only role** — Viewer access for stakeholders (no edit permissions)
- [x] **Fine-grained RBAC** — owner, admin, editor, viewer roles via hackathon_collaborators
- [x] **Audit trail coverage** — Screening results, timestamps, eligibility decisions stored per registration
- [x] **GDPR/UAE compliance** — Consent collection, data retention policy, privacy page, data export/deletion APIs

### 7.2 API & Integration
- [x] **Webhook events** — hackathon.participant.status_changed (via webhook delivery system)
- [x] **API endpoints** — CRUD for applications, screening rules, quotas, screening execution, participants
- [x] **Dual auth** — Session cookies OR API key with scope-based access
- [ ] **M365 integration readiness** — API-first design for potential M365 backend integration

---

## TIMELINE

| Milestone | Target Date | Status |
|---|---|---|
| Platform configured & UAT-complete | April 1, 2026 | 🟢 Feature Complete |
| Applications open | April 6, 2026 | ⬜ Not Started |
| Applications close | June 5, 2026 | ⬜ Not Started |
| Eligibility screening complete | June 26, 2026 | ⬜ Not Started |
| Bootcamp Al Ain | July 6–8, 2026 | ⬜ Not Started |
| Bootcamp Abu Dhabi | August 10–12, 2026 | ⬜ Not Started |
| Bootcamp Al Dhafra | September 7–9, 2026 | ⬜ Not Started |
| Post-bootcamp finalist selection | September 13, 2026 | ⬜ Not Started |
| Final pitch event | Q3 2026 | ⬜ Not Started |

---

## IMPLEMENTATION ORDER

### Phase 1: Application Engine
1. ✅ Database tables + RLS + Storage (7 tables, RLS policies, storage bucket)
2. ✅ Form schema system + API routes (CRUD for forms, applications, rules, quotas, screening)
3. ✅ Dynamic form renderer component (multi-step wizard, 14 field types, conditional logic)
4. ✅ Public application page (/apply/[slug] with auto-prefill, draft saving, validation)
5. ✅ Admin application management (list with filters, status changes, pagination)
6. ✅ File uploads via Cloudinary (authenticated raw file access, public images/video; Supabase Storage bucket exists as fallback)
7. ✅ Draft saving + application preview + editing until deadline

### Phase 2: Screening & Selection
8. ✅ Rule engine + automated eligibility checks (configurable rules, 14 operators, rejection-condition paradigm, hard/soft types)
9. ✅ Duplicate detection system (email, phone, LinkedIn, startup name fuzzy matching)
10. ✅ Quota enforcement + campus quotas (3-state: applicable/soft-flag/not-applicable, fill tracking, smart form disabling)
11. ✅ Screening dashboard (stat cards with screened %, inline failure badges, detailed breakdown in expanded view)
12. ✅ Screening audit trail (per-registration screening_results, screening_completed_at, eligibility_passed)
13. ✅ Run Screening (new apps only) + Force Re-screen (re-screen all, emails only on status change)
14. ✅ Screening results visible in applications tab (hard fails red, soft flags yellow, "Screened" badge)
15. ✅ FCFS campus quota enforcement during screening (accepted/waitlisted statuses)
16. ✅ Quota enforcement toggle (registration vs screening mode)
17. ✅ Publish Results with confirmation dialog (disabled until all screened)
18. ✅ Cancel Registration / Leave Hackathon with automatic waitlist backfill
19. ✅ Comprehensive security audit (UUID validation, RLS granular policies, input validation, race condition fixes)

### Phase 3: Communications
20. ✅ Email template editor + library
21. ✅ Segment-based bulk sending
22. ✅ RSVP/attendance confirmation flow
23. ✅ Email scheduling

### Phase 4: Bootcamp Judging
24. ✅ Configurable scorecard (flexible 0-N scale, per-phase criteria with descriptions)
25. ✅ Reviewer assignment system (auto-assign with round-robin load balancing)
26. ✅ Blind review mode (API + RLS enforced)
27. ✅ Recommend / Do Not Recommend toggle (mandatory when configured)
28. ✅ Majority-rule decision logic (advance/borderline/do_not_advance + override)
29. ✅ Parallel campus scoring (campus_filter per phase)
30. ✅ Reviewer quick-score interface (judge-facing scoring UI)

### Phase 5: Final Scoring & Winners
31. ✅ Weighted final scorecard (is_weighted + weight % per criteria)
32. ✅ Multi-phase jury management (phase_reviewers + phase-gated RLS)
33. ✅ Award-specific scoring tracks
34. ✅ Winner selection + calibration workflow

### Phase 6: Reporting & Export
35. ✅ Competition analytics dashboard
36. ✅ CSV export backend
37. ✅ PDF competition report generator (jsPDF + jspdf-autotable)
38. ✅ Funnel visualization
39. ✅ Demographics analytics (age, gender, nationality from form_data)
40. ✅ KPI tracking with configurable targets and actuals

### Phase 7: Technical Hardening
41. ✅ Pitch room management (parallel rooms with jury panels)
42. ✅ Read-only role implementation + fine-grained RBAC (owner/admin/editor/viewer)
43. ✅ GDPR/UAE compliance (consent, privacy policy, data export/deletion)
44. ⬜ M365 integration readiness (future, API-first design ready)
