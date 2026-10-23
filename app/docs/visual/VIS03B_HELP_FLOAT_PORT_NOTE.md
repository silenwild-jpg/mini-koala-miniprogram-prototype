# VIS-03B · 首页帮助浮窗受控移植说明（2026-10-13，HOLD）

- 基线：Mini_Koala_Unified_Project_V1_2026-10-13.zip（SHA-256 ad56ae81b037047b7e6bf5251d21ef2a9e704e7d7f3c13d0a9f036f77e569cbe）内层 Mini_Koala_H01_Lifestyle_Step03。
- 移植来源：Mini_Koala_H01_004B_Help_Float_Candidate_2026-10-13.zip（SHA-256 ed87033141944066265d3984ee4e10411d8ea6af84288eb9daabffc1e87c29ca）。
- 修改白名单：prototype/mini_koala_home_visual_closeout_patch_v1.js、prototype/mk-v3-page-h01.css（运行时）；qa/test_home_visual_closeout_patch_v1.py（同步）、qa/test_h01_004b_help_float.cjs（新增）；docs/CHANGELOG.md、docs/CURRENT_STATUS.md、README_CURRENT.md、本文件（记录）；RELEASE_MANIFEST.json（重建，HOLD）。
- 不在范围：Banner、H01-007 业务修复、O01/S01/S5、共享定价/库存/优惠/交易状态、全局 CSS 重构、历史文件删除。
- 验收与证据：outputs/vis03b_20261013/（before/after 两套 375×812、390×844 截图、results.json、collisions.json、small_target_hits.json、三个可重复执行的 Playwright 脚本）。
- 回退：用统一项目 V1 原 ZIP 内层目录整体替换本目录即可；或仅还原上述 4 个文件并删除 qa/test_h01_004b_help_float.cjs 后重建 manifest。
- 复跑：在本目录执行 `python3 outputs/vis03b_20261013/vis03_accept.py . <输出目录> after`（需 python playwright + Chromium）。
