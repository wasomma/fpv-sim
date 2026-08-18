# CLAUDE.md — working notes for fpv-sim

Single-file browser sim of an FPV sUAS vs counter-UAS engagement, plus its
evidence: a Monte Carlo study, a results dashboard, and generated docs.
All data is notional. Start with README.md; deep docs: DESIGN_NOTES.md,
DEVELOPMENT_HISTORY.md, MONTE_CARLO.md, PARAMETERS.md, CHANGELOG.md.

## The one invariant that matters

**Same-seed determinism is this project's API.** The sibling repo
[fpv-sim-mcp](https://github.com/wasomma/fpv-sim-mcp) contains a TypeScript
port of the simulation core in `index.html` — the engine is everything
before `RENDERING` (`CONFIG` through the end of the `TACTICAL MODE`
section) — with parity proven by golden-master fixtures generated FROM
this file.

The engine has two modes, selected by `resetSim(seed, mode)` /
`state.mode`: `"orbit"` (the original engagement, and the default whenever
`resetSim(seed)` is called without a mode) and `"tactical"` (the
multi-FPV sortie-stream plan; see DESIGN_NOTES.md "Tactical mode"). The
parity contract covers **both modes**: fpv-sim-mcp's engine, tools
(`mode` input) and fixtures span the two (orbit `golden-seeds.json`, five
featured seeds; tactical `golden-seeds-tactical.json`, six), so a
same-seed behavior change in either mode is a contract break. All of the
engine is under the contract — the mode-shared helpers
(`collectUplinkLOBs`, `collectDownlink`, `attackGuidance`, `updateFix`,
RF/terrain, `makeTeam`, the emplacement half of `resetSim`) most
delicately, since both fixture sets cross them — and the `TACTICAL MODE`
section must never run, or draw from the RNG, when
`state.mode === "orbit"` (nor tactical setup draws in orbit resets: the
two modes share every draw through emplacement and diverge at the air
plan). Consequences:

- Any edit that changes engagement outcomes for a given seed is a
  **breaking change**: it invalidates fpv-sim-mcp's fixtures AND the
  committed `results/` datasets. Flag it "Behavior-changing" in
  CHANGELOG.md, regenerate fixtures there (`npm run goldens`), update its
  `docs/upstream/SNAPSHOT.md`, and rerun the study here.
- UI-only edits are safe but must not touch the RNG draw order, and the
  whole `<script>` block must still *load* headlessly: fpv-sim-mcp's
  fixture generator runs it in a Node vm with only `document`/`window`
  (inert proxies), `performance`, `console` — no `location`,
  `URLSearchParams`, etc. Guard browser-only APIs with try/catch (see the
  deep-link init code for the pattern).
- Both violations surface as a red check on the PR: this repo's `parity`
  workflow (`.github/workflows/parity.yml`) runs on every pull request
  that touches `index.html` (and on pushes to `main` that touch it),
  checks out fpv-sim-mcp main alongside, regenerates its golden fixtures
  (both sets) from the PR's `index.html`, and fails if any featured
  seed's recorded run differs — outcome, timeline, per-team state, *or
  event-log text*
  (that repo's contract is string-equal events, so rewording an `addLog`
  line trips it too; the failure output classifies each seed and gives
  the matching remediation) — or if the file no longer loads headlessly.
  fpv-sim-mcp's `upstream-drift` workflow is the mirror check on its side
  (per-PR there, plus weekly), and there it is a *required* status check
  on `main` — a red run blocks the merge. An intended behavior change is
  necessarily red here until the matching fpv-sim-mcp PR lands: merge
  this side first, then that PR (which is unmergeable until upstream
  main carries the change). `parity` itself is advisory, not required:
  making a path-filtered check required would strand PRs that do not
  touch `index.html`, because skipped runs stay Pending. To check before
  pushing, run `npm run goldens` in a sibling fpv-sim-mcp checkout and
  confirm `git diff` there shows only `_meta` changes.

## Layout

- `index.html` — the entire sim application (zero deps, GitHub Pages
  serves it at the root URL). Supports `?seed=<n>&play=1&mode=tactical`
  deep links. Featured scenarios per mode live in the `FEATURED` table in
  the controls code (the `<select>` is populated from it).
- `.github/workflows/parity.yml` — the parity check described above;
  `workflow_dispatch` runs it on demand against any branch.
- `dashboard.html` — companion results viewer, equally single-file; reads
  `results/index.json` (manifest) and the datasets it lists. Datasets
  carry a `mode` ("orbit" default; tactical entries get a TACTICAL tag,
  packages-expended stalemate wording, a strikes tile, and
  `&mode=tactical` on their WATCH links).
- `viewer3d.html` — experimental WebGPU 3D viewer, both modes (Mode
  buttons keep the seed; `?mode=tactical` deep link). Contains NO
  simulation code: it fetches `index.html` at runtime and executes its
  script block against an inert DOM proxy (same harness as fpv-sim-mcp's
  fixture generator), then drives the real `resetSim(seed, mode)` /
  `stepSim()`. Renders engine state read-only — it must never call the
  engine RNG or add draws. Test hook:
  `window.__test.runHeadless(seed, maxT?, mode?)` reproduces both
  golden-fixture sets in-browser (mode defaults to "orbit" regardless of
  the viewed mode); `?offscreen=1` renders to an offscreen target for
  headless verification.
- `scripts/monte-carlo-study.mjs` — the canonical study runner (the four
  experiments). `--quick` for a 1/10-scale smoke pass (~4 min); full run
  ~25 min, 22,800 engagements. Writes `results/monte-carlo.json`,
  `kind:"study"`. `--mode tactical` runs the battery under the sortie
  stream (plus the tactical-only `reserveVsRetask` paired experiment,
  24,800 engagements) and writes `results/monte-carlo-tactical.json` —
  it never touches the orbit dataset.
- `scripts/run-sweep.mjs` — ad-hoc single-sweep runner: `--label` (req),
  `--start`, `--count`, `--overrides` (JSON), `--mode`. Writes an
  `adhoc-<slug>-<date>.json` dataset, `kind:"adhoc"`, and registers it.
  The dashboard prefixes these AD-HOC and offers a STUDY/AD-HOC filter;
  ad-hoc datasets carry only a `baseline` sweep, so the dashboard's dose
  and paired cards render only when those experiments exist.
- `scripts/sweep-utils.mjs` — shared helpers (engine load, Wilson CIs,
  histograms, manifest upsert) both runners use, so they can't drift.
- `scripts/generate-parameters-doc.mjs` — regenerates PARAMETERS.md.
- `results/` — committed datasets + manifest (`index.json`; entries
  written since the ad-hoc-sweep work carry a `kind` and `label`, but the
  canonical orbit study's entry predates both fields — the dashboard
  defaults such legacy entries to STUDY / "Full study" / orbit).
  Quick-run output (`monte-carlo*-quick.json`)
  is a dev artifact, gitignored and never registered. Retire an ad-hoc
  dataset by deleting its file and its manifest entry.

Both scripts import the **built** engine from a fpv-sim-mcp checkout:
sibling directory `../fpv-sim-mcp` by default, or `$FPV_SIM_MCP`. Build it
there first (`npm install && npm test`). Do not reimplement the engine
here — index.html is the spec, fpv-sim-mcp is the verified headless twin.

## Conventions

- CHANGELOG.md: Keep a Changelog + semver; accumulate under
  `[Unreleased]`, roll into a version on release. Compare links use
  release tags: when cutting a version, tag `vX.Y.Z` on the merge commit
  that carries the "Cut version" change, push the tag, and publish a
  GitHub release whose notes are that CHANGELOG section. A version cut
  is CHANGELOG-only — nothing in the app carries a version string.
- Dashboard chart colors are the sim's hues darkened to pass CVD/contrast
  validation on the dark surface (see the `:root` comment in
  dashboard.html); the sim's original brighter hues are for chrome only.
- GitHub Pages auto-deploys `main`; auto-delete of merged branches is on.
- Scheduled workflows (in fpv-sim-mcp) pause after ~60 days of repo
  inactivity — GitHub emails a one-click re-enable.

## Open work

Check the repo's open issues first — outstanding owner actions are
tracked there, not in this file. The tactical-mode follow-ups (port to
fpv-sim-mcp, study + dashboard, 3D viewer) are done; the parity contract
covers both modes, per the invariant above.
