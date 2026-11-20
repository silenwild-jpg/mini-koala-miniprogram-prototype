# Claude下一轮独立评审入口

实施分支：`codex/inventory-display-density-20261120`。请以对应Draft PR的完整head SHA拉取交付，运行时固定为`f1deabe80ab9546b719f6ad0b281b611de6034fd`，树`5f80f0d3260e405dc54863bfe16fd08fbba9e694`。后续文档提交不代表运行时又改版。

先读本目录STATUS.md、review-dispositions.csv、G_TECH.md、G_VIS.md及NEW_OBSERVATIONS.md。原评审7b5634af未改，四份UPSTREAM副本只用于追溯；Codex未写claude/review分支。

## 复核重点

1. R76-01原Python检查现在0错误；不要用旧Node有限静态报告代替。技术入口为`node wx-native/tools/verify-native-candidate.cjs COLLAB-SETUP-01`（需本机微信编译器；Linux可独立复跑Node/Python/两项smoke，WXML如无工具写NOT_RUN）。
2. R76-02/03最终S02头部：按钮width被工具默认184px覆盖，max-width后实测分享56/58、看仓64/66；地址185.7/198.7；时间单行。只给已有两个按钮定宽，不推广公共样式。
3. R76-04手机号字段错误紧邻输入框；2项新增行为回归保留容量/时间与演示线索边界。键盘和任意滚动位置的自动定位尚未验证。
4. R76-05/06未关闭：原图仍约0.92捕获，DPR3单列；边缘点击仍NOT_VERIFIED，不能将尺寸或清理动作写成点击成功。design_ref为NONE，rule_ids缺来源填UNKNOWN，请补你持有的可访问冻结稿映射。
5. R76-07语义类为待评审提案，未全局实施；R76-08已补登录、其他租期、修改需求三类调用方图，独立接受由你给出。
6. CSET-01：两张确认订单图日期与请求URL不同，已标FAIL，优先核对工具参数、page.options/_date、订单卡控件，尚不裁定为产品回归。

## 证据读取

- 当前证据：`wx-native/evidence/next-stage-20261120/COLLAB-SETUP-01/f1deabe80ab9546b719f6ad0b281b611de6034fd/`，从shots.csv或native-verification.json开始。
- 索引21行：18PASS/2FAIL/1NOT_CHECKED。含12图小样；14图复用fa7e566，420文件相同；S02三态双尺寸6图及点击前1图在当前SHA。相对路径指向原文件，runtime_sha不改标。
- 历史f125158最终24图已补shots.csv，不改文件名。f8ef8af/fa7e566的无效前置与中间布局问题保留，不作为最终通过。
- review.html需克隆后本地打开；GitHub源码页不自动渲染交互评审。原PNG可单独查看。

请输出针对本次PR head的REVIEW与问题表，存新的claude/review分支。处置为5FIXED/3DEFERRED，不表示独立签收；用户已明确本轮只需微信开发者工具sim，不应把各一台实际手机列为本包准出前置。

用户业务与视觉裁定权、main归并、体验版与正式发布边界不变。本包未归并或发布。你没有后台自动发现机制，需用户在Claude侧触发评审。

CSV格式核对：上游原问题表R76-01中的rgba逗号未包引号，标准CSV读取为12列而表头9列。原件未修改；本包处置表8行/5列均合法。下一份Claude问题表请正确转义逗号，便于双方自动读取。
