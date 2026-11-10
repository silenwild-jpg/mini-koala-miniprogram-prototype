# RC2-UAT-ACCESS-01｜独立UAT版本与访问准入（2026-11-10）

**当前状态：SITE_CREATED / PACKAGE_PREPARING / DEPLOY_NOT_DONE / ACCESS_NOT_VERIFIED / HUMAN_UAT_NOT_RUN**

## 版本真相与可审查来源

- 唯一代码候选：PR #96，`integration/rc2-rebaseline-01-20261110`，保持 Draft/HOLD；`main` 保持不变。
- 当前最后一次已通过的浏览器/业务集成QA：GitHub Actions Run #42803434656，源码 `df852e2b7c46ab6f08fc0cf57d7fab5f6a06d858`，结果 success；后续新SHA生成的UAT上传包**必须重新验收**。
- 原本已有的 Netlify 评审站：`mini-koala-rc2-uat-private`，部署ID `6aec435e9496fc5463be573d`，2026-11-05手动部署，`commit_ref=null`；**不得当作PR#96的验收站**。
- 全新独立受控项目：`mini-koala-rc2-uat-pr96-20261110`；Netlify项目ID `bc2df934-a53b-4b99-b751-810b8781577f`，管理页面：<https://app.netlify.com/projects/mini-koala-rc2-uat-pr96-20261110>。
- Netlify项目已创建但尚无部署。该团队启用了强制SSO，当前团队只有1名成员，因此受邀非团队测试者目前**不具备访问资格**。
- 本连接内可用 Netlify 项目及权限管理，但**不支持上传站点文件、触发部署**。项目创建不代表有线上原型页面。

## 已交付/待验证的UAT部署包

CI按同一SHA从唯一来源创建隔离站点；对比原有VIS-11J/H01冻结素材哈希及S01两张WebP原始来源，保留旧U01路由阻断，禁止main归并、后台交易、真实支付或真实线索承诺。

- 包：`MiniKoala_RC2_UAT_PR96.zip`，根目录必须同时包含 `index.html`、`central-review-02g.html`、`rc2-uat-version.json`、`robots.txt`。
- 版本文件：`/rc2-uat-version.json`，其中 `source_sha` 必须与PR #96当前HEAD SHA、CI日志 `GITHUB_SHA`、`package-receipt.json` 三者完全相等。
- `package-receipt.json` 保存ZIP SHA256及每一个内部文件的manifest校验结果。**只有拿到可访问的UAT站并重新核对线上文件，才能将部署状态改为PASS。**

## 将包接入独立 Netlify 项目的操作

1. 打开上面的 Netlify 新项目管理页面，进入项目的 **Deploys**（部署）。
2. 选手动部署 / 上传文件，将CI交付的`MiniKoala_RC2_UAT_PR96.zip`解压为文件夹，然后把**含 `index.html` 的站点根文件夹**上传。若部署UI支持ZIP也可直接上传；**禁止将CI证据外层的 artifact ZIP 当作站点上传**。
3. 完成后从 Netlify 项目页面读取实际新Deploy ID、状态和地址；不可把历史站/默认域名存在当作部署成功。打开站点首页及 `/rc2-uat-version.json`，确认 `source_sha` 与GitHub当前HEAD完全相同。
4. 对测试人员做真实设备访问核验：至少分别用一台Windows浏览器与一台微信内置浏览器打开，检查SSO/权限、资源请求、页面跳转和基本触控。**只验UAT入口，不表示微信原生授权或支付已经集成**。
5. 目前只有1名Netlify团队成员。若非研发测试员没有团队账号，必须先解决受邀访问方式：可由管理者邀请Netlify团队成员，或者经业务批准将**独立UAT站**切换为强口令保护。不得公开展示或降低其他旧站点权限。

## UAT最小观察任务（3–5位非研发真实参与者）

| 编号 | 用户任务 | 判定要点 |
|---|---|---|
| U1 | 首页→附近门店→城市/搜索/三筛选→S02再返回 | 能找到合适门店、理解可租状态、保持列表位置 |
| U2 | 不知容量→CAP/ITEMS估算→S5→修改容量/租期 | 结果能够回流，无重复提问和错误返回 |
| U3 | 理解公开门店最低立方单价 / 单仓月租 / 整期折后租金 | 由真实用户自行解释三种价格；不得混淆 |
| U4 | S01或S5直接选仓→O01核费→模拟支付失败→恢复 | 容量/租期/优惠/管理费/押金和库存状态一致 |
| U5 | 预约填写手机号和用仓地址→确认回执 | 可以本机保存；真实销售系统收件仍阻塞 |
| U6 | 探索企业/组合仓、顾问服务和地图 | 页面链路可测试；真实共享库存、路线、顾问跟进不计PASS |

记录方式：屏幕录像/点击顺序/完成时长/用户原话与错误、页面及操作截图、日期、设备尺寸、浏览器、测试使用的完整SHA；每项缺陷须标 P0/P1/P2、复现步骤、预期/实际和负责人。

## 禁止夸大验收结论

当前最近一次GitHub Actions浏览器验证只是**脚本化用户操作**，不是非研发真实人群；没有证据支持实际客户价格理解、真实WeChat授权/支付、CRM销售跟进、真实库存与企业交易等已经通过。没有同SHA线上地址和访问截图前不得宣称UAT已开始。

**下一阶段门禁：**
- UAT-ACCESS-01A：同SHA隔离站点包+SHA256+CI双尺寸和核心链路PASS。
- UAT-ACCESS-01B：独立 Netlify 正式部署ID / 受控访客访问截图 / 线上JSON SHA核验。
- UAT-USER-01：真实非研发用户任务回放及P0/P1收口。
- RC2-MAIN：以上全部通过并经过业务视觉终签后方可评估；暂不合并。
