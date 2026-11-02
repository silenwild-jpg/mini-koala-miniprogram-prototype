# RC2-MERGE-PREP-02｜S01 四筛选替换、H01 原件核验及门禁验收

日期：2026-11-02｜基线：PR #36｜交付：PR #37（Draft，base PR #36 隔离分支）

## 最新业务与视觉裁定
用户明确指定：用「排序／距离／价格／服务」四栏**替换** S01 A/R2 的「区域／容量／租期」三栏及顶部搜索条。此前提议仅用右上角···承接全部筛选的方案已被新裁定覆盖。

此次最小实现：
- S01 R2 原顶部搜索区删除，原三个筛选替换成四个等宽入口；不新建卡片、浮层堆叠或其他页面结构。
- 右上导航的原「···」改为可聚焦的搜索入口，进入原中央同源门店搜索逻辑；搜索输入、清除和无结果状态可用。
- 「排序」复用综合排序／距离优先／价格优先；「距离」在未验证位置来源时阻止并提示，不伪造公里数；「价格」保留手机号验证和租期确认门禁；「服务」保持原服务筛选。
- 旧「区域／容量」筛选因被新的四栏替代，会清理之前 Session 留存的不可见隐藏筛选条件，避免结果被暗中缩减；容量/租期仍可通过已存在的需求修改和 S5 主链调整，不再提供三栏独立入口。
- 原 S01 A/R2 两张 WebP 的 Git Blob SHA 未变；门店卡及业务数据未改；旧 RC1-P1 与原 PR #33 视觉及冻结证据仍独立保留。

## H01 视觉实体接收结果
- 核验对象：最新已批准 H01 HIFI-06，历史交接名称 `BR01_H01_HIFI_06.zip`，记录称含完整 HTML 与 7 张 WebP。
- GitHub PR #34 只包含旧静态路径适配器和交接文档，未包含 HIFI-06 HTML / WebP；已授权 Project/Library 可读文件及 Canva 标题检索未找到原件。
- H01 源文件 **SOURCE_NOT_MOUNTED**，不能声称已接收、试装、核对 SHA 或冻结。当前分支上的旧 `home.html` Blob SHA 由静态门禁锁定，与 PR #36 基线一致，防止误用旧首页冒充新母版。
- 后续需用户提供原 ZIP，或将完全相同的 HIFI-06 HTML + WebP 上传至可访问的私有 GitHub 分支；收到之后才能逐文件 SHA、375/390 双尺寸对照、关键热点和页面状态签收。

## CI 实际证据
- 专项动作：[GitHub Actions #41405807181](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/41405807181)：
  - `isolated-contract` SUCCESS：四栏结构、旧搜索条移除、导航更多搜索、旧隐藏筛选清零、U01/Q01 排除、WebP/H01 原基线 SHA 保留。
  - `isolated-browser` SUCCESS：真实 Chromium 375×812 与 390×844；搜索从「···」打开、搜索无结果/恢复、排序选择、未验证距离阻断、服务筛选/清除、价格前手机号与租期门禁、S01→O01 模拟支付→O03；两尺寸 JavaScript 致命错误 0；旧 01C/01D 租后及完整主链两尺寸复跑 PASS。
  - 截图、双尺寸 JSON 与原业务流程：[私有 Artifact #13123317341](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/41405807181/artifacts/13123317341)。
  - `release-gate-hold` **FAIL（按设计）**：缺 H01 最新原图实体、HTML/WebP SHA、RC2 部署身份和正式归并/发布授权。阻断报告：[Artifact #13123107372](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/41405807181/artifacts/13123107372)。
- CI 结构将 isolated 功能 QA 与 Release Eligibility 分开；**QA PASS 不代表 RC2 发布 PASS**。
- 原 RC1-P1 冻结/PR #33 自有版本门禁未改；PR #37 仍 Draft，不能自动合并 main 或私有站部署。

## 未关闭
1. **P0**：H01 最新批准的原始 HIFI-06 HTML + 7 WebP 仍未物理接收或经 SHA 审计。
2. **P0**：RC2 独立版本部署 Commit 未锁定；最终发布门禁按设计 HOLD。
3. **P1**：S01 四筛选替换后布局虽通过双尺寸自动化可用性与溢出检查，仍需与最新选定视觉进行人工逐区评审；这是用户批准的结构变更，不再把原 A/R2 三栏视为最高结构约束。
4. **P1**：CAP、ITEMS、AI/顾问完整真实填报到 S5，以及 MK 全门店完整结果与原图双尺寸人工对照，需后续集中回归。
5. **P2**：普通浏览器演示的授权和 `review=1` 非生产后台鉴权，本阶段不做正式开发交付。

## 归并决定
**PR #37 隔离 S01 四筛选功能 QA PASS；H01 视觉接收 HOLD；PR #36→main 中央归并 HOLD。**
下一步：`RC2-MERGE-PREP-03｜H01 HIFI-06 实体接收及双尺寸原图验收、S01 四筛选同状态人工视觉核对、RC2 版本身份核实`。
