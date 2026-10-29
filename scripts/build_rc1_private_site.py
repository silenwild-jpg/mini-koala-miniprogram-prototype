#!/usr/bin/env python3
"""Create a minimal, private-SSO-only RC1 static review-site bundle.
The frozen app tree is never edited; this script copies only public runtime dependencies.
"""
import hashlib
import json
import os
from subprocess import check_output
from pathlib import Path
from shutil import copy2, rmtree
from zipfile import ZipFile, ZIP_DEFLATED

REPO = Path(__file__).resolve().parents[1]
APP = REPO / "app"
OUTPUT = REPO / "release-evidence" / "merge02n"
SITE = OUTPUT / "site"
REVIEW_VERSION = os.environ.get("MK_REVIEW_VERSION", "DEMO-MK-RC1-20261027")
assert REVIEW_VERSION in {"DEMO-MK-RC1-20261027", "DEMO-MK-RC1-P1-20261029"}
ARCHIVE = OUTPUT / ("DEMO_MK_RC1_P1_Protected_Internal_Site_20261029.zip" if REVIEW_VERSION.endswith("P1-20261029") else "DEMO_MK_RC1_Protected_Internal_Site_20261027.zip")
VALID_ASSET = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg", ".gif", ".ico", ".woff", ".woff2", ".ttf", ".otf"}
VALID_RUNTIME = VALID_ASSET | {".html", ".css", ".js", ".json"}
forbidden = {"qa", "evidence", "node_modules", ".git", ".netlify", "__pycache__"}
if SITE.exists():
    rmtree(SITE)
SITE.mkdir(parents=True, exist_ok=True)


def copy_file(src: Path, rel: Path):
    if src.is_symlink() or not src.is_file():
        return False
    dest = SITE / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    copy2(src, dest)
    return True


def copy_tree(src: Path, dest: Path, allowed_extensions: set):
    n = 0
    if not src.exists():
        raise FileNotFoundError(src)
    for p in src.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in allowed_extensions:
            continue
        relparts = p.relative_to(src).parts
        if any(x.lower() in forbidden for x in relparts) or p.name.lower().startswith("readme"):
            continue
        if copy_file(p, dest / p.relative_to(src)):
            n += 1
    return n


# The central review wrapper and runtime are a strict allowlist.
assert copy_file(APP / "central-review-02g.html", Path("central-review-02g.html"))
runtime_count = copy_tree(
    APP / "prototype/parallel/core-journey-fix-01/demo",
    Path("prototype/parallel/core-journey-fix-01/demo"),
    VALID_RUNTIME,
)
app_asset_count = copy_tree(APP / "assets", Path("assets"), VALID_ASSET)
prototype_asset_count = copy_tree(APP / "prototype/assets", Path("prototype/assets"), VALID_ASSET)

# This is a new PRIVATE REVIEW LANDING SHELL, not an edit to the frozen product homepage.
landing = """<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>迷你考拉仓｜内部评审 · RC1</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f7f8f5;color:#163e31;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif}
main{max-width:580px;margin:0 auto;padding:50px 22px 60px}
h1{font-size:26px;line-height:1.35;margin:0 0 12px}
p{font-size:14px;line-height:1.7;color:#47685d}
.small{font-size:12px;color:#667d74}
a{display:block;margin:18px 0 8px;padding:15px 18px;border-radius:9px;text-decoration:none;font-weight:700}nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}nav a{margin:0;font-size:13px;font-weight:600;padding:11px 12px}h2{font-size:17px;margin:24px 0 12px}@media(max-width:350px){nav{grid-template-columns:1fr}}
.primary{background:#196847;color:white}.secondary{border:1px solid #bdcbc4;color:#196847;background:white}
hr{border:0;border-top:1px solid #d9e4df;margin:26px 0}</style></head>
<body><main><h1>迷你考拉仓 · 内部评审站</h1>
<p>DEMO-MK-RC1-20261027｜126 家历史门店 · 766 种仓型选项 · 五城市</p>
<a class="primary" data-integration="CENTRAL_DEMO_02J" href="/central-review-02g.html?catalog=mk">进入统一小程序演示（旧门店数据）</a>
<a class="secondary" href="/central-review-02g.html?catalog=sim">进入 SIM 异常及备用场景</a>
<h2>页面导航（MK 历史门店）</h2><nav aria-label="页面与状态导航">
<a class="secondary" href="/central-review-02g.html?catalog=mk&page=H01">H01 首页 · 主态</a>
<a class="secondary" href="/central-review-02g.html?catalog=mk&page=CAP">CAP 容量填写</a>
<a class="secondary" href="/central-review-02g.html?catalog=mk&page=ITEMS">物品估算</a>
<a class="secondary" href="/central-review-02g.html?catalog=mk&page=S01">S01 门店列表</a>
<a class="secondary" href="/central-review-02g.html?catalog=mk&page=S02&store=MK_BJ_E56D0702">S02 门店详情 · 示例</a>
<a class="secondary" href="/central-review-02g.html?catalog=mk&page=S5">S5 租期与推荐</a>
<a class="secondary" href="/central-review-02g.html?catalog=mk&page=BOOKING">预约用仓 · 留资态</a>
<a class="secondary" href="/central-review-02g.html?catalog=mk&page=QUICK">快捷下单 · 编辑态</a>
</nav><p class="small">确认订单 O01 必须在 S5 或快捷下单完成选仓及验证后进入；直接打开 O01 将被保护规则拦截。</p>
<hr><p>本页面仅供授权的内部业务与视觉评审。号码验证、报价、库存占用与支付均为模拟；历史价格和仓型选项不是实时正式报价或已分配的物理仓号。</p>
<p class="small">主链：H01 → CAP / S01 → S02 / S5 → O01。
演示数据及资料来自固定 GitHub RC1 基线，页面冻结视觉仍待最终签收。</p>
</main></body></html>"""
landing = landing.replace("DEMO-MK-RC1-20261027", REVIEW_VERSION)
if REVIEW_VERSION.endswith("P1-20261029"):
    landing = landing.replace("固定 GitHub RC1 基线", "受控 GitHub RC1-P1 基线")
(SITE / "index.html").write_text(landing, encoding="utf-8")
(SITE / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")
(SITE / "_headers").write_text(
    "/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n"
    "  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n"
    "  X-Frame-Options: SAMEORIGIN\n"
    "  Cache-Control: private, max-age=0, no-cache\n", encoding="utf-8"
)
# The Netlify project's SSO TEAM LOGIN restriction is the actual access control.
# Robots/headers do NOT protect a site. Never use this artifact on an unprotected domain.
must_exist = [
    "index.html", "central-review-02g.html",
    "prototype/parallel/core-journey-fix-01/demo/home.html",
    "prototype/parallel/core-journey-fix-01/demo/cap.html",
    "prototype/parallel/core-journey-fix-01/demo/items.html",
    "prototype/parallel/core-journey-fix-01/demo/index.html",
    "prototype/parallel/core-journey-fix-01/demo/fixtures.js",
    "prototype/parallel/core-journey-fix-01/demo/central-contract.js",
    "prototype/parallel/core-journey-fix-01/demo/br04/s5/index.html",
    "prototype/parallel/core-journey-fix-01/demo/br04/o01/index.html",
    "prototype/parallel/core-journey-fix-01/demo/br04/quick/index.html",
    "prototype/parallel/core-journey-fix-01/demo/br04/reserve/index.html",
]
for required in must_exist:
    assert (SITE / required).is_file(), "Missing runtime source " + required
# The compiled fixture must keep the unchanged legacy dataset counts and both namespace modes.
fixture = (SITE / "prototype/parallel/core-journey-fix-01/demo/fixtures.js").read_text("utf-8")
assert "MK_LEGACY_OPTIONS_20260929_02J" in fixture
assert "mk_active_catalog_v1" in fixture
assert len(list(SITE.rglob("*.md"))) == 0
assert not any(part.lower() in forbidden for p in SITE.rglob("*") for part in p.relative_to(SITE).parts)
payload = [
    {"path": str(p.relative_to(SITE)), "sha256": hashlib.sha256(p.read_bytes()).hexdigest(), "bytes": p.stat().st_size}
    for p in sorted(SITE.rglob("*")) if p.is_file()
]
summary = {
    "version": REVIEW_VERSION,
    "source_commit": (check_output(["git", "rev-parse", "HEAD"], cwd=REPO, text=True).strip() if REVIEW_VERSION.endswith("P1-20261029") else "285ff1529a0f756662d3f57a7f29ddab3afb07ee"),
    "site_visibility_required": "SSO_TEAM_LOGIN_FOR_ALL_DEPLOYS",
    "site_is_private_only_if_netlify_sso_is_active": True,
    "screens_not_reauthored": True,
    "root_files": len(payload),
    "runtime_files": runtime_count,
    "asset_files": app_asset_count + prototype_asset_count,
    "size_bytes": sum(x["bytes"] for x in payload),
}
OUTPUT.mkdir(parents=True, exist_ok=True)
(OUTPUT / "build-summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), "utf-8")
(OUTPUT / "manifest.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), "utf-8")
with ZipFile(ARCHIVE, "w", ZIP_DEFLATED, compresslevel=6) as z:
    for p in sorted(SITE.rglob("*")):
        if p.is_file():
            z.write(p, str(p.relative_to(SITE)))
print("REVIEW_SITE_BUILD_OK", json.dumps(summary, ensure_ascii=False))
print("REVIEW_SITE_ARCHIVE", ARCHIVE, ARCHIVE.stat().st_size)
