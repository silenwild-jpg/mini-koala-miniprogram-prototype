(function (root) {
  'use strict';
  const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const phoneValid = v => /^1[3-9]\d{9}$/.test(v) || /^\+[1-9]\d{7,14}$/.test(v);
  function context(core) {
    const s = core.state();
    return {route:location.pathname + location.search, city:s.city, requirement:s.requirement,
      storeId:s.storeId, unitIds:s.selected, startDate:s.startDate, dateConfirmed:s.dateConfirmed,
      inventoryVersion:s.inventoryVersion, stock:s.stock, prices:s.prices,
      couponChoice:s.couponChoice, coupons:s.coupons, quote:s.quote,
      orders:s.orders, services:s.services};
  }
  function create({core, persist = () => {}, onChange = () => {}, onMessage = () => {}}) {
    let dialog = null, resolveVerification = null, previousFocus = null;
    let smsPhone = '', smsSentAt = 0;
    const settings = document.createElement('details');
    settings.className = 'mk-auth-settings';
    settings.innerHTML = '<summary>验证设置</summary><p>本地原型：不请求微信或短信服务。</p><label>微信返回结果 <select aria-label="微信验证结果"><option value="success">成功</option><option value="denied">用户拒绝</option><option value="failed">接口失败</option></select></label><p>短信测试码：123456</p>';
    document.body.appendChild(settings);
    // Product previews hide internal simulation controls. ?debug=1 retains QA access.
    settings.hidden = new URLSearchParams(location.search).get('debug') !== '1';
    function finish(answer) {
      if (!resolveVerification) return;
      const resolve = resolveVerification;
      resolveVerification = null;
      if (core.state().auth.status === 'pending') core.resolvePhone(answer.ok ? 'success' : answer.reason === 'failed' ? 'failed' : 'denied', answer);
      persist();
      dialog?.remove(); dialog = null;
      document.removeEventListener('keydown', keys, true);
      previousFocus?.focus?.();
      onChange();
      resolve(answer);
    }
    function keys(e) {
      if (!dialog) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); finish({ok:false,reason:'cancelled'}); }
      if (e.key === 'Tab') {
        const controls = [...dialog.querySelectorAll('button,input,a')].filter(el => !el.disabled && el.offsetParent !== null);
        if (!dialog.contains(document.activeElement)) { e.preventDefault(); controls[0]?.focus(); return; }
        if (e.shiftKey && document.activeElement === controls[0]) { e.preventDefault(); controls.at(-1)?.focus(); }
        else if (!e.shiftKey && document.activeElement === controls.at(-1)) { e.preventDefault(); controls[0]?.focus(); }
      }
    }
    function open({intent}) {
      if (resolveVerification) return Promise.resolve({ok:false,reason:'busy'});
      core.requestPhone(); persist(); smsPhone = ''; smsSentAt = 0;
      previousFocus = document.activeElement;
      dialog = document.createElement('div'); dialog.className = 'mk-auth-overlay';
      dialog.innerHTML = '<div class="mk-auth-shade" data-auth="close"></div><section class="mk-auth-sheet" role="dialog" aria-modal="true" aria-labelledby="mk-auth-title" aria-describedby="mk-auth-purpose"><button class="mk-auth-close" data-auth="close" aria-label="关闭手机号验证">×</button><div class="mk-auth-mark"><span aria-hidden="true">●</span>迷你考拉仓</div><h2 id="mk-auth-title">手机号快捷登录</h2><p id="mk-auth-purpose">' + (intent === 'ORDER' ? '验证并注册登录后，继续确认您的订单' : '验证并注册登录后，即可查看正式租金报价') + '</p><div class="mk-auth-wechat"><button class="mk-auth-primary" data-auth="wechat">微信手机号快捷登录</button><div class="mk-auth-or">或</div><button class="mk-auth-secondary" data-auth="sms">短信验证码登录</button></div><div class="mk-auth-sms" hidden><label>手机号<input id="mk-auth-phone" type="tel" autocomplete="tel" maxlength="20" placeholder="请输入手机号"></label><label>验证码<div class="mk-auth-code"><input id="mk-auth-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="请输入验证码"><button data-auth="send">获取验证码</button></div></label><button class="mk-auth-primary" data-auth="smsSubmit">验证并继续</button><button class="mk-auth-link" data-auth="wechatMode">返回微信快捷登录</button></div><label class="mk-auth-agreement"><input id="mk-auth-agree" type="checkbox"><span>我已阅读并同意 <button type="button" class="mk-auth-policy" data-auth="policy">《用户服务协议》和《隐私政策》</button></span></label><div class="mk-auth-policy-content" hidden><p>手机号验证通过后自动注册或登录，用于识别报价和订单，并联系您处理用仓服务。关闭登录层后，仍可浏览公开信息和参考价。</p><p>本地原型不传输手机号；正式协议与隐私政策全文待提供。</p><button class="mk-auth-link" data-auth="policyClose">返回验证</button></div><p class="mk-auth-error" role="alert" aria-live="polite"></p></section>';
      document.body.appendChild(dialog);
      const error = message => { dialog.querySelector('.mk-auth-error').textContent = message; };
      const agreed = () => { if (!dialog.querySelector('#mk-auth-agree').checked) { error('请先阅读并同意服务协议和隐私政策'); return false; } return true; };
      dialog.addEventListener('click', e => {
        const action = e.target.closest('[data-auth]')?.dataset.auth;
        if (!action) return;
        e.preventDefault(); e.stopPropagation(); error('');
        if (action === 'close') return finish({ok:false,reason:'cancelled'});
        if (action === 'policy' || action === 'policyClose') { dialog.querySelector('.mk-auth-policy-content').hidden = action !== 'policy'; return; }
        if (action === 'sms' || action === 'wechatMode') {
          dialog.querySelector('.mk-auth-sms').hidden = action !== 'sms';
          dialog.querySelector('.mk-auth-wechat').hidden = action === 'sms';
          dialog.querySelector(action === 'sms' ? '#mk-auth-phone' : '[data-auth=wechat]').focus(); return;
        }
        if (!agreed()) return;
        if (action === 'wechat') {
          const result = settings.querySelector('select').value;
          return finish(result === 'success' ? {ok:true,method:'wechat',phone:'13800000000'} : {ok:false,reason:result});
        }
        const phone = dialog.querySelector('#mk-auth-phone').value.replace(/[\s-]/g, '');
        if (!phoneValid(phone)) { error('请输入有效的手机号，国际号码请带国家区号'); return; }
        if (action === 'send') { smsPhone = phone; smsSentAt = Date.now(); error('验证码已准备，请输入验证码'); return; }
        if (action === 'smsSubmit') {
          if (smsPhone !== phone || Date.now() - smsSentAt > 5 * 60 * 1000) { error('请先获取当前手机号的验证码'); return; }
          if (dialog.querySelector('#mk-auth-code').value !== '123456') { error('验证码不正确，请重新输入'); return; }
          finish({ok:true,method:'sms',phone});
        }
      });
      document.addEventListener('keydown', keys, true);
      dialog.querySelector('.mk-auth-close').focus();
      return new Promise(resolve => { resolveVerification = resolve; });
    }
    const gate = new root.SIM_PHONE_GATE({provider:{isVerified:async () => core.authorized(), requestVerification:open}});
    let sequence = 0;
    async function run(intent, actionKey, action) {
      const snapshot = context(core);
      const result = await gate.requireVerifiedPhone({intent,actionKey,operationId:actionKey + '-' + (++sequence),contextSnapshot:snapshot,getCurrentContext:() => context(core),action});
      persist();
      if (result.status === 'stale') onMessage('条件已变化，请按当前容量、租期和仓位重新操作');
      else if (result.status === 'failed' || result.status === 'blocked') onMessage('手机号验证暂未完成，请稍后重试');
      else if (result.status === 'action_failed') onMessage('当前操作未完成，请检查租期、库存和报价后重试');
      else if (result.status === 'cancelled') onMessage('手机号尚未验证，您可以继续浏览');
      return result;
    }
    return {run, verify:(intent = 'QUOTE') => run(intent, 'VERIFY_PHONE', () => onChange()), cancel:() => finish({ok:false,reason:'cancelled'}), gate};
  }
  root.SIM_PHONE_AUTH = {create, context};
})(window);
