# BRANCH-03-HIFI-03｜S01/S02 可移植模块与中央接线准备

**2026-10-23｜内部演示原型｜READY FOR ISOLATED INTEGRATION，正式 MERGE = HOLD**

## 本包是什么

- `isolated/`：来自 HIFI-02 的独立 S01/S02 页面、CSS、素材；只追加 `child-bridge.js` 引用，且订单意图仅做上下文透传及报价引用失效保护。页面视觉结构未重新设计。
- `module/`：浏览器侧隔离挂载适配器（独立 iframe + 同源消息桥），用于中央**隔离接收/演示接线验证**；**不是可以直接覆盖中央 HTML 的补丁**。
- `preview/`：模拟中央宿主入口，展示 CAP 未确认租期、S5 已确认租期、S01/S02 切换、标准化订单意图事件。
- `integration/`：字段映射、允许移植区域、依赖与回退说明；中央可以据此定向迁移 DOM/CSS/逻辑，但须单独开展中央接线测试。
- `tests/` 与 `evidence/`：回归脚本、自动检查结果和源视觉对照。

## 本地运行

在**本包根目录**执行：

```bash
python -m http.server 4313
```

打开 `http://localhost:4313/preview/` 检查宿主桥，或 `http://localhost:4313/isolated/` 检查原独立演示页面。不建议用 `file://` 运行跨文档消息或演示存储。

需要嵌入另一个同源宿主时：

```html
<div id="br03-container" style="width:390px;height:844px"></div>
<script src="/branch03/module/branch03-module.js"></script>
<script>
  const br03 = MiniKoalaBranch03.mount('#br03-container', {
    baseUrl: '/branch03/isolated/',
    requirement: {
      capacityM3: 3.53, source: 'CAP',
      rentalMonths: 12, termConfirmed: false
    },
    onOrderIntent: intent => {
      // 中央统一 revalidate(selection+term+quoteRef)，准备 O01。
      // 不把分支演示租金写成应付金额。
      console.log('O01 intent only:', intent);
    }
  });
</script>
```

### 中央只需要的公开接口

`mount` 返回 `openS01()`、`openS02(demoStoreId)`、`setRequirement(context)`、`getState()`、`showScenario(name)`、`subscribe(callback)`、`destroy()`。其中店铺 ID 仍是本分支演示 ID（`jingan / xuhui / changning / pudong`），中央需要进行 ID 映射，不能当作已有正式门店主键。

**只监听事件，不直接依赖 iframe 内部 DOM：**`br03:order_intent`、`br03:booking_intent`、`br03:favorite_changed`、`br03:nav_request`、`br03:state_changed`（事件命名实际由 `kind.toLowerCase()` 产生，例如 `br03:order_intent`）。也可使用回调 `onOrderIntent/onBookingIntent/onFavoriteChanged/onNavigationRequest/onStateChanged`。

## 重要边界

- 母版 `CURRENT_CANDIDATE.zip` 未修改，中央已冻结 `#s5/#s7`、`renderUsage/go/state`、O01 报价校验与订单保存未触及。
- 保留 S01 三枚服务标签与独立匹配数量行；保留 S02 已签收结构、仓位筛选、收藏和直接下单意图；地图模式、对比功能不恢复。
- 传入合法 `rentalMonths` 且 `termConfirmed !== true`，仍以未确认租期处理；中央调用 `mount` 时未传需求默认**无需求**，不继承独立演示版预置的6个月。
- 分支只是**订单意图生产者**，不持久化中央报价或订单，也不修改 `mini_storage_quote_current`、`mini_storage_order_current` 等键。
- 当容量或租期在分支内改变，会清空旧 `quote_snapshot_ref`。只有报价引用绑定的 `quoteStoreId` / `quoteUnitId` 与当前单仓选择匹配时，才可透传该引用；MERGE/O01 仍必须完整校验和重新准备金额。
- 组合仓 `units[]` 属于**一笔订单意图**，中央负责一主单汇总。预约为 `BOOKING_LEAD_INTENT`，不等于订单。
- 收藏变更仅发事件给宿主；原独立页面的 `br03_demo_favs` 是演示私有键，中央正式收藏键由 MERGE 对接。
- 图片、评分、库存、距离及金额是**内部演示示意**，并非核验后的实时业务数据。U01 未取得同等级最终视觉签收。

## 检查状态

- HIFI-02 原页面能力在本包复测：**64/64 PASS**。
- 本包 iframe 消息桥在真实 Chromium `srcdoc` 测试夹具中复测：**52/52 PASS**。
- JS 语法、ZIP 一致性校验通过。Chrome 对正常 HTTP URL 导航的环境拦截未解除；**未宣称中央页面实际集成成功、微信真机测试通过或发布就绪**。

详见 `integration/MERGE_WHITELIST.md`、`integration/CONTRACT.md`、`integration/INTEGRATION_CHECKLIST.md`、`QA_REPORT.md`。
