# MK-DEMO-QUALITY-RESET-01 / VERSION-BASELINE
_2026-11-15 · isolated working baseline · Web interactive internal demo only_

## Status and exact identity

| Dimension | Evidence-backed state |
|---|---|
| Current protected main | `56acf6fbb3944dac9256fcb1c9ce3a87034859a5` (read on 2026-11-15) |
| Signed source | PR #210 HEAD `f2fccf9301a54f00be9ab089a6426fae8f848242` |
| PR #210 | Open + Draft; signed for demo price and 375/390; **MERGE HOLD / DEPLOY HOLD** |
| New isolated branch | `work/mk-demo-quality-reset-01-20261115` from that exact signed source |
| Purpose | Explore/implement visual and UX improvements without altering PR #210 or main |
| Source QA | [375/390 Run #43549093999](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43549093999): success, head `f2fccf93...` |
| Source visual gate | [Run #43561229868](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43561229868): success, same source SHA |
| Live preview | NOT VERIFIED for this signed source. Existing Netlify RC1/PR96/RC2 private deployments are older or lack a matching identifiable SHA. |
| Work branch QA | NOT RUN for subsequent commits; source PASS never automatically transfers to a new SHA. |

The branch was verified identical to `f2fccf9301a54f00be9ab089a6426fae8f848242` immediately after creation (ahead 0 / behind 0). This document-only commit follows creation; no product runtime changes are authorized or implied by the document.

## Why this source, and what is not established

- PR #203 merged to main; PR #210 is newer signed business demo candidate, holding pricing, area/capacity and demo-time consistency fixes.
- GitHub `main...PR210` comparison at baseline: diverged; candidate ahead 18 commits, behind 1; 14 compared paths (8 runtime JS, five tests/scripts, one workflow). A main-side QA compatibility change is **not** permission to merge or silently rebase signed code.
- Source test pass is evidence for its captured states, **not** proof that the latest candidate is already deployed, or that new redesigned pages have passed browser/UAT.
- Web/HTML internal prototype only; do not impose real backend, inventory, payments, WeChat-native, formal pricing or production approval as current blockers.

## Entrypoint and effective sources

Local preview, from repository root (with Python):
`python -m http.server 8000 -d app`

Open:
`http://localhost:8000/central-review-02g.html?catalog=sim&page=H01`

- Outer routing: `app/central-review-02g.html`
- Inner application: `app/prototype/parallel/core-journey-fix-01/demo/index.html`
- Page render/route: `.../demo/app.js`; demo state/quote/order: `.../demo/demo-core.js`; demo fixture: `.../demo/fixtures.js`
- H01: `home.html`, `home-bridge.js`; S01: `s01-r2-live.html`, `s01-r2-bind.js`; S02: `app.js`, `s02-central.css`
- CAP: `cap.html`, `cap-bridge.js`, `space-unit.js`; S5/O01/BOOKING/QUICK: `br04/bridge.js` + `br04/*/index.html`; M01: `m01-rebaseline-01.js` and lifecycle scripts.
- Current product contract: `docs/RC2_POSTMERGE_RULE_BASELINE_01_20261114.md`; upstream requirements: user's 2026-11-15 decisions; engineering restrictions: `AGENTS.md`.

## Scope and authorization

**Goal (3-day effort):** full-site operable demo with premium core UX, not a native or backend release. Direction: mature commercial information architecture > neighborly usability > brand polish.

1. **Next: DESIGN-DIRECTION.** Create two genuinely distinct, **isolated** H01/S01/S5 visual/UX directions using the same source content, pricing and user states; include 375/390 captures and an operable comparison where feasible. The user approves only the direction once.
2. **Then CORE-IMPLEMENTATION.** Batch improve H01/S01/S5, with CAP/S02/O01 aligned; preserve IDs, business pricing state, route contracts and core outcomes. Auxiliary pages should remain coherent and functional.
3. **Then FULL-FLOW-QA + DEMO-SIGNOFF.** Test end-to-end paths at 375x812 and 390x844 with final exact SHA. Record screenshots and human UX issues separately from automation.
4. Keep disabled features disabled: no U01 unit-detail resurrection; no unit comparison; no independent S01 price filter; S02 traffic route tab remains; H01 third marketing slot is distinct from S01 third fixed E-storage slot. No restoration of cancelled M01 independent panels.
5. Existing VIS-GUARD protects the signed source. New visual concepts may **deliberately** differ only on this isolated design branch, and such changes require explicit user selection before becoming a new approved baseline.

## Explicit holds, fallback and verification

- **No main merge, no PR #210 modification, no Netlify production deployment, no branch deletion** on this task.
- Keep `f2fccf9301a54f00be9ab089a6426fae8f848242` as immutable signed business source; keep protected `main` as secondary safe fallback.
- Source visual/test evidence remains valid only for the signed source SHA. A new code commit must be evaluated at its own SHA.
- A branch existing on GitHub is not a live preview; a newer Netlify URL must be paired with its exact deployed SHA before representing it as the current demo.
- No new service/model API links or production integration are inferred.

## Completion of VERSION-BASELINE

- [x] Live main SHA, PR #210 exact HEAD, status and merged state checked.
- [x] Compared main vs PR #210; captured file-change classes and divergence.
- [x] Checked successful same-SHA 375/390 QA and visual guard.
- [x] Checked three current Netlify deploy identities; no signed-source deploy verified.
- [x] Located canonical local Web route and runtime sources.
- [x] Created and verified isolated working branch identical to signed source at branch creation.
- [ ] Run full live browser flow on new work branch (pending design/prototype implementation).
- [ ] Publish a new version-identified internal review URL (HOLD; requires explicit deployment authorization).
