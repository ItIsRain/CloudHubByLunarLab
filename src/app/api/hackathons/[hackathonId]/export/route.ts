import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import { checkHackathonAccess, canEdit } from "@/lib/check-hackathon-access";

// =====================================================
// Valid export types
// =====================================================

const VALID_EXPORT_TYPES = [
  "applications",
  "screening",
  "scores",
  "registrations",
  "winners",
  "attendance",
] as const;

type ExportType = (typeof VALID_EXPORT_TYPES)[number];

function isValidExportType(value: unknown): value is ExportType {
  return (
    typeof value === "string" &&
    VALID_EXPORT_TYPES.includes(value as ExportType)
  );
}

// =====================================================
// CSV helper — properly escapes values
// =====================================================

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = String(value);
  // Prevent CSV formula injection: if the value starts with a character
  // that spreadsheet apps (Excel, Google Sheets) interpret as a formula
  // trigger, prefix it with a single-quote so it's treated as plain text.
  // This blocks =HYPERLINK(), =cmd|, +cmd, -cmd, @SUM, etc.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // Wrap in quotes if the value contains commas, quotes, newlines, or
  // the single-quote prefix we just added.
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r") || str.includes("'")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCsvValue).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvValue).join(","));
  return [headerLine, ...dataLines].join("\n");
}

// =====================================================
// Authenticate and authorize
// =====================================================

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

  // Check access via RBAC (only owner/admin/editor can export PII data)
  const access = await checkHackathonAccess(supabase, hackathonId, auth.userId);
  if (!access.hasAccess || !canEdit(access.role)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, userId: auth.userId };
}

// =====================================================
// Export: applications
// =====================================================

async function exportApplications(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  hackathonId: string
) {
  const { data, error } = await supabase
    .from("hackathon_registrations")
    .select("*, user:profiles!hackathon_registrations_user_id_fkey(name, email)")
    .eq("hackathon_id", hackathonId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch applications:", error);
    throw new Error("Failed to fetch applications");
  }

  if (!data || data.length === 0) {
    return buildCsv(
      ["Name", "Email", "Status", "Created At", "Form Data"],
      []
    );
  }

  // Collect all unique form_data keys across all registrations
  const formKeys = new Set<string>();
  for (const row of data) {
    if (row.form_data && typeof row.form_data === "object") {
      for (const key of Object.keys(row.form_data as Record<string, unknown>)) {
        formKeys.add(key);
      }
    }
  }

  const sortedFormKeys = [...formKeys].sort();
  const headers = ["Name", "Email", "Status", "Is Draft", "Created At", ...sortedFormKeys];

  const rows = data.map((row) => {
    const user = row.user as { name: string | null; email: string | null } | null;
    const formData = (row.form_data || {}) as Record<string, unknown>;

    return [
      user?.name || "",
      user?.email || "",
      row.status || "",
      row.is_draft ? "Yes" : "No",
      row.created_at || "",
      ...sortedFormKeys.map((key) => {
        const val = formData[key];
        if (val === null || val === undefined) return "";
        if (Array.isArray(val)) return val.join("; ");
        if (typeof val === "object") return JSON.stringify(val);
        return String(val);
      }),
    ];
  });

  return buildCsv(headers, rows);
}

// =====================================================
// Export: screening
// =====================================================

async function exportScreening(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  hackathonId: string
) {
  const { data, error } = await supabase
    .from("hackathon_registrations")
    .select("*, user:profiles!hackathon_registrations_user_id_fkey(name, email)")
    .eq("hackathon_id", hackathonId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch screening data:", error);
    throw new Error("Failed to fetch screening data");
  }

  const headers = [
    "Name",
    "Email",
    "Status",
    "Eligibility Passed",
    "Completeness Score",
    "Screening Completed At",
    "Internal Notes",
  ];

  const rows = (data || []).map((row) => {
    const user = row.user as { name: string | null; email: string | null } | null;

    return [
      user?.name || "",
      user?.email || "",
      row.status || "",
      row.eligibility_passed === null ? "" : row.eligibility_passed ? "Yes" : "No",
      row.completeness_score !== null && row.completeness_score !== undefined
        ? String(row.completeness_score)
        : "",
      row.screening_completed_at || "",
      row.internal_notes || "",
    ];
  });

  return buildCsv(headers, rows);
}

// =====================================================
// Export: scores
// =====================================================

async function exportScores(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  hackathonId: string,
  phaseId?: string
) {
  // If no phaseId, get all phases for this hackathon
  let phaseIds: string[] = [];

  if (phaseId) {
    if (!UUID_RE.test(phaseId)) {
      throw new Error("Invalid phase ID");
    }
    // Verify the phase belongs to this hackathon
    const { data: phase } = await supabase
      .from("competition_phases")
      .select("id")
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .single();

    if (!phase) {
      throw new Error("Phase not found for this competition");
    }
    phaseIds = [phaseId];
  } else {
    const { data: phases } = await supabase
      .from("competition_phases")
      .select("id")
      .eq("hackathon_id", hackathonId);

    phaseIds = (phases || []).map((p) => p.id as string);
  }

  if (phaseIds.length === 0) {
    return buildCsv(
      ["Phase", "Applicant Name", "Applicant Email", "Reviewer Name", "Total Score", "Recommendation", "Flagged", "Submitted At"],
      []
    );
  }

  // Fetch scores with phase and registration joins.
  // reviewer_id has no FK constraint so we look up reviewer profiles separately.
  const { data, error } = await supabase
    .from("phase_scores")
    .select(
      "*, phase:competition_phases!phase_scores_phase_id_fkey(name), registration:hackathon_registrations!phase_scores_registration_id_fkey(user_id, user:profiles!hackathon_registrations_user_id_fkey(name, email))"
    )
    .in("phase_id", phaseIds)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch scores:", error);
    throw new Error("Failed to fetch scores");
  }

  // Collect reviewer IDs and look up their profiles
  const reviewerIds = [...new Set((data || []).map((r) => r.reviewer_id as string))];
  const reviewerMap = new Map<string, { name: string | null; email: string | null }>();

  if (reviewerIds.length > 0) {
    const { data: reviewers } = await supabase
      .from("profiles")
      .select("id, name, email")
      .in("id", reviewerIds);

    for (const rev of reviewers || []) {
      reviewerMap.set(rev.id as string, {
        name: rev.name as string | null,
        email: rev.email as string | null,
      });
    }
  }

  // Collect all unique criteria keys
  const criteriaKeys = new Set<string>();
  for (const row of data || []) {
    if (row.criteria_scores && typeof row.criteria_scores === "object") {
      for (const key of Object.keys(row.criteria_scores as Record<string, unknown>)) {
        criteriaKeys.add(key);
      }
    }
  }

  const sortedCriteriaKeys = [...criteriaKeys].sort();
  const headers = [
    "Phase",
    "Applicant Name",
    "Applicant Email",
    "Reviewer Name",
    ...sortedCriteriaKeys.map((k) => `Score: ${k}`),
    "Total Score",
    "Recommendation",
    "Flagged",
    "Submitted At",
  ];

  const rows = (data || []).map((row) => {
    const phase = row.phase as { name: string } | null;
    const reviewer = reviewerMap.get(row.reviewer_id as string);
    const registration = row.registration as {
      user_id: string;
      user: { name: string | null; email: string | null } | null;
    } | null;
    const criteriaScores = (row.criteria_scores || {}) as Record<string, unknown>;

    return [
      phase?.name || "",
      registration?.user?.name || "",
      registration?.user?.email || "",
      reviewer?.name || "",
      ...sortedCriteriaKeys.map((key) => {
        const val = criteriaScores[key];
        if (val === null || val === undefined) return "";
        if (typeof val === "object") {
          const obj = val as Record<string, unknown>;
          return obj.score !== undefined ? String(obj.score) : JSON.stringify(val);
        }
        return String(val);
      }),
      String(row.total_score ?? ""),
      row.recommendation || "",
      row.flagged ? "Yes" : "No",
      row.submitted_at || "",
    ];
  });

  return buildCsv(headers, rows);
}

// =====================================================
// Export: registrations (basic list)
// =====================================================

async function exportRegistrations(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  hackathonId: string
) {
  const { data, error } = await supabase
    .from("hackathon_registrations")
    .select("*, user:profiles!hackathon_registrations_user_id_fkey(name, email)")
    .eq("hackathon_id", hackathonId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch registrations:", error);
    throw new Error("Failed to fetch registrations");
  }

  const headers = [
    "Name",
    "Email",
    "Status",
    "RSVP Status",
    "Created At",
  ];

  const rows = (data || []).map((row) => {
    const user = row.user as { name: string | null; email: string | null } | null;

    return [
      user?.name || "",
      user?.email || "",
      row.status || "",
      row.rsvp_status || "",
      row.created_at || "",
    ];
  });

  return buildCsv(headers, rows);
}

// =====================================================
// Export: winners
// =====================================================

async function exportWinners(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  hackathonId: string
) {
  const { data, error } = await supabase
    .from("competition_winners")
    .select(
      "*, registration:hackathon_registrations!competition_winners_registration_id_fkey(user:profiles!hackathon_registrations_user_id_fkey(name, email)), track:award_tracks!competition_winners_award_track_id_fkey(name, track_type)"
    )
    .eq("hackathon_id", hackathonId)
    .order("rank", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Failed to fetch winners:", error);
    throw new Error("Failed to fetch winners");
  }

  const headers = [
    "Rank",
    "Name",
    "Email",
    "Award Track",
    "Track Type",
    "Award Label",
    "Score",
    "Confirmed",
    "Locked",
    "Notes",
  ];

  const rows = (data || []).map((row) => {
    const registration = row.registration as {
      user: { name: string | null; email: string | null } | null;
    } | null;
    const track = row.track as {
      name: string | null;
      track_type: string | null;
    } | null;

    return [
      row.rank !== null && row.rank !== undefined ? String(row.rank) : "",
      registration?.user?.name || "",
      registration?.user?.email || "",
      track?.name || "",
      track?.track_type || "",
      row.award_label || "",
      row.final_score !== null && row.final_score !== undefined
        ? String(row.final_score)
        : "",
      row.confirmed ? "Yes" : "No",
      row.locked ? "Yes" : "No",
      row.notes || "",
    ];
  });

  return buildCsv(headers, rows);
}

// =====================================================
// Export: attendance
// =====================================================

const ATTENDANCE_STATUSES = [
  "accepted",
  "approved",
  "confirmed",
  "declined",
  "cancelled",
];

async function exportAttendance(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  hackathonId: string
) {
  // Fetch the hackathon's screening_config to find the quotaFieldId
  const { data: hackathon } = await supabase
    .from("hackathons")
    .select("screening_config")
    .eq("id", hackathonId)
    .single();

  const screeningConfig = (hackathon?.screening_config || {}) as {
    quotaFieldId?: string;
  };
  const quotaFieldId = screeningConfig.quotaFieldId || null;

  const { data, error } = await supabase
    .from("hackathon_registrations")
    .select("*, user:profiles!hackathon_registrations_user_id_fkey(name, email)")
    .eq("hackathon_id", hackathonId)
    .in("status", ATTENDANCE_STATUSES)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch attendance data:", error);
    throw new Error("Failed to fetch attendance data");
  }

  const headers = [
    "Name",
    "Email",
    "Status",
    "RSVP Status",
    "Campus",
    "Registered At",
  ];

  const rows = (data || []).map((row) => {
    const user = row.user as { name: string | null; email: string | null } | null;
    const formData = (row.form_data || {}) as Record<string, unknown>;

    // Extract campus from form_data using the quotaFieldId
    let campus = "";
    if (quotaFieldId && formData[quotaFieldId] !== undefined && formData[quotaFieldId] !== null) {
      const val = formData[quotaFieldId];
      campus = Array.isArray(val) ? val.join("; ") : String(val);
    }

    return [
      user?.name || "",
      user?.email || "",
      row.status || "",
      row.rsvp_status || "",
      campus,
      row.created_at || "",
    ];
  });

  return buildCsv(headers, rows);
}

// =====================================================
// GET — Export hackathon data as CSV
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const exportType = searchParams.get("type");
    const phaseId = searchParams.get("phaseId") || undefined;

    if (!exportType || !isValidExportType(exportType)) {
      return NextResponse.json(
        {
          error: `type must be one of: ${VALID_EXPORT_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Generate CSV based on export type
    let csv: string;

    switch (exportType) {
      case "applications":
        csv = await exportApplications(supabase, hackathonId);
        break;
      case "screening":
        csv = await exportScreening(supabase, hackathonId);
        break;
      case "scores":
        csv = await exportScores(supabase, hackathonId, phaseId);
        break;
      case "registrations":
        csv = await exportRegistrations(supabase, hackathonId);
        break;
      case "winners":
        csv = await exportWinners(supabase, hackathonId);
        break;
      case "attendance":
        csv = await exportAttendance(supabase, hackathonId);
        break;
    }

    const date = new Date().toISOString().slice(0, 10);
    const filename = `competition-${exportType}-${date}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
