# Sprint 2 — Transaction Visual QA Report

## 范围
Q01 / O01 / O02 / O03

## 运行时验证

标准交易样例：4.8m³ / 6个月 / 月租 ¥573 / 整期租金 ¥3,440 / 押金 ¥573 / 管理费 ¥50 / 本次应付 ¥4,063。

### 基础页面
- Q01：375×812 / 390×844
- O01：375×812 / 390×844
- O02 Paid：375×812 / 390×844
- O03 Active：375×812 / 390×844

### 额外状态
- O01 协议 Sheet：375×812
- O02 Pending / Failed / Inventory Changed：375×812
- O03 Upcoming / Ending / Ended：375×812

## 结果

- Runtime cases：14
- JS error：0
- 页面横向 overflow：0
- 内部异常 overflow：0
- 帮助浮窗与主价格碰撞：0
- 帮助浮窗与底部主 CTA 碰撞：0
- 用户可见路线/定位 Emoji：0

## 价格层级

- Q01：整期总租金 30px；月租 14px
- O01：本次应付 34px；月租 13px
- O02：支付/应付金额 30px
- O03：租金合计与实际支付采用暖橙强调，维持订单详情型信息密度

## Body Freeze

四页 `<body>` SHA-256 在视觉修改前后完全一致：

- Q01 `7bdd5d524dcb1c9312307079594a8d80b526d14bf682fa27959bda5a295dd843`
- O01 `e6213eb1fe38ef687e6000877b03c4dc172d4d43c7bafefa1098445fa79a57fd`
- O02 `37ce9367e685720f7e3522c4e5a8845a0a38590bac9ddeb3b5cc00196ef7d154`
- O03 `1eb1da26432c28a06f836fb73bd0a92df91644d3fffc7a13724db53dd50d7bd9`

## Regression

Baseline Runner：**38 / 38 authoritative JS tests PASS**。
