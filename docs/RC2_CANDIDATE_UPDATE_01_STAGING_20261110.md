# RC2-CANDIDATE-UPDATE-01 | Isolated staging promotion manifest

- Previous Netlify UAT deployed commit: `79f07160ae3760299354b1bb38c1bdb3170155fd` (retained as rollback point).
- PR #97 merged **only** into PR #96 integration candidate, merge commit: `e435bb25eddc8a8ad4c84427ca9883d4ec3e9c16`.
- Exact integration `app/` Git tree pinned for this stage: `4fbf5eefccbc9ee3e05a969b88334314263a3e79`.
- Browser QA for PR #97: <https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/42851262284> **SUCCESS** (375/390, S01, CAP, BOOKING, O01 success/failure/cancel/resume); backend not integrated.
- Production branch for protected Netlify UAT site remains `uat/rc2-pr96-20261110` (not main). Staging branch exists for preflight only, not final release approval.
- Visual status: approved requirements applied for S01's 88×88 flat list; some secondary text remains P2; **user final visual signoff not obtained**.
- Never mark this as formal main release or real WeChat payment/CRM stock verification. `human_uat_signed_off` remains false.
- Site: `bc2df934-a53b-4b99-b751-810b8781577f`, keep Team SSO unchanged.
