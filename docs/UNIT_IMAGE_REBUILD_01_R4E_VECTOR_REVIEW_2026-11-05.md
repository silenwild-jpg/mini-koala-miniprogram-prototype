# UNIT-IMAGE-REBUILD-01-R4E｜独立矢量原图候选与验收记录

**裁定：G-SOURCE=STAGED / G-S02-LAYOUT-ISOLATED=PASS / G-VIS-GUARD=HOLD / G-APP-BINDING=NO / MAIN=NO-GO**

## 本轮实物（2026-11-05）

R4E 修复未从原先四档海报内裁切，而是独立绘制两份**可编辑 SVG 建筑房间场景**（原始矢量源），并分别导出高分辨率预览、CAP 640×480 WebP、S02 336×312 WebP：

- `source/unit-r4e-medium-architectural-room.svg` / `cap/unit-r4e-medium-640x480.webp` / `thumb/unit-r4e-medium-336x312.webp`：15m³，单扇青绿色外开门、连续建筑天花、沙发、床垫、洗衣机及纸箱；无独立箱盖、货架和绿植。
- `source/unit-r4e-large-architectural-room.svg` / `cap/unit-r4e-large-640x480.webp` / `thumb/unit-r4e-large-336x312.webp`：35m³，双扇青绿色外开门、独立建筑房间、成套家具与家电；无独立箱盖、货架和绿植。
- 每张图片为独立无字画面，没有信息图标题/价签/容积标注；矢量源为本轮原创结构绘制，并非摄影级AI独立生成图片。

## 实际可核对的检验

- 本地 SVG 渲染为 1536×1152 PNG，再使用 Pillow 输出 640×480 和 336×312 WebP。全部文件有实际 SHA256、字节数记录于交接包 `manifest.json`。
- R3 mini/small 原资源保留，不改名冒充 R4E；四档 S02 小图在本地 Chromium `page.set_content` 隔离检查页以112×104像素渲染，375×812 和390×844均完成图片加载、尺寸和横向溢出检查。两宽度均得到 PASS。
- **局限**：隔离检查页不是完整 RC2 S02 运行，不能证明门店卡数据绑定、跳转、报价或跨页业务验收通过。

## VIS-GUARD 未通过的原因

即使15/35m³建筑空间和双开门形态得到改善，新矢量图的家具细节、光影和整体立体感仍明显弱于已冻结的 R3 mini/small 白底轻三维母版。112×104小图中的床垫/洗衣机辨识度不足，未实现四档统一摄影感/立体品质，**不能申请最终视觉签收**。

## 接线禁令与下一步

原图、WebP及两尺寸独立截图已打包保存在会话交付件 `UNIT_IMAGE_REBUILD_01_R4E_VECTOR_CANDIDATES_2026-11-05.zip`，**未直接提交运行仓位资源目录**。未来使用时必须先逐档视觉签收，再在独立分支重新接 CAP/S01/S02/S5 同源，并完成 375/390 真实运行多状态验收。

本 PR 只记录证据；不合并到PR #91、#90或main，不部署评审站。GitHub Runner 的持续零步骤阻塞仍是全站真实CI的独立问题，不因隔离截图存在而解除。
