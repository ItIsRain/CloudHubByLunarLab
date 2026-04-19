import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import { checkHackathonAccess } from "@/lib/check-hackathon-access";
import { checkRateLimit } from "@/lib/rate-limit";

// ── Stat helpers ───────────────────────────────────────
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(arr: number[], mean: number): number {
  if (arr.length < 2) return 0;
  const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function hoursBetween(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60);
}

function buildHistogram(values: number[], bucketSize: number): { bucket: string; count: number }[] {
  if (values.length === 0) return [];
  const maxVal = Math.max(...values);
  const buckets: Record<string, number> = {};
  for (let lo = 0; lo <= maxVal; lo += bucketSize) {
    const hi = lo + bucketSize;
    buckets[`${lo}-${hi}`] = 0;
  }
  for (const v of values) {
    const lo = Math.floor(v / bucketSize) * bucketSize;
    const hi = lo + bucketSize;
    const key = `${lo}-${hi}`;
    buckets[key] = (buckets[key] || 0) + 1;
  }
  return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
    }

    // Dual auth: session cookies OR API key
    const auth = await authenticateRequest(request);

    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Verify user has access (any collaborator role can view analytics)
    const access = await checkHackathonAccess(supabase, hackathonId, auth.userId);
    if (!access.hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limit: 30 requests per user per minute (analytics is compute-heavy)
    const rl = checkRateLimit(auth.userId, { namespace: "analytics", limit: 30, windowMs: 60_000 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("screening_config")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    const screeningConfig = (hackathon.screening_config as Record<string, unknown>) || {};
    const quotaFieldId = screeningConfig.quotaFieldId as string | undefined;

    // ── Parallel data fetches ──────────────────────────────────
    const [
      regResult,
      teamResult,
      submissionResult,
      phasesResult,
      rsvpResult,
    ] = await Promise.all([
      // 1. All registrations (for status counts, timeline, campus, funnel)
      supabase
        .from("hackathon_registrations")
        .select("id, status, created_at, form_data, screening_completed_at, rsvp_status")
        .eq("hackathon_id", hackathonId),
      // 2. Team count
      supabase
        .from("teams")
        .select("id", { count: "exact", head: true })
        .eq("hackathon_id", hackathonId),
      // 3. Submissions with track data
      supabase
        .from("submissions")
        .select("id, track")
        .eq("hackathon_id", hackathonId),
      // 4. Competition phases
      supabase
        .from("competition_phases")
        .select("id, name, sort_order, status, scoring_criteria")
        .eq("hackathon_id", hackathonId)
        .order("sort_order", { ascending: true }),
      // 5. RSVP data from accepted/approved registrations
      supabase
        .from("hackathon_registrations")
        .select("rsvp_status")
        .eq("hackathon_id", hackathonId)
        .in("status", ["accepted", "approved"]),
    ]);

    if (regResult.error) {
      return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 400 });
    }
    if (teamResult.error) {
      return NextResponse.json({ error: "Failed to fetch teams" }, { status: 400 });
    }
    if (submissionResult.error) {
      return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 400 });
    }

    const registrations = regResult.data || [];
    const submissions = submissionResult.data || [];
    const phases = phasesResult.data || [];

    // ── 1. Registration counts by status ───────────────────────
    const registrationsByStatus: Record<string, number> = {};
    const timelineMap: Record<string, number> = {};
    const cumulativeMap: Record<string, number> = {};
    const campusMap: Record<string, number> = {};

    for (const reg of registrations) {
      const status = reg.status as string;
      registrationsByStatus[status] = (registrationsByStatus[status] || 0) + 1;

      // Daily timeline (new applications per day)
      const day = (reg.created_at as string).slice(0, 10);
      timelineMap[day] = (timelineMap[day] || 0) + 1;

      // Campus distribution from form_data
      if (quotaFieldId) {
        const formData = reg.form_data as Record<string, unknown> | null;
        if (formData) {
          const campusValue = String(formData[quotaFieldId] || "");
          if (campusValue) {
            campusMap[campusValue] = (campusMap[campusValue] || 0) + 1;
          }
        }
      }
    }

    // Sort timeline chronologically
    const registrationTimeline = Object.entries(timelineMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Build cumulative registration timeline
    let runningTotal = 0;
    const registrationsByDate = registrationTimeline.map(({ date, count }) => {
      runningTotal += count;
      return { date, count, cumulative: runningTotal };
    });

    // Campus distribution as Record
    const registrationsByCampus: Record<string, number> = campusMap;

    // ── 2. Track distribution from submissions ─────────────────
    const trackMap: Record<string, number> = {};
    for (const sub of submissions) {
      const track = sub.track as { name?: string } | null;
      const trackName = track?.name || "Unassigned";
      trackMap[trackName] = (trackMap[trackName] || 0) + 1;
    }
    const trackDistribution = Object.entries(trackMap).map(
      ([track, count]) => ({ track, count })
    );

    // ── 3. Scoring progress — overall and per-phase ────────────
    const submissionIds = submissions.map((s) => s.id as string);
    let overallScored = 0;

    // Fetch scored submissions for overall progress
    if (submissionIds.length > 0) {
      const { data: scoredRows } = await supabase
        .from("scores")
        .select("submission_id")
        .in("submission_id", submissionIds);

      const scoredSubmissionIds = new Set(
        (scoredRows || []).map(
          (r: Record<string, unknown>) => r.submission_id as string
        )
      );
      overallScored = scoredSubmissionIds.size;
    }

    // Per-phase scoring progress
    const phaseIds = phases.map((p) => (p as Record<string, unknown>).id as string);
    let scoringProgressByPhase: {
      phaseId: string;
      phaseName: string;
      scored: number;
      total: number;
    }[] = [];

    // Declare phase-related result variables outside the if block so sections 12-16 can access them
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let assignmentsResult: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let phaseScoresResult: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let decisionsResult: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let reviewersResult: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finalistsResult: any = null;

    if (phaseIds.length > 0) {
      // Fetch assignments, scores, decisions, reviewers, and finalists in parallel
      [assignmentsResult, phaseScoresResult, decisionsResult, reviewersResult, finalistsResult] = await Promise.all([
        supabase
          .from("reviewer_assignments")
          .select("phase_id, reviewer_id, registration_id, assigned_at")
          .in("phase_id", phaseIds),
        supabase
          .from("phase_scores")
          .select("phase_id, reviewer_id, registration_id, total_score, criteria_scores, recommendation, flagged, submitted_at")
          .in("phase_id", phaseIds),
        supabase
          .from("phase_decisions")
          .select("phase_id, registration_id, decision, average_score, is_override, recommendation_count, total_reviewers, created_at")
          .in("phase_id", phaseIds),
        supabase
          .from("phase_reviewers")
          .select("id, phase_id, user_id, name, email, status, invited_at, accepted_at")
          .in("phase_id", phaseIds),
        supabase
          .from("phase_finalists")
          .select("phase_id, registration_id")
          .in("phase_id", phaseIds),
      ]);

      // Count unique registrations assigned per phase
      const assignmentsByPhase: Record<string, Set<string>> = {};
      for (const a of assignmentsResult.data || []) {
        const row = a as Record<string, unknown>;
        const pid = row.phase_id as string;
        const rid = row.registration_id as string;
        if (!assignmentsByPhase[pid]) {
          assignmentsByPhase[pid] = new Set();
        }
        assignmentsByPhase[pid].add(rid);
      }

      // Count unique registrations scored per phase
      const scoresByPhase: Record<string, Set<string>> = {};
      for (const s of phaseScoresResult.data || []) {
        const row = s as Record<string, unknown>;
        const pid = row.phase_id as string;
        const rid = row.registration_id as string;
        if (!scoresByPhase[pid]) {
          scoresByPhase[pid] = new Set();
        }
        scoresByPhase[pid].add(rid);
      }

      scoringProgressByPhase = phases.map((p) => {
        const row = p as Record<string, unknown>;
        const pid = row.id as string;
        return {
          phaseId: pid,
          phaseName: row.name as string,
          scored: scoresByPhase[pid]?.size || 0,
          total: assignmentsByPhase[pid]?.size || 0,
        };
      });
    }

    // ── 4. RSVP stats ──────────────────────────────────────────
    const rsvpStats = { confirmed: 0, pending: 0, declined: 0 };
    for (const reg of rsvpResult.data || []) {
      const rsvpStatus = reg.rsvp_status as string | null;
      if (rsvpStatus === "confirmed") {
        rsvpStats.confirmed++;
      } else if (rsvpStatus === "declined") {
        rsvpStats.declined++;
      } else {
        rsvpStats.pending++;
      }
    }

    // ── 5. Funnel data ─────────────────────────────────────────
    const totalApplied = registrations.length;
    const screened = registrations.filter(
      (r) => (r as Record<string, unknown>).screening_completed_at !== null
    ).length;

    const eligibleStatuses = ["eligible", "accepted", "approved", "confirmed", "waitlisted"];
    const eligible = registrations.filter((r) =>
      eligibleStatuses.includes(r.status as string)
    ).length;

    const acceptedStatuses = ["accepted", "approved", "confirmed"];
    const accepted = registrations.filter((r) =>
      acceptedStatuses.includes(r.status as string)
    ).length;

    const confirmed = registrations.filter(
      (r) => (r as Record<string, unknown>).rsvp_status === "confirmed"
    ).length;

    const funnelData = {
      applied: totalApplied,
      screened,
      eligible,
      accepted,
      confirmed,
    };

    // ── 6. Screening progress breakdown ────────────────────────
    const screeningProgress = {
      eligible: registrationsByStatus["eligible"] || 0,
      ineligible: registrationsByStatus["ineligible"] || 0,
      underReview: registrationsByStatus["under_review"] || 0,
      pending: (registrationsByStatus["pending"] || 0) + (registrationsByStatus["confirmed"] || 0),
      screened,
      total: totalApplied,
    };

    // ── 7. Campus performance (advancement rates) ───────────────
    const campusPerformance: Record<string, {
      total: number; screened: number; eligible: number; accepted: number; confirmed: number;
    }> = {};
    if (quotaFieldId) {
      for (const reg of registrations) {
        const formData = reg.form_data as Record<string, unknown> | null;
        const campusValue = formData ? String(formData[quotaFieldId] || "") : "";
        if (!campusValue) continue;
        if (!campusPerformance[campusValue]) {
          campusPerformance[campusValue] = { total: 0, screened: 0, eligible: 0, accepted: 0, confirmed: 0 };
        }
        const cp = campusPerformance[campusValue];
        cp.total++;
        if ((reg as Record<string, unknown>).screening_completed_at) cp.screened++;
        const st = reg.status as string;
        if (eligibleStatuses.includes(st)) cp.eligible++;
        if (acceptedStatuses.includes(st)) cp.accepted++;
        if ((reg as Record<string, unknown>).rsvp_status === "confirmed") cp.confirmed++;
      }
    }

    // ── 8. Demographics extraction from form_data ───────────────
    const ageDistribution: Record<string, number> = {};
    const genderDistribution: Record<string, number> = {};
    const nationalityDistribution: Record<string, number> = {};

    const ageFieldNames = ["age", "birth", "dob", "date_of_birth"];
    const genderFieldNames = ["gender", "sex"];
    const nationalityFieldNames = ["nationality", "country", "citizen"];

    for (const reg of registrations) {
      const formData = reg.form_data as Record<string, unknown> | null;
      if (!formData) continue;

      // --- Age / DOB ---
      let ageValue = "";
      for (const fieldName of ageFieldNames) {
        for (const [key, val] of Object.entries(formData)) {
          if (key.toLowerCase().includes(fieldName) && val != null && String(val)) {
            ageValue = String(val);
            break;
          }
        }
        if (ageValue) break;
      }
      if (ageValue) {
        let numericAge: number | null = null;
        const parsed = parseInt(ageValue, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed < 150) {
          numericAge = parsed;
        } else {
          // Try parsing as a date of birth
          const dateVal = new Date(ageValue);
          if (!isNaN(dateVal.getTime())) {
            const today = new Date();
            let age = today.getFullYear() - dateVal.getFullYear();
            const monthDiff = today.getMonth() - dateVal.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateVal.getDate())) {
              age--;
            }
            if (age > 0 && age < 150) {
              numericAge = age;
            }
          }
        }
        if (numericAge !== null) {
          let bracket: string;
          if (numericAge < 18) {
            bracket = "Under 18";
          } else if (numericAge <= 24) {
            bracket = "18-24";
          } else if (numericAge <= 34) {
            bracket = "25-34";
          } else if (numericAge <= 44) {
            bracket = "35-44";
          } else if (numericAge <= 54) {
            bracket = "45-54";
          } else {
            bracket = "55+";
          }
          ageDistribution[bracket] = (ageDistribution[bracket] || 0) + 1;
        }
      }

      // --- Gender ---
      let genderValue = "";
      for (const fieldName of genderFieldNames) {
        for (const [key, val] of Object.entries(formData)) {
          if (key.toLowerCase().includes(fieldName) && typeof val === "string" && val) {
            genderValue = val.trim();
            break;
          }
        }
        if (genderValue) break;
      }
      if (genderValue) {
        // Normalize common values
        const lower = genderValue.toLowerCase();
        let normalized: string;
        if (lower === "m" || lower === "male") {
          normalized = "Male";
        } else if (lower === "f" || lower === "female") {
          normalized = "Female";
        } else if (lower.includes("non-binary") || lower.includes("nonbinary") || lower.includes("non binary")) {
          normalized = "Non-binary";
        } else if (lower.includes("prefer not") || lower.includes("rather not")) {
          normalized = "Prefer not to say";
        } else {
          // Capitalize first letter
          normalized = genderValue.charAt(0).toUpperCase() + genderValue.slice(1).toLowerCase();
        }
        genderDistribution[normalized] = (genderDistribution[normalized] || 0) + 1;
      }

      // --- Nationality ---
      let nationalityValue = "";
      for (const fieldName of nationalityFieldNames) {
        for (const [key, val] of Object.entries(formData)) {
          if (key.toLowerCase().includes(fieldName) && typeof val === "string" && val) {
            nationalityValue = val.trim();
            break;
          }
        }
        if (nationalityValue) break;
      }
      if (nationalityValue) {
        // Capitalize first letter of each word
        const normalized = nationalityValue
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
        nationalityDistribution[normalized] = (nationalityDistribution[normalized] || 0) + 1;
      }
    }

    const demographics = {
      ageDistribution,
      genderDistribution,
      nationalityDistribution,
    };

    // ── 10. Sector distribution from form_data ──────────────────
    const sectorFieldNames = ["sector", "industry", "business_sector", "startup_sector"];
    const sectorMap: Record<string, number> = {};
    for (const reg of registrations) {
      const formData = reg.form_data as Record<string, unknown> | null;
      if (!formData) continue;
      let sectorValue = "";
      for (const fieldName of sectorFieldNames) {
        for (const [key, val] of Object.entries(formData)) {
          if (key.toLowerCase().includes(fieldName) && typeof val === "string" && val) {
            sectorValue = val;
            break;
          }
        }
        if (sectorValue) break;
      }
      if (sectorValue) {
        sectorMap[sectorValue] = (sectorMap[sectorValue] || 0) + 1;
      }
    }
    const sectorDistribution: Record<string, number> = sectorMap;

    // ── 11. Winner distribution (if any) ────────────────────────
    const { data: winners } = await supabase
      .from("competition_winners")
      .select("id, award_track_id, registration_id, rank, final_score, confirmed, locked")
      .eq("hackathon_id", hackathonId);

    const winnerCount = winners?.length || 0;
    const confirmedWinners = winners?.filter((w) => (w as Record<string, unknown>).confirmed).length || 0;
    const lockedWinners = winners?.filter((w) => (w as Record<string, unknown>).locked).length || 0;

    // ── 12. Reviewer Activity ──────────────────────────────────
    const allReviewers: Record<string, unknown>[] = reviewersResult?.data || [];
    const allScoreRows: Record<string, unknown>[] = phaseScoresResult?.data || [];
    const allAssignments: Record<string, unknown>[] = assignmentsResult?.data || [];

    // Build reviewer activity map
    const reviewerAssignCounts: Record<string, number> = {};
    const reviewerScoreCounts: Record<string, number> = {};
    const reviewerScoreSums: Record<string, number> = {};
    const reviewerRecommendCounts: Record<string, number> = {};
    const reviewerDNRCounts: Record<string, number> = {};
    const reviewerFlagCounts: Record<string, number> = {};
    const reviewerPhases: Record<string, Set<string>> = {};

    for (const a of allAssignments) {
      const row = a as Record<string, unknown>;
      const rid = row.reviewer_id as string;
      reviewerAssignCounts[rid] = (reviewerAssignCounts[rid] || 0) + 1;
      if (!reviewerPhases[rid]) reviewerPhases[rid] = new Set();
      reviewerPhases[rid].add(row.phase_id as string);
    }

    for (const s of allScoreRows) {
      const row = s as Record<string, unknown>;
      const rid = row.reviewer_id as string;
      const score = Number(row.total_score) || 0;
      reviewerScoreCounts[rid] = (reviewerScoreCounts[rid] || 0) + 1;
      reviewerScoreSums[rid] = (reviewerScoreSums[rid] || 0) + score;
      if (row.recommendation === "recommend") reviewerRecommendCounts[rid] = (reviewerRecommendCounts[rid] || 0) + 1;
      if (row.recommendation === "do_not_recommend") reviewerDNRCounts[rid] = (reviewerDNRCounts[rid] || 0) + 1;
      if (row.flagged) reviewerFlagCounts[rid] = (reviewerFlagCounts[rid] || 0) + 1;
    }

    const reviewerActivityList = allReviewers.map((r) => {
      const row = r as Record<string, unknown>;
      const uid = row.user_id as string;
      const assigned = reviewerAssignCounts[uid] || 0;
      const scored = reviewerScoreCounts[uid] || 0;
      return {
        reviewerId: uid,
        name: row.name as string,
        email: row.email as string,
        status: row.status as string,
        assignedCount: assigned,
        scoredCount: scored,
        completionRate: assigned > 0 ? Math.round((scored / assigned) * 100) / 100 : 0,
        avgScoreGiven: scored > 0 ? Math.round(((reviewerScoreSums[uid] || 0) / scored) * 100) / 100 : 0,
        recommendCount: reviewerRecommendCounts[uid] || 0,
        doNotRecommendCount: reviewerDNRCounts[uid] || 0,
        flaggedCount: reviewerFlagCounts[uid] || 0,
      };
    });

    // Deduplicate by user_id (a reviewer may appear in multiple phases)
    const seenReviewers = new Set<string>();
    const uniqueReviewers = reviewerActivityList.filter((r) => {
      if (seenReviewers.has(r.reviewerId)) return false;
      seenReviewers.add(r.reviewerId);
      return true;
    });

    const completionRates = uniqueReviewers.filter((r) => r.assignedCount > 0).map((r) => r.completionRate);
    const reviewerActivity = {
      reviewers: uniqueReviewers.sort((a, b) => b.scoredCount - a.scoredCount),
      summary: {
        totalInvited: allReviewers.filter((r) => (r as Record<string, unknown>).status === "invited").length,
        totalAccepted: allReviewers.filter((r) => (r as Record<string, unknown>).status === "accepted").length,
        totalDeclined: allReviewers.filter((r) => (r as Record<string, unknown>).status === "declined").length,
        avgCompletionRate: completionRates.length > 0 ? Math.round((completionRates.reduce((a, b) => a + b, 0) / completionRates.length) * 100) / 100 : 0,
      },
    };

    // ── 13. Score Distributions ────────────────────────────────
    const allTotalScores = allScoreRows.map((s) => Number((s as Record<string, unknown>).total_score) || 0);
    const overallMean = allTotalScores.length > 0 ? allTotalScores.reduce((a, b) => a + b, 0) / allTotalScores.length : 0;

    const scoreDistributions = {
      overall: {
        histogram: buildHistogram(allTotalScores, 10),
        mean: Math.round(overallMean * 100) / 100,
        median: Math.round(median(allTotalScores) * 100) / 100,
        min: allTotalScores.length > 0 ? Math.min(...allTotalScores) : 0,
        max: allTotalScores.length > 0 ? Math.max(...allTotalScores) : 0,
        stdDev: Math.round(stdDev(allTotalScores, overallMean) * 100) / 100,
        totalScores: allTotalScores.length,
      },
      byPhase: phases.map((p) => {
        const row = p as Record<string, unknown>;
        const pid = row.id as string;
        const phaseScoreValues = allScoreRows
          .filter((s) => (s as Record<string, unknown>).phase_id === pid)
          .map((s) => Number((s as Record<string, unknown>).total_score) || 0);
        const pMean = phaseScoreValues.length > 0 ? phaseScoreValues.reduce((a, b) => a + b, 0) / phaseScoreValues.length : 0;
        return {
          phaseId: pid,
          phaseName: row.name as string,
          histogram: buildHistogram(phaseScoreValues, 10),
          mean: Math.round(pMean * 100) / 100,
          median: Math.round(median(phaseScoreValues) * 100) / 100,
          min: phaseScoreValues.length > 0 ? Math.min(...phaseScoreValues) : 0,
          max: phaseScoreValues.length > 0 ? Math.max(...phaseScoreValues) : 0,
          stdDev: Math.round(stdDev(phaseScoreValues, pMean) * 100) / 100,
          totalScores: phaseScoreValues.length,
        };
      }),
    };

    // ── 14. Decision Outcomes ──────────────────────────────────
    const allDecisions: Record<string, unknown>[] = decisionsResult?.data || [];
    const decisionsByPhase: Record<string, Record<string, unknown>[]> = {};
    for (const d of allDecisions) {
      const pid = d.phase_id as string;
      if (!decisionsByPhase[pid]) decisionsByPhase[pid] = [];
      decisionsByPhase[pid].push(d);
    }

    const decisionOutcomes = {
      byPhase: phases.map((p) => {
        const row = p as Record<string, unknown>;
        const pid = row.id as string;
        const pDecisions = decisionsByPhase[pid] || [];
        const advance = pDecisions.filter((d) => (d as Record<string, unknown>).decision === "advance").length;
        const borderline = pDecisions.filter((d) => (d as Record<string, unknown>).decision === "borderline").length;
        const doNotAdvance = pDecisions.filter((d) => (d as Record<string, unknown>).decision === "do_not_advance").length;
        const overrides = pDecisions.filter((d) => (d as Record<string, unknown>).is_override).length;
        const total = pDecisions.length;
        return {
          phaseId: pid,
          phaseName: row.name as string,
          total,
          advance,
          borderline,
          doNotAdvance,
          overrideCount: overrides,
          advanceRate: total > 0 ? Math.round((advance / total) * 100) / 100 : 0,
        };
      }),
      overall: {
        total: allDecisions.length,
        advance: allDecisions.filter((d) => (d as Record<string, unknown>).decision === "advance").length,
        borderline: allDecisions.filter((d) => (d as Record<string, unknown>).decision === "borderline").length,
        doNotAdvance: allDecisions.filter((d) => (d as Record<string, unknown>).decision === "do_not_advance").length,
        overrideCount: allDecisions.filter((d) => (d as Record<string, unknown>).is_override).length,
      },
    };

    // ── 15. Conversion Rates ──────────────────────────────────
    const totalAssigned = new Set(allAssignments.map((a) => (a as Record<string, unknown>).registration_id as string)).size;
    const totalScored = new Set(allScoreRows.map((s) => (s as Record<string, unknown>).registration_id as string)).size;
    const totalAdvanced = allDecisions.filter((d) => (d as Record<string, unknown>).decision === "advance").length;
    const totalFinalists = (finalistsResult?.data || []).length;

    const funnelStages = [
      { stage: "Applied", count: totalApplied },
      { stage: "Screened", count: screened },
      { stage: "Eligible", count: eligible },
      { stage: "Accepted", count: accepted },
      { stage: "Assigned (Judging)", count: totalAssigned },
      { stage: "Scored", count: totalScored },
      { stage: "Advanced", count: totalAdvanced },
      { stage: "Finalist", count: totalFinalists },
      { stage: "Winner", count: winnerCount },
    ];

    const conversionRates = {
      funnel: funnelStages.map((s, i) => ({
        stage: s.stage,
        count: s.count,
        percentOfTotal: totalApplied > 0 ? Math.round((s.count / totalApplied) * 1000) / 10 : 0,
        dropOff: i === 0 ? 0 : (funnelStages[i - 1].count > 0
          ? Math.round(((funnelStages[i - 1].count - s.count) / funnelStages[i - 1].count) * 1000) / 10
          : 0),
      })),
    };

    // ── 16. Processing Time Metrics ───────────────────────────
    // Reviewer response time (invited → accepted)
    const responseTimesHrs: number[] = [];
    for (const r of allReviewers) {
      const row = r as Record<string, unknown>;
      if (row.status === "accepted" && row.invited_at && row.accepted_at) {
        const hrs = hoursBetween(row.invited_at as string, row.accepted_at as string);
        if (hrs >= 0) responseTimesHrs.push(hrs);
      }
    }

    // Screening turnaround (application → screening)
    const screeningTimesHrs: number[] = [];
    for (const reg of registrations) {
      const r = reg as Record<string, unknown>;
      if (r.screening_completed_at && r.created_at) {
        const hrs = hoursBetween(r.created_at as string, r.screening_completed_at as string);
        if (hrs >= 0) screeningTimesHrs.push(hrs);
      }
    }

    // Scoring turnaround (assignment → score submission)
    const assignmentMap = new Map<string, string>();
    for (const a of allAssignments) {
      const row = a as Record<string, unknown>;
      const key = `${row.phase_id}:${row.reviewer_id}:${row.registration_id}`;
      assignmentMap.set(key, row.assigned_at as string);
    }
    const scoringTimesHrs: number[] = [];
    for (const s of allScoreRows) {
      const row = s as Record<string, unknown>;
      const key = `${row.phase_id}:${row.reviewer_id}:${row.registration_id}`;
      const assignedAt = assignmentMap.get(key);
      if (assignedAt && row.submitted_at) {
        const hrs = hoursBetween(assignedAt, row.submitted_at as string);
        if (hrs >= 0) scoringTimesHrs.push(hrs);
      }
    }

    const formatTimeStat = (arr: number[]) => ({
      avgHours: arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0,
      medianHours: Math.round(median(arr) * 10) / 10,
      minHours: arr.length > 0 ? Math.round(Math.min(...arr) * 10) / 10 : 0,
      maxHours: arr.length > 0 ? Math.round(Math.max(...arr) * 10) / 10 : 0,
      sampleSize: arr.length,
    });

    const processingTimes = {
      reviewerResponse: formatTimeStat(responseTimesHrs),
      screeningTurnaround: formatTimeStat(screeningTimesHrs),
      scoringTurnaround: formatTimeStat(scoringTimesHrs),
    };

    return NextResponse.json({
      data: {
        registrationsByStatus,
        registrationTimeline,
        registrationsByDate,
        registrationsByCampus,
        teamCount: teamResult.count || 0,
        submissionCount: submissions.length,
        trackDistribution,
        scoringProgress: {
          scored: overallScored,
          total: submissions.length,
        },
        scoringProgressByPhase,
        rsvpStats,
        funnelData,
        screeningProgress,
        demographics,
        campusPerformance,
        sectorDistribution,
        winnerStats: { total: winnerCount, confirmed: confirmedWinners, locked: lockedWinners },
        // New analytics
        reviewerActivity,
        scoreDistributions,
        decisionOutcomes,
        conversionRates,
        processingTimes,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
