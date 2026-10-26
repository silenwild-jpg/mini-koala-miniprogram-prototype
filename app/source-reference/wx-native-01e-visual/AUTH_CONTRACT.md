# AUTH-GATE-01｜统一手机号门槛契约（待母版接线）

## 触发动作

- `QUOTE`：正式报价获取。在 S5 已选容量/租期时才执行；公开参考起价不受此限制。
- `ORDER`：立即下单、进入 O01 以及提交订单。O01 深链进入仍需二次检查有效的已验证会话。
- `LEAD`：预约用仓是销售留资，不能无条件套用 ORDER。若要求联系电话，单独验证提交需求。

## 标准接口（伪代码，不是已合入的生产代码）

```ts
type PhoneGateIntent = 'QUOTE' | 'ORDER';
type ContextSnapshot = { route: string; storeId?: string; unitId?: string;
  capacityM3?: number; months?: number; date?: string; pricingRevision?: string };
async function requireVerifiedPhone(input: {
  intent: PhoneGateIntent;
  contextSnapshot: ContextSnapshot;
  actionKey: string;
}): Promise<'allowed'|'cancelled'|'failed'>;
```

流程：当前会话有效 → 直接执行业务动作；否则储存 `pendingAction + contextSnapshot`，打开同一登录层 → 用户走微信快捷手机号或短信验证码 → **服务端验证成功后**，核对上下文及报价版本并仅恢复一次原动作。拒绝/关闭/失败/网络错误：不得调用报价/订单受限接口。

## 登录状态

- `UNVERIFIED` 未验证（开放浏览）
- `LOGIN_OPEN` 登录面板打开
- `WECHAT_AUTHORIZING` 微信原生手机号授权进行中
- `SMS_VERIFYING` 短信验证进行中
- `VERIFIED` 后端确认手机号验证成功
- `AUTH_FAILED` 失败，可重试
- `DECLINED` 拒绝/关闭，无权限解锁
- `EXPIRED` 会话过期，下一受限操作重新检查

## 双重保护

1. 入口层校验：按钮、页面自动请求、深层导航、快捷下单等均通过 `requireVerifiedPhone`。
2. 受保护数据层校验：报价请求与订单创建/提交接口均不能凭前端布尔变量直接放行，必须由服务端核验有效会话。

## 视觉限制

底部弹层（A 极简方案），375 宽安全内容区 343px，390 宽安全内容区 358px，按钮高度48px；微信手机号选择 UI 由系统控制，原型不能承诺其具体内部排版。弹层协议默认未勾选，直接行内提示而非多次居中弹窗。

## 保存及回放

- 关闭/拒绝不清空容量、租期、选中门店/仓位、优惠选择。
- 旧的 pendingAction 不重复执行；相同短时间点击只能发起一条授权流程。
- 若用户上下文已经发生变化/报价快照版本不匹配，重新发起报价，不能恢复已过期价格。
- 订单入口与报价入口共用验证状态；已认证且未过期不重复请求授权。

## 与 WX-NATIVE-01B 的关系

首页首次进入即触发定位告知与授权的策略独立于手机号登录；定位拒绝不阻断浏览，提供城市手选。手机号前置覆盖原“订单确认才要求手机号”的旧节点，但不要求首页初次进入强制手机号授权。

## 合规待核验

微信平台对于获取手机号是否属于展示个性化报价的必要信息仍需上线前专项评估。公开基础价格保留非登录可见；隐私协议全文、授权用途、权限拒绝后的继续浏览均待微信真实接口测试。
