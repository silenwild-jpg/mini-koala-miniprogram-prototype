# Repository Guidelines — current Web prototype

## Project Structure & Module Organization

Root `../AGENTS.md` and `../docs/current/INDEX.md` govern current tasks and take precedence over this local coding guide. `README_CURRENT.md` and `docs/ITERATION_GUIDE.md` are historical V1.1 materials, not the default current rules. Keep existing runtime paths stable and use the following layout:

- `prototype/`: HTML/CSS/JavaScript prototype screens and shared UI assets.
- `qa/`: deterministic regression checks and flow-level test scripts.
- `assets/`: images, icons, and other source media; keep generated exports elsewhere.
- `docs/`: product decisions, interaction notes, and release checklists.
- `outputs/`: local review exports and delivery archives; do not treat these as source.

Prefer one page or flow per clearly named file, for example `mini_storage_store_detail_s02.html`. Keep shared data and helpers in dedicated files rather than duplicating inline logic across screens.

## Build, Test, and Development Commands

This repository has active Git history, RC2 test scripts and GitHub Actions. For read-only local preview from the repository root:

```powershell
python -m http.server 8000 -d app
```

Open `http://127.0.0.1:8000/central-review-02g.html?catalog=sim&page=H01` and check affected flows at `375x812` and `390x844`. For executable test commands follow the active RC2 handoff and `scripts/` / `.github/workflows/`; do not treat a static preview or old RC1 scripts as full current QA.

## Coding Style & Naming Conventions

Use two-space indentation for HTML, CSS, and JavaScript. Prefer semantic HTML, lowercase kebab-case CSS classes, and camelCase JavaScript variables/functions. Use descriptive page identifiers (`H01`, `CAP`, `S01`, `S02`, `S5`, `O01`, `M01`); standalone `U01` is retired consistently in filenames, query parameters, and test names. Keep user-facing copy in UTF-8 and avoid unexplained abbreviations.

## Testing Guidelines

Tests should be deterministic and focused on business behavior: routing, term selection, pricing summaries, and button labels. Name scripts `test_<flow>_<behavior>.js`. Every changed screen should receive a static regression check and a visual review at both supported mobile sizes; record any intentional exceptions in `docs/`.

## Commit & Pull Request Guidelines

Git history and project-specific PR conventions already exist; follow the current work-package protocol. Use concise imperative messages with a scope, such as `feat(s02): simplify store detail actions` or `fix(u01): preserve term selection`. Pull requests should describe the user-visible change, list affected files/flows, include test commands and results, and attach before/after screenshots for visual changes. Keep unrelated refactors out of feature changes.

## Security & Configuration Tips

Do not commit customer data, credentials, API keys, or private screenshots. Keep demo data clearly synthetic. Review generated ZIPs before sharing to ensure they contain only intended prototype, QA, and documentation files.
