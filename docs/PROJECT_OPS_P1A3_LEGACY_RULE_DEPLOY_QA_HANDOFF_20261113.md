# PROJECT-OPS-RESET-01 / P1-A3｜旧PRD、部署和QA知识保全及可归档性裁定

**审计日期：** 2026-11-13  
**唯一获签收演示版本：** PR #176，SHA `41a8a079eb48049e1060512bddf71c226bfd3738`  
**本轮源材料：** PR #50（PRD等5份文档）、#30（CloudBase）、#28（RC1 Netlify）、#35/#36/#47（历史测试/构建脚本）；与已签收RC2内相关测试脚本做实际路径与断言核对。  
**范围边界：** 知识转存；不修改运行时，不恢复旧视觉，不实际部署，不关闭PR。

## 1. PR #50 历史规则冲突与保留

来源：[#50](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/50) head `df09a340fc2fa61f4667a97c23758d19861a9ba1`，旧文件 `docs/PRD.md`、`BUSINESS_RULES.md`、`DECISION_LOG.md`、`DESIGN_BASELINE.md`、`QA_MATRIX.md`。

| 规则范围 | 旧PRD文义 | 最新有效规则 / 演示边界 | 处理 |
|---|---|---|---|
| S02结构 | 缩减长交通路线说明和交通路线模块 | 用户2026-11-13明确要求保留“交通路线”选项卡；最新S02三Tab；仅可收敛冗余长文案 | **旧规则被覆盖，禁止恢复** |
| BOOKING | 用仓地址必填、联系电话选填 | 最新BOOKING正常演示路径要求联系电话/手机号与地址必填；容量与租期可选；预约只生成线索，不建单 | **旧规则被覆盖** |
| S01距离 | 无可信位置不可展示SIM公里数 | 用户明确允许无可信定位时以稳定示例公里数充实演示；内部保持可替换数据源，不在UI增加“模拟/演示”等破坏体验的说明 | **演示规则覆盖旧口径** |
| S01筛选 | 旧PRD部分版本保留“价格”等历史探索 | 当前冻结为“排序/距离/服务”三筛选，排序菜单可含价格优先；无独立价格筛选、无“只看单仓” | **不恢复四筛选** |
| S01第三运营位 | 旧候选存在前两店展开等布局建议 | 最新S01第3位固定考拉E存，第4位起紧凑；H01第三卡为独立灵活运营位 | **以当前页面合同为准** |
| 仓位对比/U01 | 旧提案讨论轻量对比的例外 | 用户后续明确冻结删除对比功能及U01独立仓位详情，后续探索不再恢复 | **全面退役** |
| H01/CAP文案 | 旧“估算大小”“查看仓位”等 | H01“估大小算价格”、CAP“查看仓位报价”；避免旧文案回退 | **按新签收版本** |
| 手机号/报价 | 正式订单前要有验证，不能以手填替代 | 同现行门禁的有效原则仍保留；微信真实平台鉴权仍属未来后端 | **概念保留** |
| 订单价格 | 押金一月、管理费整单一次¥50、整期主价 | 同现行基线；优惠活动叠加和真实定价仍待业务确认 | **概念保留，正式细则后置** |

旧PRD中的来源/状态分层、批准视觉原件优先、按SHA验收和明确模拟/生产区分，仍有历史方法论参考价值，但现已由 `docs/PROJECT_CONTROL_CENTER_01_20261113.md`、`docs/DEMO_FIRST_DEVELOPMENT_STANDARD_01_20261113.md`、当前候选PRD/决策日志承接。**保留PR #50历史5份文档，不让其成为当前有效PRD第二事实源。**

## 2. PR #30 CloudBase知识保留（未来国内发布专项）

来源：[#30](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/30) head `307b5c8b51b19495fee93f230d9f63b89a45c34a`；原独有6文件：

- `docs/DEPLOY_MIGRATE_01_CLOUDBASE_FEASIBILITY_20261029.md`：可行性、安全和准入；
- `deploy/cloudbase/neutral-probe/index.html`、`health.json`、`robots.txt`：无业务资料的中性连通性探针；
- `.github/workflows/deploy-migrate-01-cloudbase.yml`：旧RC1安全构建/探针候选；
- `scripts/verify_cloudbase_migration.py`：离线核查脚本。

**可复用原则：** GitHub唯一源码→受控Actions构建→CloudBase国内托管；专用环境及最小权限CAM账号；Secret只能放入受保护GitHub Environment；真实人员访问认证不能由前端密码遮罩、referer/IP白名单代替；必须检查默认静态域名/CDN回源/深链接绕过；长期公网域名和备案情况需由腾讯云Owner核验。

**不能继承的假设：** 旧候选面向冻结RC1，不能直接将其workflow或旧站发布包用于已签收RC2；没有CloudBase实际远端部署、真实认证、备案及中国大陆网络实测证据。PR #30保持专题归档候选，未来需`DEPLOY-MIGRATE-02`单独验证。

**以后端/运维为责任方的交接：** CloudBase EnvId/地域/费用，备案域名及SSL，评审账号与撤权机制，网关全路径认证，默认域名匿名访问阻断，受保护GitHub Environment、Secret、发布版本SHA、回滚及375/390线上复测。

## 3. PR #28 Netlify RC1知识保留（旧站运维专题）

来源：[#28](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/28) head `6c31de5c6653f3f1b224e917dccd41b36d2cc478`；独有旧CD预检工作流和文档，`netlify.toml`不同版本。

- 旧站：`mini-koala-internal-rc1-review`；站点ID `e8bba69f-09d5-4866-842d-43c30411114e`。
- 曾以Netlify Team Login/SSO及旧RC1冻结构建为设计前提；此历史需求不等于当前RC2签收站点已经发布。
- 本轮GitHub/Netlify历史记录显示旧RC1 Netlify Deploy Preview曾因build exit 2而FAIL；这不能替代RC2全站QA的PASS，也不代表签收SHA的线上可访问性。
- 旧`netlify.toml`、RC1版本白名单、旧私有部署设置不得覆盖当前RC2原型或新环境。
- 若后续恢复旧站/迁移RC2，需单独审核Deploy commit SHA、branch、访问控制、深链、防泄漏和费用；此任务不操作Netlify。

## 4. PR #35 / #36 / #47 历史QA覆盖差异

本节比较的是**实际可读测试脚本的断言**，不是仅依据工作流名称判定测试已经被现行RC2覆盖。

| 旧来源和脚本 | 可确认历史断言 | 当前RC2证据 | 初步处理 |
|---|---|---|---|
| #35 `verify_rc2_rule_fix_01c.cjs` | 续租申请→审核报价→付款/延期→发票；退款审核只允许Review；发票重复申请拦截；续租不可超过允许上限 | `verify_rc2_final_vis_signoff_04_browser.cjs`明确覆盖续租待支付/取消/恢复/失败/成功、发票两笔真实付款筛选、正常用户无审核控制；`verify_h01_m01_flow_qa_01.cjs`覆盖多订单展示 | **部分有等价语义；旧“重复发票”和累计上限的独立断言需补专项覆盖证据**，不得声称全覆盖 |
| #35 `verify_rc2_rule_fix_01d_browser.cjs` | 手机拒绝不误进O01、不建单；支付失败；取消后恢复同一单ID无重复；S5预填走到O03 | RC2当前同SHA测试包含BOOKING/QUICK/O01与订单生命周期，原签收工作流全部PASS | **高风险场景已覆盖部分流程，但“取消→恢复同ID、不重复创建”须核实当前断言的逐项对等性** |
| #36 `verify_rc2_merge_prep_01_browser.cjs` | S01 R2过滤/切换及MK五城目录同源；旧隐藏/显式价格筛选 | 当前RC2 S01及跨城市测试PASS，但旧R2脚本包含已退役的四筛选断言 | **只保留五城同源/订单意图的测试思想，禁止迁入四筛选视觉或旧断言** |
| #47 `verify_rc2_merge_prep_04_cap_items_browser.cjs` | CAP 3m³/12个月、ITEMS 3.5m³/6个月继承S5 | 已签收RC2中存在**同路径、同blob SHA**的脚本 `044209f774881ce60343934aa8c7dd0d129b18fc` | **代码已完整保留；无需重复迁移该脚本**；是否在最新workflow实际执行以CI日志为准 |
| #47 `verify_rc2_merge_prep_07_browser.cjs` 与 `09_bundle_browser.cjs` | 两视口S01报价/距离、隔离构建完整性，且多处断言“4个filter” | 当前S01已冻结“排序/距离/服务”三个；新版Clean Migration另有构建SHA/资源/双宽验证 | **不可直接迁入旧脚本**；保留价格/构建可复现的测试思想，删除过时四筛选判据 |
| #47 `verify_rc2_merge_prep_09_source.cjs` | VIS-11J母版文件、原图SHA与HIFI06退役、U01拒绝、S01旧过滤数、源码追溯 | 新 `verify_rc2_clean_migration_01.cjs`检查获批母版路径存在、演示包身份、导航/资源引用；不能据路径存在推断原图哈希每次均被核验 | **仅补足必要的原图哈希/源版本审计；不复制过时S01四筛选值** |
| #47 `verify_rc2_merge_prep_10_order_contract.cjs` | M01/O03/续租/发票路径、状态映射、避免污染S01 CSS | 当前 `verify_h01_m01_flow_qa_01.cjs`、`verify_m01_ia_03_browser.cjs`、`verify_rc2_final_vis_signoff_04_browser.cjs`分开覆盖多订单、M01与租后状态 | **多数行为可从当前脚本追踪；保留作为历史设计证据，避免旧字符串断言阻断新版页面** |

### 推荐的最小补证任务（不是新视觉改版）

1. `QA-LEGACY-RETAIN-01`：在**新独立QA分支**核对现行RC2的“同订单取消恢复不重复建单”“重复开票拦截”“续租累计上限”“VIS-11J原图hash”是否各有可执行且同SHA的等价断言；缺失才新增定向测试，不能因旧脚本历史PASS而直接判新版PASS。
2. 仅给QA做补证和知识保全；不更改已签收`41a8...`的页面、业务状态机或设计；产生新业务SHA时须重新同SHA技术门禁及必要的产品签收。
3. 对旧workflow与脚本采用**引用式归档**，只在有效规则仍一致时提取断言；不把旧S01四筛选或旧RC1部署白名单设置为当前main必需CI。

## 5. 旧main目标PR逐项归档建议（尚未关闭）

| PR | 知识已保全 | 处理级别 | 关闭/归档条件 |
|---|---|---|---|
| #50 | 旧5份规则与已覆盖/冲突项已标注 | **待用户具体清理授权** | 记录历史文档仅供追溯，不再作为现行PRD；确认无独有政策需接入 |
| #30 | CloudBase部署安全、探针、owner依赖已提取 | **专题保留** | 国内发布方案已转入真正部署工程并核对安全文档后 |
| #28 | 旧Netlify RC1访问与CD配置已提取 | **历史运维保留** | 旧站部署引用清楚、迁移/停用方案批准之后 |
| #35 | 旧生命周期测试与待补证列出 | **QA源保留** | 补证4项高风险边界并确认无遗留需求 |
| #36 | 旧RC2/S01 R2桥接与QA归属 | **QA/来源保留** | 当前路由/五城/图源核对后方可归档 |
| #47 | 旧构建包、原图、S01四筛选过时断言 | **历史站点/QA源保留** | 旧部署用途及无独有必需资产确认后 |
| #22/#24/#26/#33 | 历史探索及S01图源/旧测试 | **视觉历史保留** | 经视觉原件和QA版本记录归档；严禁恢复旧布局 |

**结论：** 本轮完成知识级迁移与冲突标记；目前无证据支持无条件批量关闭全部历史PR。PR关闭需逐项用户明确授权；本次未关闭/删除任何历史记录。
