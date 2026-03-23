import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { checkHackathonAccess, canEdit } from "@/lib/check-hackathon-access";

// Helper to get lastAutoTable.finalY from doc (jspdf-autotable augments the doc)
function getLastTableY(doc: jsPDF, fallback: number): number {
  const d = doc as unknown as { lastAutoTable?: { finalY?: number } };
  return d.lastAutoTable?.finalY ?? fallback;
}

// ── Auth helper ─────────────────────────────────────────

async function authenticateAndAuthorize(request: NextRequest, hackathonId: string) {
  const auth = await authenticateRequest(request);
  if (auth.type === "unauthenticated") {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  if (auth.type === "api_key") {
    const scopeError = assertScope(auth, "/api/hackathons");
    if (scopeError) return { error: NextResponse.json({ error: scopeError }, { status: 403 }) };
  }
  const supabase = auth.type === "api_key" ? getSupabaseAdminClient() : await getSupabaseServerClient();

  // Check access via RBAC (only owner/admin/editor can view full reports)
  const access = await checkHackathonAccess(supabase, hackathonId, auth.userId);
  if (!access.hasAccess || !canEdit(access.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const { data: hackathon } = await supabase
    .from("hackathons")
    .select("id, name, tagline, organizer_id, status, screening_config")
    .eq("id", hackathonId)
    .single();

  if (!hackathon) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  return { supabase, hackathon: hackathon as Record<string, unknown> };
}

// ── PDF generation ──────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;
    const { supabase, hackathon } = result;

    const screeningConfig = (hackathon.screening_config as Record<string, unknown>) || {};
    const quotaFieldId = screeningConfig.quotaFieldId as string | undefined;

    // ── Fetch data in parallel ───────────────────────────
    const [regResult, phasesResult, winnersResult, kpiResult] = await Promise.all([
      supabase
        .from("hackathon_registrations")
        .select("id, status, created_at, form_data, screening_completed_at, rsvp_status, eligibility_passed")
        .eq("hackathon_id", hackathonId),
      supabase
        .from("competition_phases")
        .select("id, name, status, sort_order")
        .eq("hackathon_id", hackathonId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("competition_winners")
        .select("id, rank, final_score, confirmed, locked, award_label, registration:hackathon_registrations!competition_winners_registration_id_fkey(user:profiles!hackathon_registrations_user_id_fkey(name, email)), track:award_tracks!competition_winners_award_track_id_fkey(name)")
        .eq("hackathon_id", hackathonId)
        .order("rank", { ascending: true, nullsFirst: false }),
      supabase
        .from("competition_kpis")
        .select("*")
        .eq("hackathon_id", hackathonId)
        .order("sort_order", { ascending: true }),
    ]);

    const registrations = regResult.data || [];
    const phases = phasesResult.data || [];
    const winners = winnersResult.data || [];
    const kpis = kpiResult.data || [];

    // ── Compute stats ────────────────────────────────────
    const statusCounts: Record<string, number> = {};
    const campusCounts: Record<string, number> = {};
    let screenedCount = 0;
    let eligibleCount = 0;

    for (const reg of registrations) {
      const r = reg as Record<string, unknown>;
      statusCounts[r.status as string] = (statusCounts[r.status as string] || 0) + 1;
      if (r.screening_completed_at) screenedCount++;
      if (r.eligibility_passed) eligibleCount++;
      if (quotaFieldId) {
        const fd = r.form_data as Record<string, unknown> | null;
        const campus = fd ? String(fd[quotaFieldId] || "") : "";
        if (campus) campusCounts[campus] = (campusCounts[campus] || 0) + 1;
      }
    }

    // Fetch phase scoring stats
    const phaseIds = phases.map((p) => (p as Record<string, unknown>).id as string);
    let phaseStats: { phaseId: string; phaseName: string; scored: number; total: number }[] = [];
    if (phaseIds.length > 0) {
      const [assignResult, scoreResult] = await Promise.all([
        supabase.from("reviewer_assignments").select("phase_id, registration_id").in("phase_id", phaseIds),
        supabase.from("phase_scores").select("phase_id, registration_id").in("phase_id", phaseIds),
      ]);

      const assignByPhase: Record<string, Set<string>> = {};
      for (const a of assignResult.data || []) {
        const r = a as Record<string, unknown>;
        const pid = r.phase_id as string;
        if (!assignByPhase[pid]) assignByPhase[pid] = new Set();
        assignByPhase[pid].add(r.registration_id as string);
      }
      const scoreByPhase: Record<string, Set<string>> = {};
      for (const s of scoreResult.data || []) {
        const r = s as Record<string, unknown>;
        const pid = r.phase_id as string;
        if (!scoreByPhase[pid]) scoreByPhase[pid] = new Set();
        scoreByPhase[pid].add(r.registration_id as string);
      }

      phaseStats = phases.map((p) => {
        const r = p as Record<string, unknown>;
        const pid = r.id as string;
        return {
          phaseId: pid,
          phaseName: r.name as string,
          scored: scoreByPhase[pid]?.size || 0,
          total: assignByPhase[pid]?.size || 0,
        };
      });
    }

    // ── Build PDF ────────────────────────────────────────
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    // Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(hackathon.name as string, margin, y + 8);
    y += 14;

    if (hackathon.tagline) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text(hackathon.tagline as string, margin, y);
      y += 6;
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, margin, y);
    y += 4;

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // ── Section: Key Metrics ──────────────────────────────
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Key Metrics", margin, y);
    y += 8;

    const metrics = [
      ["Total Applications", String(registrations.length)],
      ["Screened", `${screenedCount} (${registrations.length > 0 ? Math.round((screenedCount / registrations.length) * 100) : 0}%)`],
      ["Eligible", String(eligibleCount)],
      ["Winners", String(winners.length)],
      ["Competition Phases", String(phases.length)],
    ];

    autoTable(doc, {
      startY: y,
      head: [["Metric", "Value"]],
      body: metrics,
      theme: "striped",
      headStyles: { fillColor: [232, 68, 10], textColor: 255, fontStyle: "bold" },
      margin: { left: margin, right: margin },
      styles: { fontSize: 10 },
    });
    y = getLastTableY(doc, y + 40);
    y += 10;

    // ── Section: Application Status Breakdown ─────────────
    if (Object.keys(statusCounts).length > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Application Status Breakdown", margin, y);
      y += 8;

      const statusRows = Object.entries(statusCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([status, count]) => [
          status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          String(count),
          `${registrations.length > 0 ? ((count / registrations.length) * 100).toFixed(1) : 0}%`,
        ]);

      autoTable(doc, {
        startY: y,
        head: [["Status", "Count", "% of Total"]],
        body: statusRows,
        theme: "striped",
        headStyles: { fillColor: [232, 68, 10], textColor: 255, fontStyle: "bold" },
        margin: { left: margin, right: margin },
        styles: { fontSize: 10 },
      });
      y = getLastTableY(doc, y + 30);
      y += 10;
    }

    // ── Section: Campus Distribution ──────────────────────
    if (Object.keys(campusCounts).length > 0) {
      if (y > 230) { doc.addPage(); y = margin; }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Campus Distribution", margin, y);
      y += 8;

      const campusRows = Object.entries(campusCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([campus, count]) => [campus, String(count)]);

      autoTable(doc, {
        startY: y,
        head: [["Campus", "Applications"]],
        body: campusRows,
        theme: "striped",
        headStyles: { fillColor: [232, 68, 10], textColor: 255, fontStyle: "bold" },
        margin: { left: margin, right: margin },
        styles: { fontSize: 10 },
      });
      y = getLastTableY(doc, y + 20);
      y += 10;
    }

    // ── Section: Phase Scoring Progress ───────────────────
    if (phaseStats.length > 0) {
      if (y > 230) { doc.addPage(); y = margin; }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Phase Scoring Progress", margin, y);
      y += 8;

      const phaseRows = phaseStats.map((ps) => [
        ps.phaseName,
        String(ps.total),
        String(ps.scored),
        ps.total > 0 ? `${Math.round((ps.scored / ps.total) * 100)}%` : "N/A",
      ]);

      autoTable(doc, {
        startY: y,
        head: [["Phase", "Assignments", "Scored", "Completion"]],
        body: phaseRows,
        theme: "striped",
        headStyles: { fillColor: [232, 68, 10], textColor: 255, fontStyle: "bold" },
        margin: { left: margin, right: margin },
        styles: { fontSize: 10 },
      });
      y = getLastTableY(doc, y + 20);
      y += 10;
    }

    // ── Section: Winners ──────────────────────────────────
    if (winners.length > 0) {
      if (y > 200) { doc.addPage(); y = margin; }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Winners", margin, y);
      y += 8;

      const winnerRows = winners.map((w) => {
        const row = w as Record<string, unknown>;
        const reg = row.registration as { user: { name: string | null; email: string | null } | null } | null;
        const track = row.track as { name: string | null } | null;
        return [
          row.rank !== null ? `#${row.rank}` : "-",
          reg?.user?.name || "Unknown",
          track?.name || "-",
          row.award_label || "-",
          row.final_score !== null ? String(row.final_score) : "-",
          row.confirmed ? "Yes" : "No",
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [["Rank", "Name", "Track", "Award", "Score", "Confirmed"]],
        body: winnerRows,
        theme: "striped",
        headStyles: { fillColor: [232, 68, 10], textColor: 255, fontStyle: "bold" },
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 },
      });
      y = getLastTableY(doc, y + 20);
      y += 10;
    }

    // ── Section: KPIs ─────────────────────────────────────
    if (kpis.length > 0) {
      if (y > 230) { doc.addPage(); y = margin; }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Key Performance Indicators", margin, y);
      y += 8;

      const kpiRows = kpis.map((k) => {
        const row = k as Record<string, unknown>;
        const target = Number(row.target_value) || 0;
        const actual = Number(row.actual_value) || 0;
        const pct = target > 0 ? `${Math.round((actual / target) * 100)}%` : "N/A";
        return [
          row.name as string,
          `${actual} / ${target}`,
          (row.unit as string) || "",
          pct,
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [["KPI", "Actual / Target", "Unit", "Progress"]],
        body: kpiRows,
        theme: "striped",
        headStyles: { fillColor: [232, 68, 10], textColor: 255, fontStyle: "bold" },
        margin: { left: margin, right: margin },
        styles: { fontSize: 10 },
      });
    }

    // ── Footer ────────────────────────────────────────────
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `CloudHub Competition Report — Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: "center" }
      );
    }

    // ── Return PDF ────────────────────────────────────────
    const pdfBuffer = doc.output("arraybuffer");
    const date = new Date().toISOString().slice(0, 10);
    const safeName = (hackathon.name as string).replace(/[^a-zA-Z0-9]/g, "-").slice(0, 40);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}-report-${date}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF report error:", err);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
