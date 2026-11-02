#!/usr/bin/env python3
"""Produce an isolated, traceable RC2 internal demo ZIP; never deploy it.

Only the active central wrapper, demo runtime and required assets are copied.
The retired H01 HIFI-06 route adapter and all old release workflows are omitted.
"""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
from shutil import copy2, rmtree
from subprocess import check_output
from zipfile import ZipFile, ZIP_DEFLATED

REPO = Path(__file__).resolve().parents[1]
APP = REPO / "app"
OUT = REPO / "release-evidence" / "rc2-merge-prep-10"
SITE = OUT / "site"
ARCHIVE = OUT / os.environ.get("RC2_BUNDLE_ARCHIVE", "MiniKoala_RC2_Review_Candidate_10_20261102.zip")
RUNTIME = Path("prototype/parallel/core-journey-fix-01/demo")
ASSET_EXT = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg", ".gif", ".ico"}
EXT = ASSET_EXT | {".html", ".css", ".js", ".json"}
FORBIDDEN = {"qa", "evidence", "node_modules", ".git", ".netlify", "__pycache__"}
LABEL = os.environ.get("RC2_BUNDLE_LABEL", "RC2-ISOLATED-DEMO-CANDIDATE-10-20261102")

def git(*args: str) -> str:
    return check_output(["git", *args], cwd=REPO, text=True).strip()

def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def install(src: Path, dst: Path) -> None:
    if not src.is_file() or src.is_symlink():
        raise RuntimeError(f"MISSING_OR_SYMLINK: {src}")
    dst.parent.mkdir(parents=True, exist_ok=True)
    copy2(src, dst)

def copy_tree(source: Path, destination: Path) -> int:
    if not source.is_dir():
        raise RuntimeError(f"NO_SOURCE_TREE: {source}")
    count = 0
    for src in source.rglob("*"):
        if not src.is_file() or src.is_symlink() or src.suffix.lower() not in EXT:
            continue
        rel = src.relative_to(source)
        if any(part.lower() in FORBIDDEN for part in rel.parts):
            continue
        if "hifi_06" in src.name.lower() or "hifi-06" in src.name.lower():
            raise RuntimeError("RETIRED_HIFI06_RUNTIME_PRESENT")
        install(src, SITE / destination / rel)
        count += 1
    return count

def main() -> None:
    cfg = json.loads((REPO / "docs/RC2_MERGE_PREP_02_SOURCE_GATE.json").read_text("utf-8"))
    assert cfg["h01"]["status"] == "HIFI06_ABANDONED", "RETIRED_MASTER_MUST_NOT_RETURN"
    assert cfg["h01"]["next_final_visual"] == "H01_APPROVED_MASTER_20261102.png", "LATEST_H01_MASTER_SELECTION_MISSING"
    assert cfg["h01"]["physical_source_received"] is False, "DO_NOT_CLAIM_H01_SOURCE_IMPORTED"
    assert cfg["release"]["allow_merge_main"] is False, "MUST_NOT_ELEVATE_RELEASE_PERMISSION"
    assert cfg["release"]["allow_deploy"] is False, "MUST_NOT_ELEVATE_DEPLOY_PERMISSION"

    if SITE.exists():
        rmtree(SITE)
    SITE.mkdir(parents=True, exist_ok=True)
    install(APP / "central-review-02g.html", SITE / "central-review-02g.html")
    runtime_count = copy_tree(APP / RUNTIME, RUNTIME)
    asset_count = copy_tree(APP / "assets", Path("assets"))
    prototype_asset_count = copy_tree(APP / "prototype/assets", Path("prototype/assets"))
    assert not (SITE / "prototype/mk-h01-central-route-connect03.js").exists()

    required = [
        "central-review-02g.html", str(RUNTIME / "index.html"),
        str(RUNTIME / "home.html"), str(RUNTIME / "cap.html"),
        str(RUNTIME / "items.html"), str(RUNTIME / "s01-r2-live.html"),
        str(RUNTIME / "s01-r2-bind.js"), str(RUNTIME / "s01-r2-content.js"),
        str(RUNTIME / "central-contract.js"), str(RUNTIME / "phone-auth.js"),
        str(RUNTIME / "lifecycle-ui.js"), str(RUNTIME / "br04/s5/index.html"),
        str(RUNTIME / "br04/o01/index.html"),
    ]
    for item in required:
        if not (SITE / item).is_file() or (SITE / item).stat().st_size < 50:
            raise RuntimeError(f"RC2_RUNTIME_MISSING: {item}")
    assert not any(p.suffix.lower() == ".md" for p in SITE.rglob("*") if p.is_file())
    assert not any("mk-h01-central-route-connect03" in str(p) for p in SITE.rglob("*"))

    # Immutable visual resources remain bit-identical to their accepted original source.
    for name in ("s01-r2-a-1.webp", "s01-r2-a-2.webp"):
        key = str(Path("app") / RUNTIME / "assets" / name)
        assert git("rev-parse", "HEAD:" + key) == git("rev-parse", cfg["baseline_commit"] + ":" + key), "S01_WEBP_CHANGED: " + name
        data = (SITE / RUNTIME / "assets" / name).read_bytes()
        assert data[:4] == b"RIFF" and data[8:12] == b"WEBP"

    landing = """<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>迷你考拉仓｜RC2 隔离演示候选</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f7f9f8;color:#18352c;font:15px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}
main{max-width:590px;margin:42px auto;padding:20px 24px}h1{font-size:24px;margin:0 0 4px}
p{margin:8px 0 20px;color:#50695f}.links{display:grid;gap:10px}
a{display:block;text-decoration:none;color:#096749;background:#fff;border:1px solid #e0e9e4;border-radius:10px;padding:13px 16px;font-weight:600}
a:focus-visible{outline:2px solid #006e50}small{display:block;color:#6b7b75;margin-top:22px}
</style></head><body><main><h1>迷你考拉仓 · RC2</h1>
<p>内部隔离演示候选。此入口仅用于业务流程与视觉评审，不代表正式发布或最终视觉签收。</p>
<div class="links">
<a href="central-review-02g.html?catalog=sim&page=S01&s01_r2=1">附近门店 · S01 四筛选</a>
<a href="central-review-02g.html?catalog=sim&page=H01">首页 · 现有功能演示</a>
<a href="central-review-02g.html?catalog=sim&page=CAP">容量填写</a>
<a href="central-review-02g.html?catalog=sim&page=ITEMS">按物品与场景估算</a>
<a href="central-review-02g.html?catalog=sim&page=S5">租期与推荐</a>
<a href="central-review-02g.html?catalog=sim&page=M01">我的订单</a>
<a href="central-review-02g.html?catalog=mk&page=S01&s01_r2=1">MK 门店目录 · S01</a>
</div><small>O01 确认订单需经页面内选仓与手机号验证进入。模拟支付、续租及退租均不产生真实交易。本包请仅在受控内网或本地浏览器中使用；文件本身不提供访问控制。</small>
</main></body></html>"""
    (SITE / "index.html").write_text(landing, "utf-8")
    (SITE / "robots.txt").write_text("User-agent: *\nDisallow: /\n", "utf-8")

    manifest = [{"path": str(p.relative_to(SITE)).replace("\\", "/"), "sha256": digest(p.read_bytes()), "bytes": p.stat().st_size}
                for p in sorted(SITE.rglob("*")) if p.is_file()]
    commit = git("rev-parse", "HEAD")
    summary = {
        "version": LABEL,
        "commit": commit,
        "candidate_branch": os.environ.get("RC2_BUNDLE_BRANCH", "isolate/rc2-merge-prep-10-order-review-hifi-gate-20261102"),
        "base_pr": 44,
        "source_chain_prs": [36, 37, 39, 40, 41, 42, 43, 44],
        "retired_prs": [34, 38],
        "hifi06": "ABANDONED_NOT_BUNDLED",
        "release_status": "ISOLATED_INTERNAL_REVIEW_ONLY",
        "visual_signoff": "S01_SCREENSHOT_TECHNICAL_REVIEW_ONLY_H01_MASTER_SELECTED_SOURCE_PENDING",
        "main_merge_allowed": False,
        "deployment_allowed": False,
        "files": len(manifest),
        "runtime_files": runtime_count,
        "asset_files": asset_count + prototype_asset_count,
        "total_bytes": sum(f["bytes"] for f in manifest),
        "archive_name": ARCHIVE.name,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", "utf-8")
    (OUT / "build-summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", "utf-8")
    with ZipFile(ARCHIVE, "w", ZIP_DEFLATED, compresslevel=6) as z:
        for p in sorted(SITE.rglob("*")):
            if p.is_file():
                z.write(p, p.relative_to(SITE).as_posix())
    summary["archive_sha256"] = digest(ARCHIVE.read_bytes())
    (OUT / "build-summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", "utf-8")
    print("RC2_ISOLATED_BUNDLE_CREATED", json.dumps(summary, ensure_ascii=False))

if __name__ == "__main__":
    main()
