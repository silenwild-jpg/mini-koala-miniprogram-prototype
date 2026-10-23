# Mini Koala Prototype Baseline 1.0

Frozen from **V2.7.4.18 — Baseline Closure PATCH** after the W3 independent baseline review and closure cycle.

## Baseline scope

This is the current internal product / business-demo prototype baseline. It is not a production engineering specification.

Frozen product structures include H01 dual-task home, Estimator flow, S01 store discovery, S02 store inventory, U01 transaction decision, Q01/O01 order flow, M01 lifecycle, real store/size-option data integration, EStore placement and current term-pricing rules.

## Explicit demo / deferred boundaries

- Distance and route values remain Demo Route Data / deterministic demo fallback, not production LBS.
- Production actual-unit allocation / inventory lock requires a backend API.
- WeChat customer service requires production corpId/url configuration.
- Payment remains prototype behavior.
- Real unit length/width/door/shape fields remain future data work where not sourced.
- EStore dedicated detail page remains future scope.

## Regression gate

Future PATCH work should start from this package and must keep `qa/run_baseline_v27418.js` green before delivery.
