# G-TECH｜COLLAB-SETUP-01与01B补修

最终运行时`f1deabe80ab9546b719f6ad0b281b611de6034fd`，树`5f80f0d3260e405dc54863bfe16fd08fbba9e694`。**PASS，限下列技术范围；视觉与点击验证分开。**

Windows，Node v24.22.1，Python3.12.14；微信开发者工具UI观察版本2.02.2611192 Nightly，模拟器基础库3.5.8。系统信息报告微信8.0.5，为模拟器值，不是实际手机微信版本。

实际入口：仓库根执行`node wx-native/tools/verify-native-candidate.cjs COLLAB-SETUP-01`；以下进程由该提交中的验证器依序启动，完整参数文件/路径发现方式见验证器源码。输出都在[最终证据目录](../../../evidence/next-stage-20261120/COLLAB-SETUP-01/f1deabe80ab9546b719f6ad0b281b611de6034fd/verification.json)同目录。

| 检查 | 子命令及实际范围 | 原始输出 | 结果 |
|---|---|---|---|
| Node测试 | `node --test --test-reporter=tap`，参数为tests目录递归发现的全部.test.js | node-tests.txt | 166通过/0失败 |
| Python静态 | 内置python.exe，`-X utf8 tools/static_check.py <miniprogram绝对路径>` | python-static.txt | errors空数组；脚本扫描25组件单元，不等于唯一组件数 |
| 页面模拟 | `node tools/smoke_run.js <miniprogram绝对路径>`，ONLY为空，全量 | smoke-pages.txt | 35页/22组件/6620调用/0异常 |
| 订单冒烟 | `node tools/smoke_orders.js <miniprogram绝对路径>` | smoke-orders.txt | 6单/54页加载/960调用/0异常 |
| WXML | 微信工具内置wcc.exe，60个WXML文件，临时编译输出成功后移除 | wxml-compile.txt | exit0 |
| 原生流程及日志 | `native-collab-setup-01.ps1 -Candidate <SHA> -AffectedOnly`与原始回执 | native-receipts.json | S02三态双尺寸已捕获；末次完整日志无error，仍有全局组件按需注入、getSystemInfoSync弃用warning |

订单冒烟原始日志中有受控无效资源/冲突拒绝的业务信息，其统计errors为0，不据此声称实际订单服务通过。真实环境仍mock。

旧static-result.json的errors空数组来自build-review-20261120.cjs的有限Node检查，标记源SHA为be7369231b57698ffa7136e3bb0fa78cc8e6542a；它不检查裸色值。当前baseline-python-static.json复现2条错误，修复后使用原Python脚本0错误；没有重写历史报告。

source-manifest固定421个运行时文件；最终整理复核全部哈希。与fa7e566仅S02样式不同，其余420文件一致，复用截图保留各自原SHA。源码复扫92生效令牌、2条注释匹配、609分支＋57默认项，共666追踪行；这些不是有效状态数、组合数或通过数。

本结论不包括1:1截图、键盘、关闭边缘命中、读屏、实际手机、冻结稿对照或人工签收；也不能覆盖本包发现的日期小样差异。

PR #221首轮远程视觉治理检查因说明缺固定证据字段失败；补齐字段后，以真实规则基线/交付SHA、draft=true及未签收/未部署HOLD状态本地复现，脚本自测与strict均exit0，technical_contract=PASS、result=REVIEW_REQUIRED。没有修改治理脚本或将视觉签收改成PASS。对应报告为最终证据目录governance-local-d9636d9.json，绑定的是此次本地复现的PR输入head，不是运行时候选。远程最终状态以PR检查页为准。
