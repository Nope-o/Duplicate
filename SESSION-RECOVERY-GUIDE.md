# Session Recovery Guide

Use this file when starting a new session after context is lost. It captures the current repo topology, deployment behavior, recent feature work, and the failure lessons that matter.

## 1. Workspace And Repo Model

Local workspace:
- `portfolio-n-main`

Git remotes:
- `duplicate` -> `https://github.com/Nope-o/Duplicate.git`
- `origin` -> `https://github.com/Nope-o/port11.git`
- `portfolio` -> `https://github.com/Nope-o/Portfolio.git`

Current important remote heads at the time this guide was written:
- `duplicate/main` -> `10d7d6777c58d2f3ce33a70fef472249bf71a9aa`
- `origin/main` (`port11`) -> `13033ed5f9fb392baa237aab220f5d411d383c5e`
- `portfolio/main` -> `53e873bd3b98d305f1dd4c19c3e5e7618cbc1c77`

Local branch model:
- local `main` tracks `duplicate/main`
- local `main` is the main development line
- `portfolio` is production and should be updated carefully
- `port11` is backup/trial like `Duplicate`

## 2. Repo Roles

### Duplicate
Purpose:
- primary trial/staging repo
- local `main` should stay aligned with this repo

Typical deploy base:
- `/Duplicate/`

### port11
Purpose:
- backup/trial repo

Typical deploy base:
- `/port11/`

### Portfolio
Purpose:
- production repo
- custom domain deployment

Custom domain:
- `https://madhav-kataria.com`

Important rule:
- do not casually overwrite `Portfolio` from local `main`
- when promoting to production, create a branch from `portfolio/main`, cherry-pick meaningful commits, validate, then push to `portfolio/main`

## 3. Deployment Configuration

Important files:
- `.github/workflows/deploy-github-pages.yml`
- `vite.config.mjs`

Pages source for all repos:
- `Settings -> Pages -> Source = GitHub Actions`

### Portfolio variables
These must be correct for production:
- `PAGES_USE_CUSTOM_DOMAIN=true`
- `PAGES_CNAME=madhav-kataria.com`
- `PAGES_BASE_PATH=/`

### Duplicate variables
- `PAGES_USE_CUSTOM_DOMAIN=false`
- `PAGES_BASE_PATH=/Duplicate/`

### port11 variables
- `PAGES_USE_CUSTOM_DOMAIN=false`
- `PAGES_BASE_PATH=/port11/`

## 4. How Vite / Pages Pathing Works

The build uses `VITE_BASE_PATH`.

Path behavior:
- custom domain production uses `/`
- Duplicate uses `/Duplicate/`
- port11 uses `/port11/`

`vite.config.mjs` also handles:
- main site entry generation
- safe build mode
- sitemap generation
- selective bundle handling
- CNAME copy when base path is `/`

## 5. Important CI / Pages Fixes Already Learned

These were the main failure sources and the fixes that were applied.

### Failure 1: Multiple `github-pages` artifacts on reruns
Symptom:
- `actions/deploy-pages@v4` failed with:
  - `Multiple artifacts named "github-pages" were unexpectedly found`

Cause:
- old workflow uploaded the default artifact name `github-pages`
- reruns or repeated attempts could leave multiple matching artifacts in a workflow run

Fix applied:
- workflow now sets a unique artifact name per run attempt:
  - `github-pages-${{ github.run_id }}-${{ github.run_attempt }}`
- upload step uses that exact name
- deploy step uses the same exact `artifact_name`

### Failure 2: old rerun snapshot still using old workflow
Symptom:
- even after fixing workflow, logs still said:
  - `Fetching artifact metadata for "github-pages"`

Cause:
- GitHub `Re-run jobs` reuses the old workflow snapshot
- it does not automatically use the newly committed workflow definition

Operational lesson:
- do not use `Re-run jobs` on an old failed run after workflow fixes
- instead:
  1. start a fresh workflow run from `main`, or
  2. push a new no-op commit to trigger a fresh run

### Failure 3: `npm ci` failed in GitHub Actions
Symptom:
- `Build Smoke Check` failed before the app build

Cause:
- `package.json` declared `@playwright/test`
- `package-lock.json` did not include it in the root devDependencies and had no resolved package entry
- `npm ci` requires lockfile/package consistency

Fix applied:
- regenerated `package-lock.json`
- verified:
  - `npm ci` passes
  - `npm run build` passes

### Failure 4: Pages upload action version lag
Improvement applied:
- updated `actions/upload-pages-artifact` from `@v3` to `@v4`

## 6. Safe Deployment Rules

### For Duplicate
Normal flow:
1. work on local `main`
2. validate build
3. push to `duplicate/main`
4. let push trigger Pages

### For port11
Safer flow:
1. branch from `origin/main`
2. cherry-pick validated commits from local `main`
3. validate with `/port11/` base path
4. push to `origin/main`

### For Portfolio
Safer flow:
1. branch from `portfolio/main`
2. cherry-pick only meaningful validated commits
3. validate with `/` base path and production config intact
4. push to `portfolio/main`

Important:
- do not push duplicate-only no-op deploy trigger commits to `Portfolio`
- preserve production-specific behavior for custom domain

## 7. Useful Validation Commands

Run from repo root.

### Duplicate-style build
```bash
VITE_BASE_PATH=/Duplicate/ SAFE_BUILD=true npm run build
```

### port11-style build
```bash
VITE_BASE_PATH=/port11/ SAFE_BUILD=true npm run build
```

### Portfolio-style build
```bash
VITE_BASE_PATH=/ SAFE_BUILD=true npm run build
```

### Lockfile / install validation
```bash
npm ci
```

## 8. Recent LiteEdit Work

LiteEdit received a substantial UX and code-structure improvement pass.

Highlights:
- mobile ergonomics improved
- pan tool became a real toggle
- undo/redo behavior improved with better state history
- large app-core logic started being split into smaller controllers
- smoke-test support added

Important LiteEdit files:
- `projects/liteedit-app/js/app-core.js`
- `projects/liteedit-app/js/app-core-canvas-interaction-controller.js`
- `projects/liteedit-app/js/app-core-keyboard-controller.js`
- `projects/liteedit-app/js/app-core-ui-flow-controller.js`
- `projects/liteedit-app/js/app-core-session-controller.js`
- `projects/liteedit-app/js/app-core-text-controller.js`
- `projects/liteedit-app/js/export-engine.js`
- `projects/liteedit-app/js/export-worker.js`
- `projects/liteedit-app/js/session-store.js`

Testing files added:
- `playwright.config.js`
- `tests/liteedit.spec.js`
- `scripts/run-e2e-safe.mjs`

## 9. Recent SurSight Studio Work

SurSight Studio got these features:
- recorded session replay from stored pitch data
- playback monitor
- replay tone toggle
- playback speed controls
- replay voice settings
- replay level setting
- version updated to `2.4.14`
- top session count indicator near settings
- session count badge on Sessions tab
- click top indicator opens Sessions and scrolls to it
- save animation from recording stop to top indicator

Important SurSight files:
- `projects/sursight-studio-app/index.html`
- `projects/sursight-studio-app/css/main.css`
- `projects/sursight-studio-app/css/mobile.css`
- `projects/sursight-studio-app/css/components.css`
- `projects/sursight-studio-app/js/app.js`
- `projects/sursight-studio-app/js/recording.js`
- `projects/sursight-studio-app/js/sessions.js`
- `projects/sursight-studio-app/js/settings.js`
- `projects/sursight-studio-app/js/ui.js`

Important functional note:
- replay uses synthesized pitch from recorded note/frequency data
- it is not original microphone audio playback

## 10. Current CI / Repo Status Learned From The Failures

Key points to remember:
- local build passing is not enough; always validate `npm ci` if CI is failing
- Pages reruns can be misleading because they may use the old workflow snapshot
- fresh workflow runs are safer than reruns after workflow changes
- for production repos, prefer cherry-picking validated commits rather than force-syncing everything
- local `main` tracks `duplicate/main`, not `portfolio/main`

## 11. Recommended Working Routine

1. develop on local `main`
2. validate with:
   - `npm ci`
   - repo-appropriate `VITE_BASE_PATH=... npm run build`
3. push to `duplicate`
4. test live there
5. cherry-pick validated commits to `port11` if needed
6. cherry-pick validated commits to `portfolio` only when ready for production

## 12. Pasteable Context For Next Session

If a future assistant session has no memory, paste this:

```txt
We are in the repo `portfolio-n-main`.

Remotes:
- duplicate = staging/trial repo
- origin = port11 backup/trial repo
- portfolio = production repo with custom domain

Local branch model:
- local `main` tracks `duplicate/main`
- do normal development on local `main`
- do not directly treat local `main` as production state for Portfolio

Current deployment model:
- GitHub Pages via GitHub Actions
- workflow file: `.github/workflows/deploy-github-pages.yml`
- build config: `vite.config.mjs`

Repo variables:
- Portfolio:
  - PAGES_USE_CUSTOM_DOMAIN=true
  - PAGES_CNAME=madhav-kataria.com
  - PAGES_BASE_PATH=/
- Duplicate:
  - PAGES_USE_CUSTOM_DOMAIN=false
  - PAGES_BASE_PATH=/Duplicate/
- port11:
  - PAGES_USE_CUSTOM_DOMAIN=false
  - PAGES_BASE_PATH=/port11/

Important failure lessons already learned:
1. Do not rerun old failed Pages jobs after workflow fixes. Old reruns reuse the old workflow snapshot.
2. Pages deploy was failing because multiple artifacts named `github-pages` existed. Workflow was fixed by using a unique artifact name per run and wiring upload+deploy to that name.
3. GitHub Actions `npm ci` was failing because `package-lock.json` was out of sync with `package.json` (`@playwright/test` missing from the lockfile). This was fixed by regenerating `package-lock.json`.
4. `actions/upload-pages-artifact` was upgraded from `@v3` to `@v4`.

Recent feature work:
- LiteEdit: mobile ergonomics, pan toggle, better undo/redo, modularization, smoke test support
- SurSight Studio: session replay, playback monitor, replay voices/level, speed controls, session counter indicators, sessions scroll routing, save animation, version 2.4.14

Safe release process:
- develop on local `main`
- validate with `npm ci` and `VITE_BASE_PATH=... npm run build`
- push to `duplicate`
- cherry-pick validated commits to `port11`
- cherry-pick validated commits to `portfolio`

Useful build commands:
- Duplicate: `VITE_BASE_PATH=/Duplicate/ SAFE_BUILD=true npm run build`
- port11: `VITE_BASE_PATH=/port11/ SAFE_BUILD=true npm run build`
- Portfolio: `VITE_BASE_PATH=/ SAFE_BUILD=true npm run build`
```

