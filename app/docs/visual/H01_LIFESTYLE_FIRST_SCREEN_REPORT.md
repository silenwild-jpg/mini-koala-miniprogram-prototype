# H01 生活感首屏与双任务卡 · 2026-10-13

范围：新用户首屏、服务特点、双任务卡。V1.1.1 基础规范＋首页生活感表达补充。内部工作副本，Release Gate HOLD。

## 基线与改动

02B-4 LITE 原型 + 收到的 02C-1A-3 `mk-v3-page-h01.css`。第三方最新完整快照与最新 tokens 未收到，不能声称接续其正在执行的分支。仅首页增 `mk-v3-h01-token-bridge.css`，从原有 tokens 的完整值复制 H01 作用域，共享 tokens 原文件未动。

本轮改 H01 `<head>` 挂载和 hero/任务卡局部 HTML；其他正文、内联业务脚本、所有既有外部 JS、数据、旧 CSS、O01/S01/S5 字节不变。新增首页局部 CSS 和三张 WebP 资产。hero 字号 28/36，说明 13/20，任务标题 17/24、说明和动作 13；低特异度类作用域、同一 `@layer mk-v3`。覆盖清单见 CSV，旧规则仅作候选，未赋予删除授权。本轮新增声明已登记，未宣称有实施前独立批准记录。

生活场景和考拉为内置 image_gen 生成的临时演示资产，不是门店实拍或官方 IP。Logo、胶囊与位置沿用原型。资产提示词在 assets/home-lifestyle/。

## 实际浏览器证据

云端 Chrome，HTTP；通过单个 iframe 提供真实 375×812 / 390×844 内页 viewport（DOM clientWidth/clientHeight 已记录），截图取浏览器原始 JPEG 左侧的等尺寸页面区域。没有模拟微信 UA/触屏，不能当作微信真机结果。完整截图保存原始 JPEG；整页以三个独立滚动截图组成浏览对照，不冒充单张连续长图。

双任务卡两尺寸真实点击：估算进入 S5 `entry=scene_select`；附近门店进入 S01 `entry=browse_nearby&source=home_hero`。首页位置入口仍进入 S01 位置搜索面板。帮助展开/收起已核，未实际拨号或发送客服消息。

新增区域可见文字 <12px = 0；横向越界元素 0；页面所有图片加载失败 0。下半页五个模块文字一致，宽高一致，y 坐标统一 +76px（首屏206px，任务卡144px）；业务价格 65/85/102 和仓位、容量未改。正常文本色采用既有 tokens；图片左侧背景上的文案仍需真机视觉复核，未宣称全页自动对比度全部通过。

浏览器日志未观察到本站 error；有云浏览器插件的 metadata 错误，来源 chrome-extension，不归为原型错误。未具备完整网络/pageerror 探针，不宣称两项为0。

长截图 fullPage/clip 接口超时；普通 screenshot 可用，首屏两尺寸已取得并复核。不隐瞒截图工具异常。尝试拼接后发现截图与即时滚动坐标不同步，已撤下拼接图；交付独立滚动截图与对照图。

## 未覆盖与后续

仅首屏本轮验收；其他首页状态完整验收未做。常驻帮助白条48px遮挡问题未治理；新布局使门店区下移76px，首屏展示的信息相应减少，需用户评审。微信 iOS/安卓、safe-area、胶囊真实位置、字体与层兼容仍待验证。官方IP与门店实景素材以后替换。全站删除/压平与品牌荣誉审查不在本轮范围。

## 回退与启动

原始 02B-4/02C 附件未改。回退本轮：把 H01 的 hero/双任务块还原为 outputs/home_lifestyle/hero-task-before.html 并去除 mk-v3-home-lifestyle.css link；恢复基线样式仍使用本工作副本的 H01 token bridge。若第三方最新 tokens 到位，先核对其 H01 扩展再去掉桥接，不直接全站改 tokens。

在工作副本根目录执行 `python3 -m http.server 4173`，入口 `prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html?state=new&loc=precise`。双视口预览入口 `home-lifestyle-review.html`。证据在 outputs/home_lifestyle/。这是可接续工作快照，未取代历史候选 ZIP。

回归：恢复基线24/34（10失败）；本轮原runner23/34（11失败）。新增1项失败：旧 `test_ux_simplification_v1.cjs` 要求旧CTA“30秒快速报价”，与已批准的新copy冲突；未改既有QA。以只读内存方式仅替换该预期为“开始估算”，该脚本13/13通过。原state integration检查因新class字符串多出的首轮失败已修：视觉hook改data属性，保留原class字节，16/16通过。未把按新copy核对结果冒充shipped runner全部通过。

包检查独立执行，manifest保留HOLD。当前结果不能等同于第三方02B/02C环境的完整回归。

收到的 V1.1.1 规范原文已附在 spec_v1_1_1/；本次用户授权的首页生活感补充控制新增 hero/copy 表达。第三方完整 H01 覆盖账本未在所收附件中，104条声明清单仅描述本轮新增规则，不声称恢复其历史批准记录。
