# Visual Elevation V2.1 — Secondary Density Polish

## Scope

This PATCH only refines three pages previously classified as local-density issues:

- S5 租期与推荐
- O02 订单结果
- M01 我的

It is a visual-only layer. Business copy, DOM structure, recommendation logic, price/state logic, CTA meaning, routes, and stored data semantics remain unchanged.

## 1. 租期与推荐

Goal: let the recommendation result become visible sooner and reduce the feeling of “controls stacked before the answer”.

Changes:

- current estimate summary changed from a raised white card to an editorial flat summary with a bottom divider;
- unselected term shortcuts are visually quiet; only the active term becomes a strong deep-green choice;
- custom-term row is flattened and reduced in height;
- moving-support note becomes an informative left-accent line instead of another rounded card;
- editable usage address becomes a flat utility row;
- recommendation plan cards and pricing hierarchy from the previous refinement remain unchanged.

Measured first-plan vertical offset at 375px:

- before: ~558px from S5 top
- after: ~501px
- reduction: ~57px

## 2. O02 订单结果

Goal: keep payment/order status as the single hero and demote the paid amount to a supporting fact.

Changes:

- status hero height reduced;
- paid/pending/payable amount changed from 30px hero-size price to 20px supporting price;
- order / next / help sections remain flat editorial groups instead of rounded cards;
- next-step block is flattened further to avoid a second card competing with the status hero;
- paid / pending / failed / inventory-changed states use the same density treatment.

## 3. M01 我的

Goal: remove dashboard-tile feeling while retaining clear service navigation.

Changes:

- profile remains the brand identity hero;
- current service remains the primary actionable service surface;
- referral promotion is flattened into an editorial strip;
- “我的记录” changes from a 2-column grid of rounded white tiles to full-width service rows with right-aligned status text;
- “更多服务” follows the same row language when expanded.

## Frozen boundaries

The following are unchanged:

- all user-facing copy;
- module order;
- recommendation and store selection;
- term and discount business rules;
- order/payment/lifecycle state logic;
- CTA semantics;
- page routing;
- localStorage/data contracts.

All three target `<body>` payloads remain byte-identical to the incoming V2.1 Density Harmonization baseline.
