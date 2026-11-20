// 我的 M01（第 4 批）。是登录守卫的落点页之一：从受限页被带过来时打开登录层并提示（D-198）。
// 已做：账户卡（未登录「登录 / 注册」、已登录掩码手机号 +「个人信息」）；任务卡 <mk-task-card>（交易域组件）与需求卡 <mk-need-card>（找仓域组件）；
//       没有订单也没有需求时的「尚未用仓」卡；多处在租时的「我的仓位」（最多 2 处 + 查看全部）；四组入口与角标（收藏数、可用权益数、未读消息数）、「预约用仓 N条记录」；
//       找仓进度副文案按需求原单位；加载 / 失败 / 断网三态；未登录点「押金」「发票与抬头」「企业认证」先弹登录层。
// 未做：任务卡与需求卡内部各状态由各自组件负责，本页只放位置；找仓进度的「当前方案有效 / 需重新报价」（全站没有保存报价的主题）。
const T = require('../../i18n/zh');
const TA = require('../../i18n/account');
const C = require('../../core/config-account');
const rules = require('../../core/account');
const req = require('../../core/requirement');
const state = require('../../services/state');
const auth = require('../../services/auth');
const routes = require('../../services/routes');
const api = require('../../services/api');
const pd = require('../../services/page-data');
const M = TA.mine;
const LOGIN_FIRST = { ENT_TITLES: 1, ENT_CERT: 1 }; // 涉及个人与企业资料：未登录先弹登录层（押金页是受限页，由 auth.navigate 处理）
const TONE = { paid_before_start: 'ok', active: 'ok', expiring: 'warn', exiting: 'warn', overdue: 'err' };
Page({
  data: { T: { mine: M, loginRegister: TA.common.loginRegister }, sys: 'loading', loggedIn: false, headTitle: M.guestTitle, headSub: M.guestSub, showNew: false, assets: [], assetsAll: '', groups: [], loginVisible: false, loginTip: '' },
  onShow() {
    this.sync();
    if (auth.consumePending(this, 'mine')) this.setData({ loginTip: T.login.gateTip });
    this.refreshTask();
    this.refresh();
  },
  sync() {
    const s = state.get().session, logged = !!s.loggedIn;
    this.setData({ loggedIn: logged, headTitle: logged ? M.signedTitle : M.guestTitle, headSub: logged ? (s.phoneMasked || M.signedSub) : M.guestSub, groups: this.buildGroups(this._counts || {}) });
  },
  refreshTask() { const c = this.selectComponent ? this.selectComponent('#task') : null; if (c && c.refresh) c.refresh(); },
  buildGroups(counts) {
    const r = state.get().requirement;
    const progress = r && req.demandText(r) ? req.demandText(r) + (r.term_months ? ' · ' + r.term_months + M.monthUnit : '') : M.progressNone;
    return M.groups.map((g) => ({ key: g.key, title: g.title, items: g.items.map((it) => ({ k: it.k, icon: '/assets/icons/' + it.icon + '.svg', t: it.t, s: it.k === 'PROGRESS' ? progress : it.k === 'NEEDS' && this._leads > 0 ? this._leads + M.leadsSuffix : it.s, count: counts[it.k] || 0 })) }));
  },
  refresh() {
    const logged = auth.isLoggedIn();
    // 角标类数据（未读数、预约条数）取不到时按 0 处理，不让整页进失败态；权益与订单取不到才算失败
    const jobs = [api.getBenefits(), api.getMessagesUnread().catch(() => ({ unread: 0 })), logged ? api.getOrders() : Promise.resolve([]), api.getLeads().catch(() => [])];
    return pd.load(this, Promise.all(jobs), (res) => {
      const orders = res[2] || [], assets = rules.activeAssets(orders);
      this._leads = Array.isArray(res[3]) ? res[3].length : 0;
      this._counts = { FAVORITES: rules.favCount(state.get().favorites), COUPONS: rules.benefitCount(res[0]), MESSAGES: Number(res[1] && res[1].unread) || 0 };
      const rows = assets.length > 1 ? assets.slice(0, C.mineAssetRows).map((o) => ({
        id: o.id, store: o.store.name, tag: M.stage[o.stage] || '', tone: TONE[o.stage] || 'info', unit: o.unit_name,
        line: o.months + M.assets.monthUnit + ' · ' + (o.stage === 'paid_before_start' ? M.assets.start + rules.dateText(o.lease.start) : M.assets.until + rules.dateText(o.lease.end))
      })) : []; // 只有一处在租时任务卡已经显示，不重复列
      this.setData({ showNew: !orders.length && !state.get().requirement, assets: rows, assetsAll: assets.length > C.mineAssetRows ? M.assets.allPrefix + assets.length + M.assets.allSuffix : '', groups: this.buildGroups(this._counts) });
    });
  },
  onRetry() { this.setData({ sys: 'loading' }); this.refresh(); },
  onHead() { if (this.data.loggedIn) wx.navigateTo({ url: routes.PROFILE }); else { this.setData({ loginTip: '' }); auth.openLogin(this); } },
  onItem(e) {
    const k = e.currentTarget.dataset.k, url = routes[k];
    if (!url || typeof url !== 'string') return;
    this.setData({ loginTip: '' });
    if (LOGIN_FIRST[k] && !auth.isLoggedIn()) return auth.openLogin(this);
    auth.navigate(this, url);
  },
  onNewCta() { wx.switchTab({ url: routes.STORES }); },
  onAsset(e) { this.setData({ loginTip: '' }); auth.navigate(this, routes.ORDER_DETAIL + '?id=' + e.currentTarget.dataset.id); },
  onAssetsAll() { wx.switchTab({ url: routes.ORDERS }); },
  onLoginClose() { this.setData({ loginVisible: false }); },
  onLoginSuccess() { this.sync(); this.refreshTask(); this.refresh(); }
});
