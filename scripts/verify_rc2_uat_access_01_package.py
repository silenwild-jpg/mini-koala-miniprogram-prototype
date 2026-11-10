#!/usr/bin/env python3
"""RC2 UAT offline bundle identity gate. Does NOT deploy anything."""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "release-evidence" / "rc2-merge-prep-10"
SITE = BUILD / "site"
EVIDENCE = ROOT / "release-evidence" / "rc2-uat-access-01"
ARCHIVE = BUILD / os.environ.get("RC2_BUNDLE_ARCHIVE", "MiniKoala_RC2_UAT_PR96.zip")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fail(message: str) -> None:
    raise SystemExit("RC2_UAT_PACKAGE_GATE_FAIL: " + message)


def main() -> None:
    git_sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    identity_path = SITE / "rc2-uat-version.json"
    if not identity_path.is_file():
        fail("Missing public version identity.")
    identity = json.loads(identity_path.read_text("utf-8"))
    summary = json.loads((BUILD / "build-summary.json").read_text("utf-8"))
    manifest = json.loads((BUILD / "manifest.json").read_text("utf-8"))
    expected_branch = "integration/rc2-rebaseline-01-20261110"

    checks = {
        "SHA matches immutable checkout": identity["source_sha"] == summary["commit"] == git_sha,
        "UAT identity source chain": identity["source_pr"] == 96
        and identity["source_branch"] == expected_branch,
        "review stage is explicit": identity["stage"] == "RC2-UAT-ACCESS-01"
        and identity["release_status"] == "ISOLATED_REVIEW_NOT_MAIN",
        "no false signoff": identity["human_uat_signed_off"] is False
        and identity["backend_crm_wechat_verified"] is False,
        "H01 master is frozen": summary["hifi06"] == "ABANDONED_NOT_BUNDLED"
        and summary["main_merge_allowed"] is False
        and summary["deployment_allowed"] is False,
        "public bundle version visible": git_sha[:12] in (SITE / "index.html").read_text("utf-8"),
        "robots no-index": "Disallow: /" in (SITE / "robots.txt").read_text("utf-8"),
        "customer flows exist": all((SITE / p).is_file() for p in (
            "central-review-02g.html",
            "prototype/parallel/core-journey-fix-01/demo/s01-r2-live.html",
            "prototype/parallel/core-journey-fix-01/demo/br04/reserve/index.html",
            "prototype/parallel/core-journey-fix-01/demo/br04/s5/index.html",
            "prototype/parallel/core-journey-fix-01/demo/br04/o01/index.html",
            "prototype/parallel/core-journey-fix-01/demo/br04/quick/index.html",
        )),
    }
    if not all(checks.values()):
        fail("Source identity/policy check failed: " + repr(checks))
    if not ARCHIVE.exists():
        fail("Review ZIP not generated.")

    expected_files = {
        p.relative_to(SITE).as_posix(): p
        for p in SITE.rglob("*") if p.is_file()
    }
    expected_manifest = {f["path"]: f for f in manifest}
    if set(expected_manifest) != set(expected_files):
        fail("Manifest does not match generated site files.")
    if any(digest(expected_files[k].read_bytes()) != v["sha256"] for k, v in expected_manifest.items()):
        fail("One or more site files differ from the SHA manifest.")

    with ZipFile(ARCHIVE, "r") as z:
        entries = {n for n in z.namelist() if not n.endswith("/")}
        if entries != set(expected_files):
            fail("Upload ZIP and site directory file sets differ.")
        for name in entries:
            if name.startswith("/") or ".." in Path(name).parts:
                fail("Unsafe path inside archive: " + name)
            if digest(z.read(name)) != expected_manifest[name]["sha256"]:
                fail("Upload ZIP file digest differs: " + name)
        archive_identity = json.loads(z.read("rc2-uat-version.json"))
        if archive_identity != identity:
            fail("ZIP SHA identity mismatches site.")

    EVIDENCE.mkdir(parents=True, exist_ok=True)
    receipt = {
        "stage": "RC2-UAT-ACCESS-01",
        "repository": "silenwild-jpg/mini-koala-miniprogram-prototype",
        "candidate_pr": 96,
        "head_sha": git_sha,
        "branch": expected_branch,
        "review_site_id": "bc2df934-a53b-4b99-b751-810b8781577f",
        "netlify_project_created": True,
        "netlify_deployed": False,
        "netlify_access_verified": False,
        "human_uat_performed": False,
        "source_checks": checks,
        "zip_filename": ARCHIVE.name,
        "zip_sha256": digest(ARCHIVE.read_bytes()),
        "files": len(entries),
        "total_bytes_unpacked": sum(f["bytes"] for f in manifest),
        "recommendation": "Manual upload to the NEW SSO-protected Netlify project; then open /rc2-uat-version.json and compare source_sha with this receipt.",
    }
    (EVIDENCE / "package-receipt.json").write_text(
        json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", "utf-8"
    )
    print("RC2_UAT_ACCESS_01_PACKAGE_GATE_PASS", json.dumps(receipt, ensure_ascii=False))


if __name__ == "__main__":
    main()
