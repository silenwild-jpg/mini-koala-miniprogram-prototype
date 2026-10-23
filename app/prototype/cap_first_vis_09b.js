/* CAP-FIRST-VIS-09B: visual tier mapping only; the estimator owns demand and routing. */
(function () {
  'use strict';
  const tiers = [
    { min: .5, max: 1, code: 'mini', label: '0.75m³ · 迷你仓' },
    { min: 1, max: 3, code: 'cube', label: '2m³ · 立方仓' },
    { min: 3, max: 6, code: 'small', label: '4.5m³ · 小型仓' },
    { min: 6, max: 10, code: 'medium', label: '8m³ · 中型仓' },
    { min: 10, max: 20, code: 'large', label: '15m³ · 大型仓' },
    { min: 20, max: 50, code: 'super', label: '35m³ · 超级仓' }
  ];
  function tierFor(value) { return tiers.find(tier => value >= tier.min && value < tier.max) || null; }
  function render() {
    const root = document.querySelector('#cap09bPreview');
    const input = document.querySelector('#knownInput');
    if (!root || !input) return;
    const raw = input.value.trim();
    const value = raw ? Number(raw) : NaN;
    const tier = tierFor(value);
    const scene = root.querySelector('.cap09b-scene');
    const items = root.querySelector('.cap09b-items');
    const title = root.querySelector('.cap09b-title');
    const note = root.querySelector('.cap09b-note');
    root.querySelectorAll('[data-cap09b]').forEach(button =>
      button.setAttribute('aria-pressed', String(value === Number(button.dataset.cap09b))));
    if (!tier) {
      scene.hidden = true;
      items.hidden = true;
      title.textContent = raw && Number.isFinite(value) && value >= 50
        ? '较大容量需求 · 继续查看推荐' : raw ? '请输入至少 0.5m³ 的有效容量' : '输入容量，查看六档空间示意';
      note.textContent = value >= 50 ? '50m³ 及以上不套用六档图片，仍可按当前需求查看推荐。' :
        '空间示意只作参考，以具体门店仓位为准。';
      return;
    }
    const base = '../assets/cap-first-vis-09b/assets/';
    scene.src = base + 'scenes/' + tier.code + '.jpg';
    scene.alt = tier.label + '历史参考仓体图';
    items.src = base + 'items/' + tier.code + '.jpg';
    items.alt = tier.label + '参考物品图';
    scene.hidden = false;
    items.hidden = false;
    title.textContent = '约 ' + value + 'm³ 可参考 ' + tier.label;
    note.textContent = '由历史综合图裁切的临时示意，不代表真实仓位尺寸；物品与价格以具体门店为准。';
  }
  function boot() {
    const root = document.querySelector('#cap09bPreview');
    const input = document.querySelector('#knownInput');
    if (!root || !input) return;
    input.addEventListener('input', render);
    root.querySelectorAll('[data-cap09b]').forEach(button => button.addEventListener('click', () => {
      input.value = button.dataset.cap09b;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    }));
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.MINI_KOALA_CAP09B = { render, tierFor };
})();
