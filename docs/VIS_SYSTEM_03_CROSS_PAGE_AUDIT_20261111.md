# VIS-SYSTEM-03｜H01/S01/S02/S5 跨页面视觉一致性与归并风险审计
**审计日期：2026-11-11。审计性质：独立证据核验／只读分析，非视觉改版、非跨分支集成。**

## 1. 有效候选来源（不可互相覆盖）

| 页面 | 审计分支/PR | 实际截图同源SHA | 自有CI | 边界 |
|---|---|---|---|---|
| H01 | [PR #115](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/115) `feat/h01-vis-gate-07-20261111` | `59a60fa60541496e94e96cd8cb00de5592c9a0de` | [#43006450102](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43006450102) success | 首页营销母版与20状态，不触碰S5 |
| S01 | [PR #99](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/99) `feature/s01-vis-decision-02-20261111` | `41a88ebe801bd0352cc877ff30c91fa77d042f8d` | [#43014741666](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43014741666) success | S01选定匹配卡：仓号+容量+用途同组 |
| S02 | [PR #104](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/104) `fix/s02-final-review-01-20261111` | `742e2269943a91a2a4059e77107e59cea72a3b62` | [#42980288269](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/42980288269) success | 11月11日电话/地址距离/服务标签等修复 |
| S5 | [PR #101](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/101) `isolate/s5-final-rebase-01-20261111` | `3fc8853b7925690a10e9867517b746db5919a669` | [#42973649234](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/42973649234) success | 双店单仓、E存、无对比功能 |

四个PR均为 Draft，未进入共同归并SHA；**单PR的success不能替代四页同源集成测试或用户终签**。本记录写入PR#99仅作审查留档，不授予PR#99更改H01/S02/S5的权力。

## 2. 实际截图交叉核对（浏览器留档，并非静态推断）
- H01 375/390：PR#115 artifact [#13848821617](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43006450102/artifacts/13848821617)，`h01-vis-gate-07/375-new.png` 等。
- S01 375/390：PR#99 artifact [#13851633962](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43014741666/artifacts/13851633962)，`s01-user-reference-02/S01-reference-12m-375.png` 等。
- S02 375/390：PR#104 artifact [#13836559696](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/42980288269/artifacts/13836559696)，`s02-default-375.png` 等。
- S5 375/390：PR#101 artifact [#13834945843](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/42973649234/artifacts/13834945843)，`s5-final-rebase-01/two-stores-375-viewport.png` 等。
- 对照基于各自项目的原生375×812与390×844截图；**没有伪造四页单一SHA或共用运行环境**。

## 3. 问题清单与证据等级

| ID | 优先级 | 确认情况 | 证据 | 下一动作 |
|---|---|---|---|---|
| VS03-01 | P0 集成门禁 | **已确认**：四个最新页面分离在不同未合并Draft PR；PR#99包含旧版兄弟页，不可整站覆盖 | 各PR head/base及CI | 建立四页所有权表；仅将每页最小批准增量移入中央隔离候选，不复制旧基线整包 |
| VS03-02 | P1 内容规则 | **已确认**：H01真实截图出现`¥62.56/m³/月起`，违反项目已裁定人民币整数展示；`home-bridge.js`通过`presentation.cubicReference`输出 | PR#115截图与`home-bridge.js` | H01独立补丁通过展示层截断到整数，保留立方单价语义；需复核首页三卡及无价状态 |
| VS03-03 | P1 内容规则 | **已确认**：S5截图出现`月均约 ¥260`，与禁止“月均”文案冲突；`br04/bridge.js`亦包含其它`月均约`字串 | PR#101截图与`bridge.js` | S5改为整数`¥月租/月 × N个月`，并对O01/快捷下单等同类文案做全链路扫描；不更改业务定价函数 |
| VS03-04 | P1 视觉系统 | **已确认**：H01标签原样式9px暖橙/浅绿，S01展开卡11px暖橙/灰，S02页独立12px暖橙/浅绿，S5当前独立11px绿色。可读性和语义色尚未全站一致 | 四分支页面CSS与截图 | 确立共享`promotion/service/attribute`语义表，布局仍可按页调整数量和容器；首页母版不未经授权重排 |
| VS03-05 | P1 源码集成 | **已确认**：PR#99的`global-store-tags.css`未出现在H01#115、S02#104、S5#101的分支文件路径中；这些页面仍有自己的旧样式 | 逐分支GitHub内容查验 | 集成时不能只移动CSS而不接入实际标签DOM/语义；双尺寸计算样式实际比对 |
| VS03-06 | P1 规则冲突待裁定 | **已确认有冲突描述**：S02#104目前真实呈现三个页签`可选仓位/服务设施/交通路线`，较早版本有移除路线及介绍类冗余的决策，而本PR描述提出暂留路线上下文 | PR#104`app.js`与S02截图；历史S02规则 | 将“门店详情是否继续保留交通路线页签”单独列为产品决策；未得到最终裁定前**不擅自删功能或增加地图内容** |
| VS03-07 | P2 视觉一致性 | **已确认**：S01整期价以绿色突出，而S5已确认匹配的整期租金以橙红突出；S02浏览态月租橙红，H01公开立方单价橙红 | 375/390首屏截图 | 区分“公开发现价”与“整期确认价”的色义；若要统一S5确认价，先在该页单独视觉探索，禁止横向套CSS |
| VS03-08 | P2 CSS清理 | **已确认存在遗留选择器**：S5#101的`style.css`保留`#s5-compare`历史CSS；`index.html`当前没有同名活跃DOM | PR#101文件内容 | 非当前可见对比功能回退证据，仅列入未来定向物理清理，不因CSS残留认定比较功能已恢复 |

**P0/P1只按项目审计与归并风险使用，不表示已出现生产故障；这是演示原型，不需要真实门店、客户、库存、定位、支付或优惠真实性验证。**

## 4. 冻结/差异边界（避免视觉防漂移误修）

| 页 | 不应强制统一的界面结构 | 跨页需保持同一语义 |
|---|---|---|
| H01 | 走廊大视觉、双任务卡、横向推荐3店，第三为灵活运营位 | 价格整数、促销优先、非装饰性可读文字、底栏标签 |
| S01 | 搜索／排序-距离-服务三筛选，匹配前两家展开仓位，第三E存，四店起紧凑 | 业务字段不删、同源仓号、整期主价与月租公式、44/48px热区 |
| S02 | 门店详情图、名称右侧导航+拨号、地址前公里数、最多5服务标签、仓位列表 | 服务语义与顺序、容量/仓号同源、48px下单、无需真地图外部校验 |
| S5 | 单行已选需求、两家各1匹配仓位、独立E存，无对比 | 整期价和具体月份公式、标签、同源门店/仓位、48px CTA |

严格区别：H01第3横滑卡是**灵活运营位**，S01第3位为**固定考拉E存**；S5中E存是推荐之外的**独立产品位**，三者不互相替代。

## 5. 建议执行顺序与门禁

1. `VIS-SYSTEM-04A` **业务表达精确补丁**：在H01#115隔离分支修正公开立方价小数，在S5#101隔离分支修正可见“月均约”；不改业务费率/真实售价；各自375/390截图与价格口径同源校验。
2. `VIS-SYSTEM-04B` **标签语义映射**：H01、S01、S02、S5统一促销/服务/属性优先级、颜色语义与基础文字可读性；各页面允许不同数量和卡形；不得默默改变H01母版几何。
3. `VIS-SYSTEM-04C` **S02路线页签冲突裁定**：确认是否删除路线上下文；同时核对导航与400电话不因结构更改丢失。
4. `RC2-CROSS-BRANCH-GATE` **统一候选隔离归并**：以明确源头提交逐页摘取，不用“把PR#99的整个旧站覆盖四页”；只有同一提交的375/390四页截屏、跨页流转、状态回归和VIS-GUARD检查通过，才提交下一次归并审议。

**审计结论**：发现确定的2项文案/价格规则冲突、3项跨页样式与来源失配、1项需要产品裁定的S02结构冲突，以及其它非阻塞清理项。四页独立QA都有成功运行，但**四页视觉统一、用户终签、统一候选归并、main、Netlify全部仍为HOLD**。
