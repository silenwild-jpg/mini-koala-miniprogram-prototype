const fs = require('fs');
const path = require('path');
const http = require('http');
const modulesRoot = process.env.CODEX_NODE_MODULES || 'C:/Users/silence/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(modulesRoot, 'playwright'));
const files = {
  home: 'mini_storage_home_H01_Visual_V2_7_4_SSOT.html',
  est: 'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html',
  s01: 'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
  s02: 'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html',
  u01: 'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html',
  q01: 'mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html',
  o01: 'mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html',
  c02: 'mini_storage_coupon_select_c02_v1.html',
  hub: 'product_demo_hub_v1.html',
  index: 'index_visual_v2_7_4_7.html',
  qa: 'prepay_exception_qa.html',
};
async function start(root, out) {
  root = path.resolve(root);
  fs.mkdirSync(out, { recursive: true });
  const server = http.createServer((req, res) => {
    if (req.url === '/favicon.ico') { res.writeHead(204).end(); return; }
    let url;
    try { url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400).end(); return; }
    const file = path.resolve(root, '.' + url);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404).end('Not found'); return; }
      const type = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' }[path.extname(file)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(body);
    });
  });
  await new Promise(resolve => server.listen(40000+Math.floor(Math.random()*10000), '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/prototype/`;
  let browser;
  try { browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true }); }
  catch (error) { server.close(); throw error; }
  return {
    base, browser,
    async page(width, height) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'zh-CN', timezoneId: 'Asia/Shanghai' });
      const page = await context.newPage();
      const logs = { errors: [], console: [], failed: [], badResponses: [] };
      page.on('pageerror', e => logs.errors.push(String(e)));
      page.on('console', m => logs.console.push({ type: m.type(), text: m.text() }));
      page.on('requestfailed', r => logs.failed.push({ url: r.url(), error: r.failure() }));
      page.on('response', r => { if (r.status() >= 400) logs.badResponses.push({ url: r.url(), status: r.status() }); });
      return { page, context, logs };
    },
    async stop() { await browser.close(); await new Promise(resolve => server.close(resolve)); },
  };
}
async function settle(page) { await page.waitForLoadState('load'); await page.waitForTimeout(250); }
async function inspect(page) {
  return page.evaluate(() => ({
    url: location.href, title: document.title, active: document.querySelector('.screen.active')?.id,
    text: document.body.innerText.slice(0, 5500),
    controls: [...document.querySelectorAll('button,a,input,summary,[role=radio],.scene,.choice,.back,.card,.unit-card')].filter(e => e.getBoundingClientRect().width && e.getBoundingClientRect().height && getComputedStyle(e).visibility !== 'hidden').map(e => ({ tag: e.tagName, id: e.id, cls: e.className, text: e.innerText?.slice(0, 130), value: e.value, data: { ...e.dataset } })),
  }));
}
async function metrics(page) {
  return page.evaluate(() => {
    const rect = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }; };
    const visible = e => e && rect(e).width > 0 && rect(e).height > 0 && getComputedStyle(e).display !== 'none';
    const card = document.querySelector('#r113PlanCards .rplan');
    const dock = document.querySelector('#usageActions');
    return { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth), broken: [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.currentSrc), card: rect(card), dock: visible(dock) ? rect(dock) : null, cardText: card?.innerText, steps: [...document.querySelectorAll('.stepbar,.progress,.steps,.stepper,.est-progress')].filter(visible).map(e => e.innerText), amount: [...document.querySelectorAll('[id*=Price],[id*=Payable],[id*=Total],.rplan-price,.coupon-card-value')].filter(visible).map(e => ({ id: e.id, cls: e.className, text: e.innerText, font: getComputedStyle(e).fontSize, color: getComputedStyle(e).color, rect: rect(e) })) };
  });
}
async function snapshot(page) {
  return page.evaluate(() => {
    const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return localStorage.getItem(key); } };
    return { requirement: read('mini_storage_requirement_current'), price: read('mini_storage_price_snapshot_current'), quote: read('mini_storage_quote_current'), order: read('mini_storage_order_current'), wallet: read('mini_koala_coupon_wallet_v1'), selection: read('mini_koala_coupon_selection_v1'), qaSeed: JSON.parse(sessionStorage.getItem('mini_koala_prepay_qa_seed_v1')||'null'), qaFacts: window.MINI_KOALA_PREPAY_QA_FACTS||null };
  });
}
module.exports = { start, files, settle, inspect, metrics, snapshot };
