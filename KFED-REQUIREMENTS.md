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
- [ ] **Configurable form schema system** — JSON-based field definitions (text, textarea, select, multi-select, checkbox, radio, number, email, phone, URL, date, file upload)
- [ ] **Dynamic form renderer** — Renders forms from schema with validation
- [ ] **Multi-step form wizard** — Break long applications into logical sections
- [ ] **Field validation rules** — Required, min/max length, regex patterns, conditional visibility
- [ ] **Conditional logic** — Show/hide fields based on other field values
- [ ] **File upload support** — PDF, PPT, DOC for pitch decks, trade licenses (up to 10MB)
- [ ] **Draft saving** — Auto-save and manual save of incomplete applications
- [ ] **Application preview** — Applicants can review before final submission
- [ ] **Application confirmation** — Email confirmation on successful submission
- [ ] **Application editing** — Allow edits until deadline (configurable)
- [ ] **Public application landing page** — Branded page with competition info + embedded form

### 1.2 Application Management (Admin)
- [ ] **Application list view** — Sortable, filterable table of all applications
- [ ] **Application detail view** — Full read-only view of any application
- [ ] **Application status pipeline** — submitted → under-review → accepted → waitlisted → rejected
- [ ] **Bulk status updates** — Select multiple and change status
- [ ] **Application search** — Full-text search across all fields
- [ ] **Application filters** — By status, campus, sector, date range, completeness
- [ ] **Application notes** — Internal reviewer notes per application

### 1.3 Database
- [x] `competition_forms` table — Form schema definitions
- [x] `competition_applications` table — Submitted application data
- [x] `application_files` table — Uploaded file references
- [x] Supabase Storage bucket for application files
- [x] RLS policies for applications

---

## 2. SCREENING & SELECTION

### 2.1 Automated Eligibility Checks
- [ ] **Rule engine** — Configurable pass/fail rules on structured fields
- [ ] **Hard eligibility filters:**
  - [ ] Age verification (18+)
  - [ ] Residency check (Abu Dhabi / Al Ain / Al Dhafra)
  - [ ] Ownership confirmation (Emirati ownership/co-ownership)
  - [ ] Startup stage filter (≥ prototype/MVP)
  - [ ] Availability confirmation (bootcamp + final pitch)
- [ ] **Completeness check** — All required fields filled, mandatory commitments ticked
- [ ] **Duplicate detection:**
  - [ ] Matching email addresses
  - [ ] Matching phone numbers
  - [ ] Matching LinkedIn URLs
  - [ ] Matching startup names (fuzzy match)
  - [ ] Flag duplicates for review (don't auto-reject)
- [ ] **Soft flags** (reviewer awareness, not disqualification):
  - [ ] No pitch deck uploaded
  - [ ] No website provided
  - [ ] No trade license
  - [ ] Residency = "Other"

### 2.2 Quota Enforcement
- [ ] **Campus-based quotas** — 75 Abu Dhabi, 50 Al Ain, 25 Al Dhafra
- [ ] **Overflow ranking** — When eligible > quota, rank by:
  - [ ] Application completeness score (pitch deck, website, trade license, traction)
  - [ ] First-come-first-served as tiebreaker
- [ ] **Waitlist management** — Auto-waitlist overflow applicants

### 2.3 Screening Dashboard
- [ ] **Summary cards** — Total applications, eligible, ineligible, incomplete, pending review
- [ ] **Campus breakdown** — Counts by campus (AD / AA / DHA) with quota progress bars
- [ ] **Sector distribution** — Applications by sector
- [ ] **Eligibility breakdown** — Pass/fail counts per rule
- [ ] **Duplicate flags list** — Flagged applications requiring manual review
- [ ] **Soft flags list** — Applications with warnings

### 2.4 Audit Trail
- [ ] **Eligibility decision logging** — Every pass/fail recorded with rule reference
- [ ] **Manual override logging** — When admin overrides automated decision
- [ ] **Screening completion timestamp** — When screening was finalized

### 2.5 Database
- [x] `screening_rules` table — Configurable eligibility rules
- [x] `screening_results` table — Per-application eligibility outcomes
- [x] `screening_flags` table — Duplicate and soft flag records
- [x] `campus_quotas` table — Configurable per-campus quotas
- [x] `application_campus_summary` view — Aggregated stats by campus

---

## 3. APPLICANT COMMUNICATIONS

### 3.1 Email Templates
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
- [ ] **Waitlist promotion** — Auto-advance waitlisted when accepted declines
- [ ] **RSVP dashboard** — Confirmed vs. pending vs. declined counts

### 3.4 Database
- [ ] `email_templates` table — Saved email templates
- [ ] `scheduled_emails` table — Queued emails with send_at timestamp
- [ ] `email_log` table — Delivery tracking (sent, opened, bounced)

---

## 4. POST-BOOTCAMP FINALIST SELECTION (150 → 15)

### 4.1 Configurable Scorecard
- [ ] **Custom criteria** — Configurable scoring criteria per competition phase
- [ ] **Flexible scale** — Support 0-3, 0-5, 0-10 scales per criteria
- [ ] **Criteria descriptions** — Help text for each criteria to guide reviewers
- [ ] **KFED Bootcamp Scorecard:**
  - [ ] Problem-Solution Fit (0–3)
  - [ ] Execution Readiness (0–3)
  - [ ] Traction & Validation (0–3)

### 4.2 Reviewer Assignments
- [ ] **Assignment matrix** — Map specific reviewers to specific applications/startups
- [ ] **3 reviewers per startup** — Configurable reviewer count
- [ ] **Blind review** — Reviewers cannot see each other's scores until all submitted
- [ ] **Conflict of interest** — Flag/prevent reviewer from scoring own startup or declared conflicts
- [ ] **Load balancing** — Distribute reviews evenly across available reviewers
- [ ] **Auto-assignment** — Algorithm to assign reviewers respecting constraints

### 4.3 Binary Recommendation
- [ ] **Recommend / Do Not Recommend toggle** — Per reviewer, per startup
- [ ] **Mandatory before submission** — Cannot submit score without recommendation

### 4.4 Decision Logic
- [ ] **Majority rule engine:**
  - [ ] 3/3 Recommend → Advances
  - [ ] 2/3 Recommend → Advances
  - [ ] 1/3 Recommend → Does not advance (unless borderline triggers calibration)
  - [ ] 0/3 Recommend → Does not advance
- [ ] **Borderline detection** — Flag applications near the cutoff for calibration review
- [ ] **Calibration mode** — Admin can review and override borderline decisions
- [ ] **Finalist quota enforcement** — 15 total (configurable per campus)

### 4.5 Parallel Scoring Support
- [ ] **Campus-based sessions** — Independent scoring per campus (AD, AA, DHA)
- [ ] **Pitch room management** — Multiple parallel rooms with separate jury panels
- [ ] **Real-time aggregation** — Live score updates per campus

### 4.6 Reviewer Dashboard
- [ ] **Progress tracker** — Scored / remaining / flagged counts
- [ ] **Quick-score interface** — Optimized for rapid scoring during live pitches (2-4 min per scorecard)
- [ ] **Score history** — View and edit own submitted scores
- [ ] **Flagged submissions** — Mark for calibration review

### 4.7 Database
- [ ] `competition_phases` table — Phase definitions with scoring config
- [ ] `reviewer_assignments` table — Judge-to-application mapping
- [ ] `phase_scores` table — Scores per phase with recommendation field
- [ ] `phase_decisions` table — Advancement decisions with rationale

---

## 5. FINAL EVENT SCORING & WINNER SELECTION (15 → 8)

### 5.1 Weighted Scorecard
- [ ] **KFED Final Scorecard:**
  - [ ] Sectoral Impact (30%)
  - [ ] Market Potential & Scalability (25%)
  - [ ] Team Assessment (25%)
  - [ ] Technical Feasibility & Execution (20%)
- [ ] **Configurable weights** — Admin can adjust weights per competition

### 5.2 Multi-Phase Jury Management
- [ ] **Separate jury panels** — Different judges for bootcamp vs. final
- [ ] **Jury invitation per phase** — Invite judges to specific competition phase
- [ ] **Phase-gated access** — Judges only see their assigned phase

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
- [ ] **Read-only role** — Viewer access for stakeholders (no edit permissions)
- [ ] **Fine-grained RBAC** — competition_admin, reviewer, read_only roles
- [ ] **Audit trail coverage** — All screening, scoring, and override decisions logged
- [ ] **GDPR/UAE compliance** — Consent collection, data retention policy, export self-service

### 7.2 API & Integration
- [ ] **Webhook events** — application.submitted, application.status_changed, screening.completed, score.submitted, winner.announced
- [ ] **API endpoints** — CRUD for applications, screening results, scores, winners
- [ ] **M365 integration readiness** — API-first design for potential M365 backend integration

---

## TIMELINE

| Milestone | Target Date | Status |
|---|---|---|
| Platform configured & UAT-complete | April 1, 2026 | ⬜ Not Started |
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
7. ✅ Rule engine + automated eligibility checks (configurable rules, 14 operators, hard/soft types)
8. ✅ Duplicate detection system (email, phone, LinkedIn, startup name fuzzy matching)
9. ✅ Quota enforcement + campus quotas API (overflow ranking needs UI)
10. ✅ Screening dashboard (summary cards, campus distribution, flag counts, run screening button)
11. ✅ Screening audit trail (all screening runs logged via audit system)

### Phase 3: Communications
12. ⬜ Email template editor + library
13. ⬜ Segment-based bulk sending
14. ⬜ RSVP/attendance confirmation flow
15. ⬜ Email scheduling

### Phase 4: Bootcamp Judging
16. ⬜ Configurable scorecard (0-3 scale)
17. ⬜ Reviewer assignment system
18. ⬜ Blind review mode
19. ⬜ Recommend / Do Not Recommend toggle
20. ⬜ Majority-rule decision logic
21. ⬜ Parallel campus scoring
22. ⬜ Reviewer dashboard

### Phase 5: Final Scoring & Winners
23. ⬜ Weighted final scorecard
24. ⬜ Multi-phase jury management
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
