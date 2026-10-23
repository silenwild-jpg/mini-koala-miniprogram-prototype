(function () {
  'use strict';
  let pending = false;
  function syncCouponArtwork() {
    const banner = document.getElementById('couponEstimateGrantV1');
    const api = window.MINI_KOALA_COUPON_V1;
    if (!banner || !api) return;
    const row = api.wallet().find(entry => entry.coupon_id === 'CPN-001');
    const newCustomer = api.isNewCustomer();
    const claimed = row && api.effectiveStatus(row) === 'CLAIMED' && newCustomer;
    const summary = banner.querySelector('summary');
    if (!summary) return;
    let image = summary.querySelector('.coupon-a-original');
    if (claimed && !image) {
      image = document.createElement('img');
      image.className = 'coupon-a-original';
      image.width = 861; image.height = 250;
      image.alt = '考拉有礼：¥200 租仓代金券已到账，下单时满足使用条件自动抵扣。';
      image.src = '../assets/coupon/coupon_a_original_861x250.png';
      image.onerror = () => { image.remove(); banner.classList.remove('has-a-art'); };
      summary.prepend(image);
    } else if (!claimed && image) image.remove();
    banner.classList.toggle('has-a-art', Boolean(claimed && image));
    const title = summary.querySelector('.coupon-v1-title');
    const statusText = claimed ? '已获得 ¥200 新客租仓券' : !newCustomer ? '优惠资格以当前订单条件为准' : !row ? '当前尚未领取新客租仓券' : api.effectiveStatus(row) === 'LOCKED' ? '新客租仓券正在订单中使用' : api.effectiveStatus(row) === 'EXPIRED' ? '新客租仓券已过期' : '新客租仓券当前不可用';
    if (title && title.textContent !== statusText) title.textContent = statusText;
  }
  function avoidAmountCollision() {
    if (!document.body.matches('.koala-q01,.koala-c02')) return;
    const float = document.getElementById('miniGlobalSupport');
    if (!float) return;
    const dock = document.querySelector('.bottombar,.coupon-bottom');
    const rects = [...document.querySelectorAll('#total,.rows .row b,.coupon-card-value,.coupon-action')].map(e => e.getBoundingClientRect()).filter(r => r.width && r.height && r.bottom > 0 && r.top < innerHeight);
    const dockTop = dock ? dock.getBoundingClientRect().top : innerHeight - 82;
    let bottom = Math.max(88, innerHeight - dockTop + 12);
    for (let i = 0; i < 32; i += 1) {
      float.style.bottom = bottom + 'px';
      const fab = float.getBoundingClientRect();
      if (!rects.some(r => fab.left < r.right && fab.right > r.left && fab.top < r.bottom + 6 && fab.bottom > r.top - 6)) break;
      bottom += 28;
    }
  }
  function queue() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; syncCouponArtwork(); avoidAmountCollision(); });
  }
  function init() {
    new MutationObserver(queue).observe(document.body, { childList: true, subtree: true, characterData: true });
    addEventListener('scroll', queue, true);
    addEventListener('resize', queue);
    addEventListener('storage', queue);
    queue();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
