# PROJECT-OPS-RESET-01 / P1-B3｜旧S01/S02中央目录与视觉素材保全清单

**审计日期：** 2026-11-13  
**来源分支：** `feature/br03-s01-s02`，commit `e0761bd71031581120b97d18883a1799d8c680f1`。  
**签收RC2演示版本：** `41a8a079eb48049e1060512bddf71c226bfd3738`，冻结不变。  
**对照main：** `823519bbb1734cc3c67f5e49a5a1079a593bf85c`。

## 1. 来源事实与迁移边界

- [旧BR03中央目录说明](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/blob/feature/br03-s01-s02/app/docs/BRANCH03_S01_S02_CENTRAL_CATALOG_DEMO_01.md)明确：2026-10-25是隔离演示候选，未接中央O01真实下单，不是已签收新版S01/S02。
- 旧目录标记 `B4A_CENTRAL_SOURCE_1`、`dataVersion=2026-09-29-v2-7-4-17-5-community`，包含**4家上海门店、35个容量选项、7档租期**（1/3/6/12/24/36/60个月）。
- 旧门店ID：徐家汇`MK_SH_792BFEEE`（8个）、张江`MK_SH_D5AF3DE3`（21个）、中山公园`MK_SH_DD275356`（3个）、大宁`MK_SH_1C44E2CD`（3个）。这些是旧中央目录身份，**不得无证据地等同于当前SIM门店ID或真实库存主键**。
- 价格为当时B4A内的演示快照，示例尺寸、面积和图片不等于真实门店数据；`size_option_id`是容量选项身份，`representative_unit_no`只是代表仓号。S02旧下单只记录`br03:order_intent`，无报价/押金/管理费/付款链路。
- 2026-11-13已签收的RC2页面规则与旧BR03结构可能冲突（S01三筛选、E存第三位、S02交通路线、仓型真实表达等）；**不得直接迁入`app.js`/`styles.css`或把旧照片/价格映射成新门店事实。**
- 物理比较结果：旧分支有 **23份**main与签收RC2均无同路径的blob；这只代表同路径缺失，不证明23份业务能力都未迁入。分类：原始目录/业务/页面代码 4；原始店铺/仓型图像 9；375/390浏览器截图证据 8；知识来源文档 1；独立QA 1。

## 2. 双基线无同路径的23份资产与blob指纹

| 类型 | 路径 | Git Blob SHA | 字节 |
|---|---|---|---:|
| 历史规则/说明 | `app/docs/BRANCH03_S01_S02_CENTRAL_CATALOG_DEMO_01.md` | `95749be3c838eea14482e0ff10b0a365d9d7bcf3` | 5665 |
| 旧独立页面/目录 | `app/prototype/parallel/br03-central-catalog-demo/app.js` | `4ffbf0ad3154894ea0a5dcecc0a948789ef720ce` | 30723 |
| 照片/仓型图 | `app/prototype/parallel/br03-central-catalog-demo/assets/mini_split.jpg` | `bccaa99e61a52bfd54fb363f8dcc39019efbfa42` | 29672 |
| 照片/仓型图 | `app/prototype/parallel/br03-central-catalog-demo/assets/store_changning.jpg` | `bb0726740aa2d3b27a7714dc3664aa450208ef4e` | 21673 |
| 照片/仓型图 | `app/prototype/parallel/br03-central-catalog-demo/assets/store_jingan.jpg` | `2e68015a4e6ef2ba66501cf1ebfb59e385867be2` | 21988 |
| 照片/仓型图 | `app/prototype/parallel/br03-central-catalog-demo/assets/store_jingan_hero_clean.jpg` | `fbb391dc443d3d407050a3f53c7a605fecf61c13` | 67925 |
| 照片/仓型图 | `app/prototype/parallel/br03-central-catalog-demo/assets/store_pudong.jpg` | `888597a4187773cf8ac37ad0835bf4579201a8e7` | 21530 |
| 照片/仓型图 | `app/prototype/parallel/br03-central-catalog-demo/assets/store_xuhui.jpg` | `8ad34375c5fe51dab5d8d071176a63bbb6e16cd9` | 22836 |
| 照片/仓型图 | `app/prototype/parallel/br03-central-catalog-demo/assets/unit_medium.jpg` | `93dc97f6933eb283516d4b5056d457d9111ffd9d` | 9719 |
| 照片/仓型图 | `app/prototype/parallel/br03-central-catalog-demo/assets/unit_small1.jpg` | `821462fcd125face446de6e2a128c3acd5663048` | 10899 |
| 照片/仓型图 | `app/prototype/parallel/br03-central-catalog-demo/assets/unit_small2.jpg` | `39f20fda3df0ff00584928096ec2d5dbf00c54c3` | 10479 |
| 旧独立页面/目录 | `app/prototype/parallel/br03-central-catalog-demo/central-catalog.js` | `eacdbf99f6e1294d784f2a42ede918c00610e51a` | 21410 |
| 375/390截图 | `app/prototype/parallel/br03-central-catalog-demo/evidence/S01_375x812.png` | `ec49380fd18458876ba95298f83e6da5823ddf68` | 68528 |
| 375/390截图 | `app/prototype/parallel/br03-central-catalog-demo/evidence/S01_390x844.png` | `06a7a5d5844057f11790e14566ad39e421a32516` | 69100 |
| 375/390截图 | `app/prototype/parallel/br03-central-catalog-demo/evidence/S02_375x812.png` | `f42d37a63caa54f6445feef7ff2d619c68ed6a1c` | 219680 |
| 375/390截图 | `app/prototype/parallel/br03-central-catalog-demo/evidence/S02_390x844.png` | `241b8cb627ed71ef65b42640e5c13dadd08f4263` | 230497 |
| 375/390截图 | `app/prototype/parallel/br03-central-catalog-demo/evidence/S02_INTENT_375x812.png` | `cc206d310baa079d47fa520e6ab31d182b4d1e82` | 117956 |
| 375/390截图 | `app/prototype/parallel/br03-central-catalog-demo/evidence/S02_INTENT_390x844.png` | `138061e235f7544bb62c1f827a7237046106b648` | 122010 |
| 375/390截图 | `app/prototype/parallel/br03-central-catalog-demo/evidence/S02_NO_TERM_375x812.png` | `c2c5e3dabdeca2284d27021721dedd27c2e7a302` | 215677 |
| 375/390截图 | `app/prototype/parallel/br03-central-catalog-demo/evidence/S02_NO_TERM_390x844.png` | `96d913f5ffe3eb58a104318628f5c7f904a8befb` | 225334 |
| 旧独立页面/目录 | `app/prototype/parallel/br03-central-catalog-demo/index.html` | `01afbd620ef85a2f116fc21efcee170b66e5abcc` | 1206 |
| 旧独立页面/目录 | `app/prototype/parallel/br03-central-catalog-demo/styles.css` | `13506edc441494166ea8e1b099c0c6fc68a9c0a4` | 14097 |
| 独立QA | `app/qa/test_br03_central_catalog.js` | `d85fc05a92cee751db72ff6a24830e37e07496f6` | 3003 |

## 3. 独立桥接资料（另一个旧分支）

来源：`br01-h01-connect-03-isolated`，原提交 `e7d0da04c2830b0dcc126d0f05560650828b81a1`，与双基线无同路径blob三份：

| 路径 | Blob SHA | 状态 |
|---|---|---|
| `app/prototype/mk-h01-central-route-connect03.js` | `3f18b1e4b8f15cef2868089e55eb3d6229da4092` | 历史桥接追溯；禁止直接恢复旧H01中央路由 |
| `docs/BR01_H01_CONNECT_03_STATUS.md` | `2f914ba1a81418a5d4270fecf2c22fe8b5ebc8ef` | 历史桥接追溯；禁止直接恢复旧H01中央路由 |
| `docs/BR01_H01_CONNECT_04_HANDOFF.md` | `64a7a121f0a1f29525fc279509cafeffc1be99f9` | 历史桥接追溯；禁止直接恢复旧H01中央路由 |

## 4. 后续“旧门店数据迁入”的正确路径

1. **独立数据交接而非视觉回滚**：先建立`legacy_store_source`只读映射表（来源仓库/分支SHA、旧ID、新候选ID、图片来源/版权/真实性、容量选项、有效仓高、租期价字段、业务审核状态），不直接改当前`fixtures.js`。
2. **四家上海门店逐条核验**：由业务/门店运营确认地址、真实门店身份、营业时间/通道服务、仓位主键/库存/面积/实际仓高及真实图片。示例距、评价和价格不得当成后台真值。
3. **UI接线仍服从冻结母版**：H01/S01/S02/S5同门店实体、缩略/大图、标签语义、S01第三E存运营位规则及用户容量租期上下文都需一致。不要再引入旧BR03独立样式/四筛选/原型说明。
4. **用数据契约适配**：针对`MK_SH_...`和当前`SIM_...`建立明确ID映射，保留同源仓位identity；`size_option_id`与实际可售仓位/仓号分开。迁入的样例数据也须走新页面金额单一来源。
5. **测试门禁**：逐实体映射、真实缺图占位、地址/定位兜底、容量与租期、无匹配/售罄、组合仓和单仓下单；完成后按新候选SHA跑375/390和核心链，不能沿用签收SHA的QA结果。
6. 现在**不迁移代码或图像、不修改冻结SHA、不建新部署、不删除来源分支**。待后端/业务真实数据介入时再启动专项实施。

## 5. 其他分支清理门禁

- 已证实存在历史Netlify UAT部署分支 `uat/rc2-pr96-20261110`，不能因为Open PR不引用而删除。
- `backup/`和`release/`为版本回滚来源，默认保留。
- `governance/`的Squash源分支与已归并PR的当前文档可能字节一致，但仍承载原始提交关系；只有来源/部署/标签审计齐全且取得具体删除授权后才可清理。
- GitHub Tags公开资源查询当前工具限制，未获得完整Tag→commit依赖表。不要把“未查到”表述为“没有Tag”。

## 6. 处理建议

| 对象 | 建议 | 触发条件 |
|---|---|---|
| `feature/br03-s01-s02` | **保留并交接独立素材/中央ID目录** | 业务确认门店/仓位身份及图片来源后启动数据专项 |
| `br01-h01-connect-03-isolated` | **保留历史桥接证据，禁止回滚接线** | 新版中央路由已有替代证据并完成归档 |
| `uat/rc2-pr96-20261110` | **历史部署引用保护，禁止删除** | 旧站迁移/停用及回滚方案批准 |
| 旧PR #22/#24/#26/#33/#35/#36/#47 | **留存视觉和QA来源，当前不整体合并** | P1-A3 QA知识覆盖查漏后逐条提请归档 |

**结论：** 23个双基线无同路径资产+3个旧H01桥接文件已按精确Git blob留存可追溯清单。未发现依据足以授权立即删除任何独有历史分支。
