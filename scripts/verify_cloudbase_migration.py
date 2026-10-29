#!/usr/bin/env python3
"""Offline CloudBase migration preflight. NEVER uploads or publishes anything."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROBE = ROOT / "deploy/cloudbase/neutral-probe"
BUILD = ROOT / "release-evidence/merge02n"
SITE = BUILD / "site"
FORBIDDEN_PARTS = {"qa", "evidence", ".git", ".netlify", "node_modules", "__pycache__"}
FORBIDDEN_SUFFIXES = {".md", ".zip", ".pdf", ".env", ".pem", ".key"}
REQUIRED = {
    "index.html",
    "central-review-02g.html",
    "prototype/parallel/core-journey-fix-01/demo/index.html",
    "prototype/parallel/core-journey-fix-01/demo/fixtures.js",
    "prototype/parallel/core-journey-fix-01/demo/br04/o01/index.html",
}

def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()

def verify_probe():
    assert PROBE.is_dir()
    files = {str(p.relative_to(PROBE)) for p in PROBE.rglob("*") if p.is_file()}
    assert files == {"index.html", "health.json", "robots.txt"}, files
    assert not any(p.is_symlink() for p in PROBE.rglob("*"))
    health = json.loads((PROBE / "health.json").read_text("utf-8"))
    assert health["contains_private_content"] is False
    html = (PROBE / "index.html").read_text("utf-8")
    assert "No private application content" in html
    assert "noindex" in html
    assert "Disallow: /" in (PROBE / "robots.txt").read_text("utf-8")
    assert all(p.stat().st_size < 10000 for p in PROBE.rglob("*") if p.is_file())
    print("CLOUDBASE_NEUTRAL_PROBE_SAFE", json.dumps({p: sha(PROBE / p) for p in sorted(files)}))

def verify_candidate():
    assert SITE.is_dir(), "run scripts/build_rc1_private_site.py first"
    summary = json.loads((BUILD / "build-summary.json").read_text("utf-8"))
    manifest = json.loads((BUILD / "manifest.json").read_text("utf-8"))
    assert summary["version"] == "DEMO-MK-RC1-20261027"
    assert summary["screens_not_reauthored"] is True
    assert summary["site_visibility_required"] == "SSO_TEAM_LOGIN_FOR_ALL_DEPLOYS"
    entries = {x["path"]: x for x in manifest}
    assert REQUIRED.issubset(entries), REQUIRED - entries.keys()
    assert len(entries) == summary["root_files"] and len(entries) > 50
    for rel, x in entries.items():
        path = Path(rel)
        assert not (set(s.lower() for s in path.parts) & FORBIDDEN_PARTS), rel
        assert path.suffix.lower() not in FORBIDDEN_SUFFIXES, rel
        p = SITE / path
        assert p.is_file() and not p.is_symlink(), rel
        assert p.stat().st_size == x["bytes"] and sha(p) == x["sha256"], rel
    assert {str(p.relative_to(SITE)) for p in SITE.rglob("*") if p.is_file()} == set(entries)
    report = {
        "task": "DEPLOY-MIGRATE-01",
        "candidate_rc1_static_package": "PASS",
        "file_count": len(entries),
        "source_version": summary["version"],
        "contains_private_product_assets": True,
        "cloudbase_upload": "NOT_PERFORMED",
        "cloudbase_live_url": None,
        "cloudbase_private_auth": "NOT_VERIFIED",
        "default_domain_bypass_test": "NOT_TESTED",
        "main_release_gate": "HOLD",
    }
    BUILD.mkdir(parents=True, exist_ok=True)
    (BUILD / "cloudbase-migration-preflight.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), "utf-8"
    )
    print("CLOUDBASE_RC1_CANDIDATE_OFFLINE_PASS", json.dumps(report, ensure_ascii=False))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("kind", choices=["probe", "candidate", "all"])
    args = parser.parse_args()
    if args.kind in ("probe", "all"):
        verify_probe()
    if args.kind in ("candidate", "all"):
        verify_candidate()
