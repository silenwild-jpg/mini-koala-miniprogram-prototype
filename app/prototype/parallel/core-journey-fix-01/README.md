# BR03-PROMO-COPY-01 门店预览与仓位信息候选

运行 START_BR03.cmd，打开 http://127.0.0.1:4260/br03-review.html 。已有服务可直接访问。

本候选基于 WX-NATIVE-01E 的 963b3509748914b71cacf4ecbdf9092d6f9a6fbc，新增 S01 独立展开、S01/S02 绿色立即下单、同源促销/库存状态和适用物品文案。实现报告在仓库 docs/BR03_PROMO_COPY_01_IMPLEMENTATION.md，视觉复查在仓库 design-qa.md。

新清单为 BR03_PROMO_COPY_01_MANIFEST.json。原 WX_NATIVE_01E_MANIFEST.json、PROJECT_MANIFEST_SHA256.json 和 GIT_INTAKE.json 仅记录此前快照，不能用于判断本候选文件是否完整。4260 与父候选 4240 为两个独立目录。

状态：已实现；111 组模型、24 个脚本语法、两种手机尺寸共 42 项浏览器检查通过；等待用户视觉验收。Draft PR 按 feature/wx-native-01e 叠放，未合并中央分支，Release Gate HOLD。实际微信、短信、库存、支付服务尚未连接。
