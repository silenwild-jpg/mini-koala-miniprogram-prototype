// Run with a local HTTP server and an installed Playwright Chromium.
const fs = require('fs');
const path = require('path');
let playwright;
try { playwright = require('playwright'); } catch (e) {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw e;
  playwright = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright'));
}
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'outputs', 'home_lifestyle_03', 'browser');
const base = process.argv[2] || 'http://127.0.0.1:4173';
const file = '/prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html?state=new&loc=precise';
(async () => {
  fs.mkdirSync(out, {recursive:true});
  const browser = await playwright.chromium.launch({headless:true});
  const results = [];
  try {
    for (const [width,height] of [[375,812],[390,844]]) {
      const context = await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + file, {waitUntil:'networkidle'});
      await page.screenshot({path:path.join(out, `first-${width}.png`)});
      await page.locator('#homeServiceFlow').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(out, `proof-${width}.png`)});
      const metrics = await page.evaluate(() => {
        const targets = [...document.querySelectorAll('#homeServiceFlow *,#brandTrust *,#homeBottomProofs *')];
        const visible = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
        return {
          viewport:[innerWidth,innerHeight],
          smallText:targets.filter(e => visible(e) && [...e.childNodes].some(n => n.nodeType===3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize)<12).map(e => e.textContent.trim()),
          overflow:targets.filter(e => visible(e) && (e.getBoundingClientRect().left < -1 || e.getBoundingClientRect().right>innerWidth+1)).map(e => e.tagName),
          imageFailures:[...document.images].filter(e=>e.complete && e.naturalWidth===0).map(e=>e.src),
          steps:[...document.querySelectorAll('.service-flow-item b')].map(e=>e.textContent.trim()),
          metrics:[...document.querySelectorAll('.brand-proof-metric')].map(e=>e.textContent.trim()),
          materialsClosed:!document.querySelector('.home-brand-materials').open
        };
      });
      await page.locator('.home-brand-materials summary').click();
      const opened = await page.locator('.home-brand-materials').evaluate(e => e.open);
      await page.screenshot({path:path.join(out, `materials-open-${width}.png`)});
      await page.locator('.home-brand-materials summary').press('Enter');
      const closed = await page.locator('.home-brand-materials').evaluate(e => !e.open);
      await page.locator('#brandTrustLink').click();
      await page.waitForURL('**/mini_storage_brand_b01_v1_10_self_service_synced_Visual_V2_7_4.html');
      results.push({width,height,metrics,opened,closed,brandUrl:page.url(),errors});
      await context.close();
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({capture:'Actual local HTTP Chromium; not WeChat',results},null,2));
  }
  const pass = results.length===2 && results.every(r=>r.opened && r.closed && r.metrics.materialsClosed && !r.metrics.smallText.length && !r.metrics.overflow.length && !r.metrics.imageFailures.length && !r.errors.length);
  console.log(JSON.stringify({pass,results},null,2));
  if (!pass) process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
