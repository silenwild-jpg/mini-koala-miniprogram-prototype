# 视觉规范 v2（增量，2026-11-20）

在冻结稿令牌（W28，94 项）上做增量，**不改**品牌色、字号阶梯、间距、圆角。本文件每一条都还没有经张坤裁定，统一留到最终裁定（清单见 `../collab/V2-FOUNDATION/PENDING_RULINGS.csv`）。
本文件里的效果只在 Linux 近似预览里看过，没有在微信开发者工具或真机上验证。

## 1. 文字颜色分四级

| 角色 | 令牌 | 色值 | 白底对比度 | 用在哪 |
|---|---|---|---|---|
| 主要 | `ink-primary` | #1F2A24 | 14.84 | 标题、正文、金额 |
| 次级 | `ink-secondary` | #5F6B65 | 5.56 | 13px 说明、标签文字 |
| 辅助（新增） | `ink-hint` | #66716B | 5.07（浅灰底 4.72，浅绿底 4.54） | 12px 但需要读的说明：价格口径、协议提示、列表副文 |
| 弱化 | `ink-tertiary` | #8A948F | 3.13 | 只用于占位文字、禁用、划线价、装饰性图标 |

改动：`.mk-mute` 从 `ink-tertiary` 改为 `ink-hint`（全站 44 处用到）；另有 4 个页面类同步改（`.ac-soft`、`.ac-fine`、`.qk-hint`、`.mt-muted`）。原因是 01A 审计 A02：3.13:1 的灰字被用在正常说明上。

## 2. 文字角色类（新增，旧类继续有效）

`mk-t-display`（24 粗）、`mk-t-title`（16 半粗）、`mk-t-body`（14）、`mk-t-caption`（13 次级色）、`mk-t-hint`（12 辅助色）、`mk-t-off`（弱化色）。新写的页面用角色类，不再逐页拼字号和字重。

## 3. 交互状态（新增）

| 令牌 / 类 | 值 | 用途 |
|---|---|---|
| `--mk-color-state-pressed` / `.mk-tap--hover` | rgba(31,42,36,0.06) | 可点的行、卡片、图标按钮的按压反馈 |
| `.mk-btn--ghostHover` | 浅绿底 | 次按钮按压 |
| `--mk-size-tapMin` / `.mk-iconbtn` | 44px（不是 rpx） | 图标按钮命中区下限 |
| `--mk-opacity-disabled` | 0.45 | 禁用态（图片、图标） |
| `--mk-radius-pill` | 999rpx | 胶囊形 |
| `--mk-z-bar / sheet / toast` | 20 / 100 / 200 | 层级 |
| `.mk-tag--error` | 错误浅底 + 错误字色 | 逾期、失败类标签 |

## 4. 图标

- 唯一来源：`wx-native/design-src/icons.json`（59 个图形，24 网格，描边 1.8，圆头圆角）。
- 文件由 `tools/gen_icons.py` 生成，命名 `<名称>-<色调>.svg`，只生成代码里用到的组合（现 68 个文件，原 91 个）。
- 色调 7 种，颜色取自令牌：`ink` 主要、`sub` 次级、`mute` 弱化、`brand` 品牌字色、`white` 反白、`promo` 促销字色、`error` 错误字色。
- 不再用 `currentColor`：小程序 `<image>` 里的 SVG 不继承文字颜色，会渲染成纯黑（01A 审计 A05）。原 68 个 `ic-*.svg` 统一改成 `*-ink.svg`。
- 色调用法：功能入口和列表行前图标用 `ink`；可点的动作图标（导航、电话、勾选）用 `brand`；行尾箭头、空态用 `mute` / `sub`；有开关状态的图标用形状加颜色两重区分（收藏：未收藏 `heart-sub` 线框，已收藏 `heartfill-brand` 实心）。
- 静态检查会拦：引用了不存在的图标、旧的 `ic-` 名称、磁盘文件与来源不一致、没人引用的文件、`currentColor`。

## 5. 风格层（STYLE-01，2026-11-20）

| 项 | 值 | 说明 |
|---|---|---|
| `--mk-elevation-card` | `0 0 0 1px #E3E8E5` | 卡片四周 1px 描边（冻结稿 `.card` 的 border）；原值只有底边一条线 |
| `.mk-card--float` | `--mk-elevation-float` | 悬浮卡，只用于首页双入口 |
| 首页首图 | 屏高 25%，190–230px，下方 78% 渐隐到白 | 冻结稿 `.hero`；参数在 `core/config-find.js hero` |
| 底部导航图标 | 选中 `brand-text`，未选中 `ink-secondary`，填充 `brand-tint` / `brand-tintStrong` | 来源 `design-src/tabbar`，`tools/gen_tabbar.py` 生成 81×81 PNG |

没有动：品牌色、字号阶梯、间距、圆角；首页以外的页面底色。详见 `../collab/STYLE-01/README.md`。
