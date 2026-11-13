# RC2-CLEAN-MIGRATION-01｜运行时文件移植清单

- 日期：2026-11-13
- 目标分支：`integration/rc2-clean-migration-01-20261113`
- 起始 main：`274c5110aa18af7ed71d92533ab126ebbbd11f75`
- 来源候选 PR #175 HEAD：`e7e60f110f13b2d2f2eab3ba484ac50418e54211`
- 当前提交状态：仅移植运行时文件；未合并 main；未部署；最终视觉签收与微信原生上线门禁仍保持 HOLD。

## 移植范围裁定

main 与来源候选的 `app/` 树差异为112项（新增83、修改29）。本批移植99项：

| 类型 | 数量 |
|---|---:|
| wrapper | 1 |
| html | 9 |
| js | 26 |
| css | 19 |
| json | 2 |
| images | 34 |
| svg | 8 |
| other | 0 |
| 合计 | 99 |

明确排除13项：10个未引用的导航探索资产（`app/assets/nav/current-four-01b/` 8项、`app/assets/nav/nav01e-candidates/` 2项）和3个 `qa/` 目录下的视觉重建工具。当前运行时实际引用 `demo/assets/nav-current-01c/` 下的8个双态SVG，因此这些图标属于本批99项。

## 依赖核对

1. 中央入口 `app/central-review-02g.html` 依赖 `demo/fixtures.js`、`demo/central-contract.js`，并按路由加载 H01/CAP/ITEMS/S01/S02/S5/BOOKING/QUICK/O01/M01 等页面。
2. 统一运行时入口 `demo/index.html` 加载共享样式、`fixtures.js`、`demo-core.js`、手机号验证、门店地理、容量单位、生命周期、推荐策略、S01 R2内容及 `app.js`。
3. H01 由 `home.html`、`home-bridge.js`、`home-recommend-policy.js`、H01状态策略/实现文件及相应CSS组成。
4. CAP/ITEMS的1.67MB/1.26MB页面本身也是来源候选中的修改文件，已纳入本批99项移植；保留页面内嵌素材，来源blob分别锁定为 `a1496aa6e4e778da0224b0456ef534c081f9260c` 与 `8bd6d0b32036b97e3a3f337d159cf8e8cb2588c2`。它们继续依赖本批的 `cap-bridge.js`、`items-bridge.js`、共享 `demo-core.js`、`fixtures.js` 和新增unit-r3图片。
5. S01 R2由 `s01-r2-live.html`、`s01-r2-bind.js`、`s01-r2-content.js`、R2样式及新增2张WebP素材组成；S5通过 `br04/s5/location-ranker.js` 与共享 `br04/bridge.js` 联动。
6. S02使用 `app.js`、`s02-central.css`、unit-r3缩略图；门店卡片/详情环境图由fixtures映射到 `assets/store-curated/v1/{storeId}/card.webp` 与 `hero.webp`。
7. M01/订单生命周期由 `account.html/js`、`lifecycle-contract.js`、`lifecycle-ui.js`、`m01-*`、`orders-ux.css` 等共同组成。
8. 已核对关键未修改依赖在main中存在：`business.html`、`br04/quick/index.html`、`br04/adapter.css`、基础样式与手机号验证资源、历史仓型图；CAP/ITEMS属于本批迁移文件，不作为未修改依赖处理。
9. 动态资产路径（`assets/${store.photo}`、`assets/unit-r3/thumb/unit-r3-${tier}-336x312.webp`、`assets/nav-current-01c/${icon}-${state}.svg`）按fixtures/模板映射核对，不把字符串扫描中未展开的模板占位误判为缺失文件。

## 运行时文件清单

| 动作 | 路径 | 来源blob SHA | 字节 |
|---|---|---|---:|
| UPDATE | `app/central-review-02g.html` | `1d9ed53583bce647c70071c6fb3f92433dfc475b` | 4023 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/account.html` | `6c99991f989dfebb31ea2dfe2799c2cc7b0fee09` | 1501 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/account.js` | `776496796a7c5f814d523db9dbf708d37e9322ee` | 29601 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/app.js` | `e194162339bc5a1bc5f18921c81ed5174ef7b2c9` | 93558 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/nav-current-01c/calendar-active.svg` | `aa9b86c3873f2b7f55bfe5ea4700274c1e7b1a22` | 431 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/nav-current-01c/calendar-inactive.svg` | `6292e38d554ee97c1e4691dd51ebf414a3a6b934` | 394 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/nav-current-01c/home-active.svg` | `5f079973b52342d34414f718139d9e43cba43ffb` | 386 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/nav-current-01c/home-inactive.svg` | `dd1b7af41acbb3121b68c57e6708ed396bbcef71` | 402 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/nav-current-01c/mine-active.svg` | `76cbb620aa0498de665ffa0caa6ec831ae50bdd0` | 291 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/nav-current-01c/mine-inactive.svg` | `9dbd6045784058269473d38d7b3139f13fd458a2` | 384 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/nav-current-01c/stores-active.svg` | `984da419f47c676ca597d8e6665da6558f312395` | 418 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/nav-current-01c/stores-inactive.svg` | `e5f43caa9220e307a4251a1e0bc6fc16309f1960` | 520 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/s01-r2-a-1.webp` | `eb93b338275b49991d7407099eea5373c1076185` | 73332 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/s01-r2-a-2.webp` | `66ff289af021c5fdc992e6de435808d7281ac5a7` | 73758 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_BJ01/card.webp` | `2f2d0a649ddd248171c71093d4a4e5b43aeb025b` | 16744 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_BJ01/hero.webp` | `e5a859ac64ee467aa6b61efdaa66e3965908d33a` | 42750 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_BJ02/card.webp` | `e944674e9106c19287206b3fa85e99a8babb655a` | 17196 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_BJ02/hero.webp` | `92bd79639bedcaea41c3b58065ebcd61a228d759` | 41974 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_BJ03/card.webp` | `453632d8cec6ac52df4f0bc68fb8e19ccae20456` | 23060 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_BJ03/hero.webp` | `96aacbfc9b028bb272e2598d1d0a3fd21c176dc3` | 59218 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_BJ04/card.webp` | `79ef04977eccc0f62369820e610fb98bf349c7d5` | 15574 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_BJ04/hero.webp` | `9c0d425ea9eda673e62790ce7c6a25bc725bae35` | 38166 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_BJ05/card.webp` | `f8d23a6d4f7a6514c196b6f055012105cd6405dd` | 14640 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_BJ05/hero.webp` | `94657bcf940db7aa42f8311f78754117da432d18` | 36000 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_BJ06/card.webp` | `9cfb2d6540e9db447da4ea0da19bebf76faa2b7d` | 15634 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_BJ06/hero.webp` | `68c0cac79f8ffbf8a99daffeb205bf8fae5504b6` | 43948 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_BJ07/card.webp` | `836103bc3da2bbb62153c05a499f60ae5ff844ba` | 20462 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_BJ07/hero.webp` | `ef10b222475a8a512d91d61d61449785030ecead` | 50250 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_BJ08/card.webp` | `b59c7816acfebcc98f66953049e0931bc3660013` | 19508 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_BJ08/hero.webp` | `0bdad357243c25367f24ce5491546a3c8ccecd02` | 56882 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_BJ09/card.webp` | `50e55be1b9503c0fd44f21a2f366f82aaac6b411` | 21694 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_BJ09/hero.webp` | `a4da8de37a6a9f8f8ba3fc412cdcd18b735d2cb8` | 50834 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_SH01/card.webp` | `51464781a3438887126430715cc3eaaeb3f90d7f` | 29650 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_SH01/hero.webp` | `b6e8f8921f9854ae5c7d0795dcb3a89598d6d904` | 85870 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_SH02/card.webp` | `95292f8a8c811ad09a7de03204b00fca9a166208` | 21732 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_SH02/hero.webp` | `925df249ab4b2d708ba8920b91cd1cbb69e1130d` | 52542 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_SZ01/card.webp` | `77644520c6221f6819d54d6f487926874ba7ed23` | 29500 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/SIM_SZ01/hero.webp` | `b6499feb1db39e9114d53eb32b769058b6f39fcb` | 71676 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/store-curated/v1/mapping_manifest.json` | `fd341d50b65801a0fed3984ac892e349b42a66bf` | 15959 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/unit-r3/asset_manifest.json` | `8f102ee23b0259c9c62ec261b922f647de0d3bea` | 1098 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/unit-r3/cap/unit-r3-large-640x480.webp` | `748e3d4a71c586d602e4929d1254cfd6d0571454` | 19224 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/unit-r3/cap/unit-r3-medium-640x480.webp` | `338df6bfab137af54c2224af49b38fdf50dc47b0` | 15744 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/unit-r3/cap/unit-r3-mini-640x480.webp` | `66e3aa610ebf2d1456d9cc9fad87bcbbcff20955` | 13068 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/unit-r3/cap/unit-r3-small-640x480.webp` | `f4e5452d9bf871831f8c1f8c11d2b509578fd1e9` | 14494 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/unit-r3/thumb/unit-r3-large-336x312.webp` | `0285a95a34f672ff4475464d15108ed5782c5457` | 7636 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/unit-r3/thumb/unit-r3-medium-336x312.webp` | `b4cefd206a3ecd976e98414a1db648d6016cc9f6` | 7004 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/unit-r3/thumb/unit-r3-mini-336x312.webp` | `5344c0119981579a82916947e9e0a6e16689615c` | 6404 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/assets/unit-r3/thumb/unit-r3-small-336x312.webp` | `f80df287a828163f57d8845af058a5e3140a72bf` | 7120 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/br03-policy.js` | `3177ccba744eac9ba8f550aa25029dee68b1748a` | 3494 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/br03-promo-copy.css` | `e47ad0283c95fd488bb1f33abc5c63d473882974` | 5531 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/br04/bridge.js` | `34afb7a0010e3df411103924b287fe1c5fac3921` | 45491 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/br04/o01/index.html` | `e8969b4b23731bc65430a1ed2725b32b21f7761f` | 4985 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/br04/reserve/index.html` | `a3d0ba0279a5a609119b3b0469c8860b00b897f5` | 5285 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/br04/s5/index.html` | `baae00a3394af3b30293f072fe3a97d30f231ba0` | 4568 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/br04/s5/location-ranker.js` | `db2a9b4bc0ab01d00d5bd4a720cdd61464840ed8` | 3093 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/br04/s5/s5-native-flow.css` | `fa4f9acb51fbc39d5ff53862917ae9f9611a7e8f` | 13095 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/br04/s5/style.css` | `1cab407b8b978d44ac3345d60f19bae3b4d2c2b8` | 18442 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/business-bridge.js` | `bb2377a601ee1d2fbfe413b7175145d4f01df4ba` | 10291 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/cap-bridge.js` | `ef6a9f98b5f4e4567a69dd1f63eeab86e6523a22` | 9991 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/cap.html` | `a1496aa6e4e778da0224b0456ef534c081f9260c` | 1674546 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/central-contract.js` | `dcfc0edbe140de1212d40f68747f879d04bdf905` | 6247 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/demo-core.js` | `2f917ef89fe06a3dd3564b5ad86029963be1a91e` | 38529 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/demo.css` | `3d7b40e8540fe0ee623177986e4eb2355cd07d2f` | 3844 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/fixtures.js` | `b632e2937ffbaf06f431322bbeefa7baf1bdd099` | 98636 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/global-store-tags.css` | `f34d94db41e66ee5d9296f39ca090f1294c3a9b0` | 2193 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/h01-state-impl-01.css` | `713c418185549bd888e02d918e0723c2c12247d8` | 8690 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/h01-state-impl-01.js` | `ed1a5369aaa4dbc415aa62390107c91a732d2fe2` | 22849 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/h01-state-policy-01.js` | `e29e2ec43d71f47070738188d849ba4bf8bf3523` | 9515 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/h01-ux-review-02.css` | `6ed385705cd9bc4d9a12b85c6b5a63ed7d61e8ef` | 916 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/home-bridge.js` | `77ea7f3666efc31cdaa6b2bbf27095c986ff42c4` | 11372 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/home-recommend-policy.js` | `e8b8483d17e7ef80864589680a13e6a0ec935f54` | 1821 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/home.html` | `4de8b9619684d48929a973b219f47c63af15331f` | 28833 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/index.html` | `c14fc5c4e462e0de5de3b5c38a0e43bd4cef4475` | 2535 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/items-bridge.js` | `107887890deff7c62756cd88a684f0385a466767` | 6140 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/items.html` | `8bd6d0b32036b97e3a3f337d159cf8e8cb2588c2` | 1268667 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/lifecycle-contract.js` | `1971beb53186aa7ef74e1dc63c7c21dfe144dda1` | 1811 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/lifecycle-ui.js` | `e084dff8cdd262b70a6068573981b4bfb92dd23b` | 7406 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/m01-lifecycle-shell-02.css` | `8b2ea4cfdfd57cb89d64298e3c8a250bfa877a4c` | 3804 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/m01-order-route-01.js` | `e98319e66dd10a5bf28fa7f466160ebb416605bf` | 963 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/m01-rebaseline-01.css` | `78fc320024792bf87fa2baa6dc388460ede2dd5f` | 7023 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/m01-rebaseline-01.js` | `8232e653485e92e366731c1e70e56bdfab0992cf` | 24042 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/m01-service-shell-02.css` | `5df8e983afd37e8ace35829cb93485eb932c3341` | 5350 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/orders-ux.css` | `d1d3abe5b7ef07057c7392af4c805ee0bef56c3a` | 4625 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/phone-auth.js` | `7bfbc5b0a5c07388cae692e624375672f087ee05` | 8582 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/presentation-policy.js` | `09a44601bbf7fc8a05cfb32590b1e470a5364b0b` | 4536 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/recommendation-policy.js` | `939b21c857893c172cc01a62f11aeda170714350` | 2184 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/review-clean.css` | `387e0c5c94f15fda5f30c53985723bbd849ce246` | 445 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/s01-motion-micro-01b.css` | `6708a7cc4b3d78673b59ff07fe3331f7242b64ee` | 763 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/s01-p1-flat-density.css` | `7077bbd49c622f93d3cc160d85ef17b8ebf0208f` | 3113 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/s01-r2-bind.js` | `419e71e542d8638d88d6e74f0aebc783ea7f3c75` | 21357 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/s01-r2-content.js` | `1b4f8a3d597e9ce91b24ebd03132544dd88b6ab3` | 3485 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/s01-r2-live.html` | `2a1f5e949b669d8a9a992f4815869d6e3d5cf843` | 216163 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/s01-r2-price-surface.css` | `b6c998bb3343d4ea28d68e9d4a159c8ef3b6b94c` | 799 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/s01-reference-layout-02.css` | `828b822502ece5971ee770b9974c7400eccbd5d1` | 18683 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/s01-vis-decision-02.css` | `fdc609647255a08d86f7782f4e67d9bcf4bd782b` | 20368 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/s02-central.css` | `6a7130031682148f376f2d5ec43b74d3180e3a7c` | 8268 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/space-unit.js` | `01f9768252325ab2b1c4c239e1a1bb1e12ba12ed` | 1645 |
| ADD | `app/prototype/parallel/core-journey-fix-01/demo/store-geo.js` | `556377ed323d9fcb32fc08e7ddfa5deaab6c3cfc` | 3553 |
| UPDATE | `app/prototype/parallel/core-journey-fix-01/demo/visual-align.css` | `45237b7a63b2c1a53a2d7712303dd02be4223012` | 12963 |

## 排除清单

- `app/assets/nav/current-four-01b/svg/calendar-active.svg`
- `app/assets/nav/current-four-01b/svg/calendar-inactive.svg`
- `app/assets/nav/current-four-01b/svg/home-active.svg`
- `app/assets/nav/current-four-01b/svg/home-inactive.svg`
- `app/assets/nav/current-four-01b/svg/mine-active.svg`
- `app/assets/nav/current-four-01b/svg/mine-inactive.svg`
- `app/assets/nav/current-four-01b/svg/stores-active.svg`
- `app/assets/nav/current-four-01b/svg/stores-inactive.svg`
- `app/assets/nav/nav01e-candidates/mine-active.svg`
- `app/assets/nav/nav01e-candidates/stores-active.svg`
- `app/prototype/parallel/core-journey-fix-01/qa/prepare_vis03c.py`
- `app/prototype/parallel/core-journey-fix-01/qa/test_vis_rebuild_03b.cjs`
- `app/prototype/parallel/core-journey-fix-01/qa/test_vis_rebuild_03c.cjs`

## 干净分支 CI 验证结果（2026-11-13）

- GitHub Actions：Run `43366861599`，结论 `success`。
- 被测提交：`345ee13fe0aa576ce0a5fedd2ced682dbedf40ed`。
- main 基线仍为：`274c5110aa18af7ed71d92533ab126ebbbd11f75`，未发生变更。
- 静态迁移核验：99项 app 变更与清单一致；12个页面入口、114条HTML本地依赖、32份CSS、4条CSS本地资源、26份JS语法、12组门店图片、4档仓型图片、8个导航SVG通过。
- 浏览器回归：H01 20状态×2尺寸（40/40）；CAP/ITEMS 4条链路；S01 4组浏览状态；S02 6组门店图片状态及租期状态；S5 16个状态、12条流程；H01/S01/S02/S5/M01双尺寸冒烟无JS错误及横向溢出；BOOKING/QUICK/O01六组双尺寸流程通过。
- 视觉与导航证据：30张最终视觉回归截图；导航12张截图、8项语义/路由检查、4项底部像素对照通过；导航自动化结果无阻断项。
- 证据包：`RC2-CLEAN-MIGRATION-01-UNIFIED-375-390`（Artifact ID `14010822125`）；内部评审包 `RC2-CLEAN-MIGRATION-01-REVIEW-BUNDLE`（Artifact ID `14011450466`）。
- 构建包：`MiniKoala_RC2_CLEAN_MIGRATION_01.zip`，SHA-256 `9e10f5e632bc7cf4b452f76fdde690eaa382b5a7f7c2a785faf92b1dc601478a`。

## PR#176 外部状态检查说明

- PR #176 保持 Draft/HOLD，目标为 `main`，未合并。
- 旧工作流 `SITE-ACCESS-03C` 在RC1完整性白名单断言处失败：它只允许 `demo/app.js` 与专用QA脚本变更，而本分支按计划包含99项RC2 app变更；该工作流未进入其浏览器回归步骤。此项属于旧RC1工作流与RC2集成分支的检查范围冲突，不计作RC2干净迁移回归失败。
- Netlify状态检查指向旧项目 `mini-koala-internal-rc1-review` 并返回失败。当前没有部署；该检查的具体失败根因尚未确认，不能把它解释为新评审包已部署。
- 不隐藏上述失败，也不修改旧工作流来规避检查；后续需单独裁定旧CI/Netlify配置如何与RC2分支隔离。

## 尚未解除的门禁

1. 导航激活态图标仍需人工视觉签收；自动化只证明尺寸、颜色、资源加载、点击语义和像素范围，不替代设计负责人确认图形是否符合最终品牌规范。
2. 当前为 HTML/Web 原型，不是微信原生小程序包；微信原生底栏、真机、VoiceOver/无障碍、后端/CRM、真实支付及生产数据均未验证。
3. UAT 尚未签收，`main_merge_allowed=false`，`deployment_allowed=false`。本分支仅供内部评审，不创建面向 main 的合并 PR，不部署，不宣称可上线。
