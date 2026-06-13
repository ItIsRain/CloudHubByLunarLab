import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";

/**
 * GET /api/proxy/pdf?url=...
 *
 * Same-origin proxy for Cloudinary-hosted PDF templates. Cloudinary's raw
 * resource delivery doesn't include permissive CORS headers, so pdf.js
 * (running in the browser) gets "Failed to fetch" when it tries to read the
 * file. Routing the fetch through this endpoint solves that and keeps the
 * URL allowlist tight so we don't turn this into an open SSRF.
 *
 * Authenticated by default — only signed-in users can pull arbitrary
 * Cloudinary URLs through us.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const target = searchParams.get("url");
    if (!target) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(target);
    } catch {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }

    // Lock to Cloudinary's CDN host so this isn't a generic outbound fetch.
    if (parsed.hostname !== "res.cloudinary.com") {
      return NextResponse.json(
        { error: "Only Cloudinary URLs are allowed" },
        { status: 400 }
      );
    }

    // 15s upstream timeout — a stalled fetch shouldn't hold a Next worker.
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15_000);

    let upstream: Response;
    try {
      upstream = await fetch(parsed.toString(), { signal: controller.signal });
    } catch (err) {
      clearTimeout(t);
      console.error("PDF proxy fetch failed:", err);
      return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
    }
    clearTimeout(t);

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}` },
        { status: 502 }
      );
    }

    // Cap response size at 15MB (matches the upload limit + a safety margin)
    const contentLength = Number(upstream.headers.get("content-length") || 0);
    if (contentLength && contentLength > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(buf.byteLength),
        // Same-origin so pdf.js can read it; short cache so editor refreshes
        // after re-uploads land.
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    console.error("PDF proxy error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
