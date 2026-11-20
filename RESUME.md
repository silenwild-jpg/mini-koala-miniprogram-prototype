# 迁移恢复检查点｜2026-11-20

执行状态：**因切换电脑停止在交接点，不启动下一批工作。** 本文件是恢复入口，先读它，再读[项目控制中心](docs/PROJECT_CONTROL_CENTER_01_20261113.md)和[Claude交接入口](wx-native/docs/collab/COLLAB-SETUP-01/HANDOFF_TO_CLAUDE.md)。

## 最新决定与职责

- 用户最新决定：**目标是现有视觉统一升级；本轮使用微信开发者工具。** 不是只修8项后宣布全站升级完成，也不是本轮要求实际iOS/Android手机测试。证据环境标sim，不冒充实际手机通过。
- Claude负责代码与视觉独立评审、冻结设计来源；Codex负责代码开发、工具/测试、微信开发者工具操作与截图。保持运行时代码单写者，Codex不写Claude评审目录或分支。
- 保留现有业务规则与信息密度要求；容量差额、组合事实、仓号、价格口径及行动不能为压缩卡片而隐藏。共享组件/全局变更先交约定独立评审，再逐域实施。
- 用户负责业务与视觉裁定、最终签收、归并与发布。未授权自行合并main或上传体验版。双方没有已配置的自动后台互相唤醒机制。

## 精确版本

| 用途 | 完整值 |
|---|---|
| 仓库 | https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype.git |
| 实施分支 | `codex/inventory-display-density-20261120` |
| 迁移内容快照SHA | `451a3a015ab90af42969a588fad9d3ec8fd5f99b` |
| 迁移前完整实现/证据交付SHA | `ccc9b1569b4ceac4f5bd955b9d7906d55b32de6b` |
| 最终运行时及技术测试SHA | `f1deabe80ab9546b719f6ad0b281b611de6034fd` |
| 运行时树 | `5f80f0d3260e405dc54863bfe16fd08fbba9e694` |
| 复用截图来源SHA | `fa7e5668d9b3cf9524271cbbb3ddb958d6890cd3` |
| Claude评审分支 | `claude/review-76916af` |
| 已读取评审提交SHA | `7b5634af2bc2d59a1379e30987f73d83b0b2bcd1` |
| 规则基线分支 | `feat/wx-native-rule-baseline-20261120` |
| 已核实规则基线SHA | `6d34a4ab0c8f539cdefe6d8eeb0f5f4b59fd1a8e` |
| Draft PR | https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/221 |

迁移内容快照与分支HEAD之间允许有一条仅记录该快照完整SHA的封口提交；最终交棒回报会给出封口HEAD完整SHA，并核对与远程一致。不要要求文档嵌入“包含自身的提交SHA”而制造循环。新电脑以最终交棒SHA/远程HEAD核对，同时核验上述运行时树没有变化。

## 当前任务和完成状态

当前任务是`MIGRATION-CHECKPOINT-20261120`，只做安全停机检查、回执保存、提交推送及迁移记录。业务工作停在`COLLAB-SETUP-01`交付、等待Claude独立复核；没有启动下一轮01C或全站推广。

已完成的代码与技术验证：

- R76-01裸色值令牌化；验证器补原Python静态检查与订单冒烟，旧有限Node静态报告口径已澄清，不改写历史。
- 门店按钮默认184px挤压最终以局部max-width限制解决；375/390下地址185.7/198.7逻辑像素、分享56/58、看仓64/66，存取时间单行。
- 看仓手机号错误紧邻输入框并有错误线/原生focus标记，新增2项保留输入及线索边界回归。
- `f1deabe`：166/166测试；Python静态0错误；35页/22组件/6620模拟调用0异常；订单6单/54页加载/960调用0异常；60个WXML模板编译通过。
- 迁移前交付`ccc9b15`的GitHub视觉治理检查成功；人工视觉签收仍HOLD。检查记录：https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/44729206429/job/136264307370 。检查点文档提交如触发既有治理CI，不等于开启新业务测试批次。

已保存截图与回执：

- [当前截图索引](wx-native/evidence/next-stage-20261120/COLLAB-SETUP-01/f1deabe80ab9546b719f6ad0b281b611de6034fd/shots.csv)21行：12张小样及补充证据，18自检PASS、2FAIL、1NOT_CHECKED。
- 其中14图保留fa7e566原SHA，附420文件相同、仅S02样式不同的复用证明；当前SHA新采集S02三态双尺寸6图及点击前1图。没有把复用图改标当前SHA。
- [完整原生汇总](wx-native/evidence/next-stage-20261120/COLLAB-SETUP-01/f1deabe80ab9546b719f6ad0b281b611de6034fd/native-verification.json)、同目录source-manifest、原始回执、技术日志、失败记录和自检哈希均已归档。
- f125158历史最终24图已补shots.csv，原文件名和图像保留。中间候选的错误fixture、缓存首页与布局失败图没有删除或算作通过。
- 迁移审计与文件哈希见[迁移证据目录](wx-native/evidence/migration-checkpoint-20261120/)。本次只做文件/索引核验，不重新运行上述业务测试。

## 8条评审处置（5修复、3延后）

“FIXED”是Codex实施方处置，仍待Claude接受，不表示独立评审关闭。完整表：[review-dispositions.csv](wx-native/docs/collab/COLLAB-SETUP-01/review-dispositions.csv)。

| ID | 当前处置 | 已做 / 未做 |
|---|---|---|
| R76-01 P1 | FIXED | 裸色值改令牌；原Python检查0错误；旧报告来源已说明 |
| R76-02 P2 | FIXED | S02地址宽度恢复；375/390截图和实测已保存 |
| R76-03 P2 | FIXED | 存取时间不拆行，与收藏/分享分离；实测保存 |
| R76-04 P2 | FIXED | 手机号就地提示、错误线、focus；输入保留测试通过；任意深滚动/真实键盘尚未证明 |
| R76-05 P2 | DEFERRED | DPR与捕获比例已登记，仍未达到1:1；缺冻结稿design_ref/规则ID映射 |
| R76-06 P2 | DEFERRED | 375边缘尝试未观察到关闭，映射/本机输入影响未排除；中心对照中断；390未继续 |
| R76-07 P3 | DEFERRED | `.mk-note`正常说明语义类仅提案，等Claude评审后推广 |
| R76-08 P2 | FIXED | 协作协议登记，补登录/其他租期/需求修改三类调用图；后续共享变更先评约定 |

新增观察CSET-01：两张O01画面显示2026-11-21，与请求URL中2026-12-01不一致，已记自检FAIL。尚未排除工具传参、页面状态或组件绑定，不能直接判为业务回归。后续核对page.options、页面_date、cardOrder.lease.start及控件值。见[新增观察](wx-native/docs/collab/COLLAB-SETUP-01/NEW_OBSERVATIONS.md)。

## 运行任务与工具限制

- 本次迁移核对本工作区Node/Python/WCC测试及PowerShell测试包装进程：0个匹配项，不需要误杀其他应用。具体时间与范围见process-audit.json；未启动新测试。
- 上轮已通过公开关闭方法和导航清理至普通门店页；不把清理当点击测试通过。本次未重新操作微信工具，当前UI未复查，应用本身不作为遗留测试进程关闭。
- 本机为Windows。已用Node v24.22.1、Python3.12.14、微信开发者工具2.02.2611192 Nightly、基础库3.5.8、wechatide-skill0.3.18；不是要求在另一电脑复制这些程序目录。
- 工程AppID为`wx54ad163db2e41201`，工程目录`wx-native/miniprogram`。AppID不是上传密钥；不要复制账号令牌、上传.key、系统凭据或旧电脑认证缓存进仓库。
- 微信CLI必须在可访问本机桌面的非沙箱上下文运行；新电脑先按工具skill核对版本、登录和工程路径。不因本次已通过而跳过新环境核对。
- 当前截图原图345×748/359×777，对应逻辑屏375×812/390×844，DPR3单列，捕获约0.92；设置100%后的诊断仍未达1:1，禁止放大后冒充原图。
- 坐标点击API曾返回`App.CDPEnable unimplemented`；桌面边缘尝试未确认，中心对照被本机输入检测中断。不可据尺寸测量宣称实际命中通过。
- GitHub连接器当时通信失败，本机未安装gh；Git与GitHub REST可用。PR脚本复用Git已有认证，不打印或写出凭据；新电脑需自行完成正常认证，不搬运密钥。
- `127.0.0.1:8686`只是旧电脑用户确认过的代理端口，新电脑必须重新核实，不硬套；旧7892拒绝为历史。
- 部分工具脚本有Windows安装路径，迁移后先只读核对路径。仍是mock，真实鉴权/SMS/支付/CRM、实际手机、读屏、键盘和全状态均未验收。
- 上游问题CSV的R76-01含未转义逗号，标准CSV读取12列而表头9列；保留原件，自动处置读取本项目合法的8行处置表，不盲目解析原表。

## 新电脑恢复步骤（此处仅记录，不在旧电脑执行）

1. 从GitHub重新clone指定分支到普通新目录。当前活动目录是worktree，其`.git`文件指向旧电脑`content-close-01c/.git/worktrees/...`，不能仅复制这段路径作为独立仓库使用。
2. `git fetch origin`；核对`git rev-parse HEAD`、`git ls-remote origin refs/heads/codex/inventory-display-density-20261120`与最终交棒完整SHA一致；若有人又推新提交，先检查差异，不强制覆盖或reset。
3. 核验运行时树：`git rev-parse HEAD:wx-native/miniprogram`应为上表值；核对artifact-manifest、source-manifest和截图哈希。先保留既有结果，不为迁移盲目全量重跑。
4. 读取本文件、AGENTS、控制中心、STATUS、G_TECH/G_VIS、处置表及Claude交接入口。需要评审原件时再只读fetch `claude/review-76916af`，不合并或往该分支提交。
5. 正常配置新电脑GitHub认证、微信工具和本地代理；导入`wx-native/miniprogram`。不把旧电脑绝对路径、token、私钥或缓存拷进Git。
6. 确认用户恢复指令后，再触发Claude对实际交付head的独立评审，或先处理证据缺口和CSET-01；之后才推进01C动态状态与分域视觉统一升级。本检查点不自动开启该工作。

未合并main、未冻结发布、未上传体验版、未部署。无关`qa.zip`、`wx-native.zip`仍只在旧电脑本地未跟踪，不属于迁移交付，不删除也不上传。
