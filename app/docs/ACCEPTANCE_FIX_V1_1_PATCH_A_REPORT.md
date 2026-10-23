# Mini Koala — Acceptance Fix V1.1 / G0 + PATCH A 执行记录

日期：2026-10-08  
来源 ZIP：`Mini_Koala_Acceptance_Fix_V1.zip`  
源 ZIP SHA-256：`6371948b9f0711deac44a544e83584f9d08b2c366ad97eee5670037bad1405c9`  
实施范围：`G0 Preflight & PATCH A — State Integrity`；未执行 PATCH B/C/D 的全量整改。

## 已执行修复

| 编号 | 项目 | 代码处理 |
|---|---|---|
| AF-01 | S01 列表售罄态首屏与普通浏览态难区分 | 保留已有售罄门店分离逻辑；新增仅在售罄场景且确有售罄卡时显示的首屏状态横幅，可跳转至下方售罄门店详情区域 |
| AF-02 | Q01 报价过期未渲染 | 支持 URL `quoteStatus=expired` 与当前已保存方案 `valid_until` 超时；显示过期说明、移除保存操作、将继续下单改为“重新获取报价”；转到 U01 重新计算，不携带旧金额快照 |
| AF-05 | S01_far 提示与门店排序/时长冲突 | 恢复文案改为根据当前筛选门店和当前出行方式计算；无结果时不再声称已展示可租方案 |
| AF-06 | S01_nomatch 无参考门店却有承诺文案 | 检查是否真的存在实体门店参考卡；无参考时改成调整需求或客服协助指引 |
| AF-09 | 未选租期的按钮呈正常主 CTA 外观 | 保留“跳到租期选择”原有功能，改为次级引导按钮“先选择租期 ›”，不引入虚假的禁用行为 |
| AF-10 | 库存倒计时格式模糊 | 明确标记倒计时数字为“分:秒”，保持演示库存语义不变 |

## 实施方式

- 使用 **additive overlay**：新增 `prototype/mini_koala_acceptance_v11_state_patch.js` 与 `.css`，由已存在的 `mini_storage_global_support_v274.js` 按页面加载。
- S01、Q01、估算器三份原始 HTML **与 V1 源包逐字节一致**；避免破坏历史页面主体哈希冻结和已批准业务结构。
- 内部 `product_demo_hub_v1.html` 新增“列表售罄”“报价过期”状态快捷入口。
- `mini_storage_demo_fixture_v2.js` 的 `q01(mode)` 支持 `expired` 场景，正常 `active` 默认调用保持兼容。
- 原压缩包保留，不覆盖。

## 验证

- `python qa/run_acceptance_static.py`：**68/68 通过**。
- `node qa/test_acceptance_v11_patch.cjs`：**6/6 通过**（JS 语法、界面注入合约、报价过期路由、正常态不变、售罄场景可见、辅助状态文案）。
- 冻结主体检验：S01/Q01/估算器三份 HTML **逐字节一致**。
- **浏览器实际动态验收尚未通过**：本环境的 Chromium 对 `http://127.0.0.1` 导航返回 `ERR_BLOCKED_BY_ADMINISTRATOR`。原始 Node Playwright 脚本还缺少 `playwright` npm 模块；本次用 Python Playwright 尝试仍遭浏览器策略拦截。不能宣称 375×812 / 390×844 的新增状态截图验收通过。

## 手动验证入口（正常可访问 HTTP 的环境）

1. 完整解压后在根目录运行 `python -m http.server 4173`，打开 `http://127.0.0.1:4173/START_HERE.html`。
2. 在 `prototype/product_demo_hub_v1.html` 的“快速状态”点击“列表售罄”：应看到国展店“已售罄”首屏提示；点击“查看详情”后滚动至售罄区域；普通“匹配门店”不出现该横幅。
3. 点击“报价过期”：应看到过期说明，底部仅有“重新获取报价”；点击后进入 U01，URL 不携带旧 `rentTotal`/`monthly`/`deposit` 金额。
4. 切换回正常 Q01：仍应显示原“继续下单”和“保存方案”两项操作。
5. 在 375×812 与 390×844 下检查首屏、列表底部、过期报价页、帮助悬浮按钮与关键 CTA 有无遮挡；如遇异常应记录截图再决定是否可验收。

## 未完成与冻结

- PATCH B：跨页 canonical facts / 场景化报价一致性，未执行。
- PATCH C：用户端研发措辞全面清理、合规等，未执行。
- PATCH D：FAB 全站遮挡及共享组件一致性，未执行。
- FR-01~FR-10 已批准的业务规则保持不变。生产级库存 TTL、锁仓、退款及发票时效等 BUSINESS_TBD 规则未新增。

**交付结论**：G0 已完成；PATCH A 形成可交付的源码修复候选并通过静态与独立逻辑检查；由于浏览器被管理员策略拦截，仍属于“待移动端动态验收”的候选版，不宣称全量验收通过。
