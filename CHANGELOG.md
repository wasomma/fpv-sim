# Changelog

All notable changes to fpv-sim are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/) (major = breaking change to the
sim's behavior contract, since same-seed determinism is the API here; minor
= new features; patch = fixes).

A note on determinism: any change that alters engagement outcomes for a
given seed invalidates the golden fixtures in
[fpv-sim-mcp](https://github.com/wasomma/fpv-sim-mcp) and the committed
Monte Carlo results — such a change is called out explicitly as
**Behavior-changing** in its entry, and requires regenerating both.

## [Unreleased]

**Behavior-changing** (the hunter-search fix under Fixed): same-seed
engagements that reach a no-acquisition terminal search — or that ever
pushed a drone against the world edge — now play out differently in both
modes. The full downstream sequence is complete within this release:
fpv-sim-mcp regenerated both golden-fixture sets against the new engine
(its PR #18, engine parity re-verified over seeds 1–500 float-for-float),
PARAMETERS.md regenerated from its updated parameter table, and both
Monte Carlo studies were rerun on the updated build (see the regenerated
datasets under Changed). The featured seeds are barely touched: all five
orbit and five of the six tactical featured engagements replay
identically, only tactical seed 5 shifts (same BLUFOR search-recovery
kill, 8.8 s later). Everything else below builds the tactical-mode
evidence and tooling around the engine. The parity contract spans both
modes: fpv-sim-mcp v0.3.0 ports tactical mode (engine, a `mode` input on
its tools, and a second golden-fixture set covering the six featured
tactical seeds, cross-checked against this file over seeds 1–500
float-for-float), so a same-seed behavior change in *either* mode is a
breaking change.

### Added
- **The dashboard leads with the finding.** `dashboard.html` now opens on
  a FINDING card: a plain-English verdict generated deterministically from
  the selected dataset (nothing stored; the same file always yields the
  same text) with the summary tiles under it, then one key-evidence card —
  the paired comparisons for a study, or for an ad-hoc sweep a new VS STOCK
  BASELINE dumbbell measured against the canonical study of the same mode in
  the manifest — and an ALL EVIDENCE fold holding the dose-response,
  timeline, notable-engagement and provenance cards. Ad-hoc tiles carry a
  Δ-vs-stock line. Every Δ is a difference of displayed rates and is read
  against a 95% Newcombe hybrid-score interval on the difference of two
  independent proportions: "clear" when the interval excludes zero, "slight"
  when it includes zero but |Δ| ≥ 2 points, otherwise "no measurable
  difference". **COPY FINDINGS** puts the verdict, the tiles with their CIs,
  the deltas and the provenance (dataset file, commits, regeneration
  command) on the clipboard as Markdown.
- **`dashboard.html?dataset=<file>`** opens on that manifest entry (an
  unknown or absent file falls back to the newest, never an error), and the
  address bar follows the DATASET selector so a reload lands on the same
  dataset.
- **`scripts/check-dashboard-stats.mjs`** lifts the dashboard's pure
  statistics and finding generator out of the page (the block between
  `@stats-begin` and `@stats-end`, which never touches the DOM) and checks
  it in node: an independent Wilson/Newcombe implementation, published
  check values, every `ci95` in the committed datasets, and byte-identical
  golden findings for the three of them. `node
  scripts/check-dashboard-stats.mjs` locally; `.github/workflows/dashboard.yml`
  runs it on every push and pull request that touches the page, the script
  or a dataset.
- **Tactical Monte Carlo study** (`scripts/monte-carlo-study.mjs --mode
  tactical`; committed dataset
  [results/monte-carlo-tactical.json](results/monte-carlo-tactical.json),
  24,800 engagements; write-up in MONTE_CARLO.md "E4"). The orbit battery
  rerun under the sortie stream — baseline, discipline parity, posture
  swap, launch stagger, uplink duty dose-response — plus the
  tactical-only reserve-vs-retask experiment. Headlines (as regenerated
  on the bounded-search engine; see Changed): over 10,000 seeds the
  disciplined side wins 29.7% to 18.5% with 51.9% stalemates (an EMCON
  edge of 1.61:1 — the 1.8:1 quoted from the first 200 seeds was a
  small-sample overstatement; direction unchanged), the EMCON findings
  all replicate, and the strongest lever in the plan is the reserve
  itself: no reserve hunter-killer collapses win rates to 14.9% / 6.0%
  and stalemates to 79.2%. `run-sweep.mjs` gains `--mode` for ad-hoc
  tactical sweeps; datasets and manifest entries carry a `mode`.
- **Tactical datasets on the dashboard**: TACTICAL tag in the dataset
  dropdown, packages-expended stalemate wording, a strikes-delivered
  tile, the reserve-vs-retask row in the paired card, mode-aware
  provenance and reproduce commands, and `&mode=tactical` on WATCH links.
- **Tactical mode in the 3D viewer**: Mode buttons (switching keeps the
  seed, like the 2D sim), per-mode featured scenarios, the
  `?mode=tactical` deep link, the full package rendered per airframe
  (darts, trails, labels, track diamonds), the OBJ TANTO ring and label,
  package tallies on the team cards, and the STALEMATE end card.
  `__test.runHeadless(seed, maxT?, mode?)` reproduces both golden-fixture
  sets in-browser.
- **PARAMETERS.md documents `CONFIG.TACTICAL`** — the doc again covers
  every number that drives the simulation. The generator renders the new
  TACTICAL group (per-side SORTIES/PILOTS table plus the scalar knobs,
  boolean ranges as true / false) from fpv-sim-mcp's parameter table,
  which now carries the tactical entries.

### Changed
- **Dashboard layout**: the tiles moved into the finding card; dose
  response, histograms, notable engagements and provenance are collapsed
  under ALL EVIDENCE (`<details id="evidence">`) by default. The DOM hooks
  downstream consumers rely on are unchanged — `#status`, `#content`,
  `#tiles`, `#charts .card`, `#seedsCard`, `#prov`, `#dataset`,
  `#kindFilter`, `#tooltip` — and the paired card's dumbbell renderer is
  now shared with the vs-stock card. The provenance footer escapes the
  dataset label (free text from a sweep's `--label`) instead of injecting
  it as HTML.
- **Monte Carlo datasets regenerated on the bounded-search engine**
  (fpv-sim-mcp `0d7d1fa`; both studies rerun in full, manifest refreshed,
  and the one committed ad-hoc sweep — DF bearing error doubled —
  re-swept and re-dated). Searches that previously wandered the AO now
  recover kills, so outcomes move sharply: orbit baseline 36.8 / 26.3 /
  36.8 → **48.0 / 28.1 / 23.9** (B / O / S) and tactical 24.9 / 18.7 /
  56.4 → **29.7 / 18.5 / 51.9**; the orbit EMCON edge is 1.71:1 and the
  tactical 1.61:1. Every dataset-derived figure in MONTE_CARLO.md, README
  and DESIGN_NOTES is updated, including one finding that flips:
  removing the reserve hunter-killer now costs the disciplined side most
  (−14.4 points to the continuous emitter's −12.8) — whoever converts
  more fixes into kills has more to lose when the converter goes away.
- CI: the `parity` workflow regenerates and compares BOTH golden-fixture
  sets (orbit and tactical) once fpv-sim-mcp main carries the tactical
  set, with the same per-seed Behavior-changing vs event-log-only
  classification; until then the tactical file is skipped.

### Fixed
- **Behavior-changing: realistic hunter flight after a miss, and no more
  invisible-wall boundary sliding.** A terminal search that found nothing
  at the fix grew its commanded orbit radius without bound (+22 m/s
  forever), so a hunter-killer that missed ended up circling the entire
  4 km AO pinned against the 30 m world-edge clamp, sliding along the
  boundary from corner to corner until battery exhaustion — seed 231513
  tactical reached a 25 km commanded search radius and spent 1,001 of its
  ~1,200 flight seconds riding the edge; over seeds 1–200, 52 orbit and 16
  tactical engagements exhibited the wall-slide. The search is now a
  bounded expanding orbit around the live fix — radius steps
  `SEARCH_RING_M` (170 m, inside visual-acquisition range) per revolution
  at `SEARCH_MPS` (24 m/s), out to `SEARCH_CEP_MULT` (2×) the current fix
  CEP, capped at `SEARCH_MAX_R_M` (650 m) and floored at visual range,
  re-sweeping from the center on a completed no-joy pattern — and the
  search start is logged (`AT FIX NO VISUAL // COMMENCING EXPANDING
  SEARCH`). Independently, `steerToward` confines every commanded steering
  point `EDGE_MARGIN_M` (150 m) inside the AO, so flight turns back ahead
  of the boundary and the world clamp is a never-ridden last-resort
  invariant (all real objectives sit well inside the margin; across seeds
  1–200 in both modes no drone now comes within 400 m of an edge).
  `TERMINAL_SEARCH_GROW` is retired. Net effect on outcomes over seeds
  1–200: fewer draws (orbit no-kill 69→42, tactical stalemates 113→104) —
  a bounded search actually recovers misses; seed 231513 turns from a
  27-minute stalemate into a BLUFOR search-recovery kill at T+09:11. No
  RNG draws were added or moved, so emplacements and every pre-search
  timeline are unchanged.
- Dashboard `fmtS` rounded seconds before carrying the minute, so 119.6 s
  rendered as "T+1:60" instead of "T+2:00" (visible on the tactical
  study's fastest-kill row; the bug predates tactical mode).

### Docs
- **PARAMETERS.md regenerated** from fpv-sim-mcp's updated parameter
  table: the five bounded-search/edge-margin `DRONE` knobs (`SEARCH_MPS`,
  `SEARCH_RING_M`, `SEARCH_CEP_MULT`, `SEARCH_MAX_R_M`, `EDGE_MARGIN_M`)
  replace the retired `TERMINAL_SEARCH_GROW`.
- DESIGN_NOTES.md: the tactical hunter paragraph now says "bounded
  expanding search" — the one "outward spiral" phrase the hunter-search
  fix missed.
- MONTE_CARLO.md gains the E4 tactical section and mode-aware
  reproduction notes; README's tactical section now cites the full-study
  numbers alongside the original seeds-1–200 figures and points at
  everything tactical mode now runs in; CLAUDE.md rewritten for the
  two-mode parity contract.
- DESIGN_NOTES.md records the OBJ TANTO naming rationale: the objective
  inside AO KATANA takes the companion blade's name from the scenario's
  Japanese-blade codename series — the short blade to the katana's long
  one, as the small objective sits inside the 4 km box and the short
  tactical fight sits beside the long orbit duel.

## [1.5.0] — 2026-08-18

Not behavior-changing for orbit mode: fpv-sim-mcp's golden fixtures
regenerate byte-identically from this release's `index.html` (verified
locally and by the `parity` workflow on every constituent merge).

### Added
- **Tactical mode** — a second, selectable engagement plan on the same
  terrain, sensors, fix math and terminal guidance (Mode buttons in the
  sidebar; `?mode=tactical` deep link). Instead of one FPV per side
  holding a forward orbit while the DF nodes work, each side pushes a
  package of one-way FPV strike sorties (default 5, plus one airframe
  held in reserve as a hunter-killer; 2 pilot stations = 2 airborne at
  once) into a shared contested objective, OBJ TANTO, midway between the
  GCS. Every sortie keys its GCS's C2 uplink — per the team's EMCON
  schedule while transiting autonomously, continuously once the pilot
  takes manual control for the terminal run — so the more a side flies,
  the more its GCS emits, and the enemy DF nodes fix it sortie by sortie.
  When the fix meets the commit gate the reserve hunter-killer launches
  against it (needing a free pilot station; it takes priority over the
  next strike launch); once a side's package is expended it goes on the
  best fix it holds (`PUSH_CEP_M`, the bingo-fuel commit by another
  route). Win: enemy GCS destroyed, as before. New end state: STALEMATE,
  when both packages are expended and neither side can launch a hunter.
  Strikes delivered on the objective are tallied per side (HUD, GCS
  panel, end card). All knobs are in `CONFIG.TACTICAL` (package size and
  pilot stations per side, reserve-or-retask, launch spacing and jitter,
  objective position/radius, terminal hand-off range, aim scatter).
  Six featured tactical scenarios ship in the dropdown; the mode switch
  keeps the seed, so the same emplacement can be watched under both air
  plans. Over seeds 1–200 the disciplined side wins 27%, the continuous
  emitter 15%, and 58% stall out — the shorter engagement window (a
  package is spent in ~7 min) draws more often than the 20-minute orbit
  fight, and the EMCON edge widens from 1.4:1 to 1.8:1.
  **Not behavior-changing for the original ("orbit") mode**: `resetSim(seed)`
  without a mode argument, the golden-fixture generator, the 3D viewer
  and the study scripts all still run the orbit engine, whose RNG draw
  order, event text and outcomes are unchanged (fpv-sim-mcp's fixtures
  regenerate identically). Three pieces of the orbit code were extracted
  verbatim into helpers now shared by both modes — `collectUplinkLOBs`,
  `collectDownlink`, `attackGuidance` (the COMMIT/TERMINAL attack run) —
  and the featured-scenario dropdown is now populated from a per-mode
  table in the script. Not yet in tactical mode: the fpv-sim-mcp port
  (its engine, tools and fixtures are orbit-only for now), the Monte
  Carlo study and dashboard, and the 3D viewer.
- `parity` GitHub Actions workflow (`.github/workflows/parity.yml`): on
  every pull request that touches `index.html` (and on pushes to `main`
  that touch it), it checks out fpv-sim-mcp `main` beside this repo,
  regenerates that repo's golden fixtures from the PR's `index.html`,
  and fails if any featured seed's recorded run differs (outcome,
  timeline, per-team state, or event-log text) — or if the file no
  longer loads headlessly; the failure output classifies each seed
  (Behavior-changing vs event-log-only) with the matching remediation
  and the cross-repo merge order. Behavior-changing edits and unguarded
  browser-only APIs now show up as a red check on the PR rather than in
  fpv-sim-mcp's weekly drift run after the fact; that repo's
  `upstream-drift` workflow gained the matching per-PR trigger, so
  divergence between the two repos surfaces before merge on either side.
  `parity` is advisory here (a path-filtered check cannot safely be made
  required); on the fpv-sim-mcp side the `drift` job is a required status
  check on `main`, so a red run there blocks the merge.
- `scripts/sweep-utils.mjs`: the results directory now honors a
  `FPV_SIM_RESULTS` environment override (default unchanged: this repo's
  `results/`), so an external host — the planned desktop app — can run
  the canonical study and sweep runners against its own data directory.
  Scripts only; the sim is untouched.

### Docs
- DESIGN_NOTES.md corrected against the code (no code change): emplacement
  jitter is ±60 m per axis, not ±120 m; `pathAtten` samples 13 interior
  points (`K = 14`, `i = 1..13`) and in practice tops out near 3.9 — the
  cap of 6 is never reached; the WLS weights floor range at 300 m; the
  geometry-penalty cut angle is measured between the two strongest
  sensors' bearings *to the current estimate*, not their mean LOBs; the
  terminal search is an outward spiral (radius +22 m/s), not an expanding
  square; randomness is several `mulberry32` streams derived from the seed
  (main engagement stream plus terrain/speckle streams), not one; and the
  seed readout is in the sidebar Controls, not a footer.
- README "Close Race (OPFOR)" description corrected: in seed 59 both sides
  *fix* within ~3 s (BLUFOR T+03:33, OPFOR T+03:36) but only OPFOR ever
  commits — BLUFOR's fix is held just above the 120 m commit gate by the
  balance penalty (27 of its 37 LOBs from one node). "Both sides commit"
  was wrong.
- DEVELOPMENT_HISTORY "Validated engagement character" timeline replaced
  with the shipped default's actual figures (seed 20260719: cross-fix
  T+01:53, FIX T+02:11 at CEP 191 m, commit T+04:28 at CEP 117 m, impact
  T+05:11); the previous numbers were from an intermediate tuning pass.
  "Current State" retitled as the state at the end of the authoring
  session (2026-07-20) with a pointer to this changelog for everything
  since.
- DEVELOPMENT_HISTORY closing note tightened for the tactical-mode era:
  what has held constant since the authoring session is the *orbit-mode
  engagement behavior* (same seed → same engagement), not the
  `index.html` file itself, which now also carries tactical mode; the
  "everything since" list gains tactical mode.
- MONTE_CARLO.md now says explicitly that the study exercises orbit mode
  only (the README already carried this caveat); extending the study to
  tactical mode remains open follow-up work.
- CLAUDE.md manifest note corrected: `results/index.json` entries written
  before the ad-hoc-sweep work predate the `kind`/`label` fields (the
  canonical study's entry has neither; the dashboard defaults such
  entries to STUDY / "Full study").

## [1.4.0] — 2026-08-16

Not behavior-changing: the simulation engine in `index.html` is untouched
and fpv-sim-mcp's golden fixtures still reproduce (weekly drift check green
against this commit's parent).

### Added
- **Experimental 3D viewer** (`viewer3d.html`): a WebGPU rendering of the
  same engagement — 3D hillshaded terrain, the canopy field as a
  translucent shell at canopy height (opacity tracks density; clearings
  and the trail read as holes) plus instanced trees, drones at true
  altitude, terrain-draped LOBs, error ellipses, flight paths, and a
  compute-shader "detectability field" overlay (per-scan intercept probability for a hypothetical uplink at
  every map point, the RF-propagation model made visible). Not
  behavior-changing and contains no simulation code: it loads the engine
  from `index.html` at runtime via the same inert-DOM harness technique
  fpv-sim-mcp's fixture generator uses, and drives the real
  `resetSim()`/`stepSim()`. Parity verified in-browser against all five
  golden-fixture seeds (winner, end time, LOB and event counts identical).
  Same `?seed=<n>&play=1` deep-link contract as the sim. Requires a
  WebGPU browser and HTTP serving; falls back to a clear notice (engine
  and event log still run) where WebGPU is unavailable. Touch controls
  for phones/tablets: one-finger orbit, two-finger pinch zoom and pan.
- **License** ([LICENSE.md](LICENSE.md)): the repository is now explicitly
  licensed under the PolyForm Strict License 1.0.0 — public to read and
  use noncommercially, but not open source (no modification,
  redistribution, or commercial use).
- **Ad-hoc sweeps** (`scripts/run-sweep.mjs`): run any seed range under
  any config overrides and save a labeled dataset the dashboard shows
  alongside the canonical study. The dataset dropdown now labels each
  entry STUDY or AD-HOC and offers a SHOW filter (all / studies only /
  ad-hoc only); ad-hoc datasets render their headline tiles, timelines,
  and click-to-watch seeds, omitting the study-only dose and paired
  charts. Shared runner logic extracted to `scripts/sweep-utils.mjs`.
- `CLAUDE.md` working notes for future sessions: the same-seed
  determinism invariant, the repo layout, and the cross-repo contract
  with fpv-sim-mcp.

### Removed
- The 3D viewer's RF Coverage toggle. Its flat max-range rings were
  nearly invisible in the 3D scene and misleading besides — the
  Detectability Field overlay supersedes them with the actual
  propagation-aware coverage picture (range falloff, terrain blocking,
  canopy loss). The GCS transmit ring and RF pulse effects are
  unaffected. The 2D sim's RF Coverage toggle is unchanged.

### Fixed
- The seed deep-link code crashed non-browser harnesses (no
  `location`/`URLSearchParams` in fpv-sim-mcp's golden-fixture VM),
  which would have broken that repo's weekly drift check. Now guarded;
  fixture regeneration verified identical before and after.
- 3D viewer layout on phones and short windows: the side panel now
  scrolls instead of painting past the bottom banner or into the team
  cards, the header wraps instead of spilling off the right edge, and
  the stacked map-over-panel breakpoint rises from 700 px to 860 px so
  portrait phones and folds get it (team cards side by side there,
  stacking again under 560 px). Verified with layout assertions at
  390×800, 750×1400, 1280×650, and 1440×900.

### Docs
- Release tags `v1.0.0`–`v1.3.0` published (2026-08-16); compare links
  below use tag form.

## [1.3.0] — 2026-07-23

### Added
- **[PARAMETERS.md](PARAMETERS.md)**: the parameter reference — every
  tunable driving the simulation with default, unit, valid range, and
  rationale, grouped as hardware (DRONE, CUAS), judgment (FIX), and
  doctrine (TEAMS). Generated by `scripts/generate-parameters-doc.mjs`
  from fpv-sim-mcp's machine-readable parameter table, so the doc cannot
  drift from what the simulation actually accepts.
- RESULTS link in the sim header, connecting the live sim to the Monte
  Carlo dashboard (the dashboard already links back via its OPEN
  SIMULATION button and per-seed WATCH links).
- This changelog.

## [1.2.0] — 2026-07-23

### Added
- **Results dashboard** (`dashboard.html`): interactive, zero-dependency
  view of the Monte Carlo results — headline win rates with confidence
  intervals, the uplink duty-cycle dose-response chart, paired-comparison
  dumbbells, time-to-fix / time-to-kill distributions, and a notable-seeds
  table. Served by GitHub Pages next to the sim.
- **Seed deep links**: `index.html?seed=<n>&play=1` opens the sim at an
  exact engagement, so any statistic can link to the watchable battle
  behind it. Not behavior-changing: the parameter only selects which
  engagement loads.
- Study runner enrichments: 60 s-bin histograms, provenance stamping
  (sim commit, engine commit, computed run count), and a
  `results/index.json` manifest so the dashboard can list datasets over
  time.

### Fixed
- Corrected the total engagement count in MONTE_CARLO.md and the README:
  the study is 22,800 engagements, not 27,800 as previously misstated. The
  runner now computes the count instead of it being hand-written.

## [1.1.0] — 2026-07-23

### Added
- **Monte Carlo study** ([MONTE_CARLO.md](MONTE_CARLO.md)): statistical
  backing for the EMCON lesson from 22,800 deterministic engagements run
  on the [fpv-sim-mcp](https://github.com/wasomma/fpv-sim-mcp) engine —
  baseline win rates with confidence intervals, paired same-seed
  comparisons (discipline parity, posture swap, launch-stagger test), and
  the uplink duty-cycle dose-response sweep. Committed dataset in
  `results/`, reproducible via `scripts/monte-carlo-study.mjs`.
- "In plain English" README section explaining the sim and the study
  findings for readers without a simulation or RF background.

### Notable finding
- The 6-second launch stagger between the teams contributes nothing to
  outcomes (all rate deltas < 0.5 points at n=2,000); EMCON posture
  explains essentially the entire baseline win-rate gap.

## [1.0.0] — 2026-07-20

### Added
- Initial public release: the single-file force-on-force simulation
  (`index.html`) — terrain and RF propagation models, DF geolocation with
  weighted-least-squares fixes and honest error ellipses, drone state
  machine with EMCON duty cycles, five featured scenarios, deterministic
  seeded replays — plus README, [DESIGN_NOTES.md](DESIGN_NOTES.md), and
  [DEVELOPMENT_HISTORY.md](DEVELOPMENT_HISTORY.md).
- Team status HUD cards, map overlay layout polish, cover-fit map view,
  and sidebar playback controls.

[Unreleased]: https://github.com/wasomma/fpv-sim/compare/v1.5.0...HEAD
[1.5.0]: https://github.com/wasomma/fpv-sim/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/wasomma/fpv-sim/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/wasomma/fpv-sim/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/wasomma/fpv-sim/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/wasomma/fpv-sim/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/wasomma/fpv-sim/releases/tag/v1.0.0
