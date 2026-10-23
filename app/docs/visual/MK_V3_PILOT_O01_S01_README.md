# Mini Koala — Visual V3 Pilot（O01 / S01 受控试装）· 候选包说明与启动方式

版本：`Mini_Koala_CrossBranch_UX_UI_Phase1_QA_V1_2_MKV3_Pilot_O01_S01_Candidate`（Task 02B-4，2026-10-12）
母版：`Mini_Koala_CrossBranch_UX_UI_Phase1_QA_V1_2_Candidate.zip`（sha256 `e3579ac9a285a0533133e17e5efdcca85904abf7eac0d0bacf7ccae1a0015741`）
Release Gate：**HOLD**（未变）。本包只在 O01 订单确认页与 S01 附近门店页叠加 Visual V3 试装样式；H01 首页与 S5 租期推荐**未修改**。

## 1. 本地启动（HTTP，推荐）

```
cd <解压后的包根目录>
python3 -m http.server 8080 --bind 127.0.0.1
```

然后在浏览器（建议 Chrome 设备模拟 375×812 / 390×844，DPR 2）打开：

| 页面 | URL |
|---|---|
| 入口 | `http://127.0.0.1:8080/START_HERE.html` 或 `index.html` |
| S01 附近门店（浏览态，先点「允许」定位） | `http://127.0.0.1:8080/prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html` |
| S01 需求态 | `…/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html?state=estimated&target=4.8&term=6` |
| S01 未定位态 | `…?state=unlocated` |
| O01 订单确认（**必须走真实路径**） | 先开 `http://127.0.0.1:8080/prototype/mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html?store=MK_BJ_2CDB7BEE&unit=BJ0112S01A009&sizeOption=MK_BJ_2CDB7BEE__4.72&target=4.8&term=6`，点「继续租用」进入 O01 |
| O01 直连（无报价快照，仅作「报价待确认」对照） | `…/mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html` |

Windows 可用包内 `START_DEMO.cmd`（PowerShell 启动器）。`file://` 也能打开（演示数据为 JS 内联），但验收口径统一为本地 HTTP。

## 2. 本轮新增 / 修改的文件

| 文件 | 性质 |
|---|---|
| `prototype/mk-v3-tokens.css` | 新增：`--koala-*` 扩展与 8 套旧前缀别名，仅作用于 `body.koala-ui-v1.koala-o01 / .koala-s01`，**不入层** |
| `prototype/mk-v3-components.css` | 新增：两页共用组件（页面壳 / 顶栏 / 卡壳 / Button / BottomBar / Tag / Chip / PriceBlock / FilterBar / TabBar / Sheet / Toast），唯一命名层 `@layer mk-v3` |
| `prototype/mk-v3-page-o01.css` | 新增：O01 局部规则（层内） |
| `prototype/mk-v3-page-s01.css` | 新增：S01 局部规则（层内） |
| `prototype/mk-v3-help-entry.css` | 新增：两页帮助入口（停靠顶栏 + float 兜底）样式（层内） |
| `prototype/mk-v3-s01-tags.js` | 新增：登记的非业务脚本（S01 服务标签行移到 `.store-head` 末尾；促销标签加 `.mk-promo-tag`） |
| `prototype/mk-v3-help-entry.js` | 新增：登记的非业务脚本（帮助入口停靠顶栏、可访问属性、外部点击 / Esc 关闭、float 兜底检测） |
| `prototype/mini_storage_order_o01_…html` | 仅 `<head>` 追加 4 个 `<link data-ui-system="v3">` + 1 个 `<script defer>`；`<body>` 字节不变 |
| `prototype/mini_storage_store_list_s01_…html` | 仅 `<head>` 追加 4 个 `<link data-ui-system="v3">` + 2 个 `<script defer>`；`<body>` 字节不变 |
| `qa/check_mk_v3_css_lint.py` `qa/mk_v3_pilot_probe.py` `qa/mk_v3_help_entry_probe.py` `qa/mk_v3_s01_card_check.py` `qa/mk_v3_override_ledger.py` `qa/mk_v3_business_invariants.py` `qa/mk_v3_compare_shots.py` | 新增：只读验收脚本 |
| `docs/visual/mk_v3_override_ledger.csv` | 新增：覆盖账本（1,152 条新声明预登记） |
| `docs/visual/mk_v3_pilot_baseline_hashes.json` | 新增：改动前两页 head / body 哈希 |
| `docs/visual/task02a_v1_1/*.md` | 新增：Task 02A 四份规范 V1.1（02B-4 同步版） |
| `docs/visual/MK_V3_PILOT_O01_S01_REPORT.md` | 新增：02B 试装与验收报告 |
| `docs/CHANGELOG.md` `docs/CURRENT_STATUS.md` `README_CURRENT.md` `RELEASE_MANIFEST.json` | 更新 |
| `outputs/mk_v3_02b4/` | 本轮验收证据（截图、探针 JSON、账本比对、回归日志） |

未改：全部业务 JS、数据母表、19 个旧 CSS、两页内联 `<style>`、`mini_storage_global_support_v274.js`、现有 QA 脚本、H01 / S5 及其他页面。

## 3. 回退方式

去掉两页 `<head>` 中新增的 `data-ui-system="v3"` link 与 `mk-v3-*.js` script 即回到母版视觉（body 未改，无需其它操作）；或直接以母版 ZIP 覆盖 `prototype/` 下的两个 HTML。

## 4. 验收复跑

```
python3 qa/check_mk_v3_css_lint.py                       # 静态约束
python3 qa/mk_v3_pilot_probe.py --label after --out outputs/mk_v3_rerun --port 8810   # 六态 / 真实路径 / 字号 / 对比度 / H01·S5 指纹
python3 -m http.server 8811 --bind 127.0.0.1 &  python3 qa/mk_v3_help_entry_probe.py --base http://127.0.0.1:8811/prototype/ --out outputs/mk_v3_rerun/help
python3 qa/mk_v3_override_ledger.py check --before <改前 probe.json> --after outputs/mk_v3_rerun/probe.json
python3 tools/run_regression.py                           # 既有回归（34 项）
```

需要 Python 3 + `playwright`（`pip install playwright && playwright install chromium`）。包内 6 个历史浏览器脚本硬编码 `/usr/bin/chromium`，无此路径时按 02B-0 记录用临时副本去掉 `executable_path` 运行。

## 5. 未验证

微信真机（iOS / 安卓 WebView）：`@layer`、`mask-image`、safe-area、原生日期控件、字体断行、顶栏胶囊真实位置与帮助入口 `right:96px` 的关系。本机 Chromium 通过不等于真机验收。
