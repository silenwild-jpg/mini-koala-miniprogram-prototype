# PROJECT-OPS-RESET-01 / P1-A2｜10条main目标历史PR独有内容核验与归档候选

**日期**：2026-11-13；**来源**：GitHub PR changed filenames、每条PR head的递归Git Tree blob SHA、当前main和已签收RC2递归Git Tree、针对PR #50/#30/#28/#24的原始文档抽查。

- 对照main：`aa29e33a23ba6a37a6e2fd3843e4001d6d0524fb`（治理PR #179已合并）。
- 冻结演示候选PR #176：`41a8a079eb48049e1060512bddf71c226bfd3738`（DEMO READY，仍Draft，不合并）。
- **范围**：11条面向main的开放PR中，#176是保留的已签收业务候选；本报告只审计另外10条历史PR。
- **比较语义**：‘同SHA’是PR head树在该文件路径上的blob与当前RC2完全一致；‘内容不同’只意味着同路径字节不同，不证明独有功能未迁入；‘路径缺失’指在main和候选中**均无同路径**，不等于相同功能或文字没有以其他路径进入候选。不得把这些列等同合并裁定。

## 一、逐PR物理文件对照

| PR | 改动路径总数 | 与签收RC2同SHA | 同路径内容不同 | 双基线均无同路径 | 处置方向 |
|---|---:|---:|---:|---:|---|
| [#50](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/50) | 5 | 0 | 0 | 5 | P1｜规则来源审计 |
| [#47](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/47) | 71 | 5 | 21 | 45 | P1｜RC1/RC2隔离部署历史 |
| [#36](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/36) | 40 | 3 | 15 | 22 | P1｜旧RC2集成来源 |
| [#35](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/35) | 15 | 0 | 8 | 7 | P1｜订单生命周期来源 |
| [#33](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/33) | 21 | 3 | 10 | 8 | P1｜S01旧视觉与业务接线 |
| [#30](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/30) | 6 | 0 | 0 | 6 | P1｜未来腾讯云迁移专题 |
| [#28](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/28) | 3 | 0 | 1 | 2 | P2｜旧Netlify RC1 CD |
| [#26](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/26) | 8 | 0 | 5 | 3 | P2｜旧S01视觉母版来源 |
| [#24](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/24) | 3 | 0 | 0 | 3 | P2｜S01 R1纯静态参考 |
| [#22](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/22) | 2 | 0 | 0 | 2 | P2｜历史视觉探索 |

**共计 174 个PR改动路径记录（包含不同PR重复路径，不是去重文件总数）**。每条PR均有可追溯的独有文件或差异，因此**目前没有可在未复核其价值时直接安全关闭的PR**。

## 二、每条PR独有资产与处理门禁

### [PR #50](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/50)｜仅保存历史文档，禁止整体当作当前PRD
- **证据**：BUSINESS_RULES.md、DECISION_LOG.md、DESIGN_BASELINE.md、PRD.md、QA_MATRIX.md
- **风险与核查**：2026-11-03旧版规则与11/13决策冲突：S02旧文档主张去交通路线；BOOKING曾写联系电话可选；对演示公里数要求不同。必须逐条对照新批准结论。

### [PR #47](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/47)｜保留历史QA与部署工件；不整体合并
- **证据**：约45个两个基线均无同路径工件，主要为历史workflow、QA、docs；已签收候选有5份同SHA文件（含2张S01 WebP）。
- **风险与核查**：21个同路径文件内容不同，含app/核心JS、netlify.toml与建站脚本；未证明未迁入任何独有业务行为。

### [PR #36](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/36)｜保留来源追溯，先提取未迁移QA
- **证据**：22个两个基线均无同路径项：历史QA、workflow、H01 route桥接和审计文档；2张S01 R2 WebP同SHA。
- **风险与核查**：旧路由桥接不可以直接加入现版，需核对当前中央路由契约。

### [PR #35](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/35)｜旧版代码勿覆盖当前，补遗留回归证据
- **证据**：7份未迁入同路径：旧生命周期browser测试、工作流及文档。
- **风险与核查**：8个现有运行时代码路径内容不同；签收候选有新流程CI，但不意味着旧测试全部语义覆盖。

### [PR #33](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/33)｜保留视觉决策原件和独有QA，勿恢复旧结构
- **证据**：8项未迁入同路径：QA、workflow、早期S01视觉审计。2张S01 WebP与签收候选同SHA。
- **风险与核查**：10项同路径内容不同，包括门店和中央业务桥接；旧布局不能擅自覆盖11/13签收版。

### [PR #30](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/30)｜保留完整六份资产供后端/部署专项；暂不合并
- **证据**：CloudBase通用探针3份、workflow、离线校验脚本和可行性研究文档，全部为不同路径。
- **风险与核查**：没有CloudBase线上发布或登录鉴权验证证据。迁移须专项授权/费用、安全和备案核验。

### [PR #28](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/28)｜保留历史站点配置记录，不带入RC2构建
- **证据**：独有旧RC1 Git CD预检workflow/交接文档2份；netlify.toml同路径不同版本。
- **风险与核查**：历史RC1站有真实Netlify绑定，不允许以本PR的旧冻结配置替换当前签收RC2。

### [PR #26](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/26)｜保留审计证据；不将旧UI用于当前候选
- **证据**：S01 R2旧QA、workflow、审核说明3份不同路径。
- **风险与核查**：5项旧中央路由/列表实现内容与当前不一致，需禁止视觉回退。

### [PR #24](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/24)｜归档为历史视觉研究参考，非当前S01母版
- **证据**：独立静态HTML、原图像素审计和workflow均独有路径。
- **风险与核查**：该静态稿含旧三筛选‘全部区域/容量/租期’，并非当前批准‘排序/距离/服务’；不得复用到正式界面。

### [PR #22](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/22)｜仅保留历史方向与裁定证据
- **证据**：两份历史VIS-REBUILD方向对比文档为独有路径。
- **风险与核查**：不能将探索方案重新等同获批母版。

## 三、与当前产品冻结规则的冲突

1. **旧PRD不能直接恢复**：PR #50的`docs/PRD.md`记录2026-11-03阶段设计。当时S02建议缩减交通路线，但用户2026-11-13明确保留‘交通路线’选项卡；该部分与当前冻结规则冲突，应只作为历史。
2. **BOOKING联系电话门槛存在版本差异**：PR #50旧文档描述普通预约‘用仓地址必填、联系电话选填’，而当前已确认的BOOKING演示路径要求明确的手机号及地址门禁。须以后者为准，不用旧文档回滚已通过的流程。
3. **S01视觉变化**：PR #24早期纯静态A版使用‘全部区域/全部容量/全部租期’筛选，不能覆盖当前签收的‘排序/距离/服务’三筛选和第三运营位。
4. **演示位置口径**：PR #50旧资料排斥用户可见演示公里数，而用户已明确当前原型允许自洽、可复现的示例公里数。只保持内部可替换数据来源与真实生产区分，禁止旧文档阻断演示。
5. **CloudBase与旧Netlify是不同的部署研究**：不能在清理历史PR时丢掉PR #30可行性/安全资料，也不能直接采用PR #28旧RC1冻结脚本作为当前RC2部署逻辑。

## 四、执行顺序（当前仅形成建议，不删除、不关闭）

1. **优先转存并复核：** #50业务与视觉规则差异；#30 CloudBase部署安全与中性探针；#28旧Netlify绑定证据。建议按需求/部署专题迁移知识，不移动旧运行时。
2. **复核测试覆盖：** #35/#36/#33/#47的旧QA独有脚本，逐项判断当前RC2同SHA全站回归是否已有等价断言；仅转移有价值的场景，不直接将老工作流设为必需CI。
3. **历史视觉留存：** #22/#24/#26的视觉原件、截图、审计文档保留为已否定/早期候选，不恢复到母版。
4. **每条PR最后再决定**：保留专题、迁移知识、可归档或关闭；需要完整记录来源blob/SHA、对应主线或新专题、未迁移功能确认和操作者批准。当前没有关闭任何PR，也没有合并任何历史业务代码。

## 五、结论

**P1-A2 文件级核对完成；历史PR的‘可直接关闭’结论仍为0条。** 当前下一步是提取PR #50独有规则及PR #30/28部署知识、对旧QA场景做覆盖差异检查。届时才产生逐项可关闭建议和证据包。旧PR仍可作为来源仓库保留，减少二次迁移风险。
