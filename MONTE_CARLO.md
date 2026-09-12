# Monte Carlo Study — Does Emissions Discipline Actually Decide the Fight?

The README claims the sim's core lesson is that **the side that transmits
less is harder to fix**. The featured scenarios illustrate that claim with
curated seeds; this document backs it with statistics: 22,800 deterministic
engagements across four experiments. The headline results:

- Under stock configuration, the disciplined side (BLUFOR) wins **48.0%** of
  engagements to the continuous emitter's **28.1%** — 63% of all decisive
  fights — and fixes the enemy GCS about **44 s sooner** at the median.
- Give OPFOR the same discipline and the 20-point gap collapses to under 3
  (36.0% vs 33.2%, overlapping CIs). Swap the postures outright and the
  advantage follows the discipline, not the team (OPFOR then wins 45.3% to
  31.8%).
- The other asymmetry in the stock config — BLUFOR launching 6 s earlier —
  turns out to be worth **nothing** (all rate deltas < 0.5 points at n=2,000).
  EMCON posture explains essentially the entire baseline gap.
- Discipline is dose-dependent: sweeping OPFOR's uplink duty cycle from 14%
  to 86% moves the enemy's win rate from ~27% to ~50% and accelerates the
  enemy's fix timeline by ~140 s.
- The findings replicate under the **tactical sortie-stream mode**
  ([E4](#e4--the-same-questions-under-tactical-mode), 24,800 further
  engagements): discipline parity closes the gap there too, the posture
  swap moves the advantage with the discipline, and the strongest lever in
  that plan is not EMCON at all — flying without a reserve hunter-killer
  cuts both sides' win rates by half or more (stalemates 52% → 79%).

As everywhere in this project, all data is **notional**. These are
statements about the model, not about any real system (see
[Scope and caveats](#scope-and-caveats)).

An interactive view of these results — including click-to-replay links from
any statistic to the watchable engagement behind it — lives at
**[dashboard.html](https://wasomma.github.io/fpv-sim/dashboard.html)**.
It opens on a finding generated from the selected dataset; deep-link a
dataset with `?dataset=<file>` (e.g.
`dashboard.html?dataset=monte-carlo-tactical.json`).

## Method

### Engine

Replications run on the headless engine from
[fpv-sim-mcp](https://github.com/wasomma/fpv-sim-mcp) — the simulation core
of this repo's `index.html` extracted to TypeScript, with behavior parity
proven by that project's golden-master tests (same seed → same engagement,
event-log string-equal, CEPs float-equal). This study deliberately does
*not* reimplement the sim: `index.html` remains the specification, the
engine is its verified headless twin, and re-deriving a third copy here
would only create drift risk. The four experiments below exercise the
original ("orbit") engagement — one FPV per side holding a forward orbit;
the same battery rerun under the tactical sortie-stream mode is
[its own section](#e4--the-same-questions-under-tactical-mode) and its
own committed dataset.

### Design

A replication is one full engagement: `runEngagement(seed, overrides)` run
to termination — a GCS kill, both drones down (stalemate), or a 3600 s cap
(stalemate; never reached in this study: all 2,385 baseline stalemates are
both-drones-down). Because every engagement draws from one seeded
`mulberry32` stream, a replication is fully determined by
(seed, config overrides), and every number below can be regenerated exactly.

- **Seed lists are contiguous ranges starting at 1**, so each experiment is
  reproducible from its range alone.
- **Paired comparisons (E2)** run two config variants over the *identical*
  seed list — a common-random-numbers design. Per-seed terrain and
  emplacement luck cancel out of the deltas, so 2,000 pairs resolve effects
  that independent samples of that size could not.
- **Uncertainty** is reported as 95% Wilson score intervals on outcome
  proportions. The dashboard's Δ readouts (a sweep against the stock
  baseline, a paired variant against its stock arm) use the Newcombe
  hybrid-score interval (method 10) on the difference of two independent
  proportions; for same-seed arms that interval is conservative.
- **Stalemates are a first-class outcome**, not discarded: an honest
  estimator that refuses to bless a bad fix produces engagements where
  nobody commits, and how often that happens is itself a finding.
- Time-to-fix statistics are **conditional on that side achieving a fix**,
  so the run subsets behind those means differ between variants; treat
  time-to-fix deltas as descriptive, not as tightly identified as the
  outcome-rate deltas.

Stock asymmetries under test: BLUFOR keys its C2 uplink 4 s on / 13 s off
with burst video (3/7); OPFOR keys 10 s on / 4 s off with continuous video.
BLUFOR launches at T+20, OPFOR at T+26. Hardware is otherwise identical.

## E1 — Baseline (10,000 seeds, stock config)

Seeds 1–10,000, no overrides.

| Outcome | Count | Rate | 95% CI |
|---|---|---|---|
| BLUFOR victory (disciplined) | 4,801 | 48.0% | [47.0%, 49.0%] |
| OPFOR victory (continuous) | 2,814 | 28.1% | [27.3%, 29.0%] |
| Stalemate (both drones down) | 2,385 | 23.9% | [23.0%, 24.7%] |

The disciplined side takes **63.0% of the 7,615 decisive engagements**. The
mechanism shows up in the fix race: BLUFOR establishes a fix in 6,795 of
10,000 runs (median 374 s), OPFOR in only 3,180 (median 418 s) — the
continuous emitter is simply available to collect against far more often.
Decisive engagements end at a median of 875 s (p10 186 s, p90 1,265 s);
the fastest kill in the sample is seed 2792 (BLUFOR, T+99.7 s) and the
slowest seed 4189 (OPFOR, T+1900.9 s).

The ~24% stalemate rate is the model being truthful: when neither side
accumulates enough well-crossed bearings, neither commits, and both drones
exhaust their batteries. (It sat near 37% before the bounded-search fix —
a drone that reached a bad fix used to spiral away across the AO instead
of sweeping the plausible error area, so many commits that now end in a
late kill used to end as battery-exhaustion draws. That is also why the
median decisive engagement got ~210 s longer: the recovered kills are the
slow ones.)

## E2 — Paired comparisons (2,000 same-seed pairs each)

Stock arm over seeds 1–2,000: BLUFOR 48.9% [46.7%, 51.0%], OPFOR 27.9%
[26.0%, 29.9%], stalemate 23.3% — consistent with E1. Each variant below is
compared against this arm on the same seeds.

| Experiment | Variant outcome (B / O / S) | Δ vs stock (points) | Outcome flips |
|---|---|---|---|
| **E2a** OPFOR adopts BLUFOR's duty cycles | 36.0% / 33.2% / 30.9% | −12.9 / +5.3 / +7.6 | 466 / 2,000 |
| **E2b** Full EMCON posture swap | 31.8% / 45.3% / 23.0% | −17.1 / +17.4 / −0.3 | 565 / 2,000 |
| **E2c** Launch stagger equalized (both T+20) | 48.6% / 28.1% / 23.4% | −0.3 / +0.2 / +0.1 | 333 / 2,000 |

**E2a — discipline is worth ~13 points of win rate.** With both sides
disciplined, the 21-point stock gap collapses to under 3 (36.0% vs 33.2%,
CIs overlapping) and stalemates rise 7.6 points — two quiet emitters give
both estimators less to work with. BLUFOR's mean time-to-fix degrades by
118 s because the uplink it collects against is now keyed 76% less of the
time.

**E2b — the advantage follows the posture, not the team.** With postures
swapped, OPFOR wins 45.3% to 31.8% — the baseline result mirrored, within
confidence intervals (compare the stock arm's 48.9% / 27.9%). If the
asymmetry were anything about the teams other than EMCON (positions,
terrain, search boxes), the swap would not reproduce the gap this cleanly.

**E2c — the launch stagger is a non-factor.** Equalizing launch times moves
every outcome rate by less than half a point — pure noise at this sample
size. This refutes the natural guess (made in fpv-sim-mcp's README example)
that BLUFOR's residual edge in E2a comes from its 6-second-earlier launch;
E2a's near-parity *is* the full story, and the E2b mirror confirms it.
Note the 333 individual seed flips at near-zero net rate change: the
engagement is chaotic — tiny perturbations reroll individual outcomes — but
the *rates* are stable, which is exactly why conclusions here are drawn
from ensembles, not single seeds.

## E3 — Dose response: OPFOR uplink duty cycle (400 seeds per cell)

OPFOR's uplink period fixed at 14 s (matching stock), on-time swept 2–12 s,
at both video postures. Seeds 1–400 per cell. BLUFOR stock throughout.

| OPFOR uplink duty | Video | BLUFOR win | OPFOR win | Stalemate | BLUFOR mean time-to-fix (s) |
|---|---|---|---|---|---|
| 14% (2/12) | continuous | 27.3% | 34.0% | 38.8% | 651 |
| 29% (4/10) | continuous | 37.8% | 33.0% | 29.3% | 550 |
| 43% (6/8) | continuous | 44.0% | 30.5% | 25.5% | 594 |
| 57% (8/6) | continuous | 45.8% | 29.0% | 25.3% | 561 |
| 71% (10/4) | continuous | 49.3% | 28.0% | 22.8% | 489 |
| 86% (12/2) | continuous | 50.2% | 25.0% | 24.8% | 509 |
| 14% (2/12) | burst 3/7 | 28.0% | 37.8% | 34.3% | 597 |
| 29% (4/10) | burst 3/7 | 38.3% | 32.3% | 29.5% | 601 |
| 43% (6/8) | burst 3/7 | 45.3% | 27.8% | 27.0% | 565 |
| 57% (8/6) | burst 3/7 | 46.8% | 27.5% | 25.8% | 525 |
| 71% (10/4) | burst 3/7 | 50.2% | 26.3% | 23.5% | 511 |
| 86% (12/2) | burst 3/7 | 49.5% | 28.0% | 22.5% | 497 |

(The 71%-duty continuous row is the stock OPFOR posture; its rates agree
with E1 within its ±4.9-point cell CI. Per-cell CIs at n=400 are roughly
±4–5 points, which accounts for the mild non-monotonicity between adjacent
cells; the trend across the sweep is far larger than the noise.)

The dose response is clear in both video postures: every additional second
of uplink on-time feeds the enemy's collectors. From quietest to loudest,
the enemy's win rate climbs ~23 points, the enemy's mean fix timeline
accelerates by ~140 s, and OPFOR's own win rate falls ~9 points. At 14%
duty OPFOR actually *out-wins* the stock-configured BLUFOR it faces —
discipline beyond BLUFOR's own 24% duty keeps paying. Stalemates rise as
the battlefield gets quieter, for the same reason as E2a: fixes get harder
for everyone.

## E4 — The same questions under tactical mode

Tactical mode replaces the hold-orbit air plan with a sortie stream: each
side pushes a package of five one-way strike sorties into a shared
objective (its GCS emitting sortie by sortie) and holds one airframe in
reserve as a hunter-killer that launches on the fix. Same terrain,
sensors, and fix math; a fundamentally different exposure profile. The
full battery above was rerun under this plan (`--mode tactical`, dataset
[results/monte-carlo-tactical.json](results/monte-carlo-tactical.json),
24,800 engagements), plus one experiment the orbit fight cannot ask.

**Baseline (10,000 seeds):** BLUFOR 29.7% (CI 28.8–30.6), OPFOR 18.5%
(17.7–19.2), stalemate 51.9% — every stalemate the sim's own
packages-expended end state, not a headless cap. Both sides deliver a mean
4.5 of 5 strikes on the objective regardless of who wins the GCS duel:
the supported ground fight almost always gets its fires, and the duel is
decided at the margin. Discipline still drives the fix race — BLUFOR
reaches a fix in 3,248 of 10,000 runs (median T+2:51) to OPFOR's 2,219
(median T+4:22) — but the shorter engagement window (a package is spent in
about seven minutes, versus a twenty-minute orbit fight) stalls out far
more often than orbit's 23.9%.

A scale note worth being honest about: the first look at this mode (seeds
1–200, on the engine as it stood before the bounded-search fix) put the
decisive edge at 27% to 15%, about 1.8:1 — the figure the v1.5.0 release
notes quote, accurately for its scope. Over the full 10,000 seeds it
settles at 1.61:1 — comparable to the orbit fight's 1.71:1, not wider.
The 200-seed sample overstated the ratio; the direction of the EMCON
conclusion is unchanged.

**The EMCON findings replicate.** Give OPFOR BLUFOR's duty cycles and the
gap nearly vanishes (20.9% vs 18.6%, stalemates rise to 60.5% as the
battlefield quiets); swap the postures outright and the advantage follows
the discipline (OPFOR 28.9% to BLUFOR 19.7%); equalize the launch stagger
and little happens (±1.5 points at n=2,000). The duty-cycle dose response
runs the same direction as E3: sweeping OPFOR's uplink duty from 14% to
86% raises BLUFOR's win rate from 16.5% to 31.8% under continuous video.

**The tactical-only question — is holding a reserve worth an airframe?**
`TACTICAL.RESERVE_HUNTER: false` retasks the next unflown strike sortie
when the fix commits instead of holding a sixth airframe back. The effect
is the largest in the whole battery: BLUFOR falls 29.3% → 14.9%, OPFOR
18.8% → 6.0%, and stalemates balloon from 52.0% to 79.2% (546 of 2,000
seeds flip). Two mechanisms compound: a retasked strike exists only until
the package is expended, so there is no final push on the best fix held —
and the fix usually commits late, when the stations are busy and the
unflown airframes are nearly gone. Both sides lose double digits (BLUFOR
−14.4 points, OPFOR −12.8): whoever converts more fixes into kills has
more to lose when the converter goes away. In this model the reserve
hunter-killer is the thing that turns a fix into a kill.

## Scope and caveats

- **Notional throughout.** Parameter values are plausible-magnitude fiction;
  nothing here supports absolute claims about real systems. The defensible
  claim is *directional and internal to the model*: under identical
  hardware, RF availability drives the fix race, and the fix race drives
  outcomes.
- The model's simplifications are inherited unchanged from `index.html`
  (sense-only cUAS, planar geometry, one sortie per side in orbit mode and
  a finite no-reload package in tactical mode, cosmetic frequencies — see
  [DESIGN_NOTES.md](DESIGN_NOTES.md)). Tactical mode tallies strikes on
  the objective without adjudicating a ground fight.
- Config overrides cannot move emplacements or NAI geometry, so these
  results are conditional on the stock scenario geography.
- One RNG stream per engagement means a config change early in a run
  diverges everything downstream; paired comparisons are valid for outcome
  statistics, but per-tick trajectories under different configs are not
  comparable.

## Reproducing

Every number above is deterministic. Full study (~30 min single-threaded):

```sh
git clone https://github.com/wasomma/fpv-sim.git
git clone https://github.com/wasomma/fpv-sim-mcp.git
cd fpv-sim-mcp && npm install && npm test && cd ../fpv-sim
node scripts/monte-carlo-study.mjs                  # writes results/monte-carlo.json
node scripts/monte-carlo-study.mjs --mode tactical  # writes results/monte-carlo-tactical.json
```

`--quick` runs a 1/10-scale smoke pass. A non-sibling engine checkout can
be pointed at with `FPV_SIM_MCP=/path/to/fpv-sim-mcp`.

The committed [results/monte-carlo.json](results/monte-carlo.json) and
[results/monte-carlo-tactical.json](results/monte-carlo-tactical.json)
are the datasets this document was written from.

Spot-checks need no local build: the fpv-sim-mcp MCP server exposes the
same engine, and any sweep within its caps reproduces the corresponding
slice of this study exactly — e.g. `sweep_seeds(start_seed: 1, count:
1000)` for the first thousand baseline seeds, or E2a at 500 pairs via
`compare_configs(start_seed: 1, count: 500, config_a: {}, config_b:
{TEAMS: {OPFOR: {uplinkOn: 4, uplinkOff: 13, videoOn: 3, videoOff: 7}}})`.
Any single engagement cited here (say, seed 2792's 100-second kill) can be
replayed with `run_engagement(2792)` — or watched in the browser by
entering the seed in [the live demo](https://wasomma.github.io/fpv-sim/).
The tools take `mode: "tactical"` for the E4 slices — e.g. the
reserve-vs-retask arm at 500 pairs is `compare_configs(start_seed: 1,
count: 500, mode: "tactical", config_a: {}, config_b: {TACTICAL:
{RESERVE_HUNTER: false}})`.

## Provenance

Like everything else in this project, this study was produced with AI
assistance (Anthropic's Claude): the runner script, the experiment design,
and this write-up. The engine it ran on is fpv-sim-mcp's golden-master-
verified extraction of this repository's simulation core.
