import { type NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToApplication } from "@/lib/supabase/mappers";
import { writeAuditLog } from "@/lib/audit";
import { evaluateAllRules, calculateCompletenessScore, detectDuplicates } from "@/lib/screening-engine";
import type { FormField, ScreeningRule } from "@/lib/types";

interface Params {
  params: Promise<{ formId: string }>;
}

// ── GET /api/competitions/[formId]/applications ─────────
export async function GET(request: NextRequest, { params }: Params) {
  const { formId } = await params;
  const auth = await authenticateRequest(request);
  if (auth.type === "unauthenticated") {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();

  // Verify the user is the form organizer or admin
  const { data: form } = await admin
    .from("competition_forms")
    .select("organizer_id")
    .eq("id", formId)
    .single();

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  let isOrganizer = form.organizer_id === auth.userId;
  if (!isOrganizer) {
    const { data: profile } = await admin
      .from("profiles")
      .select("roles")
      .eq("id", auth.userId)
      .single();
    isOrganizer = ((profile?.roles as string[]) || []).includes("admin");
  }

  if (!isOrganizer) {
    // Applicants can only see their own
    const { data, error } = await admin
      .from("competition_applications")
      .select("*, application_files(*)")
      .eq("form_id", formId)
      .eq("applicant_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      data: (data || []).map((r) => dbRowToApplication(r as Record<string, unknown>)),
    });
  }

  // Organizer/admin: return all applications with filters
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const campus = url.searchParams.get("campus");
  const sector = url.searchParams.get("sector");
  const search = url.searchParams.get("search");
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize")) || 50));

  let query = admin
    .from("competition_applications")
    .select("*, application_files(*), screening_results(*, screening_rules:rule_id(*)), screening_flags(*)", { count: "exact" })
    .eq("form_id", formId)
    .neq("status", "draft")
    .order("submitted_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (campus) query = query.eq("campus", campus);
  if (sector) query = query.eq("sector", sector);
  if (search) {
    query = query.or(`applicant_name.ilike.%${search}%,applicant_email.ilike.%${search}%,startup_name.ilike.%${search}%`);
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: (data || []).map((r) => dbRowToApplication(r as Record<string, unknown>)),
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  });
}

// ── POST /api/competitions/[formId]/applications ────────
export async function POST(request: NextRequest, { params }: Params) {
  const { formId } = await params;
  const auth = await authenticateRequest(request);
  if (auth.type === "unauthenticated") {
    return NextResponse.json({ error: "You must be logged in to submit an application" }, { status: 401 });
  }

  const admin = getSupabaseAdminClient();

  // Get form with fields
  const { data: form, error: formErr } = await admin
    .from("competition_forms")
    .select("*")
    .eq("id", formId)
    .single();

  if (formErr || !form) {
    return NextResponse.json({ error: "Competition form not found" }, { status: 404 });
  }

  // Validate form is accepting applications
  if (form.status !== "published") {
    return NextResponse.json({ error: "This competition is not currently accepting applications" }, { status: 400 });
  }

  const now = new Date();
  if (form.opens_at && new Date(form.opens_at) > now) {
    return NextResponse.json({ error: "Applications have not opened yet" }, { status: 400 });
  }
  if (form.closes_at && new Date(form.closes_at) < now) {
    return NextResponse.json({ error: "Applications are closed" }, { status: 400 });
  }

  // Check max applications
  if (form.max_applications) {
    const { count } = await admin
      .from("competition_applications")
      .select("id", { count: "exact", head: true })
      .eq("form_id", formId)
      .neq("status", "draft");

    if ((count || 0) >= form.max_applications) {
      return NextResponse.json({ error: "Maximum number of applications reached" }, { status: 400 });
    }
  }

  // Check for existing application by this user
  const { data: existingApp } = await admin
    .from("competition_applications")
    .select("id, status")
    .eq("form_id", formId)
    .eq("applicant_id", auth.userId)
    .not("status", "eq", "withdrawn")
    .maybeSingle();

  if (existingApp) {
    return NextResponse.json(
      { error: "You have already submitted an application for this competition", existingId: existingApp.id },
      { status: 409 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const applicationData = (body.data as Record<string, unknown>) || {};
  const fields = (form.fields as FormField[]) || [];
  const isDraft = body.status === "draft";

  // Validate required fields (only on submit, not draft)
  if (!isDraft) {
    const missingFields: string[] = [];
    for (const field of fields) {
      if (field.required && field.type !== "heading" && field.type !== "paragraph") {
        const value = applicationData[field.id];
        if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
          missingFields.push(field.label);
        }
      }
    }
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(", ")}`, missingFields },
        { status: 400 }
      );
    }
  }

  // Extract mapped fields from application data
  const mappedValues: Record<string, string> = {};
  for (const field of fields) {
    if (field.mappingKey && applicationData[field.id]) {
      mappedValues[field.mappingKey] = String(applicationData[field.id]);
    }
  }

  const applicantName = mappedValues.applicant_name || String(body.applicantName || "").trim();
  const applicantEmail = mappedValues.applicant_email || String(body.applicantEmail || "").trim();

  if (!isDraft && (!applicantName || !applicantEmail)) {
    return NextResponse.json({ error: "Applicant name and email are required" }, { status: 400 });
  }

  // Calculate completeness score
  const completenessScore = calculateCompletenessScore(applicationData, fields);

  const insertData = {
    form_id: formId,
    applicant_id: auth.userId,
    data: applicationData,
    applicant_name: applicantName || "Draft",
    applicant_email: applicantEmail || "draft@placeholder.com",
    applicant_phone: mappedValues.applicant_phone || body.applicantPhone || null,
    startup_name: mappedValues.startup_name || body.startupName || null,
    campus: mappedValues.campus || body.campus || null,
    sector: mappedValues.sector || body.sector || null,
    status: isDraft ? "draft" : "submitted",
    completeness_score: completenessScore,
    submitted_at: isDraft ? null : new Date().toISOString(),
  };

  const { data: application, error: insertErr } = await admin
    .from("competition_applications")
    .insert(insertData)
    .select("*, application_files(*)")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      return NextResponse.json({ error: "Duplicate application detected" }, { status: 409 });
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Post-insert recheck for max_applications to handle race conditions.
  // If two concurrent requests both passed the pre-check, the second insert
  // may have pushed us over the limit. Roll back the losing insert.
  if (form.max_applications && !isDraft) {
    const { count: postCount } = await admin
      .from("competition_applications")
      .select("id", { count: "exact", head: true })
      .eq("form_id", formId)
      .neq("status", "draft");

    if ((postCount || 0) > form.max_applications) {
      // We exceeded the limit — delete this application and return error
      await admin.from("competition_applications").delete().eq("id", application.id);
      return NextResponse.json({ error: "Maximum number of applications reached" }, { status: 400 });
    }
  }

  // If submitted (not draft), run screening + duplicate detection in background
  if (!isDraft) {
    void runPostSubmitScreening(admin, formId, application.id as string, applicationData, fields);
  }

  void writeAuditLog({
    actorId: auth.userId,
    action: "create",
    entityType: "competition_application",
    entityId: application.id,
    newValues: { form_id: formId, status: insertData.status, applicant_name: applicantName },
  });

  return NextResponse.json(
    { data: dbRowToApplication(application as Record<string, unknown>) },
    { status: 201 }
  );
}

// ── Background screening after submission ───────────────

async function runPostSubmitScreening(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  formId: string,
  applicationId: string,
  applicationData: Record<string, unknown>,
  fields: FormField[]
) {
  try {
    // 1. Get screening rules for this form
    const { data: rules } = await admin
      .from("screening_rules")
      .select("*")
      .eq("form_id", formId)
      .eq("enabled", true)
      .order("sort_order", { ascending: true });

    if (rules && rules.length > 0) {
      const typedRules = rules as unknown as ScreeningRule[];
      const evaluation = evaluateAllRules(typedRules, applicationData, fields);

      // Insert screening results
      const resultRows = evaluation.results.map((r) => ({
        application_id: applicationId,
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

      // Insert soft flag results
      for (const softFlag of evaluation.softFlags) {
        await admin.from("screening_flags").insert({
          application_id: applicationId,
          flag_type: "soft_warning",
          severity: "warning",
          message: softFlag.reason,
        });
      }
    }

    // 2. Duplicate detection
    const { data: app } = await admin
      .from("competition_applications")
      .select("id, applicant_email, applicant_phone, startup_name, data")
      .eq("id", applicationId)
      .single();

    if (app) {
      const { data: otherApps } = await admin
        .from("competition_applications")
        .select("id, applicant_email, applicant_phone, startup_name, data")
        .eq("form_id", formId)
        .neq("id", applicationId)
        .not("status", "in", '("draft","withdrawn")');

      if (otherApps && otherApps.length > 0) {
        const duplicates = detectDuplicates(
          {
            id: app.id,
            applicantEmail: app.applicant_email,
            applicantPhone: app.applicant_phone,
            startupName: app.startup_name,
            data: app.data as Record<string, unknown>,
          },
          otherApps.map((a) => ({
            id: a.id,
            applicantEmail: a.applicant_email,
            applicantPhone: a.applicant_phone,
            startupName: a.startup_name,
            data: a.data as Record<string, unknown>,
          }))
        );

        for (const dup of duplicates) {
          await admin.from("screening_flags").insert({
            application_id: applicationId,
            flag_type: dup.flagType,
            severity: "critical",
            message: dup.message,
            related_application_id: dup.relatedApplicationId,
          });
        }
      }
    }
  } catch (err) {
    console.error("Post-submit screening error:", err);
  }
}
