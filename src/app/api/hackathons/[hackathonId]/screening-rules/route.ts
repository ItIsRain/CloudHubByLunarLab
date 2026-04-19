import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import type { ScreeningRule } from "@/lib/types";
import { checkHackathonAccess, canEdit, canManage } from "@/lib/check-hackathon-access";

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

    // Verify caller has access (owner/admin/editor can view screening rules)
    const getAccess = await checkHackathonAccess(supabase, hackathonId, auth.userId);
    if (!getAccess.hasAccess || !canEdit(getAccess.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("screening_rules, screening_config, registration_fields")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }

    const config = (hackathon.screening_config as Record<string, unknown>) || {};
    const quotaFieldId = config.quotaFieldId as string | undefined;
    let quotaCounts: Record<string, number> = {};

    // If quotas are linked to a field, count registrations per field value
    if (quotaFieldId) {
      const { data: registrations } = await supabase
        .from("hackathon_registrations")
        .select("form_data")
        .eq("hackathon_id", hackathonId)
        .not("status", "in", '("cancelled","rejected","ineligible","declined","withdrawn")');

      if (registrations) {
        for (const reg of registrations) {
          const formData = reg.form_data as Record<string, unknown> | null;
          if (formData) {
            const fieldValue = String(formData[quotaFieldId] || "");
            if (fieldValue) {
              quotaCounts[fieldValue] = (quotaCounts[fieldValue] || 0) + 1;
            }
          }
        }
      }
    }

    return NextResponse.json({
      data: {
        rules: (hackathon.screening_rules as ScreeningRule[]) || [],
        config,
        fields: (hackathon.registration_fields as Record<string, unknown>[]) || [],
        quotaCounts,
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

export async function POST(
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

    // Verify caller has access (owner/admin can modify screening rules)
    const postAccess = await checkHackathonAccess(supabase, hackathonId, auth.userId);
    if (!postAccess.hasAccess || !canManage(postAccess.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { rules } = (await request.json()) as { rules: ScreeningRule[] };

    if (!Array.isArray(rules)) {
      return NextResponse.json(
        { error: "rules must be an array of ScreeningRule objects" },
        { status: 400 }
      );
    }

    // Limit total rules to prevent abuse
    if (rules.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 screening rules allowed" },
        { status: 400 }
      );
    }

    // Validate each rule structure
    const validOperators = new Set([
      "equals", "not_equals", "contains", "not_contains",
      "greater_than", "less_than", "greater_equal", "less_equal",
      "in", "not_in", "is_empty", "is_not_empty", "is_true", "is_false",
    ]);
    const validRuleTypes = new Set(["hard", "soft"]);

    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      if (!r || typeof r !== "object") {
        return NextResponse.json({ error: `Rule at index ${i} is invalid` }, { status: 400 });
      }
      if (!r.id || typeof r.id !== "string") {
        return NextResponse.json({ error: `Rule at index ${i} is missing a valid id` }, { status: 400 });
      }
      if (!r.name || typeof r.name !== "string" || r.name.length > 200) {
        return NextResponse.json({ error: `Rule at index ${i} has invalid name (max 200 chars)` }, { status: 400 });
      }
      if (!r.fieldId || typeof r.fieldId !== "string") {
        return NextResponse.json({ error: `Rule at index ${i} is missing fieldId` }, { status: 400 });
      }
      if (!validOperators.has(r.operator)) {
        return NextResponse.json({ error: `Rule at index ${i} has invalid operator "${r.operator}"` }, { status: 400 });
      }
      if (!validRuleTypes.has(r.ruleType)) {
        return NextResponse.json({ error: `Rule at index ${i} has invalid ruleType "${r.ruleType}"` }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from("hackathons")
      .update({ screening_rules: rules })
      .eq("id", hackathonId)
      .select("screening_rules")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update screening rules" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: { rules: (data.screening_rules as ScreeningRule[]) || [] },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    // Verify caller has access (owner/admin can modify screening config)
    const patchAccess = await checkHackathonAccess(supabase, hackathonId, auth.userId);
    if (!patchAccess.hasAccess || !canManage(patchAccess.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { config } = (await request.json()) as {
      config: {
        quotas?: { campus: string; quota: number }[];
        detectDuplicates?: boolean;
        quotaEnforcement?: string;
        quotaFieldId?: string;
        [key: string]: unknown;
      };
    };

    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { error: "config must be an object" },
        { status: 400 }
      );
    }

    if (config.quotaEnforcement && !["screening", "registration"].includes(config.quotaEnforcement)) {
      return NextResponse.json(
        { error: "quotaEnforcement must be 'screening' or 'registration'" },
        { status: 400 }
      );
    }

    // Validate quotas array
    if (config.quotas && Array.isArray(config.quotas)) {
      if (config.quotas.length > 200) {
        return NextResponse.json({ error: "Maximum 200 quota entries allowed" }, { status: 400 });
      }
      const seenCampuses = new Set<string>();
      for (let i = 0; i < config.quotas.length; i++) {
        const q = config.quotas[i] as Record<string, unknown>;
        if (!q.campus || typeof q.campus !== "string") {
          return NextResponse.json({ error: `Quota at index ${i} is missing campus name` }, { status: 400 });
        }
        if (typeof q.quota !== "number" || q.quota < 0 || !Number.isInteger(q.quota)) {
          return NextResponse.json({ error: `Quota at index ${i} must have a non-negative integer quota` }, { status: 400 });
        }
        if (seenCampuses.has(q.campus)) {
          return NextResponse.json({ error: `Duplicate campus "${q.campus}" at index ${i}` }, { status: 400 });
        }
        seenCampuses.add(q.campus);
      }
    }

    const { data, error } = await supabase
      .from("hackathons")
      .update({ screening_config: config })
      .eq("id", hackathonId)
      .select("screening_config")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update screening config" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: { config: (data.screening_config as Record<string, unknown>) || {} },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
