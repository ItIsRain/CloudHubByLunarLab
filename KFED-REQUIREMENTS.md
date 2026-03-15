# KFED Competition Platform Requirements

**Client:** Khalifa Fund for Enterprise Development (KFED)
**Competition:** Tri-Campus Entrepreneurship Competition (April – Q3 2026)
**Document Created:** 2026-03-15
**Status:** Implementation In Progress

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
- [x] **File upload support** — PDF, PPT, DOC for pitch decks, trade licenses (up to 10MB) via Cloudinary (access_mode: public for raw files)
- [ ] **Draft saving** — Auto-save and manual save of incomplete applications
- [ ] **Application preview** — Applicants can review before final submission
- [x] **Application confirmation** — Email confirmation on successful submission (via Resend)
- [ ] **Application editing** — Allow edits until deadline (configurable)
- [x] **Public application landing page** — Branded page with competition info + embedded form

### 1.2 Application Management (Admin)
- [x] **Application list view** — Sortable, filterable table of all applications (with expand for detail)
- [x] **Application detail view** — Full read-only view of any application (expanded row with all form fields)
- [x] **Application status pipeline** — pending → under_review → eligible → ineligible → accepted → waitlisted → rejected → cancelled
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
  - [ ] Application completeness score as additional ranking factor
- [x] **Waitlist management** — Auto-waitlist applicants who select a full quota option at registration
- [x] **Quota enforcement toggle** — Organizer chooses "During Registration" (show fills, auto-waitlist on form) vs "During Screening" (enforce quotas when screening runs)
- [x] **Automatic waitlist backfill** — When an accepted user leaves, the next waitlisted person from the same campus is auto-promoted to accepted with email notification

### 2.3 Screening Dashboard
- [x] **Summary cards** — Total applications, Screened (with %), Eligible, Ineligible/Rejected, Accepted
- [x] **Campus breakdown** — Counts by campus with quota progress bars (in Campus Quotas section)
- [ ] **Sector distribution** — Applications by sector
- [x] **Eligibility breakdown** — Per-application screening results with rule-by-rule pass/fail in expanded view
- [x] **Duplicate flags list** — Flagged applications with flag count badges
- [x] **Soft flags list** — Applications with soft flag badges (yellow warning) visible inline + in detail view

### 2.4 Audit Trail
- [x] **Eligibility decision logging** — Every pass/fail recorded with rule reference (screening_results JSONB per registration)
- [ ] **Manual override logging** — When admin overrides automated decision
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
- [ ] **Template editor** — Rich text editor for email templates with placeholders
- [ ] **Template library** — Save/reuse templates (acceptance, waitlist, rejection, reminder)
- [ ] **Dynamic placeholders** — {applicant_name}, {startup_name}, {campus}, {competition_name}, {deadline}, etc.
- [ ] **Template preview** — Preview with sample data before sending

### 3.2 Bulk Communications
- [ ] **Segment-based sending** — Send to: all, accepted, waitlisted, rejected, by campus, by sector
- [ ] **Bulk email dispatch** — Send customized template to filtered recipients
- [ ] **Email scheduling** — Schedule send for future date/time
- [ ] **Reminder automation** — Auto-reminders for: incomplete applications, approaching deadline, attendance confirmation

### 3.3 Attendance Confirmation
- [ ] **RSVP collection** — Accepted applicants confirm/decline attendance
- [ ] **RSVP deadline** — Configurable deadline for confirmation
- [x] **Waitlist promotion** — Auto-advance waitlisted when accepted leaves/cancels (same-campus FCFS backfill)
- [ ] **RSVP dashboard** — Confirmed vs. pending vs. declined counts

### 3.4 Database
- [ ] `email_templates` table — Saved email templates
- [ ] `scheduled_emails` table — Queued emails with send_at timestamp
- [ ] `email_log` table — Delivery tracking (sent, opened, bounced)

---

## 4. POST-BOOTCAMP FINALIST SELECTION (150 → 15)

### 4.1 Configurable Scorecard
- [x] **Custom criteria** — Configurable scoring criteria per competition phase (JSONB array on competition_phases)
- [x] **Flexible scale** — Support 0-3, 0-5, 0-10 scales per criteria (scoring_scale_max 1-100)
- [x] **Criteria descriptions** — Help text for each criteria to guide reviewers
- [ ] **KFED Bootcamp Scorecard:**
  - [ ] Problem-Solution Fit (0–3)
  - [ ] Execution Readiness (0–3)
  - [ ] Traction & Validation (0–3)

### 4.2 Reviewer Assignments
- [x] **Assignment matrix** — Map specific reviewers to specific applications/startups (reviewer_assignments table)
- [x] **3 reviewers per startup** — Configurable reviewer count per phase
- [x] **Blind review** — Reviewers see only own scores (enforced at API level + RLS)
- [ ] **Conflict of interest** — Flag/prevent reviewer from scoring own startup or declared conflicts
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
- [ ] **Finalist quota enforcement** — 15 total (configurable per campus)

### 4.5 Parallel Scoring Support
- [x] **Campus-based sessions** — Independent phases per campus with campus_filter
- [ ] **Pitch room management** — Multiple parallel rooms with separate jury panels
- [x] **Real-time aggregation** — Live score/assignment/decision counts per phase

### 4.6 Reviewer Dashboard
- [x] **Progress tracker** — Score count vs assignment count per phase (organizer view)
- [ ] **Quick-score interface** — Optimized for rapid scoring during live pitches (2-4 min per scorecard)
- [ ] **Score history** — View and edit own submitted scores
- [x] **Flagged submissions** — Mark for calibration review (flagged field on phase_scores)

### 4.7 Database
- [x] `competition_phases` table — Phase definitions with scoring config, campus filter, reviewer count, blind review
- [x] `reviewer_assignments` table — Judge-to-application mapping with phase scope
- [x] `phase_scores` table — Scores per phase with recommendation field, criteria_scores JSONB
- [x] `phase_decisions` table — Advancement decisions with rationale, override tracking

---

## 5. FINAL EVENT SCORING & WINNER SELECTION (15 → 8)

### 5.1 Weighted Scorecard
- [ ] **KFED Final Scorecard:**
  - [ ] Sectoral Impact (30%)
  - [ ] Market Potential & Scalability (25%)
  - [ ] Team Assessment (25%)
  - [ ] Technical Feasibility & Execution (20%)
- [x] **Configurable weights** — Admin can adjust weights per phase (is_weighted + weight field on criteria)

### 5.2 Multi-Phase Jury Management
- [x] **Separate jury panels** — Different phase_reviewers per phase
- [x] **Jury invitation per phase** — Invite judges to specific competition phase (phase_reviewers table)
- [x] **Phase-gated access** — RLS policies restrict reviewers to assigned phases only

### 5.3 Award-Specific Scoring
- [ ] **Innovation award tracks:**
  - [ ] AI Innovation Award
  - [ ] Robotics Innovation Award
  - [ ] Sustainability Innovation Award
- [ ] **Track-specific criteria** — Separate scorecard per award category
- [ ] **Track jury assignment** — Assign specific judges to specific award tracks
- [ ] **Track winner selection** — Independent ranking per award track

### 5.4 Winner Selection Workflow
- [ ] **Calibration step** — Jury discussion phase before final lock-in
- [ ] **Score review dashboard** — Side-by-side comparison of finalists
- [ ] **Winner confirmation** — Admin confirms winners before announcement
- [ ] **Result lock** — Lock results to prevent accidental changes
- [ ] **Output:** 5 sector winners + 3 innovation award recipients

### 5.5 Database
- [ ] `award_tracks` table — Award/prize category definitions
- [ ] `award_scores` table — Scores per award track
- [ ] `competition_winners` table — Confirmed winners with award type

---

## 6. REPORTING & ANALYTICS

### 6.1 Real-Time Dashboards
- [ ] **Application volume** — Total, daily trend, cumulative chart
- [ ] **Sector distribution** — Pie/bar chart by sector
- [ ] **Campus distribution** — Breakdown by AD / AA / DHA with quota progress
- [ ] **Screening progress** — Eligible / ineligible / incomplete / pending
- [ ] **Scoring progress** — Per phase: scored / remaining / flagged

### 6.2 Exportable Reports
- [ ] **CSV export** — Full application data with all fields
- [ ] **CSV export** — Eligibility outcomes with rule-by-rule results
- [ ] **CSV export** — Bootcamp attendance records
- [ ] **CSV export** — Jury scores with per-criteria breakdown
- [ ] **CSV export** — Finalist outcomes and winner list
- [ ] **PDF report** — Competition summary with charts and KPIs

### 6.3 Post-Competition Analytics
- [ ] **Demographics** — Age, gender, nationality distribution
- [ ] **Sector distribution** — Applications and winners by sector
- [ ] **Campus performance** — Completion rates, advancement rates per campus
- [ ] **KPI tracking** — Configurable KPIs with targets and actuals
- [ ] **Funnel visualization** — Applied → Screened → Bootcamp → Finalist → Winner

### 6.4 Database
- [ ] `competition_reports` table — Saved/generated report metadata
- [ ] Materialized views for dashboard aggregations

---

## 7. TECHNICAL & OPERATIONAL

### 7.1 Data & Security
- [ ] **UAE data hosting** — Supabase project in Bahrain region (closest)
- [x] **Dashboard access control** — Client-side ownership guard (organizer_id check) + server-side API auth on all endpoints
- [x] **UUID validation** — All API route handlers validate path params with `UUID_RE.test()` before any DB query
- [x] **Input validation** — Deep validation of scoring criteria, boolean fields, numeric ranges on all phase/score endpoints
- [ ] **Read-only role** — Viewer access for stakeholders (no edit permissions)
- [ ] **Fine-grained RBAC** — competition_admin, reviewer, read_only roles
- [x] **Audit trail coverage** — Screening results, timestamps, eligibility decisions stored per registration
- [ ] **GDPR/UAE compliance** — Consent collection, data retention policy, export self-service

### 7.2 API & Integration
- [x] **Webhook events** — hackathon.participant.status_changed (via webhook delivery system)
- [x] **API endpoints** — CRUD for applications, screening rules, quotas, screening execution, participants
- [x] **Dual auth** — Session cookies OR API key with scope-based access
- [ ] **M365 integration readiness** — API-first design for potential M365 backend integration

---

## TIMELINE

| Milestone | Target Date | Status |
|---|---|---|
| Platform configured & UAT-complete | April 1, 2026 | 🟡 In Progress |
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

### Phase 1: Application Engine (CURRENT)
1. ✅ Database tables + RLS + Storage (7 tables, RLS policies, storage bucket)
2. ✅ Form schema system + API routes (CRUD for forms, applications, rules, quotas, screening)
3. ✅ Dynamic form renderer component (multi-step wizard, 14 field types, conditional logic)
4. ✅ Public application page (/apply/[slug] with auto-prefill, draft saving, validation)
5. ✅ Admin application management (list with filters, status changes, pagination)
6. ⬜ File upload to Supabase Storage (UI exists, needs storage integration)

### Phase 2: Screening & Selection
7. ✅ Rule engine + automated eligibility checks (configurable rules, 14 operators, rejection-condition paradigm, hard/soft types)
8. ✅ Duplicate detection system (email, phone, LinkedIn, startup name fuzzy matching)
9. ✅ Quota enforcement + campus quotas (3-state: applicable/soft-flag/not-applicable, fill tracking, smart form disabling)
10. ✅ Screening dashboard (stat cards with screened %, inline failure badges, detailed breakdown in expanded view)
11. ✅ Screening audit trail (per-registration screening_results, screening_completed_at, eligibility_passed)
12. ✅ Run Screening (new apps only) + Force Re-screen (re-screen all, emails only on status change)
13. ✅ Screening results visible in applications tab (hard fails red, soft flags yellow, "Screened" badge)
14. ✅ FCFS campus quota enforcement during screening (accepted/waitlisted statuses)
15. ✅ Quota enforcement toggle (registration vs screening mode)
16. ✅ Publish Results with confirmation dialog (disabled until all screened)
17. ✅ Cancel Registration / Leave Hackathon with automatic waitlist backfill
18. ✅ Comprehensive security audit (UUID validation, RLS granular policies, input validation, race condition fixes)

### Phase 3: Communications
12. ⬜ Email template editor + library
13. ⬜ Segment-based bulk sending
14. ⬜ RSVP/attendance confirmation flow
15. ⬜ Email scheduling

### Phase 4: Bootcamp Judging
16. ✅ Configurable scorecard (flexible 0-N scale, per-phase criteria with descriptions)
17. ✅ Reviewer assignment system (auto-assign with round-robin load balancing)
18. ✅ Blind review mode (API + RLS enforced)
19. ✅ Recommend / Do Not Recommend toggle (mandatory when configured)
20. ✅ Majority-rule decision logic (advance/borderline/do_not_advance + override)
21. ✅ Parallel campus scoring (campus_filter per phase)
22. ⬜ Reviewer quick-score interface (judge-facing scoring UI)

### Phase 5: Final Scoring & Winners
23. ✅ Weighted final scorecard (is_weighted + weight % per criteria)
24. ✅ Multi-phase jury management (phase_reviewers + phase-gated RLS)
25. ⬜ Award-specific scoring tracks
26. ⬜ Winner selection + calibration workflow

### Phase 6: Reporting & Export
27. ⬜ Competition analytics dashboard
28. ⬜ CSV/PDF export backend
29. ⬜ Post-competition report generator
30. ⬜ Funnel visualization

### Phase 7: Technical Hardening
31. ⬜ Read-only role implementation
32. ⬜ Full audit trail coverage
33. ⬜ Competition-specific webhook events
34. ⬜ GDPR/UAE compliance features
