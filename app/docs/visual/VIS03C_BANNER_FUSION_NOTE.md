# VIS-03C · 首页品牌 Banner 与生活感视觉融合试装（2026-10-13，HOLD）

- 输入母版：Mini_Koala_VIS03B1_Help_Float_QAFix_Candidate_2026-10-13.zip（SHA-256 4e1341ead3d7a14169aeb22ea7a4e814baef75f72cd17bcad3b23c9d6c74dd60，实测一致）。
- Banner 素材（群内 2026-10-13 提供，原始字节未改，未重新生成）：
  - 品牌 Banner `assets/home-lifestyle/banner/home-banner-brand-2026-10-13.jpg`（1672×941，SHA-256 d6dbdfbd…c3b0）：迷你考拉仓 / 城市智能储物管家 / 无处安放的 都交给考拉 / 家庭闲置 · 搬家装修 · 商家备货。**候选默认使用。**
  - 双11 促销 Banner `assets/home-lifestyle/banner/home-banner-promo-double11-2026-10-13.jpg`（1672×941，SHA-256 d3379c78…c19c）：存东西 用考拉 / 2026 双11囤货大促 / 送搬运 · 特价仓 · 送租期 / 五城同享 力度翻倍。仅作对照试装，未作为默认首屏。
- 实施（方案 A「整图替换首屏」）：仅改 `prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html`（#newHero 加 `home-banner-vis03c` 类与 data-banner-variant/data-banner-fit；#heroStoragePhoto 换为 Banner 图并更新 width/height/alt；h1 与说明改为 Banner 同一文案、仅供读屏）；新增 `prototype/mk-v3-home-banner-vis03c.css`（hero-intro 按原图比例 1672/941 自适应高度、去内边距，hero-copy 视觉隐藏，图片 cover 居中；`data-banner-fit="crop-4-3"` 为对照用放大裁切规则）。服务特点条、双任务卡、推荐门店、其余模块、帮助浮窗（VIS-03B）、O01/S01/S5/U01 与共享业务脚本未动。
- 为什么不保留 HTML 可见标题：Banner 图已烧入三层文案，若再保留「附近租个独立小仓库」会出现两组同级主标题；本次把 HTML 标题改为与图一致的「城市智能储物管家」并视觉隐藏。这与 docs/visual/HOME_LIFESTYLE_SUPPLEMENT.md §6「不将整张生图作为首页背景」及 §5 标题候选「附近租个独立小仓库」存在偏离，需项目负责人裁定；本候选未改写该补充文档。
- 真实验收（本地 HTTP + Chromium，375×812 / 390×844，DPR 2）：Banner 区 343×193 / 358×201（原图比例无裁切），首屏卡 y134；双任务卡 y371–515 / y379–523，首屏完整可见；推荐门店区起点 y535 / y543（比修改前下移 19px）；图片 11/11 加载；无横向溢出；脚本错误 / 控制台错误 / 请求失败 0；「开始估算」「查看门店」「主推荐门店」跳转目标与修改前相同；帮助浮窗收起 44×44 于 (319,688)/(334,720)、展开 44×148，外部点击与 Esc 关闭回焦、客服提示层、电话路径通过；9 个滚动采样下价格/资料入口/底导碰撞 0；正文文本除 h1 与说明两处授权文案外无变化。
- 关键发现（需裁定）：Banner 为 16:9 横幅构图，按 343px 宽原比例显示时图内文字换算高度：主标题约 21.7px、副标题约 9.6px、品牌名约 7.2px、三个场景标签约 5.3px——副标题与场景标签低于 12px 可读下限。对照 4:3 放大裁切（图高 257px）主标题 29px、副标题 12.8px、场景标签 7.1px，右侧仓位 A001 与二维码被裁出画面，首屏仍完整（双任务卡 y435–579）。要让场景标签达到 12px 需把图放大到约 434px 高，双任务卡将退出首屏，超出本轮边界。
- 对照截图与数据：`outputs/vis03c_20261013/`（基线、候选 A1、对照 A2 4:3 裁切、对照 A3 双11 促销）。
- 回退：用 VIS-03B.1 原 ZIP 内层目录整体替换；或恢复 HTML 原文、删除 mk-v3-home-banner-vis03c.css 与 assets/home-lifestyle/banner/ 后重建 manifest。
- 微信真机 NOT TESTED。首页其他状态、四核心页联合链路未在本轮范围。Release Gate HOLD，统一项目母版未动。
