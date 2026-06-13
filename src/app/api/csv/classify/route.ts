import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { authenticateRequest } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/csv/classify
 *
 * Ask Claude Haiku to refine the field-type guess for a set of CSV columns
 * that the local detector wasn't confident about.
 *
 * Request body:
 *   {
 *     columns: Array<{
 *       header: string;
 *       samples: string[];       // up to 5 representative cells
 *       localGuess: string;      // local detector's pick
 *     }>
 *   }
 *
 * Response:
 *   {
 *     classifications: Array<{
 *       header: string;
 *       type: "text"|"textarea"|"email"|"phone"|"url"|"number"|"date"|"select"|"multi_select";
 *       options?: string[];      // for select / multi_select
 *       reason: string;          // short, human-readable explanation
 *     }>
 *   }
 *
 * The route caches the long system prompt (5 minutes Anthropic-side) so
 * repeat calls are cheap.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Quota: 30 AI classifications per user per hour. Each call hits Claude
    // Haiku for ~1-3k tokens depending on column count.
    const rl = checkRateLimit(auth.userId, {
      namespace: "csv-classify-ai",
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });
    if (rl.limited) {
      return NextResponse.json(
        { error: "AI classification quota exceeded. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI classification is not configured on this deployment." },
        { status: 503 }
      );
    }

    let body: { columns?: Array<{ header: string; samples: string[]; localGuess?: string }> };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const columns = Array.isArray(body.columns) ? body.columns : [];
    if (columns.length === 0) {
      return NextResponse.json({ classifications: [] });
    }
    if (columns.length > 40) {
      return NextResponse.json(
        { error: "Too many columns — split into smaller batches." },
        { status: 400 }
      );
    }

    // Bound payload size: cap each sample to 600 chars so a single rogue cell
    // can't blow up the request.
    const compact = columns.map((c) => ({
      header: String(c.header || "").slice(0, 200),
      samples: (c.samples ?? []).slice(0, 5).map((s) => String(s ?? "").slice(0, 600)),
      localGuess: String(c.localGuess || "text"),
    }));

    const client = new Anthropic({ apiKey });

    const systemPrompt = `You classify columns from a CSV file into form-field types for an event registration system.

For each input column return EXACTLY ONE of these types:
- "text"         — a single line of short text
- "textarea"     — multi-paragraph or long prose (problems, solutions, bios, motivations)
- "email"        — an email address
- "phone"        — a phone number
- "url"          — a URL or link (treat "www.foo.com" without scheme as url, also social handles that resolve to URLs)
- "number"       — a numeric value (integers, decimals, currency, percentages)
- "date"         — a date or year
- "select"       — a single-choice dropdown when values are short and repeat (industry, city, role, etc.)
- "multi_select" — multiple comma/semicolon-separated short choices

Rules:
- Prefer "textarea" for any prose-y / explanation-y column (Problem, Solution, Business Model, Description, Why X, How X, Vision, Strategy).
- Prefer "url" for any column whose values look like links — including bare domains like "www.example.com" or "example.io/path".
- Prefer "select" only when values are short (< 60 chars) and there are clearly repeating categories. Provide the unique values as "options".
- For "multi_select", split on commas/semicolons and provide deduplicated options.
- Pick "text" only when nothing else fits.
- Be decisive — pick the BEST single type even if multiple feel possible. The user can override.

Reply ONLY with valid JSON matching this schema:
{
  "classifications": [
    { "header": string, "type": one of the types above, "options"?: string[], "reason": string }
  ]
}
No prose outside the JSON, no markdown fences.`;

    const userMessage = JSON.stringify({ columns: compact }, null, 2);

    const response = await client.messages.create({
      // Claude Haiku 4.5 is the fastest current Haiku — cheap, low latency,
      // strong at structured tasks like this. See assistant cutoff guidance.
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      system: [
        {
          type: "text",
          text: systemPrompt,
          // Cache the system prompt so subsequent calls within 5 min skip the
          // ~700-token re-bill — meaningful when an organizer iterates.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    // Concatenate all text blocks (Haiku usually returns one).
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim();

    // Strip accidental markdown fences just in case the model wrapped it.
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("AI returned non-JSON:", text.slice(0, 500));
      return NextResponse.json(
        { error: "AI returned an unparseable response. Try again." },
        { status: 502 }
      );
    }

    const out = (parsed as { classifications?: unknown }).classifications;
    if (!Array.isArray(out)) {
      return NextResponse.json(
        { error: "AI response missing classifications array." },
        { status: 502 }
      );
    }

    return NextResponse.json({ classifications: out });
  } catch (err) {
    console.error("CSV classify error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
