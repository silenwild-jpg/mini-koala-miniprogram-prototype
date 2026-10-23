# DEMO-PRICE-01 B1｜发现价与整期租金视觉层级定向修复

日期：2026-10-15｜来源：DEMO-VIS-01 候选，继承 D4-A（未覆盖 D4 冻结母版）。

## 已完成的实施
- 新增 `prototype/demo_price01_b1_discovery_contract.css`，仅优化 H01、S01、S02 价格字号、强调、标签与单位关系，保持 S5 DEMO-VIS-01 已实施样式。
- H01/S01/S02 三个既有 HTML 分别增加一条 CSS 引用。未修改任何 JS、业务快照、计算公式、价格数据、推荐排序、优惠券、库存或支付流程。
- 保留 H01 普通浏览 `参考单价` 与需求态 `整期租金` 的切换，S01 相同；S02 `参考价格` 与 `整期总租金` 原业务语义不变。
- 样式层级与《Visual V3 V1.1.1》及本项目《DEMO-PRICE-01》四级金额规范对齐；价格层不引入额外大面积强调色。

## 实际核查
- `tools/check_package.py`：765受管文件、743个字面链接、0错误（可运行后以本候选为准）。
- `qa/test_demo_price01_b1_static.py`：9/9 PASS（结构与保留语义，不代表E2E）。
- `qa/DEMO_PRICE_01_B1_offline_style_probe.json`：Chromium 通过 set_content 渲染合成组件，375×812/390×844、DPR2，4种模拟金额节点×2尺寸=8/8 PASS；属于样式规则级检查，绝不作为原型真实截图/真实状态通过。
- HTTP `http://127.0.0.1` 和直接 `file://` 均被 Chromium `ERR_BLOCKED_BY_ADMINISTRATOR`，真实浏览测试仍为 BLOCKED（非0个错误）。

## 未完成与下一关
- `COUPON-VIS-02` 的用户批准 A 方案原图/补丁：在当前可取得的项目运行时及素材清单中无法取得可证明身份的源资产。本轮不自行合成替代。
- 真实 D4-A 375×812/390×844 S5 DOM/bbox、优惠券收起与展开、返回、报价、价格跨页连续性：BLOCKED。
- D4 5项P1依然 OPEN，D4-B 不准自动合入。微信真机 NOT TESTED。Release Gate HOLD。
- 下批 B2 为 U01/Q01/C02/O01 的应付金额/券语义，须与 D4 P1-02 报价快照、P1-03 支付恢复独立验证，禁止以颜色/字体修改替代业务校验。
