/* Browser rendering with local resource interception. This is not an HTTP-server acceptance test. */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium } = require('C:/Users/silence/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'outputs', 'next_stage_2026_10_19');
fs.mkdirSync(out, { recursive: true });
const base = 'http://127.0.0.1:9999/prototype/';
const names = {
  home: 'mini_storage_home_H01_Visual_V2_7_4_SSOT.html',
  s01: 'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
  s02: 'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html',
  est: 'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html',
  u01: 'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'
};
const mime = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
const results = [];
async function main() {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    for (const [width,height] of [[375,812],[390,844]]) {
      const context = await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'zh-CN'});
      await context.route('http://127.0.0.1:9999/**', async route => {
        const url = new URL(route.request().url());
        const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({status:404,body:'Not found'});
        return route.fulfill({status:200,body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'});
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      page.on('response', r => {if(r.status()>=400) errors.push(`${r.status()} ${r.url()}`)});
      const record = (name, ok, data) => results.push({viewport:`${width}x${height}`,name,status:ok?'PASS':'FAIL',data});
      const overflow = () => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth-innerWidth));
      const settle = () => page.waitForTimeout(350);
      try {
        await page.goto(base+names.home+'?state=new&loc=precise&searchOriginKey=guomao');
        await page.locator('#mkHomeSearchA').click();
        await settle();
        const home = {url:page.url(),sheet:await page.locator('#locationSheet').getAttribute('class'),intent:await page.evaluate(() => sessionStorage.getItem('mk_home_search_s01_once')),overflow:await overflow()};
        record('H01 search to S01 existing sheet',home.url.includes(names.s01)&&home.sheet.includes('show')&&home.overflow===0,home);
        await page.screenshot({path:path.join(out,`home_search_s01_${width}.png`),fullPage:true});

        await page.goto(base+names.est+'?entry=known');
        await settle();
        const boundary = [];
        for (const value of ['0.4','0.5','0.99','1','2.99','3','4.9','5','5.1','6','9.99','10','19.99','20','49.99','50']) {
          await page.locator('#knownInput').fill(value);
          if(Number(value)>=.5&&Number(value)<50) await page.waitForFunction(() => document.querySelector('.cap09b-scene').naturalWidth>0);
          const row = await page.evaluate(() => ({value:document.querySelector('#knownInput').value,title:document.querySelector('.cap09b-title').textContent,scene:document.querySelector('.cap09b-scene').getAttribute('src'),shown:!document.querySelector('.cap09b-scene').hidden,loaded:document.querySelector('.cap09b-scene').naturalWidth>0}));
          boundary.push(row);
        }
        await page.locator('#knownInput').fill('0.4');
        await page.locator('#knownNextBtn').click();
        const invalid=await page.locator('#knownInputError').innerText();
        await page.locator('#knownInput').fill('5.1');
        const buttons=await page.locator('#knownTermChips .term-choice').allTextContents();
        record('CAP six tier boundaries and invalid lower bound',boundary.every((r,i)=>i===0||i===15?!r.shown:r.shown&&r.loaded)&&invalid.includes('0.5'),{boundary,invalid,termButtons:buttons,overflow:await overflow()});
        await page.screenshot({path:path.join(out,`cap_s7_${width}.png`),fullPage:true});
        await page.locator('#knownTermChips .term-choice').first().click();
        await page.locator('#knownCustomerChips .chip').first().click();
        await page.locator('#knownNextBtn').click();
        await settle();
        const rec={url:page.url(),requirement:await page.evaluate(() => JSON.parse(localStorage.getItem('mini_storage_requirement_current')||'null')),overflow:await overflow()};
        record('5.1m3 known size enters S01 recommendations',rec.url.includes(names.s01)&&rec.url.includes('state=estimated')&&rec.overflow===0,rec);
        await page.screenshot({path:path.join(out,`cap_s01_${width}.png`),fullPage:true});

        await page.goto(base+names.est+'?scene=moving');
        await settle();
        const amountCount=await page.locator('#amountList .amount-card').count();
        await page.locator('#amountList .amount-card').last().click();
        const preset=await page.evaluate(() => ({active:document.querySelector('.screen.active')?.id,target:calc().target,reviewed:state.itemsConfirmed,overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)}));
        record('large preset skips mandatory item confirmation',amountCount>0&&preset.target>=5&&preset.active==='s5'&&!preset.reviewed&&preset.overflow===0,{amountCount,...preset});

        await page.goto(base+names.u01+'?store=jianguo');
        await settle();
        await page.locator('#r5aCompare').click();
        const cmpAdded=await page.evaluate(() => ({items:window.MINI_KOALA_UNIT_CHOICE_R5A.compare(),open:!document.querySelector('#r5aCompareMask').hidden,overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)}));
        await page.screenshot({path:path.join(out,`u01_compare_${width}.png`),fullPage:true});
        await page.goto(base+names.est+'?entry=resume_requirement');
        await settle();
        const dock={active:await page.locator('.screen.active').getAttribute('id'),hidden:await page.locator('#r5aCompareDock').evaluate(e=>e.hidden),text:await page.locator('#r5aCompareDock').innerText(),overflow:await overflow()};
        record('S5 conditional compare dock',dock.active==='s5'&&!dock.hidden&&dock.overflow===0,dock);
        await page.screenshot({path:path.join(out,`s5_compare_dock_${width}.png`),fullPage:true});
        await page.goto(base+names.u01+'?store=jianguo');
        await settle();
        await page.locator('#r5aCompare').click();
        await page.locator('#r5aCompareItems button').first().click();
        const cmpRemoved=await page.evaluate(() => window.MINI_KOALA_UNIT_CHOICE_R5A.compare().length);
        record('U01 compare add open remove',cmpAdded.items.length===1&&cmpAdded.open&&cmpAdded.overflow===0&&cmpRemoved===0,{added:cmpAdded,removed:cmpRemoved});
        await page.evaluate(() => localStorage.removeItem('mini_storage_requirement_current'));
        await page.goto(base+names.s02+'?store=jianguo&state=browse');
        await settle();
        const firstFavorite=page.locator('#unitList [data-r5a-favorite]').first();
        const s02Probe=await page.evaluate(() => ({url:location.href,count:document.querySelectorAll('#unitList [data-r5a-favorite]').length,body:document.body.innerText.slice(0,1200),unitList:document.querySelector('#unitList')?.innerText}));
        if(!s02Probe.count){record('S02 favorite persists on same U01 option',false,s02Probe);record('browser errors',errors.length===0,{errors});continue;}
        const favoriteUnit=await firstFavorite.getAttribute('data-r5a-favorite');
        await firstFavorite.click();
        const s02Pressed=await firstFavorite.getAttribute('aria-pressed');
        await page.goto(base+names.u01+'?store=jianguo&unit='+encodeURIComponent(favoriteUnit));
        await settle();
        const u01Pressed=await page.locator('#r5aFavorite').getAttribute('aria-pressed');
        record('S02 favorite persists on same U01 option',s02Pressed==='true'&&u01Pressed==='true',{favoriteUnit,s02Pressed,u01Pressed});
        record('browser errors',errors.length===0,{errors});
      } catch (error) {
        record('scenario exception',false,{error:String(error),errors});
      } finally { await context.close(); }
    }
  } finally {await browser.close()}
  fs.writeFileSync(path.join(out,'intercepted_browser_results.json'),JSON.stringify({method:'Playwright Chrome with filesystem route interception; no real HTTP server',results},null,2));
  console.log(JSON.stringify({pass:results.filter(r=>r.status==='PASS').length,fail:results.filter(r=>r.status==='FAIL').length,results},null,2));
  if(results.some(r=>r.status==='FAIL')) process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
