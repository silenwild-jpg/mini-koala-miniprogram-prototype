# BR03 GIT-MIGRATE-01｜VIS-07 与 HIFI-03 来源接收

阶段：**SOURCE_INTAKE_ONLY**。本次把两份已校验来源按目录原样保存，供后续受控差异审查；未替换 S01/S02 当前原型页、公共状态、中央门店/仓位 ID、价格或订单状态。

| 来源 | 接收位置 | 原包 SHA256 | 包内校验 |
|---|---|---|---|
| `Mini_Koala_BRANCH03_VIS07_视觉母版签收_演示素材边界冻结_2026-10-23.zip` | `source-reference/branch03/vis07/` | `10f891b5757b5e27000815d9fa1b44cd6948ee52ac3a518f039b173ea457c609` | 16 条目 CRC PASS；SHA256SUMS 15/15 PASS |
| `Mini_Koala_BRANCH03_HIFI03_Portable_Handoff_2026-10-23.zip` | `source-reference/branch03/hifi03/` | `3cfca68e6c614ec68959ff74c1f8b327433336f7519f7d1819007f578c2da400` | 30 条目 CRC PASS；SHA256SUMS 29/29 PASS |

VIS-07 包含 S01/S02 已批准演示视觉母版的 375×812 与 390×844 @2x 原图、状态参考和签收边界说明。四张正式母版图的来源 SHA256：

- S01 375×812：`79a860387ba797d471a71e0f217446c98dc8dddbcb4edfe529f0339028ddbdaa`
- S01 390×844：`b9ce508fd0721a65ebd06e910d8df35089332b6c3950963ed842ceece24d7103`
- S02 375×812：`9f5e25183c5818b9d42d569e5bbf9f86c7c790a2fbc94d937df2c51466923a77`
- S02 390×844：`f1db880c8101e985fd8b3aeca25f44c01033814b32ea2ccecd5ade7e63578529`

HIFI-03 的 `isolated/styles.css` SHA256 为 `4708b5475377c10bfc77936837828c5bf5721d5e34eeb9f60d019e9466bd96cc`，与中央 01F B4A 内附的 BR03 CSS 一致。其余独立原型与桥接文件仍是来源材料，不代表本工作区完成接线或验收。

本次没有改动运行代码，未作真实 HTTP 双尺寸、交互、S01/S02→O01 路由或中央报价/订单快照测试（**NOT TESTED**）。旧演示门店 ID 仍按中央裁定保持 `UNMAPPED_BLOCKED`；不得用名称/行政区相似度映射。S02 即使视觉已冻结，也须与中央原生门店/仓位数据结合后再核验真实路由。

回退：删除本次 `source-reference/branch03/` 来源副本及本说明即可；S01/S02 运行页与共享代码未修改。归并与 Release Gate 继续 **HOLD**。
