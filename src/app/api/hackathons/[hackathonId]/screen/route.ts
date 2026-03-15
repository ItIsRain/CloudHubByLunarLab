import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { evaluateAllRules, calculateCompletenessScore } from "@/lib/screening-engine";
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
      .select("organizer_id, registration_fields, screening_rules, screening_config")
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
      .select("id, user_id, form_data, status")
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

      // Update the registration with screening results
      await supabase
        .from("hackathon_registrations")
        .update({
          status: newStatus,
          eligibility_passed: eligibilityPassed,
          screening_results: evaluation.results,
          completeness_score: completenessScore,
          screening_completed_at: new Date().toISOString(),
          screening_flags: evaluation.softFlags,
        })
        .eq("id", reg.id);
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
