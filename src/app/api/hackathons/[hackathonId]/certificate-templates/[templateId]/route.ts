import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import { checkHackathonAccess, canEdit, type HackathonRole } from "@/lib/check-hackathon-access";

const ALLOWED_FONT_FAMILIES = new Set(["Helvetica", "TimesRoman", "Courier"]);
const ALLOWED_ALIGNMENTS = new Set(["left", "center", "right"]);
const ALLOWED_FONT_WEIGHTS = new Set(["normal", "bold"]);
const ALLOWED_CERT_TYPES = new Set([
  "participation",
  "winner",
  "runner_up",
  "mentor",
  "judge",
  "organizer",
  "speaker",
  "volunteer",
]);
const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

type RouteParams = {
  params: Promise<{ hackathonId: string; templateId: string }>;
};

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

  const access = await checkHackathonAccess(supabase, hackathonId, auth.userId);
  if (!access.hasAccess) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    supabase: getSupabaseAdminClient(),
    userId: auth.userId,
    role: access.role as HackathonRole,
  };
}

// ── GET — single template + send history summary ──────────
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, templateId } = await params;
    if (!UUID_RE.test(hackathonId) || !UUID_RE.test(templateId)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;
    const { supabase } = result;

    const { data: template } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("id", templateId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle();

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const { data: sends } = await supabase
      .from("certificate_sends")
      .select("id, recipient_email, recipient_name, status, sent_at")
      .eq("template_id", templateId)
      .order("sent_at", { ascending: false })
      .limit(500);

    return NextResponse.json({ data: { template, sends: sends ?? [] } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── PATCH — edit name, description, name_box, cert_type ───
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, templateId } = await params;
    if (!UUID_RE.test(hackathonId) || !UUID_RE.test(templateId)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;
    const { supabase, role } = result;

    if (!canEdit(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // We need the existing page size to validate any name_box update against it.
    const { data: existing } = await supabase
      .from("certificate_templates")
      .select("page_width, page_height")
      .eq("id", templateId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = (body.name as string)?.trim();
      if (!name || name.length > 200) {
        return NextResponse.json(
          { error: "name must be 1-200 chars" },
          { status: 400 }
        );
      }
      updatePayload.name = name;
    }

    if (body.description !== undefined) {
      const description = body.description === null ? null : (body.description as string)?.trim();
      if (description && description.length > 1000) {
        return NextResponse.json(
          { error: "description must be at most 1000 chars" },
          { status: 400 }
        );
      }
      updatePayload.description = description || null;
    }

    if (body.cert_type !== undefined) {
      if (!ALLOWED_CERT_TYPES.has(body.cert_type as string)) {
        return NextResponse.json({ error: "Invalid cert_type" }, { status: 400 });
      }
      updatePayload.cert_type = body.cert_type;
    }

    if (body.name_box !== undefined) {
      const raw = body.name_box;
      if (!raw || typeof raw !== "object") {
        return NextResponse.json(
          { error: "name_box must be an object" },
          { status: 400 }
        );
      }
      const b = raw as Record<string, unknown>;
      const x = Number(b.x);
      const y = Number(b.y);
      const width = Number(b.width);
      const height = Number(b.height);
      const fontSize = Number(b.fontSize);
      const fontColor = typeof b.fontColor === "string" ? b.fontColor : "#111111";
      const fontWeight = b.fontWeight === "bold" ? "bold" : "normal";
      const alignment =
        typeof b.alignment === "string" && ALLOWED_ALIGNMENTS.has(b.alignment)
          ? (b.alignment as string)
          : "center";
      const fontFamily =
        typeof b.fontFamily === "string" && ALLOWED_FONT_FAMILIES.has(b.fontFamily)
          ? (b.fontFamily as string)
          : "Helvetica";

      if (![x, y, width, height, fontSize].every(Number.isFinite)) {
        return NextResponse.json(
          { error: "name_box coords must be numbers" },
          { status: 400 }
        );
      }
      if (width <= 0 || height <= 0) {
        return NextResponse.json(
          { error: "name_box width/height must be > 0" },
          { status: 400 }
        );
      }
      if (fontSize < 6 || fontSize > 200) {
        return NextResponse.json(
          { error: "fontSize must be between 6 and 200" },
          { status: 400 }
        );
      }
      if (!HEX_COLOR_RE.test(fontColor)) {
        return NextResponse.json(
          { error: "fontColor must be a hex like #111111" },
          { status: 400 }
        );
      }
      if (!ALLOWED_FONT_WEIGHTS.has(fontWeight)) {
        return NextResponse.json(
          { error: "fontWeight must be normal or bold" },
          { status: 400 }
        );
      }
      const pw = Number(existing.page_width);
      const ph = Number(existing.page_height);
      if (x < 0 || y < 0 || x + width > pw + 1 || y + height > ph + 1) {
        return NextResponse.json(
          { error: "name_box extends beyond the page" },
          { status: 400 }
        );
      }

      updatePayload.name_box = {
        x,
        y,
        width,
        height,
        fontSize,
        fontColor,
        fontWeight,
        alignment,
        fontFamily,
      };
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data: updated, error } = await supabase
      .from("certificate_templates")
      .update(updatePayload)
      .eq("id", templateId)
      .eq("hackathon_id", hackathonId)
      .select("*")
      .single();

    if (error) {
      console.error("Failed to update certificate template:", error);
      return NextResponse.json(
        { error: "Failed to update certificate template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── DELETE — remove a template (and cascade its sends/log) ──
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, templateId } = await params;
    if (!UUID_RE.test(hackathonId) || !UUID_RE.test(templateId)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;
    const { supabase, role } = result;

    if (!canEdit(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error, count } = await supabase
      .from("certificate_templates")
      .delete({ count: "exact" })
      .eq("id", templateId)
      .eq("hackathon_id", hackathonId);

    if (error) {
      console.error("Failed to delete certificate template:", error);
      return NextResponse.json(
        { error: "Failed to delete certificate template" },
        { status: 500 }
      );
    }

    if (!count) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Template deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
