/*
 * Monte Carlo study of fpv-sim using the headless engine from fpv-sim-mcp.
 *
 * The browser sim (index.html) runs one watchable engagement per seed. This
 * script turns that into a statistical experiment: thousands of independent
 * replications, aggregated. It deliberately does NOT reimplement the engine —
 * it imports the extracted, golden-master-verified engine from a checkout of
 * https://github.com/wasomma/fpv-sim-mcp (behavior parity with index.html is
 * proven by that repo's tests).
 *
 * Usage:
 *   node scripts/monte-carlo-study.mjs [--quick]
 *
 * The fpv-sim-mcp checkout is located via $FPV_SIM_MCP, defaulting to a
 * sibling directory (../fpv-sim-mcp). It must be built (`npm install && npm
 * test` there) first. --quick runs ~1/10th the replications for a smoke pass.
 *
 * Everything is deterministic: fixed seed lists, one RNG stream per
 * engagement inside the engine. Rerunning this script reproduces every
 * number in MONTE_CARLO.md exactly.
 */

import { pathToFileURL } from "node:url";
import { resolve, join } from "node:path";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const mcpRoot = resolve(process.env.FPV_SIM_MCP ?? join(import.meta.dirname, "..", "..", "fpv-sim-mcp"));
const enginePath = join(mcpRoot, "dist", "src", "engine", "index.js");
let engine;
try {
  engine = await import(pathToFileURL(enginePath).href);
} catch (err) {
  console.error(`Cannot load engine at ${enginePath}.`);
  console.error("Clone and build fpv-sim-mcp first (npm install && npm test), or set $FPV_SIM_MCP.");
  throw err;
}
const { runEngagement, aggregateSweep, comparePaired } = engine;

const QUICK = process.argv.includes("--quick");
const scale = (n) => (QUICK ? Math.max(50, Math.round(n / 10)) : n);

/* Seed lists are contiguous ranges so any result is reproducible from the
   range alone (also directly reproducible via the MCP server's sweep_seeds /
   compare_configs tools for counts within their caps). */
const seeds = (start, count) => Array.from({ length: count }, (_, i) => start + i);

/* 95% Wilson score interval for a binomial proportion — preferred over the
   normal approximation because win rates sit well away from 0.5 and sweep
   sizes vary. */
function wilson(successes, n) {
  if (n === 0) return null;
  const z = 1.959963984540054, p = successes / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  const r = (v) => Math.round(v * 10000) / 10000;
  return { p: r(p), lo: r(center - half), hi: r(center + half) };
}

/* Fixed-width binning so the dashboard can draw distribution shapes; the
   summary stats alone (mean/median/p10/p90) hide bimodality. */
const HIST_BIN_S = 60;
function histogram(values) {
  if (values.length === 0) return null;
  const counts = [];
  for (const v of values) {
    const bin = Math.floor(v / HIST_BIN_S);
    counts[bin] = (counts[bin] ?? 0) + 1;
  }
  for (let i = 0; i < counts.length; i++) counts[i] = counts[i] ?? 0;
  return { bin_width_s: HIST_BIN_S, counts, n: values.length };
}

let totalRuns = 0;

function sweep(seedList, overrides, label) {
  const t0 = Date.now();
  const results = seedList.map((s) => runEngagement(s, overrides));
  totalRuns += results.length;
  const agg = aggregateSweep(results);
  const n = agg.runs;
  agg.ci95 = {
    BLUFOR: wilson(agg.outcomes.BLUFOR, n),
    OPFOR: wilson(agg.outcomes.OPFOR, n),
    STALEMATE: wilson(agg.outcomes.STALEMATE, n),
  };
  agg.histograms = {
    time_to_fix_s: {
      BLUFOR: histogram(results.map((r) => r.teams.BLUFOR.fix_established_t_s).filter((t) => t !== null)),
      OPFOR: histogram(results.map((r) => r.teams.OPFOR.fix_established_t_s).filter((t) => t !== null)),
    },
    time_to_kill_s: histogram(results.filter((r) => r.outcome.result !== "STALEMATE").map((r) => r.duration_s)),
  };
  console.error(`  ${label}: ${n} runs in ${((Date.now() - t0) / 1000).toFixed(1)}s ` +
    `— B ${agg.outcomes.BLUFOR} / O ${agg.outcomes.OPFOR} / S ${agg.outcomes.STALEMATE}`);
  return { results, agg };
}

function gitCommit(dir) {
  try {
    return execSync("git rev-parse HEAD", { cwd: dir, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

const study = {
  quick: QUICK,
  meta: {
    generated: new Date().toISOString(),
    sim_commit: gitCommit(join(import.meta.dirname, "..")),
    engine_commit: gitCommit(mcpRoot),
    engine_source: "https://github.com/wasomma/fpv-sim-mcp",
  },
  experiments: {},
};

/* ---------------------------------------------------------------- E1
 * Baseline: stock CONFIG over a large seed range. The headline number:
 * how often does the disciplined side actually win? */
console.error("E1 baseline (stock config)...");
{
  const list = seeds(1, scale(10000));
  const { agg } = sweep(list, undefined, "stock");
  study.experiments.baseline = agg;
}

/* ---------------------------------------------------------------- E2
 * Paired same-seed comparisons. Terrain, emplacement jitter, and noise
 * draws are seed-determined, so comparing variants on identical seed lists
 * is a common-random-numbers design: per-seed luck cancels out of the
 * deltas, and a couple thousand pairs resolve effects that would need far
 * more independent runs. */
const pairList = seeds(1, scale(2000));
const BLUFOR_EMCON = { uplinkOn: 4, uplinkOff: 13, videoOn: 3, videoOff: 7 };
const OPFOR_EMCON = { uplinkOn: 10, uplinkOff: 4, videoOn: 1, videoOff: 0 };

console.error("E2 stock arm (shared across paired comparisons)...");
const stockArm = sweep(pairList, undefined, "stock arm");

function paired(label, overridesB) {
  console.error(`E2 ${label}...`);
  const b = sweep(pairList, overridesB, "variant");
  return { variant: b.agg, paired: comparePaired(stockArm.results, b.results) };
}
study.experiments.pairedStockArm = stockArm.agg;

/* E2a — OPFOR adopts BLUFOR's duty cycles (launch stagger kept). Isolates
   what discipline is worth to the currently-undisciplined side. */
study.experiments.opforAdoptsDiscipline =
  paired("OPFOR adopts BLUFOR discipline", { TEAMS: { OPFOR: BLUFOR_EMCON } });

/* E2b — full posture swap (launch stagger kept). If EMCON is the causal
   asymmetry, the win-rate gap should follow the discipline, not the team. */
study.experiments.postureSwap =
  paired("full EMCON posture swap",
    { TEAMS: { BLUFOR: OPFOR_EMCON, OPFOR: BLUFOR_EMCON } });

/* E2c — launch stagger equalized (both launch T+20), EMCON stock. Sizes the
   one non-EMCON asymmetry so E2a/E2b residuals are interpretable. */
study.experiments.launchEqualized =
  paired("launch stagger equalized", { TEAMS: { OPFOR: { launchT: 20 } } });

/* ---------------------------------------------------------------- E3
 * Sensitivity: OPFOR uplink duty cycle. Fixed 14 s period (matching the
 * stock postures' period), on-time swept 2..12 s, at both video postures.
 * Yields the "how much does discipline buy" curve behind the headline. */
console.error("E3 uplink duty-cycle sensitivity...");
{
  const cellSeeds = seeds(1, scale(400));
  const PERIOD = 14;
  const cells = [];
  for (const video of [{ label: "continuous", videoOn: 1, videoOff: 0 },
                       { label: "burst", videoOn: 3, videoOff: 7 }]) {
    for (const on of [2, 4, 6, 8, 10, 12]) {
      const ov = { TEAMS: { OPFOR: { uplinkOn: on, uplinkOff: PERIOD - on, videoOn: video.videoOn, videoOff: video.videoOff } } };
      const { agg } = sweep(cellSeeds, ov, `uplink ${on}/${PERIOD - on} video ${video.label}`);
      cells.push({
        opfor_uplink_on_s: on, opfor_uplink_off_s: PERIOD - on,
        opfor_uplink_duty: Math.round((on / PERIOD) * 1000) / 1000,
        opfor_video: video.label,
        n: agg.runs, outcomes: agg.outcomes, win_rates: agg.win_rates, ci95: agg.ci95,
        opfor_mean_ttf_by_blufor_s: agg.time_to_fix_s.BLUFOR?.mean ?? null,
      });
    }
  }
  study.experiments.uplinkDutySensitivity = { period_s: PERIOD, seeds_per_cell: cellSeeds.length, cells };
}

study.meta.total_runs = totalRuns;

const outDir = join(import.meta.dirname, "..", "results");
mkdirSync(outDir, { recursive: true });
const outFile = QUICK ? "monte-carlo-quick.json" : "monte-carlo.json";
const outPath = join(outDir, outFile);
writeFileSync(outPath, JSON.stringify(study, null, 2));
console.error(`\nWrote ${outPath} (${totalRuns} engagements)`);

/* Register full runs in the manifest the dashboard reads. Quick runs are
   dev smoke passes and stay out of it. */
if (!QUICK) {
  const manifestPath = join(outDir, "index.json");
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : { datasets: [] };
  manifest.datasets = manifest.datasets.filter((d) => d.file !== outFile);
  manifest.datasets.unshift({
    file: outFile,
    generated: study.meta.generated,
    sim_commit: study.meta.sim_commit,
    engine_commit: study.meta.engine_commit,
    total_runs: totalRuns,
    baseline: {
      runs: study.experiments.baseline.runs,
      win_rates: study.experiments.baseline.win_rates,
    },
  });
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.error(`Updated ${manifestPath}`);
}
