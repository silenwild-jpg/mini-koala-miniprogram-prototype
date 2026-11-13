# RC2-UAT-P1-FIX-01｜截图稳定性修复与新SHA证据

审计日期：2026-11-13  
主任务：[Issue #199](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/issues/199)  
实施：[PR #200](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/pull/200)

## 1. 范围与冻结
- **原签收版**：`41a8a079eb48049e1060512bddf71c226bfd3738`，PR #176 Draft / MAIN HOLD，未修改。
- **上阶段整合候选**：`281b3deab14a715fb61d20c50f6e1a5aedd5de0c`。
- **QA修复后的新整合候选**：`d5a4ff63e2b0cdcffb2e5be4c4e710b61497ae95`，分支 `integration/rc2-mainline-integration-01-20261113`。
- **合并方式**：PR #200仅合入独立整合分支，未合并main业务代码。
- **代码差异**：只修改两份测试脚本；没有改动app/、HTML、CSS、图像、业务规则、促销策略或Netlify部署配置。

## 2. QUICK截图稳定性
修改文件：`scripts/verify_rc2_merge_ready_04_browser.cjs`。

- 增加 `quickShot`，9个QUICK截屏状态统一调用；通过真实选中仓位ID和容量计算图片名。
- 断言实际 `.unit-row > img` 的 `src` 与仓型匹配，不允许用旧默认图代替已选仓图。
- 在截图前等待 `img.decode()`，检查 `complete=true`、`naturalWidth>0`、`naturalHeight>0`。
- 将所选仓位、预期缩略图及加载成功状态记录为 `imageChecks`。
- 新SHA Artifact内 `rc2-merge-ready-04/results.json` 确认：**18/18（9状态×2尺寸）通过，blockers=0**。

## 3. S01匹配态长截图
修改文件：`scripts/verify_rc2_single_candidate_03_s01_browser.cjs`。

- 在匹配态长截图前归零顶层页面、中央iframe、S01 iframe中HTML/BODY、#stage、#canvas滚动位置。
- 等待字体与当前图片解码，经过两个 `requestAnimationFrame` 完成状态稳定。
- 记录截图时各容器 `scrollTop` / `scrollLeft`。
- 新SHA Artifact内 `rc2-single-candidate-03-s01/results.json` 确认：`status=PASS`；375/390两尺寸 `scrollY=0`，各记录滚动容器均为0。

## 4. 同SHA自动化门禁
- [GitHub Actions Run #43452015757](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43452015757)：`completed / success`，`head_sha=d5a4ff63e2b0cdcffb2e5be4c4e710b61497ae95`。
- [新375/390 QA Artifact #14052280343](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43452015757/artifacts/14052280343)：真实下载并解压，包含374项证据文件，352张PNG。
- [新Review Bundle #14053215123](https://github.com/silenwild-jpg/mini-koala-miniprogram-prototype/actions/runs/43452015757/artifacts/14053215123)：本SHA构建包，不代表已部署。
- 全流程门禁包括容量、促销/优惠券/赠期、导航、H01、CAP/ITEMS、S01/S02、S5、M01、BOOKING、QUICK、O01，并对375/390测试，均通过。

## 5. 新旧证据像素复核（实际ZIP逐项比对）
比较范围：上阶段整合SHA的Artifact #14048525517与本次修复SHA的Artifact #14052280343；两份均有374个同名文件（352张PNG）。

| 指标 | 数值 |
|---|---:|
| 全部文件字节完全相同 | 334/374 |
| PNG像素完全相同 | 327/352 |
| PNG有细微像素变化 | 25/352 |
| 单图强差异像素比例超过1%的PNG | 0 |
| 此前重点的11张异常截图，新整合版修复前后逐字节相同 | 11/11 |

**强差异定义**：两图尺寸相同、任一RGB通道绝对差>15的像素占全图像素数超过1%。

旧RC2签收版Artifact #14026423639与本次新SHA仍有此前11项明显差异。这是旧快照与新快照捕获时展示的仓型图片/滚动起点不一致；不能宣称历史截图逐像素一致，也不能为了追求截图一致把正确加载的新版图片回退成旧静态占位图。

本次修复使测试用例明确断言图片解码和滚动位置，其目的在于稳定取证，不改变页面业务表现。

## 6. 验收裁定
| 门禁 | 结果 |
|---|---|
| QA脚本修复并受控归并独立整合分支 | PASS / MERGED |
| 新候选SHA全链路375/390自动化 | PASS |
| QUICK选仓图片加载 | PASS 18/18 |
| S01滚动位置归零 | PASS 375/390 |
| 业务页面DOM、CSS、图片资源变更 | NONE |
| 两阶段新候选的明显截图差异 | NONE（强差异>1%为0） |
| 新候选用户人工视觉/UAT签收 | HOLD |
| 业务代码合并main | HOLD / 未授权 |
| Netlify/正式部署 | NOT DEPLOYED |

**下一动作**：把新SHA评审截图提交用户核对；签收新SHA之后才能进入业务main合并门禁。新候选已过技术QA，不等于用户已完成视觉签收。
