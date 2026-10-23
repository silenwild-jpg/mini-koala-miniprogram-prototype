/* Mini Koala — Task 02B-2 registered non-business helper (S01 only) | 2026-10-12
   mk-v3-s01-tags.js — ONE minimal runtime layout adjustment + ONE visual class, both reversible by removing this <script>.
   A. Service-tag row relocation (layout only)
      DOM (render() in the S01 inline script): .store > .store-head(grid) > .store-main > .store-demo-tags. A grid-column
      on the nested row has no effect, so the row is moved to be the LAST child of .store-head (a direct grid child);
      mk-v3-page-s01.css then spans it across both columns and lets it wrap. Tag text, order, count, the aria-label and the
      card click / keyboard handlers (bound on .store by render()) are unchanged. Re-applied after every list re-render
      (filters / quick chips / pagination / state change) through a childList observer on #storeList.
   B. Promotion tag marker (visual class only)
      The demo tag pool (storeDemoTags) inserts promotion tags, 特价仓 and 双11大促, with the same .tag class as the service
      tags. The helper adds .mk-promo-tag to exactly those two texts so the page CSS can give them the promotion colour pair.
      No text / order / count change; the class is already a registered semantic class in mini_storage_visual_harmonization_v1.css.
   Not touched: the help entry (#miniGlobalSupport) — deferred to the help-entry special. */
(function () {
  'use strict';
  var PROMO = { '特价仓': 1, '双11大促': 1 };
  function apply(root) {
    var cards = (root || document).querySelectorAll('.store');
    for (var i = 0; i < cards.length; i += 1) {
      var head = cards[i].querySelector('.store-head');
      var tags = cards[i].querySelector('.store-main > .store-demo-tags');
      if (head && tags) head.appendChild(tags);
      var row = cards[i].querySelector('.store-demo-tags');
      if (!row) continue;
      var items = row.querySelectorAll('.tag');
      for (var k = 0; k < items.length; k += 1) {
        var promo = Object.prototype.hasOwnProperty.call(PROMO, (items[k].textContent || '').trim());
        if (promo !== items[k].classList.contains('mk-promo-tag')) items[k].classList.toggle('mk-promo-tag', promo);
      }
    }
  }
  function init() {
    apply();
    var list = document.getElementById('storeList');
    if (list) new MutationObserver(function () { apply(list); }).observe(list, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
