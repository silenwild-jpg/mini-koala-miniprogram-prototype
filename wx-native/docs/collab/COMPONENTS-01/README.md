# COMPONENTS-01 公共组件层

基线：`8daf22a`（V2-FOUNDATION）。本批没有在微信开发者工具里编译或截图，校准按张坤 2026-11-20 的要求留到后续批量执行。

## 新增组件（已在 app.json 全局注册）

| 组件 | 用途 | 关键属性 |
|---|---|---|
| `mk-empty` | 空态 | `icon` `title` `sub` `card` `has-action`；按钮放插槽，带 `mk-empty-btn` |
| `mk-cell` | 列表行 | `icon` `title` `value` `badge` `arrow` `divider` `strong`；`bindtap` 和 `data-*` 直接写在组件上 |
| `mk-notice` | 提示条 | `title` `text` `tone`（空 / warn / err）`link` `plain`；取代 `mk-after-note`（已删）和 `ac-notice` |
| `mk-field` | 表单项 | `label` `mark` `mark-tone` `error` `hint`；输入控件放插槽 |

## 迁移范围

- 空态 18 处、提示条 16 处、表单项 20 处、列表行 5 页。删掉 58 条不再使用的页面样式。
- 按压反馈：187 个可点 view 加 `hover-class="mk-tap--hover"`；按钮不再用 `hover-class="none"`（禁用态除外）。

## 没迁的（static_check 里登记为 PENDING_HANDWRITTEN，只拦新增）

- 找仓域专用空态：`mt-empty`（仓位推荐）、`sd-empty`（门店详情）、`sl-empty`（门店列表）。
- 交易域和线索域提示：`ag-notice` `cf-notice` `lnd-notice` `ldf-notice`。
- 线索分包 5 页的表单项（`ldf-field`，大标签带必填标记）、收藏页的自定义行、个人信息页弹层里的两组输入。

## 要在开发者工具里确认的点（批量校准时一起看）

1. 自定义组件宿主节点上写的 `class`（`ec-gap` `eb-gap` `rf-note` `pf-note` `lpg-emptywrap`）是否生效。
2. `mk-empty` 插槽里的按钮是否居中、两个按钮是否并排。
3. `mk-cell` 的按压底色只盖住行内容区，不到卡片左右边。
4. `hover-stop-propagation` 是否阻止了外层卡片同时变色。
5. 四个类名的按压态选择器是否压过页面里给按钮定底色的规则。
6. 演示工具页「公共组件」一节是四个组件的集中样例，`data-calib` 以 `cell-` `notice-` `empty-` 开头。

## 门禁

单测 186/186；静态检查 0 错误（新增按压反馈、禁止手写空态两类规则）；页面模拟 36 页 6680 次调用 0 异常；订单冒烟 6 单 960 次调用 0 异常；主包约 1480KB（按文件粗算）。
