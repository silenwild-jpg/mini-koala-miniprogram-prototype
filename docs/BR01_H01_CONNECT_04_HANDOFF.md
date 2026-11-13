# BR01-H01-CONNECT-04｜完整页面入库边界与接收说明

- 当前本地交付：BR01_H01_CONNECT_04.zip（包含 app/prototype/h01-visual-20261102/index.html 与 assets/ 七张图片，以及路由适配器）
- GitHub PR #34 已提交隔离路由适配器；HTML 与图片尚未实际上传到仓库。
- 目标文件路径：app/prototype/h01-visual-20261102/index.html；图片 app/prototype/h01-visual-20261102/assets/。
- 已修改隔离页面事件处理，将 S01、CAP、S02 映射到中央适配器。S02 示例门店真实 ID 未核验时回退 S01；BOOKING 与 QUICK_ORDER 保持 unbound。
- 原视觉冻结：不修改 Hero、门店照片、E存横幅及其他布局。
- 本地 Chromium 测试尝试：net::ERR_BLOCKED_BY_ADMINISTRATOR，375/390 标记 NOT TESTED。
- 全站中央联调、预约/快捷下单实际处理器、门店 ID 同源与认证门禁：NOT TESTED / NOT BOUND。
- 不得直接合并；资源完整上传并执行真实浏览器主链回归后才可申请正式签收。
