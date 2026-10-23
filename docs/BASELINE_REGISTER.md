# 基线登记｜GIT-SETUP-01

| 项目 | 当前事实 |
|---|---|
| 基线名称 | PROTO-PARALLEL-01 / CURRENT_CANDIDATE.zip |
| 创建日期 | 2026-10-21 冻结记录，源码来源2026-10-19受控候选 |
| SHA256（必须实际校验） | `bb04999dda292983780d9d627a7afb546b6f610917a2aca35fd225c3b1d384fe` |
| 原件大小 | 27,631,053 bytes |
| 原件ZIP条目 | 909 |
| 原始验收记录 | CRC PASS，Manifest 908项匹配；本迁移脚本单独做SHA、CRC、条目复验 |
| 当前评审门禁 | demo_gate=PENDING_REVIEW / release_gate=HOLD / 微信真机未测 |
| 01B | `Mini_Koala_PROTO_MERGE_01B_Isolated_Integration_2026-10-23(3).zip`：仅作为中央隔离候选 |
| 01F | `Mini_Koala_PROTO_MERGE_01F_BR03_B4A_CentralSource_O01_Demo_2026-10-23.zip`：隔离路由候选，真实HTTP导航未最终验收 |

**Git `main` 初次提交只是“原件基线存档”，不是目前四分支视觉成果已归并或验收。** 初次 Tag `baseline/proto-parallel-01-20261021` 同理。

不要根据打包日期直接推断新包应替代该基础层；后续候选一律分别审查 PR 进入集成分支。
