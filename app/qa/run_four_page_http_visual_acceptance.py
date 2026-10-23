#!/usr/bin/env python3
"""Capture *real HTTP-loaded* four-page visual evidence when Chromium navigation is permitted.

No silent fallback to data:/about:blank or synthesized cards. An administrator block, missing browser,
console/runtime issue, or failed screenshot is explicitly reported; no false visual PASS.
Run from anywhere: python qa/run_four_page_http_visual_acceptance.py
Requires: pip install playwright; playwright install chromium (or --chromium PATH)
"""
from __future__ import annotations
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import shutil
import threading
from datetime import datetime
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
PAGES = {
    "H01_home_new": "prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html?state=new",
    "S01_nearby_browse": "prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html?state=browse",
    "S5_term_recommend": "prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html?entry=b2b_recommend&term=6",
    "O01_order_review": "prototype/mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html",
}
VIEWPORTS = [(375, 812), (390, 844)]

class SilentHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    ap = argparse.ArgumentParser(description="Real HTTP four-page screenshot and layout diagnostics")
    ap.add_argument("--chromium", default=os.getenv("KOALA_CHROMIUM_PATH", ""), help="Executable path; leave blank for Playwright bundled Chromium")
    ap.add_argument("--output", default=str(ROOT / "outputs" / "four_page_http_acceptance"))
    ap.add_argument("--settle-ms", type=int, default=1100)
    args = ap.parse_args()
    out = Path(args.output).resolve()
    out.mkdir(parents=True, exist_ok=True)
    data = {"protocol": "http", "source": "Confirmed UX Merge V1.1", "release_gate": "HOLD", "attempted_at": datetime.now().astimezone().isoformat(), "pages": [], "limitations": []}
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(SilentHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host = f"http://127.0.0.1:{server.server_address[1]}/"
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            launch = {"headless": True, "args": ["--no-sandbox", "--disable-dev-shm-usage"]}
            if args.chromium:
                launch["executable_path"] = args.chromium
            try:
                browser = pw.chromium.launch(**launch)
            except Exception as exc:
                data["limitations"].append("Chromium launch failed: " + str(exc).splitlines()[0])
                browser = None
            if browser:
                for width, height in VIEWPORTS:
                    context = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=1, is_mobile=True, has_touch=True)
                    for label, path in PAGES.items():
                        item = {"page": label, "width": width, "height": height, "status": "NOT_VERIFIED", "errors": []}
                        page = context.new_page()
                        page.on("pageerror", lambda e, obj=item: obj["errors"].append("JS: " + str(e)[:250]))
                        target = host + path
                        item["url"] = target
                        try:
                            response = page.goto(target, wait_until="domcontentloaded", timeout=15000)
                            item["http_status"] = response.status if response else None
                            page.wait_for_timeout(args.settle_ms)
                            item["title"] = page.title()
                            item["metrics"] = page.evaluate("""() => ({
                                viewport: innerWidth,
                                scrollWidth: document.documentElement.scrollWidth,
                                bodyScrollWidth: document.body.scrollWidth,
                                visibleButtons: [...document.querySelectorAll('button')].filter(el => {
                                    const r=el.getBoundingClientRect(), s=getComputedStyle(el);
                                    return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none';
                                }).length,
                                sharedStyleLoaded: [...document.styleSheets].some(s=>s.href && s.href.includes('mini_koala_miniprogram_ui_system_v1.css')),
                                bodyClasses: document.body.className,
                                textLength: (document.body.innerText||'').length
                            })""")
                            if item["http_status"] != 200:
                                item["errors"].append("HTTP status not 200")
                            if item["metrics"]["scrollWidth"] > width + 1:
                                item["errors"].append("Horizontal overflow")
                            if not item["metrics"]["sharedStyleLoaded"]:
                                item["errors"].append("Shared style not loaded")
                            if item["metrics"]["textLength"] < 60:
                                item["errors"].append("Page content appears empty")
                            screenshot = f"{label}_{width}x{height}.png"
                            page.screenshot(path=str(out / screenshot), full_page=True, timeout=15000, animations="disabled")
                            item["screenshot"] = screenshot
                            item["status"] = "CAPTURED_WITH_FINDINGS" if item["errors"] else "CAPTURED_NEEDS_MANUAL_REVIEW"
                        except Exception as exc:
                            item["errors"].append(str(exc).splitlines()[0])
                            item["status"] = "BLOCKED_OR_FAILED"
                        finally:
                            data["pages"].append(item)
                            page.close()
                    context.close()
                browser.close()
    except ImportError:
        data["limitations"].append("Python playwright package not installed. Run: pip install playwright")
    finally:
        server.shutdown()
        server.server_close()
    captured = sum(x["status"].startswith("CAPTURED") for x in data["pages"])
    data["capture_count"] = captured
    data["required_capture_count"] = len(VIEWPORTS) * len(PAGES)
    data["release_gate"] = "HOLD"  # Screenshots do not establish transaction or device acceptance.
    if captured != data["required_capture_count"]:
        data["limitations"].append("Required real-URL screenshots incomplete. Never substitute offline fixture screenshots as proof.")
    (out / "results.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"captured": captured, "required": data["required_capture_count"], "output": str(out), "limitations": data["limitations"]}, ensure_ascii=False))
    raise SystemExit(0 if captured == data["required_capture_count"] else 2)

if __name__ == "__main__":
    main()
