/* Mini Koala — Task 02B-3 registered non-business helper (O01 + S01) | 2026-10-12
   mk-v3-help-entry.js — placement + accessibility + fallback for the global help entry (#miniGlobalSupport, created by
   mini_storage_global_support_v274.js, which is NOT modified). Reversible by removing this <script> and the
   mk-v3-help-entry.css <link>.

   Registered runtime changes
   R1 node move  : #miniGlobalSupport is appended into .header (one appendChild). Element identity, ids
                   (#miniGlobalSupport #miniSupportLauncher #miniSupportPhone #miniSupportChat), the legacy onclick handlers
                   (bound on the nodes), aria-labels and #miniSupportMask (stays on body) are unchanged. Focus order becomes
                   back(O01) → title → help → page content.
   R2 classes    : #miniGlobalSupport gets mk-v3-help-docked (header mode) or mk-v3-help-float (float mode) + data-mk-v3-help;
                   .header gets mk-v3-help-host, and mk-v3-help-open while the menu is expanded (z-index while open).
                   Float mode only: mk-v3-support-obstructed (hidden while overlapping content) / mk-v3-help-nudged.
   R3 a11y attrs : launcher aria-haspopup="true", aria-controls="miniSupportActions", aria-expanded (kept in sync);
                   #miniSupportActions role="group" aria-label="客服联系方式". No visible text is added or changed.
   R4 behaviour  : the open menu closes on a tap outside the entry and on Escape (the legacy launcher toggle still works).
   R5 fallback   : float mode only — hide ONLY while the launcher overlaps price / tag / link / chevron / button content;
                   checks run on first load, on the real scroll container (.page) and document scroll (capture), resize,
                   orientation change, list re-render (#storeList childList → filter / quick chip / pagination), body and
                   #locatedContent class changes, after clicks, and on a 1.5 s safety interval. Never hidden while expanded.
                   If hidden continuously for > 3 s the entry is moved to a second position (mk-v3-help-nudged) and re-checked,
                   so it cannot disappear for long.
   Mode selection: default "header". "float" via window.MK_V3_HELP_MODE, <html data-mk-v3-help="float"> or ?mkv3help=float
                   (test hook). If .header is missing the helper falls back to float automatically. */
(function () {
  'use strict';
  var MODE = 'header';
  try { var q = new URLSearchParams(location.search).get('mkv3help'); if (q === 'float' || q === 'header') MODE = q; } catch (e) { /* ignore */ }
  if (MODE === 'header') MODE = window.MK_V3_HELP_MODE || document.documentElement.getAttribute('data-mk-v3-help') || 'header';
  var TARGETS = '.price-number,.price-unit,.price-start,.estore-list-badge,.estore-list-link,.estore-list-title,.card-open-chevron,' +
    '.store-demo-tags .tag,.store .name,.store .badge,.store .route,.moreline,.browse-stock-line strong,.fact .label,.fact .sub,' +
    '.estore-list-points span,.estore-list-note,.estore-list-desc,.tab,.quick-store-filters button,.compact-filter-btn,' +
    '.empty-results button,.loc-empty button,.loc-empty .search,.distance-recovery,.demand .edit,.estimate-strip .go,' +
    '#managementFee,#depositFee,#rentFee,#monthlyText,#payableTotal,#endDateText,#termText,.payable-hero span,.row span,.row b,' +
    '.order-rules button,.order-rules span,.agreement label,.agreement>div,.bottombar button,.coupon-v1-inline-row,.pay-after .item,' +
    '.storage-notice span,.hint,.section h2,.date-input,a[href],button';

  function sup() { return document.getElementById('miniGlobalSupport'); }
  function launcher() { return document.getElementById('miniSupportLauncher'); }
  function header() { return document.querySelector('.page > .header') || document.querySelector('.header'); }

  function a11y(s) {
    var l = launcher(), acts = document.getElementById('miniSupportActions');
    if (l) {
      if (!l.hasAttribute('aria-haspopup')) l.setAttribute('aria-haspopup', 'true');
      if (!l.hasAttribute('aria-controls')) l.setAttribute('aria-controls', 'miniSupportActions');
      l.setAttribute('aria-expanded', s.classList.contains('expanded') ? 'true' : 'false');
    }
    if (acts && !acts.hasAttribute('role')) { acts.setAttribute('role', 'group'); acts.setAttribute('aria-label', '客服联系方式'); }
  }

  function dockHeader() {
    var h = header(), s = sup();
    if (!h || !s) return false;
    if (s.parentNode !== h) h.appendChild(s);                 // R1 (one node move)
    if (!s.classList.contains('mk-v3-help-docked')) s.classList.add('mk-v3-help-docked');
    s.classList.remove('mk-v3-help-float', 'mk-v3-support-obstructed', 'mk-v3-help-nudged');
    s.setAttribute('data-mk-v3-help', 'header');
    if (!h.classList.contains('mk-v3-help-host')) h.classList.add('mk-v3-help-host');
    a11y(s);
    return true;
  }
  function floatMode() {
    var s = sup(); if (!s) return false;
    if (!s.classList.contains('mk-v3-help-float')) s.classList.add('mk-v3-help-float');
    s.setAttribute('data-mk-v3-help', 'float');
    a11y(s);
    return true;
  }

  /* ---- R5 collision fallback (float mode only) ---- */
  var pending = false, hiddenSince = 0;
  function overlaps(f) {
    var els = document.querySelectorAll(TARGETS);
    for (var i = 0; i < els.length; i += 1) {
      var el = els[i];
      if (el.closest('#miniGlobalSupport,#miniSupportMask,.sheet-mask,.mini-support-mask')) continue;
      var r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      var cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (r.left < f.right && r.right > f.left && r.top < f.bottom && r.bottom > f.top) return true;
    }
    return false;
  }
  function check() {
    pending = false;
    var s = sup(), l = launcher();
    if (!s || !l) return;
    if (s.closest('.header')) {                                // header mode: positional avoidance, nothing to hide
      if (s.classList.contains('mk-v3-support-obstructed')) s.classList.remove('mk-v3-support-obstructed');
      return;
    }
    if (s.classList.contains('expanded')) { s.classList.remove('mk-v3-support-obstructed'); hiddenSince = 0; return; }
    var f = l.getBoundingClientRect();
    if (f.width === 0 || f.height === 0) return;
    var hit = overlaps(f);
    if (hit && !s.classList.contains('mk-v3-help-nudged')) {
      // try the second position before hiding
      s.classList.add('mk-v3-help-nudged');
      var f2 = l.getBoundingClientRect();
      if (overlaps(f2)) s.classList.remove('mk-v3-help-nudged'); else hit = false;
    } else if (!hit && s.classList.contains('mk-v3-help-nudged')) {
      // home position free again? go back
      s.classList.remove('mk-v3-help-nudged');
      if (overlaps(l.getBoundingClientRect())) s.classList.add('mk-v3-help-nudged');
    }
    if (hit) { if (!hiddenSince) hiddenSince = Date.now(); } else hiddenSince = 0;
    if (hit !== s.classList.contains('mk-v3-support-obstructed')) s.classList.toggle('mk-v3-support-obstructed', hit);
    if (hit && Date.now() - hiddenSince > 3000) { s.classList.toggle('mk-v3-help-nudged'); hiddenSince = Date.now(); schedule(); }
  }
  function schedule() { if (!pending) { pending = true; requestAnimationFrame(check); } }

  function wire() {
    var s = sup(); if (!s) return;
    // R3/R2 sync: aria-expanded + header z-index class follow the legacy .expanded toggle
    new MutationObserver(function () {
      var open = s.classList.contains('expanded'); a11y(s);
      var h = s.closest('.header'); if (h) h.classList.toggle('mk-v3-help-open', open);
      schedule();
    }).observe(s, { attributes: true, attributeFilter: ['class'] });
    // R4: close on outside tap / Escape
    document.addEventListener('click', function (e) {
      if (s.classList.contains('expanded') && !s.contains(e.target)) s.classList.remove('expanded');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && s.classList.contains('expanded')) s.classList.remove('expanded'); });
    // R5 triggers
    var page = document.querySelector('.page');
    if (page) page.addEventListener('scroll', schedule, { passive: true });
    document.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    document.addEventListener('click', function () { setTimeout(schedule, 0); setTimeout(schedule, 350); }, true);
    var list = document.getElementById('storeList');
    if (list) new MutationObserver(schedule).observe(list, { childList: true });
    new MutationObserver(schedule).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    var located = document.getElementById('locatedContent');
    if (located) new MutationObserver(schedule).observe(located, { attributes: true, subtree: true, attributeFilter: ['class', 'hidden'] });
    setInterval(schedule, 1500);
    schedule(); setTimeout(schedule, 300); setTimeout(schedule, 1200);
  }

  function place() {
    if (MODE === 'header' && dockHeader()) return true;
    if (MODE === 'header' && !header() && sup()) { MODE = 'float'; }
    return MODE === 'float' ? floatMode() : false;
  }
  function init() {
    if (place()) { wire(); return; }
    var tries = 0;
    var timer = setInterval(function () { tries += 1; if (place() || tries > 40) { clearInterval(timer); if (sup()) wire(); } }, 50);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
