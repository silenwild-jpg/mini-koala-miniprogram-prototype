// 优惠与权益 ACC_COUPONS（第 4 批）。
// 已做：顶部说明句；优惠券列表（面额、名称、状态、使用条件、有效期——条件 / 有效期没有值时该行不显示，§6）；服务权益「免费运输 1 次」；
//       未登录态（不显示金额，「登录后查看金额」打开登录层）；空态「领取新客券」；已锁定 / 已使用 / 不可用（券状态由接口按订单给出）；加载 / 失败 / 断网。
// 未做：「赠送租期」分组（冻结稿 8 个状态都没有出现，接口也没有这类数据）；有效期一行现在不会出现（业务没给有效期）。
const TA = require('../../i18n/account');
const rules = require('../../core/account');
const routes = require('../../services/routes');
const auth = require('../../services/auth');
const api = require('../../services/api');
const pd = require('../../services/page-data');
const P = TA.coupons;
Page(auth.guarded(routes.COUPONS, {
  data: { T: P, sys: 'loading', loggedIn: false, empty: false, coupons: [], benefits: [], busy: false, loginVisible: false },
  onShow() { this.refresh(); },
  apply(res) {
    res = res || {};
    const logged = !!res.loggedIn;
    const coupons = (res.coupons || []).map((c) => ({
      id: c.id, name: c.name, off: rules.couponOff(c.status), tone: rules.tone(c.status), tag: P.couponStatus[c.status] || P.statusFallback,
      amount: logged && c.amount !== null && c.amount !== undefined ? rules.money(c.amount) : '', // 未登录不显示金额
      condition: c.condition || '', valid: c.valid_until ? P.validPrefix + c.valid_until : '', canUse: logged && c.status === 'AVAILABLE'
    }));
    const benefits = (res.benefits || []).map((b) => ({ id: b.id, name: b.name, tone: rules.tone(b.status), tag: P.benefitStatus[b.status] || P.statusFallback }));
    this.setData({ loggedIn: logged, coupons, benefits, empty: !coupons.length });
  },
  refresh() { return pd.load(this, api.getBenefits(), (res) => this.apply(res)); },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onClaim() {
    if (this.data.busy) return;
    if (!auth.isLoggedIn()) return auth.openLogin(this);
    this.setData({ busy: true });
    api.claimCoupons().then((res) => { this.apply(res); this.setData({ busy: false }); })
      .catch((err) => { this.setData({ busy: false }); wx.showToast({ title: (err && err.message) || TA.common.saveFailed, icon: 'none' }); });
  },
  onUse() { wx.switchTab({ url: routes.STORES }); },
  onLogin() { auth.openLogin(this); },
  onLoginClose() { this.setData({ loginVisible: false }); },
  onLoginSuccess() { this.refresh(); }
}));
