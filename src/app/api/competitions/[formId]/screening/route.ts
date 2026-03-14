import { type NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { evaluateAllRules, calculateCompletenessScore, detectDuplicates } from "@/lib/screening-engine";
import type { FormField, ScreeningRule } from "@/lib/types";

interface Params {
  params: Promise<{ formId: string }>;
}

// ── GET — screening dashboard data ──────────────────────
export async function GET(request: NextRequest, { params }: Params) {
  const { formId } = await params;
  const auth = await authenticateRequest(request);
  if (auth.type === "unauthenticated") {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();

  // Verify organizer/admin
  const { data: form } = await admin
    .from("competition_forms")
    .select("organizer_id")
    .eq("id", formId)
    .single();

  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  let authorized = form.organizer_id === auth.userId;
  if (!authorized) {
    const { data: profile } = await admin
      .from("profiles")
      .select("roles")
      .eq("id", auth.userId)
      .single();
    authorized = ((profile?.roles as string[]) || []).includes("admin");
  }
  if (!authorized) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  // Get campus summary
  const { data: campusSummary } = await admin
    .from("application_campus_summary")
    .select("*")
    .eq("form_id", formId);

  // Get quotas
  const { data: quotas } = await admin
    .from("campus_quotas")
    .select("*")
    .eq("form_id", formId);

  // Get overall stats
  const { data: allApps } = await admin
    .from("competition_applications")
    .select("status, completeness_score, eligibility_passed, campus, sector")
    .eq("form_id", formId)
    .neq("status", "draft");

  const apps = allApps || [];
  const statusCounts: Record<string, number> = {};
  const sectorCounts: Record<string, number> = {};
  for (const app of apps) {
    statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
    if (app.sector) sectorCounts[app.sector] = (sectorCounts[app.sector] || 0) + 1;
  }

  // Get unresolved flags
  const { count: unresolvedFlags } = await admin
    .from("screening_flags")
    .select("id", { count: "exact", head: true })
    .eq("resolved", false)
    .in(
      "application_id",
      apps.map(() => "").length > 0
        ? (await admin
            .from("competition_applications")
            .select("id")
            .eq("form_id", formId)
            .neq("status", "draft")
          ).data?.map((a) => a.id) || []
        : []
    );

  // Get flag counts by type
  const { data: flagsData } = await admin
    .from("screening_flags")
    .select("flag_type, resolved")
    .in(
      "application_id",
      (await admin
        .from("competition_applications")
        .select("id")
        .eq("form_id", formId)
        .neq("status", "draft")
      ).data?.map((a) => a.id) || []
    );

  const flagCounts: Record<string, { total: number; unresolved: number }> = {};
  for (const f of flagsData || []) {
    if (!flagCounts[f.flag_type]) flagCounts[f.flag_type] = { total: 0, unresolved: 0 };
    flagCounts[f.flag_type].total++;
    if (!f.resolved) flagCounts[f.flag_type].unresolved++;
  }

  return NextResponse.json({
    data: {
      totalApplications: apps.length,
      statusCounts,
      sectorCounts,
      campusSummary: campusSummary || [],
      quotas: quotas || [],
      unresolvedFlags: unresolvedFlags || 0,
      flagCounts,
      avgCompleteness: apps.length > 0
        ? Math.round((apps.reduce((s, a) => s + Number(a.completeness_score || 0), 0) / apps.length) * 100) / 100
        : 0,
    },
  });
}

// ── POST — run screening on all submitted applications ──
export async function POST(request: NextRequest, { params }: Params) {
  const { formId } = await params;
  const auth = await authenticateRequest(request);
  if (auth.type === "unauthenticated") {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();

  // Verify organizer/admin
  const { data: form } = await admin
    .from("competition_forms")
    .select("organizer_id, fields")
    .eq("id", formId)
    .single();

  if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  let authorized = form.organizer_id === auth.userId;
  if (!authorized) {
    const { data: profile } = await admin
      .from("profiles")
      .select("roles")
      .eq("id", auth.userId)
      .single();
    authorized = ((profile?.roles as string[]) || []).includes("admin");
  }
  if (!authorized) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const fields = (form.fields as FormField[]) || [];

  // Get all rules
  const { data: rules } = await admin
    .from("screening_rules")
    .select("*")
    .eq("form_id", formId)
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  const typedRules = (rules as unknown as ScreeningRule[]) || [];

  // Get all submitted applications (not yet screened or re-screen all)
  const { data: applications } = await admin
    .from("competition_applications")
    .select("id, data, applicant_email, applicant_phone, startup_name, status")
    .eq("form_id", formId)
    .in("status", ["submitted", "under_review", "eligible", "ineligible"]);

  if (!applications || applications.length === 0) {
    return NextResponse.json({ data: { screened: 0, eligible: 0, ineligible: 0, flagged: 0 } });
  }

  let eligible = 0;
  let ineligible = 0;
  let flagged = 0;

  // Process each application
  for (const app of applications) {
    const appData = app.data as Record<string, unknown>;

    // Run eligibility rules
    let hardPassed = true;
    if (typedRules.length > 0) {
      const evaluation = evaluateAllRules(typedRules, appData, fields);
      hardPassed = evaluation.hardPassed;

      // Upsert screening results
      const resultRows = evaluation.results.map((r) => ({
        application_id: app.id,
        rule_id: r.ruleId,
        passed: r.passed,
        actual_value: r.actualValue !== undefined ? JSON.stringify(r.actualValue) : null,
        reason: r.reason,
      }));

      if (resultRows.length > 0) {
        await admin.from("screening_results").upsert(resultRows, {
          onConflict: "application_id,rule_id",
        });
      }

      // Add soft flags
      for (const softFlag of evaluation.softFlags) {
        const { data: existingFlag } = await admin
          .from("screening_flags")
          .select("id")
          .eq("application_id", app.id)
          .eq("flag_type", "soft_warning")
          .ilike("message", `%${softFlag.ruleName}%`)
          .maybeSingle();

        if (!existingFlag) {
          await admin.from("screening_flags").insert({
            application_id: app.id,
            flag_type: "soft_warning",
            severity: "warning",
            message: softFlag.reason,
          });
          flagged++;
        }
      }
    }

    // Recalculate completeness
    const completeness = calculateCompletenessScore(appData, fields);

    // Update application status
    const newStatus = hardPassed ? "eligible" : "ineligible";
    await admin
      .from("competition_applications")
      .update({
        status: newStatus,
        eligibility_passed: hardPassed,
        completeness_score: completeness,
        screening_completed_at: new Date().toISOString(),
      })
      .eq("id", app.id);

    if (hardPassed) eligible++;
    else ineligible++;
  }

  // Run duplicate detection across all applications
  const { data: allApps } = await admin
    .from("competition_applications")
    .select("id, applicant_email, applicant_phone, startup_name, data")
    .eq("form_id", formId)
    .neq("status", "draft");

  if (allApps && allApps.length > 1) {
    for (const app of allApps) {
      const dups = detectDuplicates(
        {
          id: app.id,
          applicantEmail: app.applicant_email,
          applicantPhone: app.applicant_phone,
          startupName: app.startup_name,
          data: app.data as Record<string, unknown>,
        },
        allApps.map((a) => ({
          id: a.id,
          applicantEmail: a.applicant_email,
          applicantPhone: a.applicant_phone,
          startupName: a.startup_name,
          data: a.data as Record<string, unknown>,
        }))
      );

      for (const dup of dups) {
        // Avoid duplicate flags
        const { data: existingFlag } = await admin
          .from("screening_flags")
          .select("id")
          .eq("application_id", app.id)
          .eq("flag_type", dup.flagType)
          .eq("related_application_id", dup.relatedApplicationId)
          .maybeSingle();

        if (!existingFlag) {
          await admin.from("screening_flags").insert({
            application_id: app.id,
            flag_type: dup.flagType,
            severity: "critical",
            message: dup.message,
            related_application_id: dup.relatedApplicationId,
          });
          flagged++;
        }
      }
    }
  }

  void writeAuditLog({
    actorId: auth.userId,
    action: "update",
    entityType: "competition_form",
    entityId: formId,
    newValues: { action: "bulk_screening", screened: applications.length, eligible, ineligible, flagged },
  });

  return NextResponse.json({
    data: {
      screened: applications.length,
      eligible,
      ineligible,
      flagged,
    },
  });
}
