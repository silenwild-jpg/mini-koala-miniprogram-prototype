# 支付前异常验收检查点

当前内部演示READY：核心32/32及A01双尺寸PASS；正式Release Gate HOLD。父候选ZIP SHA a8c32a0aa3ab30c4e0e2e0a8d243dc95e8cfb11c45bd6dd360da51944d2d1c4d。当前工作副本workspaces/exception_candidate；前一副本workspaces/merged_candidate保持原状。

改动为独立QA场景页、会话数据事实适配、必要页面引用、O01阻断金额标签及验收脚本/文档。原数据文件、业务SSOT、coupon资格和price gate SHA与父包相同。完整结果见docs/PREPAY_EXCEPTION_RESULT_2026-10-15.md；最后封包SHA见SHA256SUMS_Exception_QA.txt。

回滚使用父C4 ZIP。以下旧C0–C4记录保留，PENDING是父版本状态。

# C0–C4 检查点与回滚（历史）

正式 Release Gate HOLD；演示 PENDING（28/32 PASS，4/32 NOT TESTED）。本包是唯一当前支付前评审候选。

原始输入SHA与继承关系见RELEASE_MANIFEST.json/parent_inputs；原包未修改。独立证据包保留INPUT_MANIFEST、输入审计、源码逐文件before/after SHA和原始测试日志。

| 检查点 | 独立工作副本 | 改动与验证 | 回滚/下一动作 |
|---|---|---|---|
| C0 | original_d / common_d4_a / business_latest / visual_latest | 七件输入身份校验；实际HTTP两尺寸预检 | 从业务原ZIP重新解压 |
| C1 | checkpoints/C1_business | 演示快照、依赖、精确容量、Windows工具；真实业务路径通过 | 回到业务冻结，不保留B1/B2 |
| C2 | checkpoints/C2_visual | 两CSS及四HTML引用；主体内容与C1一致；B1静态9/9 | 回到B1完成、不含B2 |
| C3 | checkpoints/C3_visual | B2/A图、S5首卡、浮窗、选券返回租期；双尺寸展示与状态VM | 保留最终运行时，补异常UI样本 |
| C4 | 最终完整候选ZIP | 32位置矩阵、同环境历史测试对照、封包/解包复验 | 最终ZIP SHA见SHA256SUMS.txt |

本机检查点原始存放在 `C:\Users\silence\Documents\Codex\2026-10-15\new-chat\work\MK_CODEX_execution\checkpoints`。各检查点目录均可独立恢复；Manifest SHA及状态在证据包final/checkpoint_hashes.json记录。

恢复时复制到新的工作目录，不覆盖原始输入ZIP或管理母版。P1-03/P1-05和B3售后仍OPEN/DEFERRED，原P2台账保留。演示先在Hub重置，从首页自然入口开始，到O01停止；后续先补P13/P15和A图异常状态证据，再裁定READY。
