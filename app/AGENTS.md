# Repository Guidelines

## Project Structure & Module Organization

This is the Mini Koala V1.1 Lean Iteration prototype. Read README_CURRENT.md and docs/ITERATION_GUIDE.md before changes. Keep existing runtime paths stable and use the following layout:

- `prototype/`: HTML/CSS/JavaScript prototype screens and shared UI assets.
- `qa/`: deterministic regression checks and flow-level test scripts.
- `assets/`: images, icons, and other source media; keep generated exports elsewhere.
- `docs/`: product decisions, interaction notes, and release checklists.
- `outputs/`: local review exports and delivery archives; do not treat these as source.

Prefer one page or flow per clearly named file, for example `mini_storage_store_detail_s02.html`. Keep shared data and helpers in dedicated files rather than duplicating inline logic across screens.

## Build, Test, and Development Commands

No package manager or build configuration is committed yet. Until one is introduced, preview static pages from the repository root with:

```powershell
python -m http.server 4173
```

Open `http://127.0.0.1:4173/` and verify the affected flow at both `375x812` and `390x844`. When `qa/` scripts exist, run targeted checks from the repository root, for example `node qa/test_store_unit_match.js`. Add new commands to this section when a formal build or package manifest is introduced.

## Coding Style & Naming Conventions

Use two-space indentation for HTML, CSS, and JavaScript. Prefer semantic HTML, lowercase kebab-case CSS classes, and camelCase JavaScript variables/functions. Use descriptive page identifiers (`S01`, `S02`, `U01`) consistently in filenames, query parameters, and test names. Keep user-facing copy in UTF-8 and avoid unexplained abbreviations.

## Testing Guidelines

Tests should be deterministic and focused on business behavior: routing, term selection, pricing summaries, and button labels. Name scripts `test_<flow>_<behavior>.js`. Every changed screen should receive a static regression check and a visual review at both supported mobile sizes; record any intentional exceptions in `docs/`.

## Commit & Pull Request Guidelines

There is no existing Git history to infer a project-specific convention. Use concise imperative messages with a scope, such as `feat(s02): simplify store detail actions` or `fix(u01): preserve term selection`. Pull requests should describe the user-visible change, list affected files/flows, include test commands and results, and attach before/after screenshots for visual changes. Keep unrelated refactors out of feature changes.

## Security & Configuration Tips

Do not commit customer data, credentials, API keys, or private screenshots. Keep demo data clearly synthetic. Review generated ZIPs before sharing to ensure they contain only intended prototype, QA, and documentation files.
