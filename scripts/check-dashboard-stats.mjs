#!/usr/bin/env node
/* Checks the dashboard's pure statistics and finding generator without a
   browser. dashboard.html keeps that code between the markers
   "@stats-begin" and "@stats-end" with no DOM access, so this script can
   lift the block out, run it in node, and hold it to:

     1. an independent Wilson / Newcombe implementation over a grid;
     2. published check values (z = 1.96, tolerance 5e-5);
     3. the displayed-rate delta rule;
     4. byte-identical golden findings for the three committed datasets;
     5. a smoke test of the COPY FINDINGS Markdown for every manifest entry.

   Usage: node scripts/check-dashboard-stats.mjs        (exit 1 on any failure) */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(ROOT, "dashboard.html"), "utf8");
const m = html.match(/\/\* @stats-begin[\s\S]*?\*\/([\s\S]*?)\/\* @stats-end \*\//);
if (!m) { console.error("FAIL: @stats-begin / @stats-end markers not found in dashboard.html"); process.exit(1); }

const block = m[1];
let S;
try {
  S = new Function(block + "\nreturn { pct, fmtS, fmtGap, wilson, newcombe, sigWord, dTenths, dStr, cleanLabel, refEntryFor, verdict, findingsMarkdown };")();
} catch (err) {
  console.error("FAIL: the stats block does not run without a DOM:", err.message);
  process.exit(1);
}

let failures = 0;
const ok = (cond, what) => { if (cond) console.log("  ok   " + what); else { failures++; console.log("  FAIL " + what); } };
const near = (a, b, tol = 5e-5) => Math.abs(a - b) <= tol;

/* 1. independent implementation ------------------------------------- */
console.log("wilson / newcombe against an independent implementation");
const Z = 1.959963984540054;
function wilsonRef(x, n) {
  const p = x / n, z2 = Z * Z;
  const den = 1 + z2 / n, cen = p + z2 / (2 * n);
  const half = Z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return { lo: Math.max(0, (cen - half) / den), hi: Math.min(1, (cen + half) / den) };
}
function newcombeRef(x1, n1, x2, n2) {
  const a = wilsonRef(x1, n1), b = wilsonRef(x2, n2), p1 = x1 / n1, p2 = x2 / n2, d = p1 - p2;
  return { lo: d - Math.hypot(p1 - a.lo, b.hi - p2), hi: d + Math.hypot(a.hi - p1, p2 - b.lo) };
}
let worst = 0;
for (const n of [1, 7, 50, 400, 1000, 2000, 10000]) {
  for (const x of [0, 1, Math.floor(n / 3), Math.floor(n / 2), n - 1, n].filter((v) => v >= 0 && v <= n)) {
    const a = S.wilson(x, n), b = wilsonRef(x, n);
    worst = Math.max(worst, Math.abs(a.lo - b.lo), Math.abs(a.hi - b.hi));
    for (const x2 of [0, Math.floor(n / 4), n]) {
      const c = S.newcombe(x, n, x2, n), d = newcombeRef(x, n, x2, n);
      worst = Math.max(worst, Math.abs(c.lo - d.lo), Math.abs(c.hi - d.hi));
    }
  }
}
ok(worst < 1e-12, `grid agreement (worst |diff| ${worst.toExponential(2)})`);
ok(S.wilson(0, 0) === null && S.newcombe(0, 0, 1, 2) === null, "n = 0 yields null");
ok(S.wilson(2000, 2000).hi === 1, "wilson(2000,2000).hi clamps to 1");

/* 2. published check values ------------------------------------------ */
console.log("check values (Newcombe method 10, z = 1.96)");
const cases = [
  [146, 1000, 4800, 10000, -0.334, -0.35675, -0.30878, "clear"],
  [719, 2000, 977, 2000, -0.129, -0.15917, -0.09849, "clear"],
  [197, 400, 183, 400, 0.035, -0.03407, 0.10360, "slight"],
  [971, 2000, 977, 2000, -0.003, -0.03395, 0.02795, "no measurable difference"],
  [0, 50, 0, 50, 0, -0.07135, 0.07135, "no measurable difference"],
  [50, 50, 0, 50, 1, 0.8991, 1, "clear"],
];
for (const [x1, n1, x2, n2, d, lo, hi, word] of cases) {
  const ci = S.newcombe(x1, n1, x2, n2);
  const dT = S.dTenths(x1 / n1, x2 / n2);
  ok(near(ci.delta, d, 1e-9) && near(ci.lo, lo) && near(ci.hi, hi) && S.sigWord(ci, dT) === word,
    `newcombe(${x1},${n1}, ${x2},${n2}) → Δ ${ci.delta.toFixed(3)} [${ci.lo.toFixed(5)}, ${ci.hi.toFixed(5)}] ${S.sigWord(ci, dT)}`);
}
const w = S.wilson(4801, 10000);
ok(near(w.lo, 0.47031728, 1e-6) && near(w.hi, 0.48989800, 1e-6), `wilson(4801,10000) = (${w.lo.toFixed(8)}, ${w.hi.toFixed(8)})`);

/* 3. the displayed-rate delta rule ------------------------------------ */
console.log("delta rule (tenths of displayed rates)");
ok(S.dTenths(0.4525, 0.2790) === 174 && S.dStr(174) === "+17.4", "dTenths(0.4525, 0.2790) = +174 → \"+17.4\"");
ok(S.dTenths(0.3595, 0.4885) === -129 && S.dStr(-129) === "−12.9", "dTenths(0.3595, 0.4885) = −129 → \"−12.9\"");
ok(S.dStr(0) === "0.0", "dStr(0) = \"0.0\"");
ok(S.fmtS(374.4) === "6:14" && S.fmtS(417.9) === "6:58" && S.fmtS(119.6) === "2:00", "fmtS carries the minute after rounding");
ok(S.fmtGap(43.5) === "44 s" && S.fmtGap(333.7) === "5:34", "fmtGap: seconds under 2 min, m:ss above");
ok(S.cleanLabel("").short === "unlabeled sweep" && S.cleanLabel("a".repeat(80)).short.endsWith("…") &&
  S.cleanLabel("tab\there  x").full === "tab here x", "cleanLabel sanitises, truncates, defaults");

/* 4. every ci95 in the committed files reproduces ---------------------- */
console.log("stored ci95 values reproduce from counts");
const manifest = JSON.parse(readFileSync(join(ROOT, "results", "index.json"), "utf8"));
const datasets = manifest.datasets.map((entry) => ({ entry, data: JSON.parse(readFileSync(join(ROOT, "results", entry.file), "utf8")) }));
let aggs = 0, ciBad = 0;
const walk = (o) => {
  if (!o || typeof o !== "object") return;
  if (o.outcomes && o.runs && o.ci95) {
    aggs++;
    for (const s of ["BLUFOR", "OPFOR", "STALEMATE"]) {
      const c = S.wilson(o.outcomes[s], o.runs);
      const r = (v) => Math.round(v * 10000) / 10000;
      if (r(c.lo) !== o.ci95[s].lo || r(c.hi) !== o.ci95[s].hi) ciBad++;
    }
  }
  for (const k of Object.keys(o)) walk(o[k]);
};
for (const { data } of datasets) walk(data.experiments);
ok(aggs > 0 && ciBad === 0, `${aggs} aggregates × 3 outcomes match to 4 dp (${ciBad} mismatches)`);

/* 5. golden findings -------------------------------------------------- */
console.log("golden findings (byte-identical)");
const CAVEAT = "All data is notional — a statement about this model, not about any real system.";
const GOLDEN = {
  "monte-carlo.json": {
    lead: "Emissions posture, not the team, decides this fight.",
    clauses: [
      "Across 10,000 notional engagements on the stock configuration, BLUFOR (disciplined) wins 48.0%, OPFOR (continuous) 28.1%, and 23.9% end in stalemate, both drones down; BLUFOR takes 63.0% of the 7,615 decided fights.",
      "On 2,000 same-seed pairs (stock arm 48.9% / 27.9% / 23.3%): give OPFOR the same duty cycles and BLUFOR falls 12.9 points to 36.0% while OPFOR rises 5.3 to 33.2% (both clear) — the two come within 2.8 points of each other, and stalemates rise 7.6.",
      "Swap the two postures outright and the advantage follows the posture, not the team: OPFOR wins 45.3% to BLUFOR's 31.8% (+17.4 / −17.1, both clear).",
      "Equalizing the two sides' launch times is worth nothing — no rate moves more than 0.3 points (no measurable difference either way).",
      "It is a dial, not a switch: the more OPFOR transmits, the more BLUFOR wins: 27.3% → 50.2% across the duty sweep (14% → 86% uplink duty, video continuous).",
      "BLUFOR also locates the enemy station about 44 s sooner at the median (6:14 vs 6:58), and reaches a fix at all in 6,795 of 10,000 runs to OPFOR's 3,180.",
    ],
  },
  "monte-carlo-tactical.json": {
    lead: "Emissions posture, not the team, decides this fight.",
    clauses: [
      "Across 10,000 notional engagements on the stock configuration, BLUFOR (disciplined) wins 29.7%, OPFOR (continuous) 18.5%, and 51.9% end in stalemate, both packages spent; BLUFOR takes 61.7% of the 4,812 decided fights.",
      "Both sides still land a mean 4.5 strikes each on the objective, so the supported ground fight gets its fires either way and the duel is decided at the margin.",
      "On 2,000 same-seed pairs (stock arm 29.3% / 18.8% / 52.0%): give OPFOR the same duty cycles and BLUFOR falls 8.4 points to 20.9% (clear) while OPFOR's 18.6% is within noise of its 18.8% (−0.2, no measurable difference) — the two come within 2.3 points of each other, and stalemates rise 8.5.",
      "Swap the two postures outright and the advantage follows the posture, not the team: OPFOR wins 28.9% to BLUFOR's 19.7% (+10.1 / −9.6, both clear).",
      "Equalizing the two sides' launch times is worth nothing — no rate moves more than 1.5 points (no measurable difference either way).",
      "Flying without a dedicated hunter-killer — retasking a strike sortie onto the fix instead — costs both sides: BLUFOR −14.4, OPFOR −12.8, stalemates +27.2 (all clear) — the largest single effect in this battery.",
      "It is a dial, not a switch: the more OPFOR transmits, the more BLUFOR wins: 16.5% → 31.8% across the duty sweep (14% → 86% uplink duty, video continuous).",
      "BLUFOR also locates the enemy station about 91 s sooner at the median (2:51 vs 4:22), and reaches a fix at all in 3,248 of 10,000 runs to OPFOR's 2,219.",
    ],
  },
  "adhoc-df-bearing-error-doubled-8-deg-2026-08-24.json": {
    lead: "'DF bearing error doubled (8 deg)': 14.6% / 14.4% / 71.0% — clearly different from the stock baseline.",
    clauses: [
      "Versus the stock baseline (48.0% / 28.1% / 23.9%), 'DF bearing error doubled (8 deg)' moves BLUFOR −33.4 points (clear), OPFOR −13.7 (clear), stalemates +47.1 (clear); n=1,000 here vs n=10,000 in the baseline.",
      "Only 29.0% of fights are decided against 76.1% there, and the decided ones split 50/50 here against 63/37 there.",
      "One parameter was changed: `CUAS.BRG_SIGMA_DEG` = 8.",
      "BLUFOR still locates the enemy station about 5:34 sooner at the median (6:05 vs 11:38), on the 838 of 1,000 runs where it reached a fix at all.",
    ],
  },
};
function diffLines(got, want) {
  const n = Math.max(got.length, want.length);
  const out = [];
  for (let i = 0; i < n; i++) if (got[i] !== want[i]) out.push(`    clause ${i + 1}\n      want: ${want[i] ?? "(absent)"}\n      got:  ${got[i] ?? "(absent)"}`);
  return out.join("\n");
}
for (const { entry, data } of datasets) {
  const g = GOLDEN[entry.file];
  const v = S.verdict(data, manifest, entry);
  if (!g) { ok(v && v.text.clauses.length > 0, `${entry.file}: finding generated (no golden on file)`); continue; }
  const same = v && v.text.lead === g.lead && v.text.caveat === CAVEAT &&
    v.text.clauses.length === g.clauses.length && v.text.clauses.every((c, i) => c === g.clauses[i]);
  ok(same, `${entry.file}: lead + ${g.clauses.length} clauses + caveat`);
  if (!same && v) {
    if (v.text.lead !== g.lead) console.log(`    lead\n      want: ${g.lead}\n      got:  ${v.text.lead}`);
    const d = diffLines(v.text.clauses, g.clauses);
    if (d) console.log(d);
  }
}
{
  const adhoc = datasets.find((d) => d.entry.kind === "adhoc");
  const v = S.verdict(adhoc.data, manifest, adhoc.entry);
  ok(v.facts.ref && v.facts.ref.file === "monte-carlo.json", "ad-hoc reference is monte-carlo.json");
}

/* 6. Markdown smoke ---------------------------------------------------- */
console.log("COPY FINDINGS markdown");
for (const { entry, data } of datasets) {
  const v = S.verdict(data, manifest, entry);
  const md = S.findingsMarkdown(v.facts, v.text);
  ok(md.startsWith("## Finding — ") && md.includes(`results/${entry.file}`) && md.includes(v.facts.regen) &&
    md.includes("| Outcome | Rate | 95% CI |") && md.split("\n").length < 40,
    `${entry.file}: heading, source file, regen command, table (${md.split("\n").length} lines)`);
}

console.log(failures ? `\n${failures} FAILED` : "\nALL PASS");
process.exit(failures ? 1 : 0);
