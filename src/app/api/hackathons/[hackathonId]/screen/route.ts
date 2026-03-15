import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { evaluateAllRules, calculateCompletenessScore } from "@/lib/screening-engine";
import { UUID_RE } from "@/lib/constants";
import {
  sendApplicationAcceptedEmail,
  sendApplicationWaitlistedEmail,
  sendApplicationEligibleEmail,
  sendApplicationIneligibleEmail,
  sendApplicationUnderReviewEmail,
} from "@/lib/resend";
import type { ScreeningRule, FormField } from "@/lib/types";

// ── GET: Fetch count of unpublished screened registrations ──

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
    }

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

    // Verify caller is the hackathon organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }
    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch screened registrations that haven't had results published yet
    const { data: registrations, error: regError } = await supabase
      .from("hackathon_registrations")
      .select("status")
      .eq("hackathon_id", hackathonId)
      .not("screening_completed_at", "is", null)
      .is("results_published_at", null)
      .in("status", ["accepted", "waitlisted", "eligible", "ineligible", "under_review"]);

    if (regError) {
      return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 400 });
    }

    const regs = registrations || [];
    let eligible = 0;
    let ineligible = 0;
    let underReview = 0;
    let accepted = 0;
    let waitlisted = 0;

    for (const reg of regs) {
      const status = reg.status as string;
      if (status === "eligible") eligible++;
      else if (status === "ineligible") ineligible++;
      else if (status === "under_review") underReview++;
      else if (status === "accepted") accepted++;
      else if (status === "waitlisted") waitlisted++;
    }

    return NextResponse.json({
      data: {
        unpublished: regs.length,
        accepted,
        waitlisted,
        eligible,
        ineligible,
        underReview,
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

// ── POST: Run screening ──

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
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

    // Verify caller is the hackathon organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id, name, registration_fields, screening_rules, screening_config")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rules = (hackathon.screening_rules as ScreeningRule[]) || [];
    const fields = (hackathon.registration_fields as FormField[]) || [];
    const screeningConfig = (hackathon.screening_config as Record<string, unknown>) || {};
    const quotaFieldId = screeningConfig.quotaFieldId as string | undefined;
    const configQuotas = (screeningConfig.quotas as { campus: string; quota: number; rejected?: boolean; softFlagged?: boolean; softFlagMessage?: string }[]) || [];

    // Build soft-flag lookup from quota config
    const softFlaggedOptions = new Map<string, string>();
    for (const q of configQuotas) {
      if (q.softFlagged && !q.rejected) {
        softFlaggedOptions.set(q.campus, q.softFlagMessage || "This option is flagged for additional review.");
      }
    }

    if (rules.length === 0 && softFlaggedOptions.size === 0) {
      return NextResponse.json(
        { error: "No screening rules configured for this hackathon" },
        { status: 400 }
      );
    }

    // Check if this is a retrigger (force re-screen all) or first-run (unscreened only)
    let body: { force?: boolean; publishResults?: boolean } = {};
    try { body = await request.json(); } catch { /* no body = default */ }
    const force = body.force === true;
    const publishResults = body.publishResults === true;

    // Fetch registrations to screen
    let regQuery = supabase
      .from("hackathon_registrations")
      .select("id, user_id, form_data, status, screening_completed_at, created_at, user:profiles!hackathon_registrations_user_id_fkey(email, name)")
      .eq("hackathon_id", hackathonId)
      .not("form_data", "is", null);

    if (force) {
      // Retrigger: re-screen all non-cancelled/non-declined registrations
      regQuery = regQuery.not("status", "in", '("cancelled","declined")');
    } else {
      // First run: only screen applications that haven't been screened yet
      regQuery = regQuery.is("screening_completed_at", null)
        .in("status", ["pending", "confirmed", "under_review"]);
    }

    const { data: registrations, error: regError } = await regQuery;

    if (regError) {
      return NextResponse.json(
        { error: "Failed to fetch registrations" },
        { status: 400 }
      );
    }

    if (!registrations || registrations.length === 0) {
      return NextResponse.json({
        data: {
          screened: 0,
          eligible: 0,
          ineligible: 0,
          flagged: 0,
          message: force
            ? "No registrations to re-screen."
            : "All applications have already been screened. Use retrigger to re-screen.",
        },
      });
    }

    // ── Phase 1: Evaluate rules for all registrations ──
    interface EvalResult {
      reg: typeof registrations[number];
      evaluation: ReturnType<typeof evaluateAllRules>;
      completenessScore: number;
    }
    const evalResults: EvalResult[] = [];

    for (const reg of registrations) {
      const formData = reg.form_data as Record<string, unknown>;
      const evaluation = evaluateAllRules(rules, formData, fields);

      // Check soft-flagged quota options
      if (quotaFieldId && softFlaggedOptions.size > 0) {
        const fieldValue = String(formData[quotaFieldId] || "");
        if (fieldValue && softFlaggedOptions.has(fieldValue)) {
          const quotaField = fields.find((f) => f.id === quotaFieldId);
          const optionLabel = quotaField?.options?.find((o) => o.value === fieldValue)?.label || fieldValue;
          const flagMessage = softFlaggedOptions.get(fieldValue)!;
          const quotaSoftFlag = {
            ruleId: `quota-soft-flag-${fieldValue}`,
            ruleName: `Quota soft flag: ${optionLabel}`,
            ruleType: "soft" as const,
            passed: false,
            actualValue: fieldValue,
            reason: `${quotaField?.label || "Quota field"}: soft flagged — "${optionLabel}": ${flagMessage}`,
          };
          evaluation.results.push(quotaSoftFlag);
          evaluation.softFlags.push(quotaSoftFlag);
        }
      }

      const completenessScore = calculateCompletenessScore(formData, fields);
      evalResults.push({ reg, evaluation, completenessScore });
    }

    // ── Phase 2: Determine final statuses ──
    // Check if quota enforcement is set to "screening" (FCFS campus quotas during screening)
    const quotaEnforcement = (screeningConfig.quotaEnforcement as string) || "screening";
    const hasActiveQuotas = quotaFieldId && configQuotas.some((q) => !q.rejected) && quotaEnforcement === "screening";

    // Separate into passed/failed
    const passedHard: EvalResult[] = [];
    const failedHard: EvalResult[] = [];
    for (const er of evalResults) {
      if (er.evaluation.hardPassed) {
        passedHard.push(er);
      } else {
        failedHard.push(er);
      }
    }

    // Assign final statuses
    interface FinalResult {
      reg: typeof registrations[number];
      status: string;
      eligibilityPassed: boolean;
      evaluation: ReturnType<typeof evaluateAllRules>;
      completenessScore: number;
    }
    const finalResults: FinalResult[] = [];

    // Failed hard rules → ineligible
    for (const er of failedHard) {
      finalResults.push({
        reg: er.reg,
        status: "ineligible",
        eligibilityPassed: false,
        evaluation: er.evaluation,
        completenessScore: er.completenessScore,
      });
    }

    if (hasActiveQuotas) {
      // ── FCFS quota-based acceptance ──
      // Group eligible applicants by campus field value
      const campusGroups = new Map<string, EvalResult[]>();
      const noQuotaGroup: EvalResult[] = []; // applicants whose campus has no quota entry

      for (const er of passedHard) {
        const formData = er.reg.form_data as Record<string, unknown>;
        const campusValue = String(formData[quotaFieldId!] || "");
        const quotaEntry = configQuotas.find((q) => q.campus === campusValue && !q.rejected);

        if (campusValue && quotaEntry) {
          const group = campusGroups.get(campusValue) || [];
          group.push(er);
          campusGroups.set(campusValue, group);
        } else {
          noQuotaGroup.push(er);
        }
      }

      // Sort each campus group by created_at ASC (first-come-first-serve)
      for (const [campusValue, group] of campusGroups) {
        group.sort((a, b) =>
          new Date(a.reg.created_at || "").getTime() - new Date(b.reg.created_at || "").getTime()
        );

        const quotaEntry = configQuotas.find((q) => q.campus === campusValue && !q.rejected);
        const quota = quotaEntry?.quota ?? 0;

        // Also count already-accepted registrations for this campus (from previous screening runs)
        // to handle incremental screening correctly
        let alreadyAccepted = 0;
        if (!force) {
          const { data: existingAccepted } = await supabase
            .from("hackathon_registrations")
            .select("form_data")
            .eq("hackathon_id", hackathonId)
            .eq("status", "accepted")
            .not("screening_completed_at", "is", null);

          if (existingAccepted) {
            for (const r of existingAccepted) {
              const fd = r.form_data as Record<string, unknown> | null;
              if (fd && String(fd[quotaFieldId!] || "") === campusValue) {
                alreadyAccepted++;
              }
            }
          }
        }

        for (let i = 0; i < group.length; i++) {
          const er = group[i];
          const hasSoftFlags = er.evaluation.softFlags.length > 0;
          const slotIndex = alreadyAccepted + i;

          let status: string;
          if (hasSoftFlags) {
            status = "under_review"; // organizer must review
          } else if (slotIndex < quota) {
            status = "accepted";
          } else {
            status = "waitlisted";
          }

          finalResults.push({
            reg: er.reg,
            status,
            eligibilityPassed: true,
            evaluation: er.evaluation,
            completenessScore: er.completenessScore,
          });
        }
      }

      // Applicants without a matching quota entry → use old behavior (eligible or under_review)
      for (const er of noQuotaGroup) {
        const hasSoftFlags = er.evaluation.softFlags.length > 0;
        finalResults.push({
          reg: er.reg,
          status: hasSoftFlags ? "under_review" : "eligible",
          eligibilityPassed: true,
          evaluation: er.evaluation,
          completenessScore: er.completenessScore,
        });
      }
    } else {
      // ── No quota enforcement during screening — old behavior ──
      for (const er of passedHard) {
        const hasSoftFlags = er.evaluation.softFlags.length > 0;
        finalResults.push({
          reg: er.reg,
          status: hasSoftFlags ? "under_review" : "eligible",
          eligibilityPassed: true,
          evaluation: er.evaluation,
          completenessScore: er.completenessScore,
        });
      }
    }

    // ── Phase 3: Write results to DB + send notifications ──
    let accepted = 0;
    let waitlisted = 0;
    let eligible = 0;
    let ineligible = 0;
    let flagged = 0;
    let underReview = 0;

    for (const fr of finalResults) {
      if (fr.status === "accepted") accepted++;
      else if (fr.status === "waitlisted") waitlisted++;
      else if (fr.status === "eligible") eligible++;
      else if (fr.status === "ineligible") ineligible++;
      else if (fr.status === "under_review") underReview++;

      if (fr.evaluation.softFlags.length > 0) flagged++;

      // Update the registration
      await supabase
        .from("hackathon_registrations")
        .update({
          status: fr.status,
          eligibility_passed: fr.eligibilityPassed,
          screening_results: fr.evaluation.results,
          completeness_score: fr.completenessScore,
          screening_completed_at: new Date().toISOString(),
          screening_flags: fr.evaluation.softFlags,
          ...(force ? { results_published_at: null } : {}),
        })
        .eq("id", fr.reg.id);

      // Send emails/notifications if publishResults is true
      if (publishResults) {
        const previousStatus = fr.reg.status as string;
        const statusChanged = previousStatus !== fr.status;

        if (statusChanged) {
          const userProfile = fr.reg.user as { email?: string; name?: string } | null;
          const userEmail = userProfile?.email;
          const userName = userProfile?.name || "Applicant";
          const hackathonName = (hackathon.name as string) || "the hackathon";

          if (userEmail) {
            const emailParams = { to: userEmail, applicantName: userName, hackathonName, hackathonId };

            if (fr.status === "accepted") {
              sendApplicationAcceptedEmail(emailParams).catch((e) => console.error("Failed to send accepted email:", e));
            } else if (fr.status === "waitlisted") {
              sendApplicationWaitlistedEmail(emailParams).catch((e) => console.error("Failed to send waitlisted email:", e));
            } else if (fr.status === "eligible") {
              sendApplicationEligibleEmail(emailParams).catch((e) => console.error("Failed to send eligible email:", e));
            } else if (fr.status === "ineligible") {
              sendApplicationIneligibleEmail(emailParams).catch((e) => console.error("Failed to send ineligible email:", e));
            } else if (fr.status === "under_review") {
              sendApplicationUnderReviewEmail(emailParams).catch((e) => console.error("Failed to send under-review email:", e));
            }
          }

          // Create in-app notification
          const notifMessages: Record<string, { title: string; message: string }> = {
            accepted: { title: "Application Accepted", message: `Congratulations! Your application for ${hackathonName} has been accepted.` },
            waitlisted: { title: "Application Waitlisted", message: `Your application for ${hackathonName} has been placed on the waitlist.` },
            eligible: { title: "Application Eligible", message: `Your application for ${hackathonName} has passed screening and is eligible for selection.` },
            ineligible: { title: "Application Ineligible", message: `Your application for ${hackathonName} did not meet the eligibility criteria.` },
            under_review: { title: "Application Under Review", message: `Your application for ${hackathonName} is being reviewed by the organizers.` },
          };
          const notif = notifMessages[fr.status];
          if (notif) {
            supabase.from("notifications").insert({
              user_id: fr.reg.user_id,
              type: "hackathon-update",
              title: notif.title,
              message: notif.message,
              link: `/hackathons/${hackathonId}`,
            }).then(({ error: notifErr }) => {
              if (notifErr) console.error("Failed to insert notification:", notifErr);
            });
          }

          // Mark results as published
          await supabase
            .from("hackathon_registrations")
            .update({ results_published_at: new Date().toISOString() })
            .eq("id", fr.reg.id);
        }
      }
    }

    return NextResponse.json({
      data: {
        screened: registrations.length,
        accepted,
        waitlisted,
        eligible,
        ineligible,
        underReview,
        flagged,
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

// ── PATCH: Publish screening results (send emails & notifications) ──

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
    }

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

    // Verify caller is the hackathon organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id, name")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }
    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Atomically claim unpublished screened registrations by setting results_published_at
    // in the same UPDATE query. This prevents race conditions where concurrent requests
    // could pick up the same registrations.
    const { data: registrations, error: regError } = await supabase
      .from("hackathon_registrations")
      .update({ results_published_at: new Date().toISOString() })
      .eq("hackathon_id", hackathonId)
      .not("screening_completed_at", "is", null)
      .is("results_published_at", null)
      .in("status", ["accepted", "waitlisted", "eligible", "ineligible", "under_review"])
      .select("id, user_id, status, user:profiles!hackathon_registrations_user_id_fkey(email, name)");

    if (regError) {
      return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 400 });
    }

    if (!registrations || registrations.length === 0) {
      return NextResponse.json({
        data: {
          published: 0,
          accepted: 0,
          waitlisted: 0,
          eligible: 0,
          ineligible: 0,
          underReview: 0,
          message: "No unpublished screening results found.",
        },
      });
    }

    const hackathonName = (hackathon.name as string) || "the hackathon";
    let acceptedCount = 0;
    let waitlistedCount = 0;
    let eligibleCount = 0;
    let ineligibleCount = 0;
    let underReviewCount = 0;

    for (const reg of registrations) {
      const status = reg.status as string;
      const userProfile = reg.user as { email?: string; name?: string } | null;
      const userEmail = userProfile?.email;
      const userName = userProfile?.name || "Applicant";

      if (status === "accepted") acceptedCount++;
      else if (status === "waitlisted") waitlistedCount++;
      else if (status === "eligible") eligibleCount++;
      else if (status === "ineligible") ineligibleCount++;
      else if (status === "under_review") underReviewCount++;

      // Send email
      if (userEmail) {
        const emailParams = {
          to: userEmail,
          applicantName: userName,
          hackathonName,
          hackathonId,
        };

        if (status === "accepted") {
          sendApplicationAcceptedEmail(emailParams).catch((e) =>
            console.error("Failed to send accepted email:", e)
          );
        } else if (status === "waitlisted") {
          sendApplicationWaitlistedEmail(emailParams).catch((e) =>
            console.error("Failed to send waitlisted email:", e)
          );
        } else if (status === "eligible") {
          sendApplicationEligibleEmail(emailParams).catch((e) =>
            console.error("Failed to send eligible email:", e)
          );
        } else if (status === "ineligible") {
          sendApplicationIneligibleEmail(emailParams).catch((e) =>
            console.error("Failed to send ineligible email:", e)
          );
        } else if (status === "under_review") {
          sendApplicationUnderReviewEmail(emailParams).catch((e) =>
            console.error("Failed to send under-review email:", e)
          );
        }
      }

      // Create in-app notification
      const notifMessages: Record<string, { title: string; message: string }> = {
        accepted: {
          title: "Application Accepted",
          message: `Congratulations! Your application for ${hackathonName} has been accepted.`,
        },
        waitlisted: {
          title: "Application Waitlisted",
          message: `Your application for ${hackathonName} has been placed on the waitlist.`,
        },
        eligible: {
          title: "Application Eligible",
          message: `Your application for ${hackathonName} has passed screening and is eligible for selection.`,
        },
        ineligible: {
          title: "Application Ineligible",
          message: `Your application for ${hackathonName} did not meet the eligibility criteria.`,
        },
        under_review: {
          title: "Application Under Review",
          message: `Your application for ${hackathonName} is being reviewed by the organizers.`,
        },
      };
      const notif = notifMessages[status];
      if (notif) {
        supabase
          .from("notifications")
          .insert({
            user_id: reg.user_id,
            type: "hackathon-update",
            title: notif.title,
            message: notif.message,
            link: `/hackathons/${hackathonId}`,
          })
          .then(({ error: notifErr }) => {
            if (notifErr) console.error("Failed to insert notification:", notifErr);
          });
      }
    }

    return NextResponse.json({
      data: {
        published: registrations.length,
        accepted: acceptedCount,
        waitlisted: waitlistedCount,
        eligible: eligibleCount,
        ineligible: ineligibleCount,
        underReview: underReviewCount,
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
