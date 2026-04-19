import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import { checkHackathonAccess, canEdit, type HackathonRole } from "@/lib/check-hackathon-access";

// ── Auth helper ─────────────────────────────────────────

async function authenticateAndAuthorize(
  request: NextRequest,
  hackathonId: string
) {
  const auth = await authenticateRequest(request);

  if (auth.type === "unauthenticated") {
    return {
      error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  if (auth.type === "api_key") {
    const scopeError = assertScope(auth, "/api/hackathons");
    if (scopeError) {
      return {
        error: NextResponse.json({ error: scopeError }, { status: 403 }),
      };
    }
  }

  const supabase =
    auth.type === "api_key"
      ? getSupabaseAdminClient()
      : await getSupabaseServerClient();

  // Check access via RBAC (all collaborator roles have base access)
  const access = await checkHackathonAccess(supabase, hackathonId, auth.userId);
  if (!access.hasAccess) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, userId: auth.userId, role: access.role as HackathonRole };
}

// ── Validation helpers ──────────────────────────────────

const VALID_UNITS = ["count", "%", "currency", "custom"] as const;
const VALID_CATEGORIES = [
  "engagement",
  "quality",
  "impact",
  "operations",
  "custom",
] as const;

function isValidUnit(value: unknown): boolean {
  return typeof value === "string" && VALID_UNITS.includes(value as typeof VALID_UNITS[number]);
}

function isValidCategory(value: unknown): boolean {
  return typeof value === "string" && VALID_CATEGORIES.includes(value as typeof VALID_CATEGORIES[number]);
}

// =====================================================
// GET — List all KPIs for this hackathon
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid competition ID" },
        { status: 400 }
      );
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;

    const { supabase } = result;

    const { data: kpis, error } = await supabase
      .from("competition_kpis")
      .select("*")
      .eq("hackathon_id", hackathonId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Failed to fetch KPIs:", error);
      return NextResponse.json(
        { error: "Failed to fetch KPIs" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: kpis ?? [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// POST — Create a new KPI
// =====================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid competition ID" },
        { status: 400 }
      );
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;

    const { supabase, role } = result;

    // POST requires owner/admin/editor
    if (!canEdit(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Support batch creation (array of KPIs)
    const items: unknown[] = Array.isArray(body) ? body : [body];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "At least one KPI is required" },
        { status: 400 }
      );
    }

    if (items.length > 50) {
      return NextResponse.json(
        { error: "Cannot create more than 50 KPIs at once" },
        { status: 400 }
      );
    }

    const insertPayloads = [];

    for (const item of items) {
      const kpi = item as Record<string, unknown>;

      // Validate name (required)
      if (
        !kpi.name ||
        typeof kpi.name !== "string" ||
        (kpi.name as string).trim().length === 0
      ) {
        return NextResponse.json(
          { error: "name is required for each KPI" },
          { status: 400 }
        );
      }
      if ((kpi.name as string).length > 200) {
        return NextResponse.json(
          { error: "name must be at most 200 characters" },
          { status: 400 }
        );
      }

      // Validate description
      if (kpi.description !== undefined && kpi.description !== null) {
        if (typeof kpi.description !== "string") {
          return NextResponse.json(
            { error: "description must be a string" },
            { status: 400 }
          );
        }
        if ((kpi.description as string).length > 2000) {
          return NextResponse.json(
            { error: "description must be at most 2000 characters" },
            { status: 400 }
          );
        }
      }

      // Validate targetValue (required, >= 0)
      if (kpi.targetValue === undefined || kpi.targetValue === null) {
        return NextResponse.json(
          { error: "targetValue is required for each KPI" },
          { status: 400 }
        );
      }
      if (typeof kpi.targetValue !== "number" || kpi.targetValue < 0) {
        return NextResponse.json(
          { error: "targetValue must be a non-negative number" },
          { status: 400 }
        );
      }

      // Validate actualValue
      if (kpi.actualValue !== undefined && kpi.actualValue !== null) {
        if (typeof kpi.actualValue !== "number" || kpi.actualValue < 0) {
          return NextResponse.json(
            { error: "actualValue must be a non-negative number" },
            { status: 400 }
          );
        }
      }

      // Validate unit
      if (kpi.unit !== undefined && kpi.unit !== null) {
        if (!isValidUnit(kpi.unit)) {
          return NextResponse.json(
            { error: `unit must be one of: ${VALID_UNITS.join(", ")}` },
            { status: 400 }
          );
        }
      }

      // Validate category
      if (kpi.category !== undefined && kpi.category !== null) {
        if (!isValidCategory(kpi.category)) {
          return NextResponse.json(
            { error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` },
            { status: 400 }
          );
        }
      }

      // Validate sortOrder
      if (kpi.sortOrder !== undefined) {
        if (typeof kpi.sortOrder !== "number" || kpi.sortOrder < 0) {
          return NextResponse.json(
            { error: "sortOrder must be a non-negative number" },
            { status: 400 }
          );
        }
      }

      insertPayloads.push({
        hackathon_id: hackathonId,
        name: (kpi.name as string).trim(),
        description: kpi.description ?? null,
        target_value: kpi.targetValue as number,
        actual_value: typeof kpi.actualValue === "number" ? kpi.actualValue : 0,
        unit: typeof kpi.unit === "string" ? kpi.unit : "count",
        category: typeof kpi.category === "string" ? kpi.category : "engagement",
        sort_order: typeof kpi.sortOrder === "number" ? kpi.sortOrder : 0,
      });
    }

    const { data: kpis, error } = await supabase
      .from("competition_kpis")
      .insert(insertPayloads)
      .select("*");

    if (error) {
      console.error("Failed to create KPI:", error);
      return NextResponse.json(
        { error: "Failed to create KPI" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: kpis }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH — Update a KPI
// =====================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid competition ID" },
        { status: 400 }
      );
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;

    const { supabase, role } = result;

    // PATCH requires owner/admin/editor
    if (!canEdit(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { kpiId, ...updates } = body;

    if (!kpiId || typeof kpiId !== "string") {
      return NextResponse.json(
        { error: "kpiId is required" },
        { status: 400 }
      );
    }
    if (!UUID_RE.test(kpiId)) {
      return NextResponse.json(
        { error: "Invalid KPI ID" },
        { status: 400 }
      );
    }

    // Map camelCase body fields to snake_case DB columns
    const fieldMapping: Record<string, string> = {
      name: "name",
      description: "description",
      targetValue: "target_value",
      actualValue: "actual_value",
      unit: "unit",
      category: "category",
      sortOrder: "sort_order",
    };

    const updatePayload: Record<string, unknown> = {};

    for (const [bodyField, dbField] of Object.entries(fieldMapping)) {
      if (bodyField in updates) {
        updatePayload[dbField] = updates[bodyField];
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Validate individual fields if present
    if ("name" in updatePayload) {
      const name = updatePayload.name;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "name cannot be empty" },
          { status: 400 }
        );
      }
      if ((name as string).length > 200) {
        return NextResponse.json(
          { error: "name must be at most 200 characters" },
          { status: 400 }
        );
      }
      updatePayload.name = (name as string).trim();
    }

    if ("description" in updatePayload) {
      const desc = updatePayload.description;
      if (desc !== null && typeof desc !== "string") {
        return NextResponse.json(
          { error: "description must be a string or null" },
          { status: 400 }
        );
      }
      if (typeof desc === "string" && desc.length > 2000) {
        return NextResponse.json(
          { error: "description must be at most 2000 characters" },
          { status: 400 }
        );
      }
    }

    if ("target_value" in updatePayload) {
      const val = updatePayload.target_value;
      if (typeof val !== "number" || val < 0) {
        return NextResponse.json(
          { error: "targetValue must be a non-negative number" },
          { status: 400 }
        );
      }
    }

    if ("actual_value" in updatePayload) {
      const val = updatePayload.actual_value;
      if (typeof val !== "number" || val < 0) {
        return NextResponse.json(
          { error: "actualValue must be a non-negative number" },
          { status: 400 }
        );
      }
    }

    if ("unit" in updatePayload) {
      if (!isValidUnit(updatePayload.unit)) {
        return NextResponse.json(
          { error: `unit must be one of: ${VALID_UNITS.join(", ")}` },
          { status: 400 }
        );
      }
    }

    if ("category" in updatePayload) {
      if (!isValidCategory(updatePayload.category)) {
        return NextResponse.json(
          { error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` },
          { status: 400 }
        );
      }
    }

    if ("sort_order" in updatePayload) {
      const val = updatePayload.sort_order;
      if (typeof val !== "number" || val < 0) {
        return NextResponse.json(
          { error: "sortOrder must be a non-negative number" },
          { status: 400 }
        );
      }
    }

    const { data: kpi, error } = await supabase
      .from("competition_kpis")
      .update(updatePayload)
      .eq("id", kpiId)
      .eq("hackathon_id", hackathonId)
      .select("*")
      .single();

    if (error) {
      console.error("Failed to update KPI:", error);
      return NextResponse.json(
        { error: "Failed to update KPI" },
        { status: 500 }
      );
    }

    if (!kpi) {
      return NextResponse.json(
        { error: "KPI not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: kpi });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE — Delete a KPI
// =====================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json(
        { error: "Invalid competition ID" },
        { status: 400 }
      );
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;

    const { supabase, role: delRole } = result;

    // DELETE requires owner/admin/editor
    if (!canEdit(delRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { kpiId } = body;

    if (!kpiId || typeof kpiId !== "string") {
      return NextResponse.json(
        { error: "kpiId is required" },
        { status: 400 }
      );
    }
    if (!UUID_RE.test(kpiId)) {
      return NextResponse.json(
        { error: "Invalid KPI ID" },
        { status: 400 }
      );
    }

    const { error, count } = await supabase
      .from("competition_kpis")
      .delete()
      .eq("id", kpiId)
      .eq("hackathon_id", hackathonId);

    if (error) {
      console.error("Failed to delete KPI:", error);
      return NextResponse.json(
        { error: "Failed to delete KPI" },
        { status: 500 }
      );
    }

    if (count === 0) {
      return NextResponse.json(
        { error: "KPI not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "KPI deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
