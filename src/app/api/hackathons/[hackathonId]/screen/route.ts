import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { evaluateAllRules, calculateCompletenessScore } from "@/lib/screening-engine";
import {
  sendApplicationEligibleEmail,
  sendApplicationIneligibleEmail,
  sendApplicationUnderReviewEmail,
} from "@/lib/resend";
import type { ScreeningRule, FormField } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

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

    if (rules.length === 0) {
      return NextResponse.json(
        { error: "No screening rules configured for this hackathon" },
        { status: 400 }
      );
    }

    // Fetch all registrations with form_data that are in a screenable status
    const { data: registrations, error: regError } = await supabase
      .from("hackathon_registrations")
      .select("id, user_id, form_data, status, user:profiles!hackathon_registrations_user_id_fkey(email, name)")
      .eq("hackathon_id", hackathonId)
      .not("form_data", "is", null)
      .in("status", ["pending", "confirmed", "under_review"]);

    if (regError) {
      return NextResponse.json(
        { error: "Failed to fetch registrations" },
        { status: 400 }
      );
    }

    if (!registrations || registrations.length === 0) {
      return NextResponse.json({
        data: { screened: 0, eligible: 0, ineligible: 0, flagged: 0 },
      });
    }

    let eligible = 0;
    let ineligible = 0;
    let flagged = 0;

    // Process each registration
    for (const reg of registrations) {
      const formData = reg.form_data as Record<string, unknown>;

      // Evaluate all screening rules against this registration's form data
      const evaluation = evaluateAllRules(rules, formData, fields);

      // Calculate completeness score
      const completenessScore = calculateCompletenessScore(formData, fields);

      // Determine new status based on hard rule results
      const newStatus = evaluation.hardPassed ? "eligible" : "ineligible";
      const eligibilityPassed = evaluation.hardPassed;

      if (eligibilityPassed) {
        eligible++;
      } else {
        ineligible++;
      }

      if (evaluation.softFlags.length > 0) {
        flagged++;
      }

      // If there are soft flags but the applicant passed hard rules,
      // set to under_review instead of eligible so organizer can review
      const hasSoftFlags = evaluation.softFlags.length > 0;
      const finalStatus = hasSoftFlags && eligibilityPassed ? "under_review" : newStatus;

      // Update the registration with screening results
      await supabase
        .from("hackathon_registrations")
        .update({
          status: finalStatus,
          eligibility_passed: eligibilityPassed,
          screening_results: evaluation.results,
          completeness_score: completenessScore,
          screening_completed_at: new Date().toISOString(),
          screening_flags: evaluation.softFlags,
        })
        .eq("id", reg.id);

      // Send email + in-app notification
      const userProfile = reg.user as { email?: string; name?: string } | null;
      const userEmail = userProfile?.email;
      const userName = userProfile?.name || "Applicant";
      const hackathonName = (hackathon.name as string) || "the hackathon";

      if (userEmail) {
        const emailParams = {
          to: userEmail,
          applicantName: userName,
          hackathonName,
          hackathonId,
        };

        // Fire-and-forget emails (don't block the loop)
        if (finalStatus === "eligible") {
          sendApplicationEligibleEmail(emailParams).catch((e) =>
            console.error("Failed to send eligible email:", e)
          );
        } else if (finalStatus === "ineligible") {
          sendApplicationIneligibleEmail(emailParams).catch((e) =>
            console.error("Failed to send ineligible email:", e)
          );
        } else if (finalStatus === "under_review") {
          sendApplicationUnderReviewEmail(emailParams).catch((e) =>
            console.error("Failed to send under-review email:", e)
          );
        }
      }

      // Create in-app notification
      const notifMessages: Record<string, { title: string; message: string }> = {
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
      const notif = notifMessages[finalStatus];
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
        screened: registrations.length,
        eligible,
        ineligible,
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
