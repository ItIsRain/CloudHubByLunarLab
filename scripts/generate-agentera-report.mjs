// Generates a full ministry-grade markdown report for the Agentera hackathon.
// Run: node --env-file=.env.local scripts/generate-agentera-report.mjs
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

const HACKATHON_ID = "8df2d830-550a-45a1-888f-1d1c39be1ce8";
const OUT = "Agentera-Hackathon-Report.md";

// Official final results as declared by the organizers.
const WINNERS = [
  { place: 1, medal: "🥇", team: "Dash", award: "1st Place", amount: "AED 15,000" },
  { place: 2, medal: "🥈", team: "Lunar Labs", award: "2nd Place", amount: "AED 10,000" },
  { place: 3, medal: "🥉", team: "RushSwap", award: "3rd Place", amount: "AED 5,000" },
];
const WINNER_BY_TEAM = Object.fromEntries(WINNERS.map((wn) => [wn.team, wn]));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const db = createClient(url, key);

// ── helpers ──────────────────────────────────────────────
const norm = (v) => (Array.isArray(v) ? v[0] : v) ?? null;
const stripHtml = (s) =>
  (s || "")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<br\s*\/?>(\s*)/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&rsquo;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
const cell = (v) => String(v ?? "").replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();
const fmt = (d) =>
  d ? new Date(d).toISOString().replace("T", " ").slice(0, 16) + " UTC" : "—";

async function all(table, select, filter) {
  let q = db.from(table).select(select);
  if (filter) q = filter(q);
  const { data, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return data || [];
}

// ── fetch ────────────────────────────────────────────────
const { data: hk, error: hkErr } = await db
  .from("hackathons")
  .select("*")
  .eq("id", HACKATHON_ID)
  .single();
if (hkErr) throw new Error(hkErr.message);

const phases = await all("competition_phases", "*", (q) =>
  q.eq("hackathon_id", HACKATHON_ID).order("sort_order")
);
const phaseIds = phases.map((p) => p.id);

const regs = await all("hackathon_registrations", "id,user_id,status,created_at,form_data", (q) =>
  q.eq("hackathon_id", HACKATHON_ID)
);
const userIds = [...new Set(regs.map((r) => r.user_id))];
const profiles = userIds.length
  ? await all("profiles", "id,name,email", (q) => q.in("id", userIds))
  : [];
const profById = Object.fromEntries(profiles.map((p) => [p.id, p]));

const teams = await all("teams", "id,name,created_at", (q) => q.eq("hackathon_id", HACKATHON_ID));
const teamById = Object.fromEntries(teams.map((t) => [t.id, t]));
const members = teams.length
  ? await all("team_members", "team_id,user_id,is_leader", (q) =>
      q.in("team_id", teams.map((t) => t.id))
    )
  : [];
const teamByUser = {}; // user_id -> team_id (their team in this hackathon)
const membersByTeam = {};
for (const m of members) {
  teamByUser[m.user_id] = m.team_id;
  (membersByTeam[m.team_id] ||= []).push(m);
}

const submissions = await all("submissions", "*", (q) => q.eq("hackathon_id", HACKATHON_ID));
const subByTeam = {};
for (const s of submissions) {
  // Prefer a submitted one, else any.
  if (!subByTeam[s.team_id] || s.status === "submitted") subByTeam[s.team_id] = s;
}

const reviewers = phaseIds.length
  ? await all("phase_reviewers", "phase_id,user_id,name,email,status", (q) =>
      q.in("phase_id", phaseIds)
    )
  : [];
const reviewerName = {}; // `${phase_id}:${user_id}` -> name
for (const r of reviewers) reviewerName[`${r.phase_id}:${r.user_id}`] = r.name || profById[r.user_id]?.name || "Reviewer";

const assignments = phaseIds.length
  ? await all("reviewer_assignments", "phase_id,reviewer_id,registration_id", (q) =>
      q.in("phase_id", phaseIds)
    )
  : [];
const scores = phaseIds.length
  ? await all("phase_scores", "*", (q) => q.in("phase_id", phaseIds))
  : [];
const decisions = phaseIds.length
  ? await all("phase_decisions", "*", (q) => q.in("phase_id", phaseIds))
  : [];
const finalists = phaseIds.length
  ? await all("phase_finalists", "*", (q) => q.in("phase_id", phaseIds))
  : [];
const winners = await all("competition_winners", "*", (q) => q.eq("hackathon_id", HACKATHON_ID));

// registration_id -> team_id (scores are keyed by the team rep's registration)
const regById = Object.fromEntries(regs.map((r) => [r.id, r]));
const teamByReg = {};
for (const r of regs) {
  const tid = teamByUser[r.user_id];
  if (tid) teamByReg[r.id] = tid;
}

// Finalists = teams assigned into the Final Phase (the round the organizer
// advanced the top teams to). Derived from reviewer_assignments since formal
// finalist rows weren't recorded.
const finalPhase = phases.find((p) => /final/i.test(p.name)) || phases[phases.length - 1];
const finalistTeamIds = new Set();
for (const a of assignments) {
  if (finalPhase && a.phase_id === finalPhase.id) {
    const tid = teamByReg[a.registration_id];
    if (tid) finalistTeamIds.add(tid);
  }
}

// ── field label/option maps ──────────────────────────────
const subFields = hk.submission_fields || [];
const subLabel = {};
const subType = {};
const subOptions = {};
for (const f of subFields) {
  subLabel[f.id] = f.label;
  subType[f.id] = f.type;
  if (f.options) subOptions[f.id] = Object.fromEntries(f.options.map((o) => [o.value, o.label]));
}
const regFields = hk.registration_fields || [];
const regLabel = {};
const regOptions = {};
for (const f of regFields) {
  regLabel[f.id] = f.label;
  if (f.options) regOptions[f.id] = Object.fromEntries(f.options.map((o) => [o.value, o.label]));
}

function renderValue(val, type, options) {
  if (val == null || val === "") return "—";
  if (Array.isArray(val)) return val.map((v) => options?.[v] || v).join(", ") || "—";
  if (typeof val === "object") {
    if (val.url) return `[${val.originalFilename || "file"}](${val.url})`;
    return JSON.stringify(val);
  }
  if (options && options[val]) return options[val];
  return String(val);
}

// criteria maps per phase
const phaseCrit = {};
for (const p of phases) {
  phaseCrit[p.id] = Object.fromEntries((p.scoring_criteria || []).map((c) => [c.id, c]));
}

// ── build markdown ───────────────────────────────────────
const L = [];
const w = (s = "") => L.push(s);

const accepted = regs.filter((r) => ["accepted", "confirmed", "eligible"].includes(r.status));
const statusCounts = regs.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});

w(`# ${hk.name} — Official Report`);
w();
w(`> Generated ${fmt(new Date().toISOString())} · Report covers the complete competition record: participants, teams, submissions, and judging results.`);
w();
w(`---`);
w();
w(`## 1. Executive Summary`);
w();
w(`| | |`);
w(`|---|---|`);
w(`| **Event** | ${cell(hk.name)} |`);
w(`| **Theme** | ${cell(hk.tagline)} |`);
w(`| **Host** | 42 Abu Dhabi${hk.location?.address ? ` · ${cell(hk.location.address)}` : ""}, ${cell(hk.location?.city)}, ${cell(hk.location?.country)} |`);
w(`| **Format** | ${cell(hk.type)} |`);
w(`| **Status** | ${cell(hk.status)} |`);
w(`| **Registration window** | ${fmt(hk.registration_start)} → ${fmt(hk.registration_end)} |`);
w(`| **Build window** | ${fmt(hk.hacking_start)} → ${fmt(hk.hacking_end)} |`);
w(`| **Submission deadline** | ${fmt(hk.submission_deadline)} |`);
w(`| **Judging** | ${fmt(hk.judging_start)} → ${fmt(hk.judging_end)} |`);
w(`| **Winners announcement** | ${fmt(hk.winners_announcement)} |`);
w(`| **Total prize pool** | AED ${Number(hk.total_prize_pool || 0).toLocaleString()} |`);
w(`| **Registrations** | ${regs.length} |`);
w(`| **Accepted participants** | ${accepted.length} |`);
w(`| **Teams** | ${teams.length} |`);
w(`| **Submissions received** | ${submissions.length} |`);
w(`| **Judges (reviewers)** | ${new Set(reviewers.map((r) => r.user_id)).size} across ${phases.length} phases |`);
w();
w(`### 🏆 Final Result`);
w();
w(`| Place | Team | Award |`);
w(`|---|---|---|`);
for (const wn of WINNERS) w(`| ${wn.medal} ${wn.award} | **${cell(wn.team)}** | ${wn.amount} |`);
w();
w(`### Overview`);
w();
w(stripHtml(hk.description));
w();

// Prizes
w(`### Prize Structure`);
w();
w(`| Award | Amount |`);
w(`|---|---|`);
for (const p of hk.prizes || []) {
  w(`| ${cell(p.name)}${p.place && p.place !== "special" ? ` (Place ${p.place})` : ""} | ${cell(p.currency || "AED")} ${Number(p.value || 0).toLocaleString()} |`);
}
w();
w(`---`);
w();

// Tracks
w(`## 2. Challenge Tracks`);
w();
for (const t of hk.tracks || []) {
  w(`### ${t.name}`);
  w();
  w(stripHtml(t.description));
  w();
}
w(`---`);
w();

// Judging criteria per phase
w(`## 3. Judging Framework`);
w();
for (const p of phases) {
  const crit = p.scoring_criteria || [];
  const total = crit.reduce((a, c) => a + (c.maxScore || 0), 0);
  w(`### ${p.name} — *${p.status}*`);
  w();
  w(`Reviewers: ${reviewers.filter((r) => r.phase_id === p.id).length} · Blind review: ${p.blind_review ? "Yes" : "No"} · Total points: ${total}`);
  w();
  if (crit.length) {
    w(`| Criterion | Max | Description |`);
    w(`|---|---|---|`);
    for (const c of crit) w(`| ${cell(c.name)} | ${c.maxScore} | ${cell(c.description)} |`);
    w();
  }
}
w(`---`);
w();

// Reviewers
w(`## 4. Judging Panel`);
w();
for (const p of phases) {
  const rs = reviewers.filter((r) => r.phase_id === p.id);
  if (!rs.length) continue;
  w(`**${p.name}**`);
  w();
  w(`| Judge | Email | Status |`);
  w(`|---|---|---|`);
  for (const r of rs) w(`| ${cell(r.name)} | ${cell(r.email)} | ${cell(r.status)} |`);
  w();
}
w(`---`);
w();

// Participant roster
w(`## 5. Participant Roster`);
w();
w(`Registration breakdown: ${Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join(" · ")}`);
w();
w(`### Accepted Participants (${accepted.length})`);
w();
w(`| # | Name | Email | Team | Role |`);
w(`|---|---|---|---|---|`);
let i = 1;
const acceptedSorted = accepted
  .map((r) => ({ r, p: profById[r.user_id], team: teamById[teamByUser[r.user_id]] }))
  .sort((a, b) => (a.team?.name || "zzz").localeCompare(b.team?.name || "zzz") || (a.p?.name || "").localeCompare(b.p?.name || ""));
for (const { r, p, team } of acceptedSorted) {
  const isLeader = members.find((m) => m.user_id === r.user_id && m.team_id === team?.id)?.is_leader;
  w(`| ${i++} | ${cell(p?.name)} | ${cell(p?.email)} | ${cell(team?.name || "—")} | ${isLeader ? "Leader" : team ? "Member" : "—"} |`);
}
w();
w(`---`);
w();

// Teams & submissions
w(`## 6. Teams & Submissions`);
w();
const teamsSorted = [...teams].sort((a, b) => a.name.localeCompare(b.name));
let tn = 1;
for (const t of teamsSorted) {
  const tm = (membersByTeam[t.id] || []).slice().sort((a, b) => (b.is_leader ? 1 : 0) - (a.is_leader ? 1 : 0));
  const sub = subByTeam[t.id];
  w(`### 6.${tn}. ${t.name}`);
  tn++;
  w();
  w(`**Members:**`);
  w();
  w(`| Name | Email | Role |`);
  w(`|---|---|---|`);
  for (const m of tm) {
    const p = profById[m.user_id];
    w(`| ${cell(p?.name)} | ${cell(p?.email)} | ${m.is_leader ? "Leader" : "Member"} |`);
  }
  w();
  if (!sub) {
    w(`**Submission:** _No submission on record._`);
    w();
    continue;
  }
  w(`**Submission** — status: \`${sub.status}\`${sub.submitted_at ? ` · submitted ${fmt(sub.submitted_at)}` : " · (draft / not formally published)"}`);
  w();
  const fd = sub.form_data || {};
  // Render in submission-form order, then any extras.
  const ordered = subFields.map((f) => f.id).filter((id) => id in fd);
  const extras = Object.keys(fd).filter((k) => !ordered.includes(k) && !k.startsWith("_"));
  const keys = [...ordered, ...extras];
  if (keys.length === 0) {
    // Fall back to structured columns.
    w(`- **Project Name:** ${cell(sub.project_name)}`);
    w(`- **Tagline:** ${cell(sub.tagline)}`);
    if (sub.github_url) w(`- **GitHub:** ${sub.github_url}`);
    if (sub.demo_url) w(`- **Demo:** ${sub.demo_url}`);
    w();
  } else {
    for (const k of keys) {
      const label = subLabel[k] || k;
      const type = subType[k];
      const val = renderValue(fd[k], type, subOptions[k]);
      if (type === "textarea" || (typeof fd[k] === "string" && fd[k].length > 120)) {
        w();
        w(`**${label}:**`);
        w();
        w(`> ${String(fd[k]).replace(/\n/g, "\n> ")}`);
        w();
      } else {
        w(`- **${label}:** ${val}`);
      }
    }
    w();
  }
}
w(`---`);
w();

// Judging results
w(`## 7. Judging Results`);
w();
w(`Scores are recorded per team (each team judged as a single unit). Totals are out of 100 per phase.`);
w();
for (const p of phases) {
  const ps = scores.filter((s) => s.phase_id === p.id);
  if (!ps.length) {
    w(`### ${p.name}`);
    w();
    w(`_No scores recorded yet._`);
    w();
    continue;
  }
  const crit = p.scoring_criteria || [];
  // Group scores by team.
  const byTeam = {};
  for (const s of ps) {
    const tid = teamByReg[s.registration_id];
    const tname = teamById[tid]?.name || `(registration ${s.registration_id.slice(0, 8)})`;
    (byTeam[tname] ||= []).push(s);
  }
  // Leaderboard (average total per team).
  const board = Object.entries(byTeam)
    .map(([name, arr]) => ({
      name,
      avg: arr.reduce((a, s) => a + (s.total_score || 0), 0) / arr.length,
      n: arr.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  w(`### ${p.name} — Leaderboard`);
  w();
  w(`*${p.status === "completed" ? "Final" : "Current standings (judging in progress)"}* · ${ps.length} scores · ${board.length} teams scored`);
  w();
  w(`| Rank | Team | Avg Score /100 | # Judges |`);
  w(`|---|---|---|---|`);
  board.forEach((b, idx) => w(`| ${idx + 1} | ${cell(b.name)} | ${b.avg.toFixed(1)} | ${b.n} |`));
  w();

  w(`#### Detailed Scores — ${p.name}`);
  w();
  for (const b of board) {
    const arr = byTeam[b.name];
    w(`**${b.name}** — average **${b.avg.toFixed(1)}/100**`);
    w();
    // header: Judge | each criterion | Total | Recommendation
    const header = ["Judge", ...crit.map((c) => `${c.name} /${c.maxScore}`), "Total /100", "Recommendation"];
    w(`| ${header.join(" | ")} |`);
    w(`|${header.map(() => "---").join("|")}|`);
    for (const s of arr) {
      const jn = reviewerName[`${p.id}:${s.reviewer_id}`] || profById[s.reviewer_id]?.name || "Judge";
      const cmap = Object.fromEntries((s.criteria_scores || []).map((c) => [c.criteriaId, c.score]));
      const row = [
        cell(jn),
        ...crit.map((c) => (cmap[c.id] ?? "—")),
        s.total_score ?? "—",
        cell(s.recommendation || "—"),
      ];
      w(`| ${row.join(" | ")} |`);
    }
    w();
    const fbs = arr.filter((s) => s.overall_feedback);
    if (fbs.length) {
      w(`_Judge feedback:_`);
      for (const s of fbs) {
        const jn = reviewerName[`${p.id}:${s.reviewer_id}`] || "Judge";
        w(`> **${cell(jn)}:** ${cell(s.overall_feedback)}`);
      }
      w();
    }
  }
}
w(`---`);
w();

// Finalists (Top 6) — Final Phase
w(`## 8. Finalists — Top ${finalistTeamIds.size} (Final Phase)`);
w();
w(`The following **${finalistTeamIds.size} teams** advanced from the Pre-Screening Phase to the **Final Phase**, where they pitched live to the full final judging panel. Standings below are by average Final Phase score (out of 100).`);
w();

// Final Phase judging panel
const finalJudges = reviewers.filter((r) => r.phase_id === finalPhase.id);
w(`### Final Phase Judging Panel (${finalJudges.length})`);
w();
w(`| Judge | Email | Status |`);
w(`|---|---|---|`);
for (const r of finalJudges) w(`| ${cell(r.name)} | ${cell(r.email)} | ${cell(r.status)} |`);
w();

// Build per-team Final Phase scores
const finalCrit = finalPhase.scoring_criteria || [];
const finalScores = scores.filter((s) => s.phase_id === finalPhase.id);
const finalByTeam = {}; // team_id -> scores[]
for (const s of finalScores) {
  const tid = teamByReg[s.registration_id];
  if (tid) (finalByTeam[tid] ||= []).push(s);
}
const finalistBoard = [...finalistTeamIds]
  .map((tid) => {
    const arr = finalByTeam[tid] || [];
    const avg = arr.length ? arr.reduce((a, s) => a + (s.total_score || 0), 0) / arr.length : 0;
    return { tid, name: teamById[tid]?.name || tid, arr, avg, n: arr.length };
  })
  .sort((a, b) => b.avg - a.avg);

w(`### Finalist Standings`);
w();
w(`| Rank | Finalist Team | Avg Score /100 | Judges Scored | Final Result |`);
w(`|---|---|---|---|---|`);
finalistBoard.forEach((b, idx) => {
  const win = WINNER_BY_TEAM[b.name.trim()];
  const result = win ? `${win.medal} ${win.award} — ${win.amount}` : "Finalist";
  w(`| ${idx + 1} | ${cell(b.name)} | ${b.n ? b.avg.toFixed(1) : "—"} | ${b.n} / ${finalJudges.length} | ${result} |`);
});
w();

// Per-finalist detail: project, judges' grades + notes
w(`### Finalist Scorecards`);
w();
finalistBoard.forEach((b, idx) => {
  const sub = subByTeam[b.tid];
  w(`#### ${idx + 1}. ${b.name} — ${b.n ? `**${b.avg.toFixed(1)}/100**` : "_not yet scored_"}`);
  w();
  if (sub) {
    const fd = sub.form_data || {};
    const proj = fd["180b74c0-6aba-422e-abed-583a53df2401"] || sub.project_name || "—";
    const trackField = subFields.find((f) => f.type === "multi_select");
    const track = trackField ? renderValue(fd[trackField.id], "multi_select", subOptions[trackField.id]) : "—";
    w(`- **Project:** ${cell(proj)}`);
    w(`- **Track:** ${cell(track)}`);
    if (sub.github_url || fd["2a1a2404-30ea-43da-a6b4-60f754b67905"])
      w(`- **GitHub:** ${sub.github_url || fd["2a1a2404-30ea-43da-a6b4-60f754b67905"]}`);
    if (sub.demo_url || fd["8e192f0b-0c34-4c5b-9e2c-a8ee373cfc2a"])
      w(`- **Demo:** ${sub.demo_url || fd["8e192f0b-0c34-4c5b-9e2c-a8ee373cfc2a"]}`);
    w();
  }
  if (!b.arr.length) {
    w(`_No Final Phase scores recorded yet._`);
    w();
    return;
  }
  const header = ["Judge", ...finalCrit.map((c) => `${c.name} /${c.maxScore}`), "Total /100", "Recommendation"];
  w(`| ${header.join(" | ")} |`);
  w(`|${header.map(() => "---").join("|")}|`);
  for (const s of b.arr) {
    const jn = reviewerName[`${finalPhase.id}:${s.reviewer_id}`] || profById[s.reviewer_id]?.name || "Judge";
    const cmap = Object.fromEntries((s.criteria_scores || []).map((c) => [c.criteriaId, c.score]));
    const row = [
      cell(jn),
      ...finalCrit.map((c) => (cmap[c.id] ?? "—")),
      s.total_score ?? "—",
      cell(s.recommendation || "—"),
    ];
    w(`| ${row.join(" | ")} |`);
  }
  w();
  const fbs = b.arr.filter((s) => s.overall_feedback);
  if (fbs.length) {
    w(`_Judge notes:_`);
    for (const s of fbs) {
      const jn = reviewerName[`${finalPhase.id}:${s.reviewer_id}`] || "Judge";
      w(`> **${cell(jn)}:** ${cell(s.overall_feedback)}`);
    }
    w();
  } else {
    w(`_No written notes were recorded by the Final Phase judges (numeric scores only)._`);
    w();
  }
});

// Winners
w(`### 🏆 Winners`);
w();
w(`Final placements as declared by the organizing committee:`);
w();
w(`| Place | Team | Project | Award |`);
w(`|---|---|---|---|`);
for (const wn of WINNERS) {
  const tid = teams.find((t) => t.name.trim() === wn.team)?.id;
  const sub = tid ? subByTeam[tid] : null;
  const proj = sub ? (sub.form_data?.["180b74c0-6aba-422e-abed-583a53df2401"] || sub.project_name) : "";
  w(`| ${wn.medal} ${wn.award} | **${cell(wn.team)}** | ${cell(proj || "—")} | ${wn.amount} |`);
}
w();
w(`The remaining finalists — **We have Time**, **FEDROS**, and **Trio** — are recognized for reaching the Final Phase (top 6 of ${teams.length} teams).`);
w();

// Appendix: participant registration details
w(`---`);
w();
w(`## Appendix A — Participant Registration Details`);
w();
w(`Registration answers submitted by each accepted participant.`);
w();
for (const { r, p, team } of acceptedSorted) {
  const fd = r.form_data || {};
  const keys = Object.keys(fd).filter((k) => !k.startsWith("_") && fd[k] != null && fd[k] !== "");
  if (!keys.length) continue;
  w(`**${cell(p?.name)}** (${cell(p?.email)})${team ? ` — ${cell(team.name)}` : ""}`);
  w();
  for (const k of keys) {
    const label = regLabel[k] || k;
    w(`- **${label}:** ${renderValue(fd[k], null, regOptions[k])}`);
  }
  w();
}

w(`---`);
w();
w(`*End of report. Prepared from the CloudHub by Lunar Labs platform database.*`);

writeFileSync(OUT, L.join("\n"), "utf8");
console.log(`Wrote ${OUT} (${L.length} lines, ${L.join("\n").length} chars)`);
console.log(`Teams: ${teams.length}, Submissions: ${submissions.length}, Scores: ${scores.length}, Accepted: ${accepted.length}`);
