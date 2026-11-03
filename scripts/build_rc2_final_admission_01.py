#!/usr/bin/env python3
"""Build a traceable RC2 reviewer ZIP without touching Netlify or main."""
from __future__ import annotations
import hashlib, json, os, shutil, subprocess, sys
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
UPSTREAM = ROOT / "release-evidence/rc2-merge-prep-10"
OUT = ROOT / "release-evidence/rc2-final-admission-01"
SITE = OUT / "site"
VERSION = "RC2-FINAL-ADMISSION-01-20261103"

def sha(data: bytes) -> str: return hashlib.sha256(data).hexdigest()
def git(*args: str) -> str: return subprocess.check_output(["git",*args],cwd=ROOT,text=True).strip()

def main() -> None:
    env=os.environ.copy()
    env["RC2_BUNDLE_LABEL"]=VERSION
    env["RC2_BUNDLE_BRANCH"]=git("rev-parse","--abbrev-ref","HEAD")
    env["RC2_BUNDLE_ARCHIVE"]="RC2_initial_dependency_bundle.zip"
    # Reuse previously source-locked builder, including VIS-11J immutable master and asset gate.
    subprocess.run([sys.executable,str(ROOT/"scripts/build_rc2_isolated_demo.py")],cwd=ROOT,env=env,check=True)
    if SITE.exists(): shutil.rmtree(SITE)
    shutil.copytree(UPSTREAM/"site", SITE)
    (SITE/"index.html").write_text("""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>迷你考拉仓</title><meta http-equiv="refresh" content="0;url=central-review-02g.html?catalog=sim&amp;page=H01">
<script>location.replace('central-review-02g.html?catalog=sim&page=H01')</script></head>
<body><a href="central-review-02g.html?catalog=sim&amp;page=H01">进入迷你考拉仓</a></body></html>
""","utf-8")
    # The historical CAP HTML is >1.6 MB and embeds a retired toast in an inline script.
    # Strip exactly this unused prototype message from the review build, fail if source drifts.
    cap_file=SITE/"prototype/parallel/core-journey-fix-01/demo/cap.html"
    cap_html=cap_file.read_text("utf-8")
    deprecated="notify('独立流程入口演示，实际流程由对应页面承接');"
    if cap_html.count(deprecated)!=1: raise RuntimeError("CAP_COPY_SOURCE_DRIFT")
    cap_file.write_text(cap_html.replace(deprecated,""),"utf-8")
    (SITE/"_redirects").write_text("/central-review-02g /central-review-02g.html 200\n", "utf-8")
    (SITE/"_headers").write_text("/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Referrer-Policy: strict-origin-when-cross-origin\n","utf-8")
    # Headers and robots are discoverability hints, not a substitute for Netlify SSO site protection.
    required=[
      "central-review-02g.html",
      "prototype/parallel/core-journey-fix-01/demo/index.html",
      "prototype/parallel/core-journey-fix-01/demo/s02-central.css",
      "prototype/parallel/core-journey-fix-01/demo/store-geo.js",
      "prototype/parallel/core-journey-fix-01/demo/br04/s5/index.html",
      "prototype/parallel/core-journey-fix-01/demo/assets/unit-r3/asset_manifest.json",
    ]
    for name in required:
      if not (SITE/name).is_file(): raise RuntimeError("MISSING_CRITICAL_RUNTIME "+name)
    files=[{"path":str(p.relative_to(SITE)).replace("\\","/"),"size":p.stat().st_size,"sha256":sha(p.read_bytes())}
       for p in sorted(SITE.rglob("*")) if p.is_file()]
    manifest={"version":VERSION,"commit":git("rev-parse","HEAD"),
      "runtime_source":"app/central-review-02g.html","source_chain":[63,64],
      "governance_source_pr":68,"branch":env["RC2_BUNDLE_BRANCH"],
      "historic_netlify_deploy_id":"6ae9756ecb05d0b77a21a489",
      "historic_netlify_same_bytes_verified":False,
      "visual_signoff":"HOLD","merge_to_main":"HOLD","deploy_to_uat":"HOLD",
      "asset_r4a_sha_confirmed":False,"files":files}
    (OUT/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n","utf-8")
    archive=OUT/"MiniKoala_RC2_FINAL_ADMISSION_01_PRIVATE_REVIEW.zip"
    with ZipFile(archive,"w",ZIP_DEFLATED,compresslevel=6) as z:
      for p in sorted(SITE.rglob("*")):
        if p.is_file(): z.write(p,p.relative_to(SITE).as_posix())
    summary={k:v for k,v in manifest.items() if k!="files"}
    summary.update({"file_count":len(files),"zip_sha256":sha(archive.read_bytes()),"zip_bytes":archive.stat().st_size})
    (OUT/"build-summary.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2)+"\n","utf-8")
    (OUT/"SHA256SUMS.txt").write_text(summary["zip_sha256"]+"  "+archive.name+"\n","utf-8")
    print("RC2_FINAL_ADMISSION_BUNDLE_CREATED",json.dumps(summary,ensure_ascii=False))
if __name__=="__main__": main()
