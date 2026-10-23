# Visual Elevation V2.1 — Secondary Density QA Report

## Result

**PASS**

## Target pages

- 租期与推荐 (S5)
- O02 订单结果
- M01 我的

## Runtime coverage

Primary coverage:

- 375×812
- 390×844
- S5 recommendation state
- O02 paid state
- M01 active-order state

Additional O02 state coverage:

- paid
- pending
- failed
- inventory_changed
- both 375×812 and 390×844

## Runtime result

- JavaScript page error: 0
- document horizontal overflow: 0
- support launcher / main CTA collision: 0
- target-page abnormal visible-content overflow: 0 (global support launcher internal width is a known shared component exception)

## Density metrics

### S5 recommendation

- first recommendation card offset: ~558px → ~501px at 375px
- estimate summary: white rounded card → transparent editorial group
- moving note: filled rounded card → transparent left-accent note

### O02

- result hero height: ~166px → ~146px
- paid amount visual size: 30px → 20px
- order section background/radius: transparent / 0px

### M01

- “我的记录” layout: grid → block rows
- record tile background: white → transparent
- record tile radius: 16px → 0px
- record row height: ~72px → ~56px
- referral card: filled rounded surface → flat editorial strip

## Body freeze

All three target page bodies are byte-identical before/after:

- Estimator / recommendation body SHA-256: `1a8e85f2a3c956d0ea2e1da8234939cf1698aac11fcd3f6fa8087a7bb688091d` (full body element snapshot)
- O02 body SHA-256: `a6a8f92e711ffa90efad9b40eeae98679b4f6b2f520f27ee6e1aeb7691fed788`
- M01 body SHA-256: `3804f1ed9265768530799da1f823f975d26028a4887f3b4da2f9d202669e47b9`

## Regression

`qa/run_baseline_v27418.js`:

**45 / 45 authoritative JS tests PASS**

Static package integrity remained green.
