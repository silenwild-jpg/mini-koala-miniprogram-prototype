const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const S = require('./vis_bg01_support.cjs');
const X = require('./exception_browser_checks.cjs');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a, []));
const out = path.resolve(args.out || 'evidence/browser');
const results = [];
let runtime;
async function runCase(id, width, height, body) {
  const { page: p, context, logs } = await runtime.page(width, height);
  p.setDefaultTimeout(20000);
  const row = { case_id: id, viewport: `${width}x${height}`, dpr: 2, status: 'NOT TESTED', samples: [], checks: [] };
  const go = async name => { await p.goto(runtime.base + S.files[name] + (name === 'home' ? '?state=new&loc=unknown' : '')); await S.settle(p); };
  const click = async selector => {
    const before = p.url();
    const navigates = (/#(estimateBtn|storeLink|saveQuote|edit|confirm|back$|viewStoreDetail|viewOtherUnits|d4Q01DemoEntry|comboNearbyBtn)|#r113PlanCards|#storeList|#unitList|#internalDemoRibbonV1 [.]next|#backBtn/.test(selector) && !(selector === '#backBtn' && before.includes(S.files.est))) || (before.includes(S.files.c02) && /data-id=|#none/.test(selector));
    if (navigates) await Promise.all([p.waitForURL(url => url.href !== before), p.locator(selector).click()]);
    else await p.locator(selector).click();
    await S.settle(p);
  };
  const record = async (label, shot = true) => {
    const sample = { label, dom: await S.inspect(p), metrics: await S.metrics(p), snapshot: await S.snapshot(p) };
    if (shot) { sample.screenshot = `${id}-${width}-${label}.png`; await p.screenshot({ path: path.join(out, sample.screenshot) }); }
    row.samples.push(sample); return sample;
  };
  const check = (ok, message) => { row.checks.push({ message, pass: Boolean(ok) }); assert.ok(ok, message); };
  const natural = async (scene = 'moving', index = 0, finish = true) => {
    await go('hub'); await p.locator('#resetAll').click();
    await go('home'); await click('#estimateBtn');
    await p.locator('#s2').waitFor({ state: 'visible' });
    await p.locator(`#s2 .scene[data-id="${scene}"]`).click();
    await p.locator('#s3').waitFor({ state: 'visible' });
    await p.locator('#s3 .amount-card').nth(index).click();
    if (finish && await p.locator('#s4').isVisible()) await click('#toUsageBtn');
    if (finish) await p.locator('#s5').waitFor({ state: 'visible' });
  };
  const seed = async selector => { await go('hub'); const before = p.url(); if (selector === '#resetAll') await click(selector); else { await Promise.all([p.waitForURL(url => url.href !== before),p.locator(selector).click()]); await S.settle(p); } };
  const s5 = async label => {
    await p.locator('#s5').waitFor({ state: 'visible' });
    await p.locator('#r113PlanCards .rplan').first().waitFor({ state: 'visible' });
    const sample = await record(label);
    check(sample.metrics.card.bottom <= sample.metrics.dock.top + 1, `${label}: first card above dock`);
    check(!await p.locator('.ux-a1-stepbar').isVisible().catch(() => false), `${label}: no step bar`);
    return sample;
  };
  const finance = async label => {
    const sample = await record(label);
    const snap = sample.snapshot.price;
    check(snap && snap.term_months > 0, `${label}: valid snapshot`);
    check(await p.evaluate(() => window.MINI_KOALA_PRICE_GATE_STATUS?.valid === true), `${label}: price gate valid`);
    check(snap.upfront_payable === snap.total_rent - (snap.coupon_discount_amount || 0) + snap.deposit + snap.management_fee, `${label}: payable equation`);
    const main = p.locator(label.includes('order') ? '#payableTotal' : '#initialPayableRow');
    check(Number((await main.innerText()).replace(/[^\d]/g, '')) === snap.upfront_payable, `${label}: DOM matches snapshot`);
    return sample;
  };
  try {
    await body({ p, go, click, record, check, natural, seed, s5, finance, row });
    if (row.status === 'NOT TESTED' && !row.note) row.status = 'PASS';
    row.navigationAborts = logs.failed.filter(x => x.error?.errorText === 'net::ERR_ABORTED');
    if (logs.errors.length || logs.failed.some(x => x.error?.errorText !== 'net::ERR_ABORTED') || logs.badResponses.length) { row.status = 'FAIL'; row.runtimeIssue = 'pageerror/request/resource failure'; }
    if (row.samples.some(x => x.metrics.overflow > 0 || x.metrics.broken.length)) { row.status = 'FAIL'; row.layoutIssue = 'overflow or broken images'; }
  } catch (error) {
    row.status = 'FAIL'; row.error = String(error);
    try { await record('failure'); } catch {}
  } finally {
    row.logs = logs; await context.close(); results.push(row);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ root: args.root, base: runtime.base, browser: runtime.browser.version(), results }, null, 2));
    console.log(JSON.stringify({ id, viewport: row.viewport, status: row.status, error: row.error || row.note }));
  }
}
const cases = {
  P01: async ({ p, go, click, check, record }) => {
    await go('home'); check((await S.snapshot(p)).requirement === null, 'clean home has no prior requirement');
    check(await p.locator('#estimateBtn').isVisible() && await p.locator('#storeLink').isVisible(), 'two home tasks visible');
    await record('home'); await click('#storeLink'); check(p.url().includes(S.files.s01), 'nearby task reaches list');
    check(!(await S.snapshot(p)).requirement, 'ordinary browsing carries no demand'); await record('ordinary-list');
  },
  P02: async ({ p, go, click, check, record }) => {
    await go('home'); await click('#estimateBtn'); check(await p.locator('#s2 .scene').count() === 8, 'eight scenes');
    await click('[data-method="known"]'); check(await p.locator('#knownInput').isVisible(), 'known capacity accessible');
    await click('#knownNextBtn'); check(await p.locator('#knownInputError').isVisible(), 'empty capacity blocked');
    await click('#backBtn'); await click('[data-method="ai"]'); check(p.url().includes('ai_photo'), 'AI entry accessible'); await record('ai');
    await p.goBack(); await S.settle(p); await click('[data-method="browse"]'); check(p.url().includes(S.files.s01), 'direct store entry accessible');
  },
  P03: async ({ p, go, click, check, record }) => {
    const scenes = ['moving','renovation','luggage','seasonal','household','collection','merchant','enterprise'];
    for (const scene of scenes) {
      await go('home'); await click('#estimateBtn'); await p.locator(`#s2 .scene[data-id="${scene}"]`).click(); await p.locator('#s3').waitFor({state:'visible'});
      const cards = await p.locator('#s3 .amount-card').allTextContents();
      for (let i = 0; i < cards.length; i += 1) {
        if (i) { await go('home'); await click('#estimateBtn'); await p.locator(`#s2 .scene[data-id="${scene}"]`).click(); await p.locator('#s3').waitFor({state:'visible'}); }
        const range = cards[i].match(/约\s*([\d.]+)[–—-]([\d.]+)m³/);
        check(Boolean(range), `${scene}/${i}: displayed range found`);
        await p.locator('#s3 .amount-card').nth(i).click();
        const expected = Number(range[2]) < 5 ? 's5' : 's4';
        await p.locator('#'+expected).waitFor({state:'visible'}); check(await p.locator('#'+expected).isVisible(), `${scene}/${i}: upper ${range[2]} routes to ${expected}`);
        if (i === 0) await record(scene+'-route', false);
      }
    }
  },
  P04: async ({ p, click, natural, check, record }) => {
    await natural('moving', 1, false); await p.locator('#s4').waitFor({state:'visible'}); await record('prefilled');
    const name = await p.locator('#p1List [data-act="plus"]').first().getAttribute('data-id');
    await click('#clearItemsBtn'); check(await p.locator('#toUsageBtn').isDisabled(), 'empty list blocks recommendation');
    await click(`#s4 [data-act="plus"][data-id="${name}"]`); check(await p.locator('#toUsageBtn').isEnabled(), 'one selected item enables recommendation');
    await click(`#s4 [data-act="plus"][data-id="${name}"]`);
    const variants=p.locator('#s4 .variant button');if(await variants.count()>1)await variants.last().click();
    await record('reselected'); await click('#backBtn'); await p.locator('#s3').waitFor({state:'visible'}); await p.locator('#s3 .amount-card').nth(1).click(); await p.locator('#s4').waitFor({state:'visible'}); await record('returned');
    check(await p.evaluate(()=>Object.values(state.quantities).some(q=>q>2)),'back cancels unconfirmed draft and restores preset');
    await click('#clearItemsBtn');await click(`#s4 [data-act="plus"][data-id="${name}"]`);await click(`#s4 [data-act="plus"][data-id="${name}"]`);if(await variants.count()>1)await variants.last().click();const kept=await p.evaluate(()=>JSON.stringify({quantities:state.quantities,variants:state.variants}));await click('#toUsageBtn');await p.locator('#s5').waitFor({state:'visible'});await click('#backBtn');await p.locator('#s4').waitFor({state:'visible'});
    check(await p.evaluate(()=>JSON.stringify({quantities:state.quantities,variants:state.variants}))===kept,'item quantities and variants retained');
  },
  P05: async ({ p, click, natural, s5 }) => {
    await natural(); await s5('s3-direct'); await click('#r113PlanCards .rplan >> nth=0'); await click('#back'); await s5('u01-return');
    await click('#r113PlanCards .rplan >> nth=0'); await click('#viewStoreDetail'); await click('#backBtn'); await s5('s02-return');
    await natural('moving',1); await s5('s4-entry');
  },
  P06: async ({ p, click, natural, check, record, s5 }) => {
    await natural(); check(await p.locator('[data-term-quick="12"]').getAttribute('class').then(x=>x.includes('active')), 'first term defaults to 12');
    for (const term of [1,3,6,12,36,60]) { await click(`[data-term-quick="${term}"]`); check((await p.locator('#r113PlanCards .rplan').first().innerText()).includes(term+'个月'), `${term}: recommendation price follows term`); await record('term-'+term, false); }
    await click('.other-term-toggle'); await p.locator('.other-term-input').fill('13'); await p.locator('.other-term-input').press('Enter');
    await click('#capacityPlus'); const capacity=await p.locator('#usageCapacityInput').inputValue();
    await click('#r113PlanCards .rplan >> nth=0'); await click('#back'); await p.locator('#s5').waitFor({state:'visible'}); await record('custom-return-expanded');
    await click('.other-term-toggle'); await s5('custom-return-collapsed');
    check((await p.locator('#r113PlanCards .rplan').first().innerText()).includes('13个月'), 'custom 13 months retained'); check(await p.locator('#usageCapacityInput').inputValue()===capacity, 'capacity retained');
  },
  P07: async ({ p, seed, click, record, check, s5 }) => {
    await seed('[data-story="coupon"] >> nth=0'); await s5('coupon-collapsed');
    await click('#couponEstimateGrantV1 summary'); check(await p.locator('#couponEstimateGrantV1 details').getAttribute('open')!==null, 'coupon explanation expands');
    check((await p.locator('#couponEstimateGrantV1').innerText()).includes('300'), '300 coupon explanation retained'); await record('coupon-expanded'); await click('#couponEstimateGrantV1 summary');
    await click('#uxA3TransportHelp'); check(await p.locator('#uxA3TransportExplanation').isVisible(), 'transport qualification disclosure visible'); await click('#uxA3TransportClose'); check(!await p.locator('#uxA3TransportExplanation').isVisible(), 'transport disclosure closes');
  },
  P08: async ({ p, go, click, check, record }) => {
    await go('home'); await click('#storeLink'); check(!(await S.snapshot(p)).requirement, 'browse entry has no old demand');
    await click('#sortFilterBtn'); await record('sort-options'); await p.locator('.quick-sort-option').last().click();
    await click('#distanceFilterBtn'); await record('distance-options'); await p.locator('.quick-distance-option').first().click();
    await click('#filterBtn'); await record('service-options'); await click('#applyFilter');
    const url=p.url(); await click('#storeList .store >> nth=0'); await click('#backBtn'); check(p.url().includes(S.files.s01), 'store return reaches S01'); await record('filter-return');
    check(await p.locator('#storeList .store').count()>0, 'list remains usable after filter restore');
    await click('#sortFilterBtn');check(await p.locator('.quick-sort-option').last().getAttribute('aria-checked')==='true','sort restored');await p.locator('.quick-sort-option').last().click();
    await click('#distanceFilterBtn');check(await p.locator('.quick-distance-option').first().getAttribute('aria-pressed')==='true','distance restored');await p.locator('.quick-distance-option').first().click();
    await click('#filterBtn');await click('[data-group="service"] [data-value="elevator"]');await click('#applyFilter');await click('#storeList .store >> nth=0');await click('#backBtn');await click('#filterBtn');check(await p.locator('[data-group="service"] [data-value="elevator"]').getAttribute('class').then(x=>x.includes('active')),'service restored');await click('#applyFilter');
    await click('#locationSearchEntry');await p.locator('#locationSearchInput').fill('三元桥');await click('#locationSearchBtn');await record('search-results');check((await p.locator('body').innerText()).includes('三元桥'),'location search usable');
  },
  P09: async ({ p, seed, click, check, record }) => {
    await seed('[data-s01="estimated"]'); const store=await p.locator('#storeList .store').first().getAttribute('data-id'); await click('#storeList .store >> nth=0');
    check(new URL(p.url()).searchParams.get('store')===store, 'S02 current store identity'); await record('store');
    check(await p.locator('#unitList .unit-card').count()>0, 'available units shown'); if(await p.locator('#allUnits').isVisible()) {await click('#allUnits'); await record('more-units');}
    await click('#unitList .unit-card:not(.is-soldout) >> nth=0'); check(p.url().includes(S.files.u01), 'unit card opens U01'); await record('unit');
  },
  P10: async ({ p, seed, click, check, record, row }) => {
    await seed('[data-open="u01"]');check(await p.locator('#viewOtherUnits').getAttribute('data-mode')==='same-store','multiple units offers same-store branch');const firstStore=new URL(p.url()).searchParams.get('store');await click('#viewOtherUnits');check(new URL(p.url()).searchParams.get('store')===firstStore,'same-store branch retains store ID');await record('same-store-other-units');
    await seed('[data-s01="estimated"]'); const candidates=await p.evaluate(()=>window.MINI_KOALA_DATA.stores.filter(s=>window.MINI_KOALA_DATA.getLegacyUnits(s.store_id).filter(u=>u.available_count>0).length===1).map(s=>s.store_id));
    let chosen;
    for(let attempt=0;attempt<8&&!chosen;attempt++){const ids=await p.locator('#storeList .store').evaluateAll(es=>es.map(e=>e.dataset.id));chosen=ids.find(id=>candidates.includes(id));if(!chosen&&await p.locator('#loadMore').isVisible())await click('#loadMore');else if(!chosen)break;}
    if(!chosen){row.note='No one-unit store exposed by the lawful current list; nearby branch NOT TESTED';row.status='NOT TESTED';await record('no-nearby-sample');return;}
    const listRoute=await p.evaluate(id=>routeFor(id),chosen);await click('#storeList .store[data-id="'+chosen+'"]');const route=await p.locator('#routeText').innerText();check(route.includes(String(listRoute.km))&&route.includes(String(listRoute.m)),'S01/S02 displayed distance and minutes agree');await record('s02-distance');await click('#unitList .unit-card:not(.is-soldout) >> nth=0');const unitUrl=new URL(p.url());
    const unitRoute=await p.evaluate(()=>({km:searchKm,m:searchMin}));check(unitRoute.km===listRoute.km&&unitRoute.m===listRoute.m,'U01 distance and minutes agree with S01/S02');
    check((await p.locator('#viewOtherUnits').getAttribute('data-mode'))==='nearby','single-unit store offers nearby stores');await record('u01-distance');await click('#viewOtherUnits');check(new URL(p.url()).searchParams.get('excludeStore')===chosen,'current ID carried to exclusion');
    check(await p.locator('.store[data-id="'+chosen+'"]').count()===0,'current store excluded');await record('other-stores');
    const next=await p.locator('#storeList .store').first().getAttribute('data-id');await click('#storeList .store >> nth=0');await click('#unitList .unit-card:not(.is-soldout) >> nth=0');await click('#back');await click('#backBtn');check(new URL(p.url()).searchParams.get('excludeStore')===chosen,'exclusion survives return');await record('other-return');
  },
  P11: async ({ p, seed, go, click, check, record, row }) => {
    await seed('[data-s02="soldout"]');check((await p.locator('#soldoutNotice').innerText()).includes('售罄'),'sold-out state visible');await record('soldout');
    await go('index');await p.locator('a').filter({hasText:'S02 本店无理想仓位'}).click();await S.settle(p);check(await p.locator('#comboNearbyBtn').isVisible(),'no-match has nearby exit');await click('#comboNearbyBtn');check(p.url().includes(S.files.s01),'no-match nearby exit works');await record('nomatch');
    await seed('#resetAll');await go('home');await click('#estimateBtn');await click('[data-method="known"]');await p.locator('#knownInput').fill('25');await click('#knownTermChips [data-term-quick="6"]');await click('#knownCustomerChips [data-id="personal"]');await click('#knownNextBtn');await p.waitForURL(url=>url.href.includes(S.files.s01));await S.settle(p);
    let combo;for(let i=0;i<8&&!combo;i++){combo=await p.locator('#storeList .store').evaluateAll(es=>es.find(e=>e.innerText.includes('组合'))?.dataset.id);if(!combo&&await p.locator('#loadMore').isVisible())await click('#loadMore');else if(!combo)break;}
    if(!combo){row.note='Soldout and no-match exits passed; no legal 25m³ combination appeared in current list';row.status='NOT TESTED';await record('no-combo-sample');return;}
    await click('#storeList .store[data-id="'+combo+'"]');check(await p.locator('.combo-action').first().isVisible(),'combo offers consultation');await record('combo');await click('.combo-action >> nth=0');check((await p.locator('body').innerText()).includes('咨询本店组合仓位'),'combo retains consultation route');await record('combo-consultation');
  },
  P12: async ({ p, seed, go, click, natural, finance, check, record }) => {
    for(const mode of ['active','coupon']){await seed('[data-q01="'+mode+'"]');await finance('quick-quote-'+mode);}
    for(const mode of ['none','coupon']){await seed('[data-o01="'+mode+'"]');await finance('quick-order-'+mode);}
    await seed('[data-story="coupon"] >> nth=0'); for(let step=1;step<=4;step++){await click('#internalDemoRibbonV1 .next');if(step===3)await finance('story-quote');if(step===4)await finance('story-order');}
    await go('index');await click('#d4Q01DemoEntry');await finance('index-quote');
    await natural();await click('#r113PlanCards .rplan >> nth=0');const expectedVolume=await p.evaluate(()=>u.v);await click('#saveQuote');await finance('real-quote');await click('#save');await click('#edit');await finance('real-order');check(Number(new URL(p.url()).searchParams.get('volume'))===expectedVolume,'physical capacity propagated exactly');
  },
  P13: async ({ p, go, seed, click, check, record, row }) => {
    await seed('[data-open="u01"]');await click('#couponChangeV1');check(await p.locator('#unusable').innerText().then(x=>x.includes('12个月')),'300 coupon unavailable reason');await record('coupon-6-month');await click('[data-id="CPN-001"]');check(p.url().includes(S.files.u01),'selected coupon returns to U01');check((await S.snapshot(p)).price.coupon_discount_amount===200,'200 discount applied');
    await click('#couponChangeV1');await click('#none');check((await S.snapshot(p)).price.coupon_discount_amount===0,'none removes discount');await record('no-coupon');
    await click('#termDetails summary');await click('[data-quick="12"]');await click('#couponChangeV1');await click('[data-id="CPN-002"]');check((await S.snapshot(p)).price.coupon_discount_amount===300,'12-month 300 discount applied');await click('#confirm');await record('coupon-order');
    await X.coupons({p,go,check,record});
  },
  P14: async ({ p, seed, click, check, finance, record }) => {
    await seed('[data-o01="coupon"]');await finance('confirmed-order');await p.locator('#agreeContract').check();check(await p.locator('#agreeContract').isChecked(),'agreement checked');await p.locator('#agreeContract').uncheck();check(!await p.locator('#agreeContract').isChecked(),'agreement unchecked');
    const beforeOrder=(await S.snapshot(p)).order;await p.locator('#pay').click();await S.settle(p);check((await p.locator('body').innerText()).includes('请先阅读并勾选租赁服务协议'),'unchecked agreement blocks submission');check(JSON.stringify((await S.snapshot(p)).order)===JSON.stringify(beforeOrder),'unchecked agreement creates no order');await record('agreement-blocked');
    await click('#contractOpen');await record('contract-open');await click('#contractClose');
    await click('#rulesOpen');await record('rules-open');await click('#rulesClose');
    await record('prepay-endpoint');check(await p.locator('#pay').isEnabled(),'valid quote has enabled payment entry');
  },
  P15: async ({ p, go, seed, click, check, record, row }) => {
    await seed('#resetAll');await go('home');await click('#storeLink');await click('#storeList .store >> nth=0');await click('#unitList .unit-card:not(.is-soldout) >> nth=0');await p.locator('#confirm').click();await S.settle(p);check(p.url().includes(S.files.u01),'missing term cannot reach O01');check(await p.locator('#termDetails').getAttribute('open')!==null,'missing term asks for selection');await record('missing-term');
    await go('index');await p.locator('a').filter({hasText:'O01 下单与支付'}).click();await S.settle(p);check(await p.locator('#pay').isDisabled(),'missing snapshot blocks payment');await record('missing-snapshot');
    await seed('[data-q01="expired"]');check((await p.locator('body').innerText()).includes('超过 48 小时参考期'),'expired quotation indicated');await record('expired');
    await X.price({p,go,check,record});await X.stock({p,go,check,record});
  },
  P16: async ({ p, go, seed, click, check, natural, finance, record }) => {
    await natural();await click('#r113PlanCards .rplan >> nth=0');await click('#saveQuote');await finance('path-a-quote');await click('#edit');await finance('path-a-order');
    await seed('#resetAll');await go('home');check(!(await S.snapshot(p)).requirement,'demo reset clears old requirement');await click('#storeLink');await click('#storeList .store >> nth=0');await click('#unitList .unit-card:not(.is-soldout) >> nth=0');
    if(!await p.locator('#termDetails').getAttribute('open').then(x=>x!==null))await click('#termDetails summary');await click('[data-quick="6"]');await click('#confirm');await finance('path-b-order');await click('#edit');await click('#termDetails summary');await click('[data-quick="12"]');await click('#confirm');await finance('path-b-changed-order');
  },
  A01: async (t) => { await X.art(t); },
};
async function main(){runtime=await S.start(args.root||'workspaces/business_latest',out);try{for(const [w,h]of[[375,812],[390,844]])for(const [id,body]of Object.entries(cases)){if(args.cases&&!args.cases.split(',').includes(id))continue;await runCase(id,w,h,body)}}finally{await runtime.stop()}}
main().catch(e=>{console.error(e);process.exitCode=1});
