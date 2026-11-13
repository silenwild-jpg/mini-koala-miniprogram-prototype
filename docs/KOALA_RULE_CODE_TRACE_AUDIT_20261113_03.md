# KOALA-RULE-RECONCILE-03｜RC2代码与规则映射审计

- 审计时间：2026-11-13
- 仓库：silenwild-jpg/mini-koala-miniprogram-prototype
- PR：#176（Draft/HOLD）
- 当前HEAD：fcda81566c606d23c527071eddccdd8ccb676d6f
- 运行时回归证据基准：345ee13fe0aa576ce0a5fedd2ced682dbedf40ed
- 本轮方法：读取PR #176当前HEAD的页面/规则JS与演示fixture；检查GitHub提交比较、当前HEAD checks。未修改运行时源码，未执行浏览器人工视觉验收。

## 1. 核心发现

### CODE-01｜CAP面积换算仍将2.5m作为全局高度｜P1
证据：
- demo/space-unit.js：HEIGHT=2.5；cubicFromArea(value)=value*HEIGHT。
- demo/cap-bridge.js：putArea将面积乘2.5；单位切换和步进同步也按2.5处理。
- demo-core.js：setRequirement对㎡输入仍以area*2.5验证。
- fixtures.js：仓位实际尺寸高度并非全部2.5m。0.8/1/1.5/2m³等样本使用2m高度；3m³及以上部分样本使用2.5m。
影响：低仓型按真实尺寸面积换算会产生容量偏差。例如0.8m³样本尺寸0.8×0.5×2m，底面积0.4㎡；固定2.5m会将0.4㎡解释为1.0m³。可能改变S5/S01匹配与推荐。
裁定：与用户批准的“按仓位实际高度换算，2.5m只适用于标准仓”不一致。需将仓高作为具体仓型/仓位数据来源，不能仅修显示层；需一并调整CAP输入、单位切换、需求持久化校验及回填。
状态：CONFIRMED CODE MISMATCH；未在浏览器端复现交互影响。

### CODE-02｜租期折扣37个月边界存在整期价格倒挂｜P1 / 定价阻断
证据：fixtures.js pricing.termRules：13–36月factor=.60，37–60月factor=.55；roundRentTo=10。
按每月原价¥1,000演算：36月=¥21,600；37月=¥20,350（未计其他项）。增加一个月反而整期少¥1,250。
影响：可能诱导异常租期选择、造成报价解释与财务损失；不能把折扣单调递增直接视为价格合理。
状态：CONFIRMED CONFIGURATION RISK；正式折扣表仍待业务定价负责人确认，不应由开发擅自改档。

### CODE-03｜首页/门店卡参考月租计算没有使用最低折扣档｜P1
证据：fixtures.js计算store.teaserCubicPrice时固定使用0.65；当前termRules最低因子配置为0.55（37–60月）。
影响：与近期“未填写需求时展示最低折扣月租价格，以‘起’结尾”的裁定可能不一致。是否应展示37–60月最低月均价，需结合用户实际可选租期、促销资格和价格显示口径裁定；不得只替换常量而不处理倒挂风险。
状态：CONFIRMED CODE PATH；业务显示口径需进一步确认。

### CODE-04｜门店运营标签与促销事实源脱节｜P1
证据：fixtures.js使用operating数组按门店索引轮转分配“特价仓 / 新开门店 / 双11大促 / 免费搬运”，并写入store.operatingTag与tags。此分配不是由仓位活动、适用租期、有效期、资格或Quote决定。demoToday固定为2026-10-25。
对照：br03-policy.js的仓位特价逻辑则要求campaign配置、仓位/门店ID、版本、基础价、有效期及已确认租期。
影响：门店级轮转标签可能让用户误以为整店特价或全店送搬运；“双11大促”演示日期也与2026-11-13审计日期不一致。
裁定：PROMO-OPS-01A要求活动与门店事实/库存分离、特价仓绑定具体仓位。应移除无事实绑定的轮转促销标签，改由显式presentation fixture campaign提供，且区分store tag与unit campaign。
状态：CONFIRMED CODE MISMATCH；需定向修复并补齐四状态截图。

### CODE-05｜生命周期存在两套契约表达｜P1
证据：
- lifecycle-contract.js的normalize将支付订单统一映射为active_demo，actions标为renewal/exit/invoice NOT_BOUND、deposit READ_ONLY。
- demo-core.js另有lifecycleView、续租申请/报价/确认/付款、退租申请/验仓、押金退款模拟、发票申请等状态函数。
- m01-rebaseline-01.js依赖ctx.getLife展示active/upcoming/returning/expired、续租和退租入口。
影响：若两个契约同时参与渲染或QA，可能产生状态来源不一致；若lifecycle-contract.js未被使用，则属于过期孤立契约，仍会误导维护者。当前尚未确认该文件是否实际被加载。
状态：CONTRACT DIVERGENCE CONFIRMED；runtime impact PENDING。下一步核对script加载和调用关系，确定删除/统一/标注deprecated，不应同时维护两套生命周期定义。

### CODE-06｜M01近期删除项核验｜部分符合
证据：m01-rebaseline-01.js的assetRow以文字展示门店、仓号、容量、状态和日期，没有在该仓位条目中渲染门店环境图；这与11/12“不保留C待入仓/在租门店环境图”方向一致。
待核：primaryFromOrder仍对status=pending显示“待支付”及“继续支付”。需与用户所说“A待支付进度”原始设计块逐一比对，不能把普通订单可恢复能力误删，也不能保留被明确否决的独立进度模块。
状态：C项在该模块代码中未发现；A项需按具体UI块核验。

### CODE-07｜生命周期演示动作与真实业务能力边界｜已部分隔离
证据：demo-core.js续租报价通过review=true人工输入；付款、验仓、退款均为模拟动作；invoice状态仅SUBMITTED；refund amount=null。页面按钮明确使用“评审模拟”。
结论：与演示阶段边界基本一致；不能宣称已接真实支付、门店验仓或财务退款。历史V2.4.2报告中的QA案例不能视为当前真实业务政策。

## 2. 追溯矩阵（本轮抽查范围）

| 规则 | 代码位置 | 当前状态 | 下一步 |
|---|---|---|---|
| ㎡/m³按实际高度 | space-unit.js / cap-bridge.js / demo-core.js / fixtures.js | 不符合：全局2.5m | 修复数据驱动高度及往返状态 |
| 容量匹配统一m³ | demo-core.js setRequirement / requirementReady | 已有统一m³核心值；面积验证高度不正确 | 联动修复并回归 |
| 租期1–60个月 | demo-core.js validTerm | 代码可见 | 覆盖边界输入测试 |
| 36→37月报价连续性 | fixtures.js termRules | 不符合/存在倒挂 | 定价负责人裁定折扣表 |
| 最低折扣“起”价 | fixtures.js teaserCubicPrice | 固定0.65，与最低档0.55不一致 | 统一价格函数后核验 |
| 特价仓资格 | br03-policy.js + fixtures.js store tags | 仓位逻辑有资格门槛；门店标签仍轮转 | 清理标签双来源 |
| 续租报价确认后付款生效 | demo-core.js lifecycle* | 演示状态链已实现 | 核对跨页刷新、支付失败恢复 |
| 退租申请→验仓→押金状态 | demo-core.js lifecycle* | 演示状态链已实现 | 核对日期、访问权限与异常回滚 |
| M01环境图删除 | m01-rebaseline-01.js assetRow | 未发现环境图 | 补M01整页截图证据 |
| M01待支付进度删除 | m01-rebaseline-01.js primaryFromOrder | 普通待支付订单主卡仍在 | 对照用户指定A块，判断是否同一模块 |
| 视觉母版逐区签收 | 本轮未取得批准原图字节 | 未签收 | 恢复原件后人工比对 |

## 3. CI证据边界修正
PR #176当前HEAD为fcda815...。与完整运行时回归代码SHA 345ee13...比较，GitHub比较结果显示31个变更路径，未包含app运行时文件，但包含3个工作流、netlify.toml和多个scripts验证脚本以及文档。因此：
- 可以说app运行时代码与已测SHA保持一致（本次比较未发现app路径变化）。
- 不能说当前HEAD在所有最新工作流/验证脚本下重新跑过完整CI。
- 当前HEAD的两个新触发工作流均为SKIPPED；不是PASS。
- PR body记录的RC2完整回归在345ee13... SUCCESS，Artifact #14010822125 / #14011450466；应继续保留为运行时证据，不夸大为当前HEAD完整CI。
- 当前HEAD Netlify状态为success，但其为旧站点deploy-preview检查；不能据此证明当前UAT站已部署或允许发布。

## 4. 本轮不执行的动作
- 不修改业务定价表；
- 不删除普通待支付订单恢复能力；
- 不把模拟退款标记为真实退款；
- 不恢复U01、对比或被否决的M01环境图；
- 不合并main、不部署。

## 5. 下一轮
KOALA-RULE-RECONCILE-04：定向修复CODE-01与CODE-04；先统一仓高数据源及促销事实源，再补CAP双单位往返、S01/S02/S5促销四状态、375/390视觉回归。CODE-02/03需定价负责人确认后再改。
