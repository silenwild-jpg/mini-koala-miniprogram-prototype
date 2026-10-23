> **V2.7.4.17.3 业务口径覆盖说明：** 源月租现已确认属于折扣前基准价；本文件中相关 `BUSINESS_TBD` 表述仅保留为当时历史状态。

# V2.7.4.17.1 — Baseline Blocking Hotfix

## Status

Candidate baseline after closing the V2.7.4.17 independent-review blockers.

This patch is intentionally narrow. It does not redesign frozen page structure, change the discount engine, add production LBS, or redefine lifecycle business rules.

## Fixed blockers

### 1. H01 runtime / fact integrity

- Removed the `index`-undefined path in the H01 recommendation renderer.
- All three recommendation cards now use one `renderHomeStoreCard(card, profile, index)` path.
- Visible store name, district, address, storage type, route source, price source, badge, click target, and `store_id` are derived from the same store profile.
- Store imagery stays as `门店环境示意`; unsupported store feature labels are not inherited from the old static card.

### 2. H01 recommendation roles

Default Guomao demo route:

1. **距离最近** — nearest store by current demo route source: 三元桥店, 3.2km.
2. **5km内低价** — lowest positive `display_price_min` among remaining stores within 5km: 酒仙桥店, ¥150/月起, 4.8km.
3. **模拟促销位** — separately configurable promotion store; default changed to 安贞店 so it does not collide with the low-price slot.

The promotion slot remains demo configuration only and is not written into the formal store data source.

Home recommendation cards now show the actual entry monthly rent (`display_price_min`, `/月起`) so the visible price matches the low-price selection rule.

### 3. Size option vs physical unit semantics

Before payment:

- `size_option_id` = selected capacity option.
- `representative_unit_no` = representative display number only.
- `actual_unit_id = null`.
- `unit_identity_type = SIZE_OPTION`.
- Legacy `unit_id` remains only for prototype compatibility and is explicitly marked `LEGACY_REPRESENTATIVE_DISPLAY`.

After successful payment in the internal prototype:

- O02 runs an explicit demo allocation step.
- `actual_unit_id` is created only at that post-payment allocation event.
- `unit_identity_type` becomes `ACTUAL_UNIT`.
- `actual_unit_assignment_source = DEMO_POST_PAYMENT_ALLOCATION`.
- Password / access / O03 physical-unit presentation prefers `actual_unit_id`.

The demo allocation currently chooses the representative candidate as the allocated physical unit. This is an internal prototype behavior only; production must obtain the actual unit from the real-time inventory/locking service.

### 4. Viewing branch identity handoff

V01/V02 now preserve:

- `size_option_id`
- `representative_unit_no`
- `actual_unit_id`
- `unit_identity_type`

A size-option viewing appointment is labelled as a capacity-plan appointment instead of prematurely calling the representative number a physical unit.

## Price business gate

The question **“源月租是否属于折扣前基准价” remains BUSINESS_TBD**.

This hotfix does **not** alter the term discount engine or reinterpret `display_price_min` as a confirmed pre-discount list price. H01 only uses `display_price_min` as the current source-data entry monthly rent for store comparison.

## Remaining non-blocking limitations

- Distance still uses the existing demo route SSOT / deterministic fallback, not production LBS.
- Promotion store and badge are simulated configuration.
- Post-payment `actual_unit_id` assignment is a prototype simulation, not a real inventory lock API.
- New Chromium visual screenshots could not be completed in the current environment because the headless browser navigation hung / remained restricted; no new visual-proof claim is made.
