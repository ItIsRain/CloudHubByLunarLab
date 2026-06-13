import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import { checkHackathonAccess, canEdit, type HackathonRole } from "@/lib/check-hackathon-access";

// ── Auth helper ────────────────────────────────────────────
// Mirrors the email-templates route: collaborator-aware via
// checkHackathonAccess; writes go through the admin client to bypass the
// organizer-only RLS policy (which is intentionally narrow because RLS
// can't easily express "owner OR editor collaborator").

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

// ── Validation ─────────────────────────────────────────────

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

/**
 * Validate and normalize a name-box config. Returns either { ok: true, value }
 * or { ok: false, error }.
 *
 * Coordinates are PDF points (72 dpi) with origin at the top-left so the
 * editor canvas and the rendered server side speak the same language.
 * pdf-lib's coordinate origin is bottom-left; the renderer flips Y at draw
 * time using the template's page_height.
 */
export type NameBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontColor: string;
  fontWeight: "normal" | "bold";
  alignment: "left" | "center" | "right";
  fontFamily: "Helvetica" | "TimesRoman" | "Courier";
};

function validateNameBox(
  raw: unknown,
  page: { width: number; height: number }
): { ok: true; value: NameBox } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "name_box must be an object" };
  }
  const b = raw as Record<string, unknown>;
  const x = Number(b.x);
  const y = Number(b.y);
  const width = Number(b.width);
  const height = Number(b.height);
  const fontSize = Number(b.fontSize);
  const fontColor = typeof b.fontColor === "string" ? b.fontColor : "#111111";
  const fontWeight =
    b.fontWeight === "bold" ? "bold" : "normal";
  const alignment =
    typeof b.alignment === "string" && ALLOWED_ALIGNMENTS.has(b.alignment)
      ? (b.alignment as NameBox["alignment"])
      : "center";
  const fontFamily =
    typeof b.fontFamily === "string" && ALLOWED_FONT_FAMILIES.has(b.fontFamily)
      ? (b.fontFamily as NameBox["fontFamily"])
      : "Helvetica";

  if (![x, y, width, height, fontSize].every(Number.isFinite)) {
    return { ok: false, error: "name_box coords must be numbers" };
  }
  if (width <= 0 || height <= 0) {
    return { ok: false, error: "name_box width/height must be > 0" };
  }
  if (fontSize < 6 || fontSize > 200) {
    return { ok: false, error: "fontSize must be between 6 and 200" };
  }
  if (!HEX_COLOR_RE.test(fontColor)) {
    return { ok: false, error: "fontColor must be a hex like #111111" };
  }
  // Clamp to page so a buggy editor can't store a box pointing off-page.
  if (
    x < 0 ||
    y < 0 ||
    x + width > page.width + 1 ||
    y + height > page.height + 1
  ) {
    return { ok: false, error: "name_box extends beyond the page" };
  }
  if (!ALLOWED_FONT_WEIGHTS.has(fontWeight)) {
    return { ok: false, error: "fontWeight must be normal or bold" };
  }

  return {
    ok: true,
    value: { x, y, width, height, fontSize, fontColor, fontWeight, alignment, fontFamily },
  };
}

// =====================================================
// GET — List all certificate templates for this hackathon
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;
    const { supabase } = result;

    const { data: templates, error } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("hackathon_id", hackathonId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch certificate templates:", error);
      return NextResponse.json(
        { error: "Failed to fetch certificate templates" },
        { status: 500 }
      );
    }

    // Send counts per template so the UI can show "Sent to N recipients".
    const ids = (templates ?? []).map((t) => t.id as string);
    const sendCounts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: countRows } = await supabase
        .from("certificate_sends")
        .select("template_id")
        .in("template_id", ids)
        .eq("status", "sent");
      for (const row of countRows ?? []) {
        const tid = (row as Record<string, unknown>).template_id as string;
        sendCounts[tid] = (sendCounts[tid] ?? 0) + 1;
      }
    }

    const data = (templates ?? []).map((t) => ({
      ...t,
      sentCount: sendCounts[t.id as string] ?? 0,
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =====================================================
// POST — Create a new certificate template
// Body: { name, description?, pdf_url, pdf_public_id?, pdf_bytes?, page_width,
//         page_height, name_box, extra_blocks?, cert_type? }
// =====================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;
    const { supabase, userId, role } = result;

    if (!canEdit(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const name = (body.name as string | undefined)?.trim();
    const description = (body.description as string | undefined)?.trim();
    const pdfUrl = body.pdf_url as string | undefined;
    const pdfPublicId = (body.pdf_public_id as string | undefined) ?? null;
    const pdfBytes = body.pdf_bytes as number | undefined;
    const pageWidth = Number(body.page_width);
    const pageHeight = Number(body.page_height);
    const certType = (body.cert_type as string | undefined) ?? "participation";

    if (!name || name.length > 200) {
      return NextResponse.json(
        { error: "name is required (max 200 chars)" },
        { status: 400 }
      );
    }
    if (description && description.length > 1000) {
      return NextResponse.json(
        { error: "description must be at most 1000 characters" },
        { status: 400 }
      );
    }
    if (!pdfUrl || typeof pdfUrl !== "string" || !/^https?:\/\//.test(pdfUrl)) {
      return NextResponse.json(
        { error: "pdf_url is required and must be an http(s) URL" },
        { status: 400 }
      );
    }
    // Lock the PDF source to Cloudinary so a malicious payload can't make our
    // server fetch arbitrary URLs at send time (SSRF).
    if (!/^https:\/\/res\.cloudinary\.com\//.test(pdfUrl)) {
      return NextResponse.json(
        { error: "pdf_url must be a Cloudinary URL" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(pageWidth) || pageWidth <= 0 || pageWidth > 5000) {
      return NextResponse.json(
        { error: "page_width must be a positive number (max 5000)" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(pageHeight) || pageHeight <= 0 || pageHeight > 5000) {
      return NextResponse.json(
        { error: "page_height must be a positive number (max 5000)" },
        { status: 400 }
      );
    }
    if (!ALLOWED_CERT_TYPES.has(certType)) {
      return NextResponse.json({ error: "Invalid cert_type" }, { status: 400 });
    }

    const boxResult = validateNameBox(body.name_box, {
      width: pageWidth,
      height: pageHeight,
    });
    if (!boxResult.ok) {
      return NextResponse.json({ error: boxResult.error }, { status: 400 });
    }

    const { data: template, error } = await supabase
      .from("certificate_templates")
      .insert({
        hackathon_id: hackathonId,
        name,
        description: description || null,
        pdf_url: pdfUrl,
        pdf_public_id: pdfPublicId,
        pdf_bytes: typeof pdfBytes === "number" ? Math.floor(pdfBytes) : null,
        page_width: pageWidth,
        page_height: pageHeight,
        name_box: boxResult.value,
        cert_type: certType,
        created_by: userId,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Failed to create certificate template:", error);
      return NextResponse.json(
        { error: "Failed to create certificate template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
