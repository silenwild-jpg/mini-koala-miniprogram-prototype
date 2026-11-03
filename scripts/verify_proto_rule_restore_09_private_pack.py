#!/usr/bin/env python3
"""RESTORE-09: verify the self-contained, NOT-DEPLOYED RC2 internal review ZIP.
Requires scripts/build_rc2_isolated_demo.py to have run first.
"""
from __future__ import annotations
import hashlib, json, os, re, subprocess, zipfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
BASELINE = "ac83603dc20be2de53f7e27a3b428ee674d54637"
OUT = REPO / "release-evidence" / "rc2-merge-prep-10"
SITE = OUT / "site"
AR = OUT / os.environ.get("RC2_BUNDLE_ARCHIVE", "MiniKoala_PROTO_RULE_RESTORE_09_PRIVATE_REVIEW_CANDIDATE_20261103.zip")
RECEIPT = REPO / "release-evidence" / "proto-rule-restore-09" / "private-candidate-preflight.json"
sha = lambda b: hashlib.sha256(b).hexdigest()
commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO, text=True).strip()
assert commit != BASELINE, "RESTORE-09 branch must have its own isolated commit"
summary = json.loads((OUT/"build-summary.json").read_text("utf-8"))
manifest = json.loads((OUT/"manifest.json").read_text("utf-8"))
approved = json.loads((REPO/"docs/PROTO_RULE_RESTORE_08_GATE.json").read_text("utf-8"))
assert summary["commit"] == commit
assert summary["deployment_allowed"] is False and summary["main_merge_allowed"] is False
assert "RESTORE-09" in summary["version"]
assert summary["archive_name"] == AR.name and summary["archive_sha256"] == sha(AR.read_bytes())
assert approved["approved_art"]["S01"]["approved_original_path"] is None, "A new visual acceptance decision cannot be automated"
assert approved["approved_art"]["H01"]["sha256"] == "30749d1700c025423a4d54fb3e34e99e9516bf299fac2a2cf073a9e1b0560660"
byname = {x["path"]:x for x in manifest}
assert len(byname) == len(manifest) == summary["files"] and len(byname) > 300
required = ["index.html", "central-review-02g.html","robots.txt","_redirects",
 "prototype/parallel/core-journey-fix-01/demo/index.html",
 "prototype/parallel/core-journey-fix-01/demo/s01-r2-live.html",
 "prototype/parallel/core-journey-fix-01/demo/assets/hero_original_375.png",
 "prototype/parallel/core-journey-fix-01/demo/assets/hero_original_390.png",
 "assets/branch01/VIS-11J_用户批准唯一视觉母版.png"]
for x in required:
    assert x in byname, f"missing review entry: {x}"
body = (SITE/"central-review-02g.html").read_text("utf-8")
assert "if(page==='S01')" in body and "s01_r2=1" in body, "S01 canonical route missing"
assert (SITE/"robots.txt").read_text("utf-8").strip() == "User-agent: *\nDisallow: /"
redirects = (SITE/"_redirects").read_text("utf-8")
assert redirects.count(" 302") >= 6 and redirects.count("page=S01") >= 6
with zipfile.ZipFile(AR) as z:
    names = z.namelist()
    assert len(names) == len(manifest) and set(names) == set(byname)
    assert not any(name.startswith("/") or ".." in Path(name).parts for name in names)
    for name in names:
        assert sha(z.read(name)) == byname[name]["sha256"], f"zip manifest mismatch {name}"
    assert z.read("assets/branch01/VIS-11J_用户批准唯一视觉母版.png") == (SITE/"assets/branch01/VIS-11J_用户批准唯一视觉母版.png").read_bytes()
    assert not any(re.search(r"(^|/)(?:\.env(?:\..+)?|id_rsa|\.git|node_modules|qa|evidence)(/|$)",name,re.I) for name in names), "private development material copied"
    assert not any(re.search(r"u01.*\.html$",name,re.I) for name in names), "retired U01 page in candidate"
receipt = {
    "task":"PROTO-RULE-RESTORE-09","source_parent_pr":54,"source_parent_sha":BASELINE,
    "review_candidate_sha":commit,"bundle_label":summary["version"],"site_entry":"/index.html",
    "direct_entry":"/central-review-02g.html?catalog=sim&page=H01",
    "s01_entry":"/central-review-02g.html?catalog=sim&page=S01&s01_r2=1",
    "site_files":len(manifest),"archive_bytes":AR.stat().st_size,"archive_sha256":sha(AR.read_bytes()),
    "approved_h01_sha256":approved["approved_art"]["H01"]["sha256"],
    "s01_approved_full_image":"MISSING_HOLD",
    "source_and_zip_integrity":"PASS",
    "privacy_gates":{"robots_disallow":"PASS_NOT_ACCESS_CONTROL","netlify_sso":"EXTERNAL_SETTING_MUST_BE_VERIFIED","mobile_unauthenticated_denial":"NOT_RUN","mobile_authenticated_access":"NOT_RUN"},
    "release":{"merge_main":False,"production_deploy":False,"netlify_deploy":False,"public_access":False,"real_wechat_test":False},
    "status":"ISOLATED_BUILD_READY_ONLY"
}
RECEIPT.parent.mkdir(parents=True,exist_ok=True)
RECEIPT.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n","utf-8")
print("PROTO_RULE_RESTORE_09_BUNDLE_VERIFY_PASS",json.dumps(receipt,ensure_ascii=False))
