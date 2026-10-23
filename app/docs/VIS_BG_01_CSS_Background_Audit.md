# VIS-BG-01 CSS Background Audit

逐节点完整 JSON、CSSOM匹配来源、层次条件、图片层与透明祖先合成位于证据包 `VIS_BG_01_CSS_Background_Audit.json`；不是仅列拟定色表。

对照节点 10106；目标合规 1980；背景变化 982；未登记变化0；几何差异0；语义例外708条均保持。

| 页面 | HTML/body before | after | 证据 |
|---|---|---|---|
| A01: mini_storage_access_a01_v2_self_service_Visual_V2_7_4.html | rgb(251, 248, 242) / rgb(248, 250, 249) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| AI01_L: mini_storage_ai_loading_ai01_l_v1_demo_patch.html | rgba(0, 0, 0, 0) / rgb(248, 250, 249) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| AI01: mini_storage_ai_photo_ai01_v1_demo_patch.html | rgba(0, 0, 0, 0) / rgb(248, 250, 249) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| AI02: mini_storage_ai_result_ai02_v1_demo_patch.html | rgba(0, 0, 0, 0) / rgb(248, 250, 249) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| B01: mini_storage_brand_b01_v1_10_self_service_synced_Visual_V2_7_4.html | rgb(251, 248, 242) / rgb(248, 250, 249) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| B2B01: mini_storage_business_b2b01_r113_Visual_V2_7_4.html | rgb(253, 251, 247) / rgb(250, 248, 243) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| CONTRACT: mini_storage_contract_c01_v1_agreement_confirm_Visual_V2_7_4.html | rgb(251, 248, 242) / rgb(248, 250, 249) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| C02: mini_storage_coupon_select_c02_v1.html | rgba(0, 0, 0, 0) / rgb(248, 250, 249) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| WALLET: mini_storage_coupon_wallet_c01_v1.html | rgba(0, 0, 0, 0) / rgb(248, 250, 249) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| DP01: mini_storage_deposit_dp01_v2_7_4.html | rgb(253, 251, 247) / rgb(250, 248, 243) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| EX01: mini_storage_exit_ex01_v2_7_4.html | rgb(253, 251, 247) / rgb(250, 248, 243) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| H01: mini_storage_home_H01_Visual_V2_7_4_SSOT.html | rgb(253, 251, 247) / rgb(253, 251, 247) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| ID01: mini_storage_identity_id01_v2_7_4_5.html | rgba(0, 0, 0, 0) / rgb(248, 250, 249) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| IV01: mini_storage_invoice_iv01_v2_7_4.html | rgb(253, 251, 247) / rgb(250, 248, 243) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| M01: mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html | rgb(253, 251, 247) / rgb(250, 248, 243) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_m01_corrected |
| OH01: mini_storage_order_history_oh01_v2_7_4.html | rgb(253, 251, 247) / rgb(250, 248, 243) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| O01: mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html | rgb(253, 251, 247) / rgb(248, 250, 249) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_valid_routes / after_valid_routes |
| O02: mini_storage_order_o02_v1_17_self_service_Visual_V2_7_4.html | rgb(253, 251, 247) / rgb(250, 248, 243) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| O03: mini_storage_order_o03_v1_17_self_service_Visual_V2_7_4.html | rgb(253, 251, 247) / rgb(250, 248, 243) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| Q01: mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html | rgb(253, 251, 247) / rgb(250, 248, 243) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_valid_routes / after_valid_routes |
| REF01: mini_storage_referral_ref01_v1.html | rgba(0, 0, 0, 0) / rgb(248, 250, 249) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| RN01: mini_storage_renew_rn01_v2_7_4.html | rgb(253, 251, 247) / rgb(250, 248, 243) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| S02: mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html | rgb(253, 251, 247) / rgb(250, 248, 243) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_valid_routes / after_valid_routes |
| S01: mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html | rgb(253, 251, 247) / rgb(248, 250, 249) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_valid_routes / after_valid_routes |
| TRANSPORT: mini_storage_transport_status_v1.html | rgba(0, 0, 0, 0) / rgb(248, 250, 249) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| U01: mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html | rgb(251, 248, 242) / rgb(250, 248, 243) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_valid_routes / after_valid_routes |
| V01: mini_storage_viewing_v01_v1_14_self_service_synced.html | rgba(0, 0, 0, 0) / rgb(248, 250, 249) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| V02: mini_storage_viewing_v02_v1_14_self_service_synced.html | rgba(0, 0, 0, 0) / rgb(248, 250, 249) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |
| EST: space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html | rgb(253, 251, 247) / rgb(248, 250, 249) | rgb(248, 250, 249) / rgb(248, 250, 249) | before_final / after_final |

## 语义例外
所有未列入专用 CSS 的语义色面保持，逐容器清单见 Semantic_Exceptions.json。包括 H01 Banner与照片/双任务表达、S5券图/运输资格/推荐选中/E存活动、S01服务标签、S02/U01照片与库存状态、O01价变/库存警示、M01品牌profile与当前租赁态、生命周期状态hero、品牌与企业hero、券钱包资格摘要、续租券与安全说明。

透明节点沿祖先链合成；若祖先有图片或渐变，JSON保留有序图层并要求结合截图解释，没有将其压成单一RGB。

加载顺序与每条旧规则见styleOrder、before_rules、after_rules。最终新增规则仅作用于专用命名空间及经过核实的容器。
