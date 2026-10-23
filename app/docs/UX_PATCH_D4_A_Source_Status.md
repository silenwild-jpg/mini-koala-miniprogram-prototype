# UX-PATCH D4-A 源码候选｜真实浏览 BLOCKED

本候选只完成 D4-A 的源码修复与可执行专项检查，不能称为 D4 完整验收版。Release Gate = HOLD；管理母版未覆盖。

唯一原型输入 SHA-256：29571257a897f2897cec3d3a0d6c02165b1062e948a437a8ee03c97688e9df87。
入口：prototype/index_visual_v2_7_4_7.html。完整解压后在本目录运行 python3 -m http.server 4173 --bind 127.0.0.1，再访问 http://127.0.0.1:4173/prototype/index_visual_v2_7_4_7.html。

- D3-P1-01 / D3-P1-02：SOURCE IMPLEMENTED；375×812 与 390×844 均 BLOCKED，未关闭。
- D3-P1-03 / D3-P1-04 / D3-P1-05：NOT TESTED；D4-B 未执行。
- 11 项 P2：全部沿用 D3，未处理。
- Playwright 1.62.1 可用，但本环境 Chromium 可执行文件缺失，官方安装返回无效 ZIP。没有 D4 真实截图；不能用 D3 JPEG 冒充修复后截图。
- 新增专项：8/8 源码与 VM 检查通过；受保护源码检查 20/20；JS 解析 5/5，CSS 解析器缺失标 BLOCKED。
- 原有127脚本同输入前后比对：均45 PASS / 81 FAIL / 1 BLOCKED；新增失败脚本0。失败保持开放，详情在独立证据包。

真实浏览成功复测 D4-A 后，才能按原执行任务书继续 D4-B，尤其支付恢复必须先以干净会话复现。
