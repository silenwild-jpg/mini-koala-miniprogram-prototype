# 微信原生手机号授权接入位置（待真实小程序原件）

`getPhoneNumber` 必须由用户点击微信支持的原生 `<button open-type="getPhoneNumber" bindgetphonenumber="onGetPhoneNumber">` 触发。**不要在普通 HTML 内虚构 `wx.getPhoneNumber()` 可以主动调用**。

```xml
<!-- 微信原生小程序 WXML 参考；并非当前 HTML 原型可直接运行的代码 -->
<button open-type="getPhoneNumber" bindgetphonenumber="onGetPhoneNumber">微信手机号快捷登录</button>
```

`onGetPhoneNumber(event)` 从 `event.detail.code` 获取临时代码后，应向本业务后端交换手机号、确认隐私同意并建立受信任会话。`event.detail.errMsg` 为拒绝/失败时不能放行。服务端对 `QUOTE` 和 `ORDER` 做双重身份校验；不能只相信 JS `verified=true`。会话失效需要重新校验。

对当前 HTML 演示母版：用 `showWeChatAuthorizationSimulation()` 完成非真机演示，并在页面上标注“模拟”，不可作为微信 API 测试通过的证据。

短信通道须具备真实短信发送、验证码核验、次数限制和服务端登录会话；演示验证码 123456 只允许留在 demo 文件，不得进入生产业务模块。

协议：用户主动勾选才可授权；协议链接须接入真实《用户服务协议》《隐私政策》全文，避免图上有链接、线上无内容。
