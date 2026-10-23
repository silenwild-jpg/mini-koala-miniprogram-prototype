# BRAND-VIS-01C / 独立组件 Chromium 验收

- 375x812，DPR2，zh-CN：PASS；区块高度 711px；横向滚动宽度 375px；模拟图片加载 PASS；页面错误 0。
- 390x844，DPR2，zh-CN：PASS；区块高度 719px；横向滚动宽度 390px；模拟图片加载 PASS；页面错误 0。
- 验收方式：真正 Chromium 渲染，但由于运行环境的 localhost 被拦截，使用内联HTML/CSS + data URI 同源图片进行 DOM 及截图验证。**不等同于本地HTTP网络加载验收**。
- 数据：三项数字、四项服务、三项资质图片及文字全部存在。
- 页面路由行为：独立预览使用演示锚点；母版路由保持待集成。
- 原型母版合并：BLOCKED（需要原始 ZIP 可编辑访问）。
- 整站回归与微信真机：NOT TESTED。Release Gate HOLD。
