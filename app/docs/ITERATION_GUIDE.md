# 策略与版本迭代指南

1. 先读CURRENT_STATUS、CURRENT_DOCS_INDEX及相应业务规格；确认原型/内部演示范围。
2. 新策略写成docs/迭代编号_SPEC.md，写明目标、页面与状态、文案、动作、业务规则、允许变化和不变项。
3. 检查门店/仓位事实、价格/优惠券、订单生命周期、找仓位置和跨页需求是否连续；字段源以现有data/及共享业务脚本为准。
4. 修改现有组件或收口既有补丁，避免继续堆叠同一选择器的!important；保留URL参数、订单主键、动态入口及数据引用。
5. 运行python tools/run_regression.py。修改状态/金额/路由时补有意义的行为检查；纯排版不重复造实现镜像测试。
6. 在可用浏览器中验证自然用户链与375×812/390×844；证据写明版本、捕获方式、屏宽、状态与未验证项。
7. 更新CURRENT_STATUS与CHANGELOG，运行python tools/check_package.py --write-manifest生成当前哈希，再运行不带参数的完整性检查。
8. 打包前检查引用、回归及Release Gate。禁止仅因静态PASS更新为Accepted；保留上一版本ZIP和历史档案。

源码目录不移动。qa/原路径保留，是因为已有测试使用__dirname推导根目录。文档中带V2.x/V1.x的文件名可能是稳定引用名，不可只按名称判定过期。

当前可复跑的默认回归仅需Python标准库和Node.js。可选布局工具需Python playwright、beautifulsoup4、tinycss2及Playwright浏览器；test_patch_d_visual.py是隔离布局检查，不是整站E2E。PLAYWRIGHT_CHROMIUM_EXECUTABLE可指定合法安装的浏览器；MINI_KOALA_PREVIOUS_BASELINE可选指定历史对比目录。

静态文本检查无法证明动态资源全部加载；真实E2E受阻时保持HOLD并记录阻断。
