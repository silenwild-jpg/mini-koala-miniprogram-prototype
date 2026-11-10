#!/usr/bin/env python3
"""Fail-closed gate for the dedicated RC2 UAT Netlify Git build.

Never deploy a changed, unapproved app tree or to an unexpected Netlify site.
This is a static-prototype deployment gate, not a production business signoff.
"""
from __future__ import annotations

import json
import os
import subprocess

APPROVED_PR_SHA = "a6b5e7c70b7b44b699369218c2b2ee67401d5c81"
APPROVED_APP_TREE_SHA = "6f96d6dc95c0669aa571e260ff18d0ca097cc3cf"
BRANCH = "uat/rc2-pr96-20261110"
NETLIFY_SITE_ID = "bc2df934-a53b-4b99-b751-810b8781577f"


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], text=True).strip()


def main() -> None:
    actual_tree = git("rev-parse", "HEAD:app")
    actual_head = git("rev-parse", "HEAD")
    checks = {
        "frozen_app_tree": actual_tree == APPROVED_APP_TREE_SHA,
        "branch_context": not os.getenv("BRANCH") or os.environ["BRANCH"] == BRANCH,
        "netlify_site": not os.getenv("SITE_ID") or os.environ["SITE_ID"] == NETLIFY_SITE_ID,
        "production_context_only": not os.getenv("CONTEXT") or os.environ["CONTEXT"] == "production",
        "bundle_branch": os.getenv("RC2_BUNDLE_BRANCH") == BRANCH,
        "expected_source_pr": os.getenv("RC2_APPROVED_CANDIDATE_SHA") == APPROVED_PR_SHA,
        "expected_tree_environment": os.getenv("RC2_APPROVED_APP_TREE") == APPROVED_APP_TREE_SHA,
    }
    print("RC2_NETLIFY_UAT_CD_SOURCE_CHECK", json.dumps({
        "checks": checks,
        "current_deployment_sha": actual_head,
        "approved_pr_sha": APPROVED_PR_SHA,
        "current_app_tree_sha": actual_tree,
        "branch": BRANCH,
        "site_id": NETLIFY_SITE_ID,
        "human_uat_signed_off": False,
    }, ensure_ascii=False))
    if not all(checks.values()):
        raise SystemExit("RC2_NETLIFY_UAT_CD_BLOCKED: wrong source, branch, site, or deployment context")


if __name__ == "__main__":
    main()
