# VIS-03B.1 · 帮助浮窗小控件遮挡定向修复（2026-10-13，HOLD）—— 避让规则已撤回，仅保留 QA 夹具修复

- 输入候选：Mini_Koala_VIS03B_Help_Float_Port_Candidate_2026-10-13.zip（SHA-256 db1a9a98f9fe3d2025f8bbbb6da0202f9f47b028595d706143f2843f1d315fef）。
- 试验改动：仅 `prototype/mini_koala_home_visual_closeout_patch_v1.js` 的 `CRITICAL_SELECTORS` 追加 5 个经 DOM 核对的精准目标：`.featured-store .featured-go`、`.store-alt .arrow`、`.enterprise-scene em`、`#brandTrustLink`、`.home-other-scene span`。位置算法、44px 尺寸、展开逻辑、电话/客服未动。差异见 `outputs/vis03b1_20261013/WITHDRAWN_closeout_patch_v1_small_target_rule.diff`。
- 验收方法：本地 HTTP + Chromium，375×812 与 390×844、DPR 2，20px 滚动步进（79/77 个采样），收起与展开两态；逐采样记录滚动坐标、浮窗位置与上移量、各控件遮挡比例、`data-collision-unresolved`、相邻采样上移量变化。脚本 `outputs/vis03b1_20261013/vis03b1_scan.py`。
- 结果（修改前 → 修改后）：
  - 收起态：5 类小控件遮挡 100%/96%/45%/44%/47% → 全部 0；无 unresolved；但上移量在一次整页滚动中变化 16 次（375）/15 次（390），单次最大 156px 瞬移（无过渡动画）；390 在页面首屏即上移 52px。
  - 展开态（44×148）：备选门店「›」仍被遮 96%（375 共 11 个采样、390 共 12 个采样），「了解更多 ›」56%；`data-collision-unresolved` 出现 15/14 个采样；上移量变化 21/20 次，单次最大 312px。
  - 原因：门店三张卡的「›」纵向间距约 188px（实测 featured-go→alt-arrow-1→alt-arrow-2），两箭头之间净空约 160px，小于展开列 148px + 两侧 8px 安全距 = 164px；0–312px 的 7 级上移全部碰到某个箭头，算法回落到 0 并标记 unresolved。属"无法避让"，不是选择器错误。
- 裁决：按任务书规则（频繁跳动 / 无法避让 → 撤回新增规则，保留 VIS-03B 已验证版本）。本候选的运行时文件与 VIS-03B 逐字节一致。
- 保留的改动：`qa/test_home_visual_closeout_patch_v1.py` 夹具初始化修复——内联页面改用 `state=new&loc=precise` 参数（与 HTTP 验收 URL 一致），不再弹出定位权限层拦截点击；断言未删减。修复后 2/2 PASS，修复前超时失败日志在 `outputs/vis03b1_20261013/qa/`。
- 回归：VIS-03B 验收脚本在试验版上复跑，价格/资料入口/底导碰撞 0，开始估算与推荐门店跳转目标、正文文本 SHA 与 VIS-03B 一致，页面错误 0（`outputs/vis03b1_20261013/regression_after/`）。
- 后续建议（需授权）：若要彻底消除小箭头遮挡，应沿用 004B 对价格的做法——给这些右侧小控件加 56px 右侧安全区（CSS，会改变门店卡右侧布局），或给浮窗加 `bottom` 过渡动画并把展开态限制为仅在无碰撞位置展开；两者都超出本轮范围。
- 微信真机 NOT TESTED。Release Gate HOLD。
