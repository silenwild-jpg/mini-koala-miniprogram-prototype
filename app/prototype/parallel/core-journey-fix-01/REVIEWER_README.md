# CORE-JOURNEY-FIX-01 评审说明

本目录是在 integration/proto-merge-01f 远端基线上的独立、可运行演示候选，用于保存 2026-10-26 修复版及其来源、截图和验证记录。它不覆盖共享首页、容量页、门店页、租期页、订单页或中央状态文件。

## 如何打开

在本目录运行 START_FIX.cmd，或从当前 Git 工作树根目录执行：

    python app/prototype/parallel/core-journey-fix-01/serve.py --no-browser

然后浏览：
- http://127.0.0.1:<服务显示端口>/demo/home.html
- http://127.0.0.1:<服务显示端口>/fix.html

此版使用隔离的本地演示数据。

## 修复范围

- F01：预约用仓地址栏恢复完整宽度；定位和可选联系电话使用独立行。
- F02：续租改月后使旧报价失效，重新核价绑定月数、金额及新到期日。
- F03：补充企业需求更新原编号；明确新建才会创建另一条需求。

## 评审记录

源码逐文件SHA记录在 MANIFEST_SHA256.json。evidence/ 中保存两种宽度的修复前后页面和之前已保存的业务回归记录。VERIFICATION.json 记录原交付中94组模型检查、37条浏览器断言及21条语法检查的结果；这些是该演示构建时的记录，本次Git文件收口不重新声称测试。

完整原始交付ZIP的名称与SHA见 GIT_INTAKE.json；原ZIP保留在项目外的原交付目录，没有再次嵌套进Git。

## 尚未完成

这是 SOURCE_INTAKE_ONLY / PENDING_REVIEW。F04–F07、D25、D38及其余待确认项继续开放；最新独立聊天中提出的手机号AuthGate、S01/S02展开布局、促销状态和容量图资源还没有作为后续批准实现加入本候选。生产账号、库存、价格、顾问投递、微信真机和Release Gate均未验收。

本PR必须保持 Draft，逐项评审证据后再决定后续定向接入。回滚方式：不合并PR或删除本目录；主线页面无改动。
