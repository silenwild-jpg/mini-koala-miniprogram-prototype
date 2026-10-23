# VIS-BG-01 Change Report

2026-10-15 · **VIS-BG-01 QA REVIEW / RELEASE HOLD**

## 结论

背景色阶专项 PASS；完整 Visual QA = **PARTIAL**（既有 S5 展开态遮挡未改）。Business Regression = **NO_NEW_FAILURE**。Internal Demo Gate = **ORIGINAL READY, NEW CANDIDATE PENDING**；Formal Release Gate = **HOLD**。未经用户批准不得替换冻结演示包。

## G0 来源与隔离

唯一母版 `Mini_Koala_DEMO_PREPAY_Exception_QA_Candidate_2026-10-15.zip`，SHA `a66ca395476a21475f762c8c9ddfd8747dd4da5d2380bfd45281593335b8b5ad`。CRC PASS；794 个普通条目含 Manifest，793 个受管文件 SHA 全匹配；静态引用769项通过。源码分别解压到 `workspaces/vis_bg01_baseline`、`workspaces/vis_bg01_candidate`。原793指纹重新确认，源ZIP未变。

## G1 根因与覆盖

29 个现行业务页面各有实测背景变化；四个旧 Q02/Q03/T01/T02 兼容承接页原样保留。33入口×双尺寸均采集，29页使用对应真实业务状态；七核心页另提供总览。具体页面清单见背景审计。

H01 的 html/phone 仍被旧 `#FDFBF7` 与 `--hc-paper` 控制；U01/Q01/M01及生命周期页面的旧 `:has(#...)` 规则具有 ID 特异度，盖过后加载的 shell；shell 仅设 background-color，不能清除历史 background-image；估算 wrap 与 S1/S2/S3/S4/S7 仍有旧米白。G1_PreEdit_Findings.md 在任何运行文件编辑前生成；完整 CSSOM 匹配规则、加载顺序与祖先合成均保存。

## G2 实施与保护

运行改动仅 **一个新增 CSS + 29个HTML挂载**。html 增加 `vis-bg01` 与页面标记；head 首先声明 `@layer vis-bg01;`，最后链接专用样式。重要声明按层逆序生效，这个先声明的背景层能确定地优先于 mk-v3 与无层旧规则，不靠不断增加选择器特异度。仅设置三项 --koala-* 表面 token 与审计确认节点的背景色/背景图；没有泛 `.card/.section/.top` 强制白底，没有全局替换旧色，也没有修改旧别名体系。

页面基底 #F8FAF9；普通信息卡和导航 #FFFFFF；指定次级说明 #F3F6F4。Banner、原优惠券图、运输权益、选中推荐、库存、变价阻断、支付/退款与品牌绿色保留。M01 profile 经截图识别为品牌绿色面后撤回了白底规则；该试验结果没有进入最终候选。

764 个既有文件逐字节不变；29个HTML去除挂载后（仅统一换行与末尾换行）与母版一致，内联 JS/CSS/文案/DOM顺序保持。所有现存外部 JS/CJS、数据、图片和测试断言不变。Protected_Sources.json 提供全部保留指纹。

## G3 实测

Chrome 155.0.8059.79，真实 HTTP，375×812与390×844，DPR2、mobile/touch、zh-CN、Asia/Shanghai。首屏/中段/底端/可见展开态，背景色、背景图、祖先透明合成、DOM/bbox、console/network均留证。10106 条逐节点前后对照：1980 个目标记录符合色阶，982 个背景实测变化，未登记变化0，最终几何差异0，708条语义例外全部保留。

支付前32核心+券图2项，原版与候选分别34/34 PASS。默认40命令前后19 PASS /21历史FAIL，无新增FAIL；不改旧断言。QA事实隔离9/9。运行证据目录与最终矩阵见QA报告。

## 未完成与边界

S5券说明展开后，首卡底端进入固定底栏：375为51.75px、390为24.9375px，原版与候选完全相同；返回态间距2.25px/29.0625px也未恶化。BG06全项不能记PASS。其布局修复属于独立CARD-REF-01C，本轮不改位置、高度或JS。

D3-P1-03支付失败恢复、D3-P1-05退租确认防重保持OPEN/DEFERRED；11项历史P2保留。微信真机、真实支付、生产API、并发库存NOT TESTED。本轮不是完整可访问性审计或生产验收。

## G4 使用与回滚

完整解压候选后运行 `node tools/preview-static.cjs --port 8767`，入口 `/prototype/product_demo_hub_v1.html`。先重置Hub；异常只用包内QA入口的合法会话种子。复测 `node tools/run_prepay_browser.cjs --root . --out outputs/vis_bg01_prepay`；背景 `node tools/vis_bg01_audit.cjs --root . --out outputs/vis_bg01_background`。两命令均使用真实Chrome；不得点击实际支付。

新ZIP的CRC/Manifest/解包复验与外部SHA清单由G4脚本生成，见交付包外 Packaging.json 与 SHA256SUMS_VIS_BG_01.txt。回滚直接使用原SHA母版；本候选不改现场默认服务器或原演示包。
