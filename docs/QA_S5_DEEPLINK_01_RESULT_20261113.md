# QA-S5-DEEPLINK-01｜签收RC2冷启动必选需求浏览器补证

**真实执行结果：PASS，6/6**。  
范围：从未填写需求、仅填写容量但尚未确认租期、容量与租期均已确认的访问状态进入S5。按375×812、390×844两种视口执行真实Chromium浏览器测试，不使用历史截图冒充测试，也不改动业务运行时。

| 版本与证据 | 内容 |
|---|---|
| 业务基线 | [PR #176](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/176)，用户已签收SHA `41a8a079eb48049e1060512bddf71c226bfd3738` |
| 独立QA-only | [PR #187](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/187)，QA SHA `0395bd5922046ea3bf454bd6cd734ac969d948ef`，Draft/HOLD |
| GitHub Actions | [Run #43435644089](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43435644089)：`completed/success`；job全部步骤成功 |
| 日志 | `QA_S5_DEEPLINK_01_PASS 6 cases across 375/390` |
| 测试产物 | [Artifact #14043901942](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43435644089/artifacts/14043901942)：6张截图 + 1份结果JSON，7天短期保留 |
| QA脚本 | PR #187 的`scripts/verify_qa_s5_cold_deeplink_01.cjs`与独立CI `.github/workflows/qa-s5-deeplink-01.yml` |

## 六条已经验证的行为

| 用户访问路径 | 375 | 390 | 测试裁定 |
|---|---|---|---|
| 首次访问`index.html?page=S5`，容量与租期均缺失 | PASS | PASS | 自动进入CAP，不显示不完整的S5 |
| 已知容量3m³、未确认租期，再直接访问S5 | PASS | PASS | 自动进入CAP，要求补齐前序租期 |
| 容量3m³、主动确认12个月租期，再直接访问S5 | PASS | PASS | 正常展示S5推荐界面，继承容量与租期 |

## 源码冻结与验收边界

- 测试CI首先确认已签收SHA是QA HEAD的祖先，`git diff signed...HEAD -- app/`为空；因此本次补证没有改动应用、仓位规则、视觉母版、用户签收内容或演示数据。
- 测试所用浏览器与站点均为GitHub Actions的隔离QA环境，**未部署任何线上站点**。
- 此项只补足历史[#135](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/135)提出的S5冷启动深链覆盖；不能自动证明所有真实微信原生路由、CRM、支付或生产条件通过。
- 由于本次是QA-only增量，**PR #176签收SHA仍锁定**，不将测试文件并入该原型业务分支；QA PR #187保持Draft，供未来WorkBuddy/后端开发迁移测试方法。
- 已签收原型DEMO READY仍有效。后续若改动S5业务代码，要生成新候选并重新同SHA回归。

关联：[QA-LEGACY-COVERAGE-02](QA_LEGACY_COVERAGE_02_20261113.md)、[项目总控 #177](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/177)。
