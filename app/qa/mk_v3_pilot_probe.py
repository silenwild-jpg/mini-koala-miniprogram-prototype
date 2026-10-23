#!/usr/bin/env python3
"""Mini Koala — Task 02B O01/S01 pilot acceptance probe (read-only, local HTTP, real Chromium).

Usage:
  python3 qa/mk_v3_pilot_probe.py --label before --out outputs/mk_v3_pilot/before [--port 8810]

Captures for 375x812 and 390x844 (DPR 2, WeChat UA, zh-CN):
  S01 six states (unlocated / browse / estimated / nomatch / extended / far): viewport + long screenshots,
      computed styles, visible-text audit (<12px, contrast), horizontal overflow, card text snapshot,
      E-store card position, help FAB collision scan (first screen, scroll steps, bottom, expanded,
      after filter update), console / page errors / failed requests.
  S01 browse interactions: three filter panels, service multi-select apply / cancel, quick chips,
      pagination, help expand + phone / chat actions.
  O01 via U01 -> 继续租用 (real price snapshot): same audits + business text snapshot, bottom bar
      geometry, four sheets, agreement validation, phone authorisation -> O02 navigation.
  O01 direct URL (no snapshot): must show 报价待确认.
  H01 / S5: computed-style fingerprint + screenshot for no-change comparison.
Nothing in the prototype is modified. Results: <out>/probe.json + PNG files.
"""
import argparse, json, subprocess, time, sys, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(os.environ.get('MK_ROOT') or Path(__file__).resolve().parents[1])
S01 = 'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'
O01 = 'mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html'
U01 = ('mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'
       '?store=MK_BJ_2CDB7BEE&unit=BJ0112S01A009&sizeOption=MK_BJ_2CDB7BEE__4.72&target=4.8&term=6')
H01 = 'mini_storage_home_H01_Visual_V2_7_4_SSOT.html?state=new'
S5 = 'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html?entry=b2b_recommend&term=6'
UA = ('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) '
      'Mobile/15E148 MicroMessenger/8.0.49')
VIEWPORTS = [(375, 812), (390, 844)]
S01_STATES = {
    'unlocated': '?state=unlocated',
    'browse': '',
    'estimated': '?state=estimated&target=4.8&term=6',
    'nomatch': '?state=estimated&target=4.8&term=6',   # then setState('nomatch')  (review-chip path)
    'extended': '?state=estimated&target=4.8&term=6',  # then setState('extended')
    'far': '?state=estimated&target=4.8&term=6',       # then setState('far')
}
SET_STATE = {'nomatch', 'extended', 'far'}
PROPS = ['fontSize', 'fontWeight', 'lineHeight', 'color', 'backgroundColor', 'backgroundImage', 'borderTopWidth',
         'borderTopColor', 'borderRadius', 'paddingTop', 'paddingLeft', 'paddingRight', 'boxShadow', 'height', 'minHeight',
         'width', 'display', 'position', 'bottom', 'right', 'zIndex', 'gap', 'visibility', 'whiteSpace', 'letterSpacing']
S01_SEL = ['.shell', '.page', '.header', '.header h1', '.location-unified-box', '.current-location', '.current-location .loc',
           '.current-location .pin', '.location-search-entry', '.location-search-entry .placeholder', '.location-search-entry .search-ico',
           '.travel-pill', '.coverage-strip', '.coverage-strip b', '.coverage-strip span', '.coverage-strip em',
           '.estimate-strip', '.estimate-strip b', '.estimate-strip span', '.estimate-strip .go',
           '.demand', '.demand b', '.demand .edit', '.recommendation-summary', '.distance-recovery', '.distance-recovery h3',
           '.distance-recovery p', '.loc-empty', '.loc-empty h2', '.loc-empty p', '.loc-empty button', '.loc-empty .search',
           '.toolbar', '.controls', '.compact-filter-btn', '.compact-filter-btn .filter-current', '.compact-filter-btn .filter-chevron',
           '.quick-store-filters', '.quick-store-filters button', '.quick-store-filters button.active',
           '.list', '.store', '.store:nth-child(2)', '.store-head', '.store-photo', '.store-photo small', '.store-photo img',
           '.store-main', '.store-title-line', '.store .name', '.store .badge', '.store .area', '.store .route', '.store .route b',
           '.store-demo-tags', '.store-demo-tags .tag', '.store-demo-tags .tag:nth-child(2)', '.store-demo-tags .tag:nth-child(4)',
           '.store-facts', '.fact', '.fact .label', '.fact .sub', '.browse-stock-line span', '.browse-stock-line strong',
           '.browse-unit-price', '.browse-unit-price .price-number', '.browse-unit-price .price-unit', '.browse-unit-price .price-start',
           '.contract-price', '.contract-price .price-number', '.contract-price .price-start', '.card-open-chevron',
           '.estore-list-card', '.estore-list-kicker', '.estore-list-title', '.estore-list-badge', '.estore-list-desc',
           '.estore-list-points span', '.estore-list-note', '.estore-list-link', '.moreline', '.empty-results',
           '.tabbar', '.tab', '.tab .ico', '.tab.active', '.tab.active .ico',
           '#miniGlobalSupport', '.mini-support-launcher', '.mini-support-launcher i', '.mini-support-launcher span',
           '.inline-filter-sheet .sheet', '.quick-sort-option', '.quick-distance-option', '.pills .pill', '#applyFilter']
O01_SEL = ['.shell', '.page', '.header', '.header h1', '.back', '.section', '.section:nth-of-type(2)', '.section h2', '.order-card',
           '.order-card .unit', '.order-card .meta', '.order-card>.rows', '.row', '.row span', '.row b', '.date-input', '.payment-section',
           '.payable-hero', '.payable-hero span', '.payable-hero b', '#payableTotal', '.payment-rows', '.payment-rows .row',
           '.payment-rows .row span', '.payment-rows .row b', '.monthly-muted', '.coupon-v1-inline-row', '.coupon-v1-discount',
           '.deposit-info', '.hint', '.pay-after', '.pay-after b', '.pay-after .item', '.order-rules', '.order-rules span',
           '.order-rules button', '.storage-notice', '.storage-notice b', '.storage-notice span', '.storage-notice button',
           '.agreement', '.agreement label span', '.agreement>div', '#agreeContract', '#contractOpen',
           '.bottombar', '.bottombar .secondary', '.bottombar .primary', '.bottombar .mini-global-support',
           '#miniGlobalSupport', '.mini-support-launcher', '.mini-support-launcher i', '.mini-support-launcher span',
           '.sheet', '.sheet h3', '.sheet-desc', '.sheet-confirm', '.prohibited-list b', '.prohibited-list span', '.toast']
H01_SEL = ['body', '.page', '.topbar', '.hero', '.task-card', '.featured-store', '.store-alt', '.store-tags span', '.bottomnav', '.bottomnav .tab',
           '.home-proof-card', 'h1', 'h2', '.price', '.btn', 'button', '#miniGlobalSupport', '.mini-support-launcher']
S5_SEL = ['body', '.phone', '#s5', '#s5 .usage-summary', '#s5 .rplan', '#s5 .rplan.active', '#s5 .rplan-price', '#s5 .term-choice',
          '#s5 .term-choice.active', '#s5 .usage-price-range', '#s5 .capacity-stepper button', '#s5 h2', '#s5 .estore-price b', 'button', '.bottombar']

JS_STYLES = '''([sels,props])=>{const out={};for(const s of sels){let el=null;try{el=document.querySelector(s)}catch(e){out[s]={error:String(e)};continue}
 if(!el){out[s]=null;continue}const cs=getComputedStyle(el);const r=el.getBoundingClientRect();
 const o={rect:[Math.round(r.left*10)/10,Math.round(r.top*10)/10,Math.round(r.width*10)/10,Math.round(r.height*10)/10],text:(el.textContent||'').trim().slice(0,40)};
 for(const p of props){let v=cs[p];if(p==='backgroundImage'&&v&&v.length>80)v=v.slice(0,80)+'…';o[p]=v}out[s]=o}return out}'''

JS_TEXT_AUDIT = '''()=>{
 function parse(c){const m=c.match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const a=m[1].split(',').map(x=>parseFloat(x));return {r:a[0],g:a[1],b:a[2],a:a.length>3?a[3]:1}}
 function lum(c){const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)}
 function blend(fg,bg){const a=fg.a;return {r:fg.r*a+bg.r*(1-a),g:fg.g*a+bg.g*(1-a),b:fg.b*a+bg.b*(1-a),a:1}}
 function ratio(a,b){const l1=lum(a),l2=lum(b);return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)}
 function effBg(el){let node=el;let acc=null;let gradient=false;while(node&&node!==document.documentElement){const cs=getComputedStyle(node);const bi=cs.backgroundImage;if(bi&&bi!=='none'){gradient=true}const c=parse(cs.backgroundColor);if(c&&c.a>0){if(!acc)acc=c;else acc=blend(acc,c);if(acc.a>=0.999)break}node=node.parentElement}
  if(!acc||acc.a<0.999){const body=parse(getComputedStyle(document.body).backgroundColor)||{r:255,g:255,b:255,a:1};acc=acc?blend(acc,body):body}
  return {bg:acc,gradient}}
 function hex(c){return '#'+[c.r,c.g,c.b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase()}
 function path(el){const parts=[];let n=el;let d=0;while(n&&n.nodeType===1&&d<3){let s=n.tagName.toLowerCase();if(n.id)s+='#'+n.id;else if(typeof n.className==='string'&&n.className.trim())s+='.'+n.className.trim().split(/\\s+/).slice(0,2).join('.');parts.unshift(s);n=n.parentElement;d++}return parts.join('>')}
 const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const small=[],zero=[],contrast=[],lowFallback=[];let total=0;const seen=new Set();
 while(w.nextNode()){const t=w.currentNode;if(!t.nodeValue.trim())continue;const el=t.parentElement;if(!el)continue;if(el.closest('script,style,noscript,.review,[hidden]'))continue;
  let hidden=false;let n=el;while(n&&n!==document.body){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden'||cs.opacity==='0'){hidden=true;break}n=n.parentElement}if(hidden)continue;
  const r=el.getBoundingClientRect();if(r.width===0&&r.height===0)continue;const cs=getComputedStyle(el);const fs=parseFloat(cs.fontSize);const fw=parseInt(cs.fontWeight)||400;
  const key=path(el)+'|'+t.nodeValue.trim().slice(0,20);if(seen.has(key))continue;seen.add(key);total++;
  const sample=t.nodeValue.trim().slice(0,24);const p=path(el);
  if(fs===0){zero.push({path:p,text:sample});continue}
  if(fs<12){small.push({path:p,text:sample,fontSize:fs})}
  const fg=parse(cs.color);if(!fg)continue;const eb=effBg(el);const fgc=fg.a<1?blend(fg,eb.bg):fg;const cr=ratio(fgc,eb.bg);
  const large=fs>=24||(fs>=18.66&&fw>=700);const need=large?3:4.5;
  const rec={path:p,text:sample,fontSize:fs,fontWeight:fw,color:hex(fgc),bg:hex(eb.bg),ratio:Math.round(cr*100)/100,need,gradient:eb.gradient};
  if(cr<need)contrast.push(rec);}
 return {total,lt12:small.length,small,zeroFont:zero,contrastFail:contrast.length,contrast}}'''

JS_OVERFLOW = '''()=>{const de=document.documentElement;const vw=innerWidth;const bad=[];for(const el of document.querySelectorAll('body *')){if(el.closest('.review,script,style'))continue;const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')continue;const r=el.getBoundingClientRect();if(r.width===0)continue;if(r.right>vw+1||r.left<-1){const sc=el.closest('.store-demo-tags,.term-grid,.term-scroll,.quick-store-filters,[data-h-scroll]');if(sc&&sc!==el)continue;bad.push({path:el.tagName.toLowerCase()+(el.className&&typeof el.className==='string'?'.'+el.className.trim().split(/\\s+/).slice(0,2).join('.'):''),left:Math.round(r.left),right:Math.round(r.right)});if(bad.length>12)break}}
 return {docW:de.scrollWidth,vw,pageScrollH:(document.querySelector('.page')||de).scrollHeight,outside:bad}}'''

JS_SCROLL = '''(y)=>{const el=document.querySelector('.page')||document.scrollingElement;el.style.scrollBehavior='auto';el.scrollTop=y;return [el.scrollTop,el.scrollHeight,el.clientHeight]}'''

JS_FAB = '''(sels)=>{const fab=document.querySelector('#miniSupportLauncher');const wrap=document.querySelector('#miniGlobalSupport');if(!fab)return {fab:null};const f=fab.getBoundingClientRect();const cs=getComputedStyle(fab);const wcs=getComputedStyle(wrap);
 const hiddenNow=wcs.visibility==='hidden'||cs.visibility==='hidden'||wcs.display==='none'||wrap.classList.contains('mk-v3-support-obstructed')||wrap.classList.contains('home-support-obstructed');
 const dockHost=wrap.closest('.bottombar,.header');const docked=dockHost?(dockHost.classList.contains('bottombar')?'bottombar':'header'):null;
 const hits=[];for(const s of sels){if(docked)break;for(const el of document.querySelectorAll(s)){if(el.closest('#miniGlobalSupport'))continue;const r=el.getBoundingClientRect();if(r.width===0||r.height===0)continue;const ecs=getComputedStyle(el);if(ecs.visibility==='hidden'||ecs.display==='none')continue;const ix=Math.max(0,Math.min(f.right,r.right)-Math.max(f.left,r.left)),iy=Math.max(0,Math.min(f.bottom,r.bottom)-Math.max(f.top,r.top));if(ix>0&&iy>0)hits.push({sel:s,text:(el.textContent||'').trim().slice(0,30),overlap:[Math.round(ix),Math.round(iy)]})}}
 const span=fab.querySelector('span');const i=fab.querySelector('i');const sr=span?span.getBoundingClientRect():null;
 return {fab:[Math.round(f.left),Math.round(f.top),Math.round(f.width),Math.round(f.height)],hidden:hiddenNow,visibility:wcs.visibility,cls:wrap.className,inBottombar:!!wrap.closest('.bottombar'),docked:docked,position:wcs.position,labelFits:sr?(sr.height<=f.height+1&&sr.width<=f.width+1):null,labelFont:span?getComputedStyle(span).fontSize:null,iconFont:i?getComputedStyle(i).fontSize:null,hits}}'''

JS_CARDS = '''()=>[...document.querySelectorAll('#storeList>*')].map((e,i)=>{const r=e.getBoundingClientRect();const q=s=>e.querySelector(s);const txt=s=>{const n=q(s);return n?n.textContent.trim().replace(/\\s+/g,' '):null};
 return {index:i,kind:e.classList.contains('estore-list-card')?'estore':e.classList.contains('store')?'store':'other',id:e.dataset.id||e.id||'',cls:e.className,height:Math.round(r.height),top:Math.round(r.top),width:Math.round(r.width),
  name:q('.name')?[...q('.name').childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue.trim()).join(''):txt('.estore-list-title'),badges:[...e.querySelectorAll('.badge,.estore-list-badge')].map(b=>b.textContent.trim()),area:txt('.area'),route:txt('.route'),
  tags:[...e.querySelectorAll('.store-demo-tags .tag')].map(t=>t.textContent.trim()),tagsClipped:(()=>{const c=q('.store-demo-tags');if(!c)return null;const cr=c.getBoundingClientRect();const card=e.getBoundingClientRect();return [...c.querySelectorAll('.tag')].some(t=>{const tr=t.getBoundingClientRect();return tr.right>card.right+0.5||tr.right>cr.right+0.5||tr.bottom>cr.bottom+0.5||tr.left<cr.left-0.5})})(),
  tagsRowRect:(()=>{const c=q('.store-demo-tags');if(!c)return null;const cr=c.getBoundingClientRect();return [Math.round(cr.left),Math.round(cr.top-r.top),Math.round(cr.width),Math.round(cr.height)]})(),
  facts:[...e.querySelectorAll('.fact')].map(f=>f.textContent.trim().replace(/\\s+/g,' ')),price:txt('.price-number'),priceSuffix:[...e.querySelectorAll('.price-unit,.price-start')].map(x=>x.textContent.trim()).join(''),photo:q('.store-photo img')?'img':'placeholder',
  chevron:txt('.card-open-chevron'),estore:e.classList.contains('estore-list-card')?{kicker:txt('.estore-list-kicker'),desc:txt('.estore-list-desc'),points:[...e.querySelectorAll('.estore-list-points span')].map(x=>x.textContent.trim()),note:txt('.estore-list-note'),link:txt('.estore-list-link'),fallbackFirst:e.classList.contains('fallback-first')}:null}})'''

JS_S01_HEAD = '''()=>{const t=s=>{const n=document.querySelector(s);return n?n.textContent.trim().replace(/\\s+/g,' '):null};const vis=s=>{const n=document.querySelector(s);if(!n)return null;const cs=getComputedStyle(n);return cs.display!=='none'&&cs.visibility!=='hidden'&&n.getBoundingClientRect().height>0};
 return {locationText:t('#locationText'),placeholder:t('.location-search-entry .placeholder'),travel:t('#travelBtn'),sort:t('#sortFilterValue'),distance:t('#distanceFilterValue'),service:t('#serviceFilterValue'),quick:[...document.querySelectorAll('[data-quick]')].map(b=>b.textContent.trim()+':'+b.getAttribute('aria-pressed')),coverage:t('#localCoverageTitle'),coverageDesc:t('#localCoverageDesc'),estimateStrip:vis('#estimateStrip')?t('#estimateStrip'):null,demand:vis('#activeDemandCard')?t('#demandSummary'):null,recommendation:vis('#recommendationSummary')?t('#recommendationSummary'):null,recovery:vis('#distanceRecoveryCard')?t('#distanceRecoveryCard'):null,locEmpty:vis('.loc-empty')?t('.loc-empty'):null,nomatch:vis('.notice.state-nomatch')?t('.notice.state-nomatch'):null,loadMore:vis('#loadMore')?t('#loadMore'):null,tabs:[...document.querySelectorAll('.tab')].map(x=>x.textContent.trim()),listTop:Math.round(document.querySelector('#storeList').getBoundingClientRect().top),headerBottom:Math.round(document.querySelector('.header').getBoundingClientRect().bottom),stateClass:document.body.className}}'''

JS_O01_TEXTS = '''()=>{const t=s=>{const n=document.querySelector(s);return n?n.textContent.trim().replace(/\\s+/g,' '):null};return {url:location.pathname.split('/').pop(),title:t('#unitTitle'),storeMeta:t('#storeMeta'),unitMeta:t('#unitMeta'),term:t('#termText'),startDate:document.querySelector('#startDateInput').value,endDate:t('#endDateText'),payable:t('#payableTotal'),rentLabel:t('#rentLabel'),rent:t('#rentFee'),monthly:t('#monthlyText'),deposit:t('#depositFee'),management:t('#managementFee'),transportRowVisible:getComputedStyle(document.querySelector('#transportRow')).display!=='none',transport:t('#transportFee'),hint:t('#transportHint'),couponRows:[...document.querySelectorAll('.coupon-v1-inline-row')].map(r=>r.textContent.trim().replace(/\\s+/g,' ')),afterStart:t('#afterStart'),pay:t('#pay'),payDisabled:document.querySelector('#pay').disabled,edit:t('#edit'),agree:document.querySelector('#agreeContract').checked,sections:[...document.querySelectorAll('.section')].filter(s=>getComputedStyle(s).display!=='none').map(s=>s.querySelector('h2')?s.querySelector('h2').textContent.trim():'(order-card)'),rows:[...document.querySelectorAll('.payment-rows .row')].filter(r=>getComputedStyle(r).display!=='none').map(r=>r.textContent.trim().replace(/\\s+/g,' ')),gateValid:window.MINI_KOALA_PRICE_GATE_STATUS?window.MINI_KOALA_PRICE_GATE_STATUS.valid:null,notice:t('#priceRecheckNotice')}}'''

JS_BOTTOMBAR = '''()=>{const bar=document.querySelector('.bottombar');if(!bar)return null;const br=bar.getBoundingClientRect();const kids=[...bar.children].map(k=>{const r=k.getBoundingClientRect();const cs=getComputedStyle(k);const inner=k.querySelector('span')||k;return {tag:k.tagName.toLowerCase(),id:k.id,cls:k.className.slice(0,40),text:k.textContent.trim().slice(0,30),rect:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],fontSize:cs.fontSize,fontWeight:cs.fontWeight,singleLine:(()=>{const rg=document.createRange();rg.selectNodeContents(k);const rr=rg.getBoundingClientRect();return rr.height<=(parseFloat(cs.lineHeight)||20)*1.5+1&&rr.width<=k.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)+1})(),scrollW:k.scrollWidth,clientW:k.clientWidth,padL:cs.paddingLeft,padR:cs.paddingRight,textW:(()=>{const rg=document.createRange();rg.selectNodeContents(k);const rr=rg.getBoundingClientRect();return Math.round(rr.width)})()}});
 const page=document.querySelector('.page');const pcs=getComputedStyle(page);const last=[...document.querySelectorAll('.page .section')].filter(s=>getComputedStyle(s).display!=='none').pop();
 return {bar:[Math.round(br.left),Math.round(br.top),Math.round(br.width),Math.round(br.height)],paddingTop:getComputedStyle(bar).paddingTop,paddingBottom:getComputedStyle(bar).paddingBottom,gap:getComputedStyle(bar).gap,children:kids,pagePaddingBottom:pcs.paddingBottom,pageScrollH:page.scrollHeight,pageClientH:page.clientHeight,lastSectionBottomAtEnd:(()=>{page.scrollTop=page.scrollHeight;const r=last.getBoundingClientRect();const v=Math.round(br.top-r.bottom);page.scrollTop=0;return v})()}}'''

JS_VARS = '''(names)=>{const cs=getComputedStyle(document.body);const o={};for(const n of names)o[n]=cs.getPropertyValue(n).trim();return o}'''
VAR_NAMES = ['--koala-bg', '--koala-surface', '--koala-surface-2', '--koala-text', '--koala-text-2', '--koala-text-3', '--koala-muted', '--koala-divider',
             '--koala-line', '--koala-brand', '--koala-brand-700', '--koala-brand-500', '--koala-brand-200', '--koala-brand-100', '--koala-brand-soft',
             '--koala-brand-tint', '--koala-price', '--koala-price-strong', '--koala-price-soft', '--koala-promo-text', '--koala-radius', '--koala-shadow',
             '--bg', '--ms-bg', '--s01-bg', '--vb-bg', '--ve2-paper', '--v274-bg', '--card', '--ms-surface', '--vb-surface', '--text', '--ms-text',
             '--vb-text', '--ve2-ink', '--muted', '--ms-muted', '--vb-tertiary', '--ve2-muted', '--line', '--ms-line', '--vb-line', '--ve2-line',
             '--primary', '--ms-green', '--vb-green', '--ve2-green', '--vb-green-deep', '--ve2-deep', '--ms-orange', '--vb-orange', '--ve2-copper',
             '--vb-orange-deep', '--vb-orange-soft', '--mk-promo-text', '--mk-promo-bg', '--mk-tertiary']

FAB_TARGETS_S01 = ['.estore-list-badge', '.estore-list-link', '.estore-list-title', '.price-number', '.price-unit', '.price-start', '.store-demo-tags .tag',
                   '.card-open-chevron', '.store .name', '.store .badge', '.store .route', '.tab', '.moreline', '.browse-stock-line strong', '.fact .label',
                   '.quick-store-filters button', '.compact-filter-btn', '.estore-list-points span', '.estore-list-note', '.distance-recovery', '.loc-empty button',
                   '.loc-empty .search', '.empty-results button']
FAB_TARGETS_O01 = ['#managementFee', '#depositFee', '#rentFee', '#monthlyText', '#payableTotal', '#endDateText', '#termText', '.payable-hero span', '.row span',
                   '.row b', '.order-rules button', '.order-rules span', '#prohibitedOpen', '#contractOpen', '.agreement label', '.agreement>div', '.bottombar .primary',
                   '.bottombar .secondary', '.coupon-v1-inline-row', '.pay-after .item', '.storage-notice span', '.hint', '.section h2', '.date-input']


def jsclick(pg, sel):
    """Click through the DOM (works even if the element is visually hidden); returns whether it was visible/clickable first."""
    vis = pg.evaluate('''(s)=>{const e=document.querySelector(s);if(!e)return null;const cs=getComputedStyle(e);const r=e.getBoundingClientRect();let hidden=false;let n=e;while(n&&n!==document.body){const c=getComputedStyle(n);if(c.visibility==='hidden'||c.display==='none')hidden=true;n=n.parentElement}return {visible:!hidden&&r.width>0,rect:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]}}''', sel)
    pg.evaluate('''(s)=>document.querySelector(s).click()''', sel)
    return vis


def long_shot(pg, path):
    """Full-length screenshot of the internal .page scroll container (temporary style only on the screenshot pass)."""
    pg.evaluate('''()=>{const page=document.querySelector('.page');const shell=document.querySelector('.shell')||document.querySelector('.phone');if(!page)return;window.__mkLong={shell:shell?shell.getAttribute('style'):null,page:page.getAttribute('style'),body:document.body.getAttribute('style')};
      const h=page.scrollHeight;if(shell){shell.style.height=h+'px';shell.style.overflow='visible'}page.style.height=h+'px';page.style.overflow='visible';document.body.style.height=h+'px';document.body.style.overflow='visible';document.documentElement.style.overflow='visible'}''')
    pg.wait_for_timeout(120)
    pg.screenshot(path=path, full_page=True)
    pg.evaluate('''()=>{const s=window.__mkLong;if(!s)return;const page=document.querySelector('.page');const shell=document.querySelector('.shell')||document.querySelector('.phone');const put=(el,v)=>{if(!el)return;if(v==null)el.removeAttribute('style');else el.setAttribute('style',v)};put(shell,s.shell);put(page,s.page);put(document.body,s.body);document.documentElement.style.overflow='';}''')
    pg.wait_for_timeout(80)


def fab_scan(pg, targets, step=120, limit=4000):
    """Scroll through the page sampling FAB collisions; returns list of {scrollTop, hits, hidden}."""
    rows = []
    y = 0
    while True:
        st = pg.evaluate(JS_SCROLL, y)
        pg.wait_for_timeout(70)
        r = pg.evaluate(JS_FAB, targets)
        rows.append({'scrollTop': st[0], 'hidden': r.get('hidden'), 'hits': r.get('hits', [])[:5], 'fab': r.get('fab')})
        if st[0] + st[2] >= st[1] - 2 or y > limit:
            break
        y += step
    # bottom explicitly
    st = pg.evaluate(JS_SCROLL, 100000); pg.wait_for_timeout(70)
    r = pg.evaluate(JS_FAB, targets)
    rows.append({'scrollTop': st[0], 'hidden': r.get('hidden'), 'hits': r.get('hits', [])[:5], 'fab': r.get('fab'), 'bottom': True})
    pg.evaluate(JS_SCROLL, 0); pg.wait_for_timeout(60)
    return rows


def visible_hits(rows):
    """Collisions that are user-visible: FAB not hidden and overlapping a target."""
    return [r for r in rows if r['hits'] and not r['hidden']]


def new_ctx(b, w, h):
    return b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='zh-CN', user_agent=UA)


def attach(pg):
    errs = {'pageerror': [], 'console': [], 'requestfailed': []}
    pg.on('pageerror', lambda e: errs['pageerror'].append(str(e)[:200]))
    pg.on('console', lambda m: errs['console'].append(m.text[:200]) if m.type == 'error' else None)
    pg.on('requestfailed', lambda rq: errs['requestfailed'].append(rq.url[-120:] + ' ' + str(rq.failure)))
    return errs


def allow_location(pg):
    try:
        btn = pg.get_by_text('允许', exact=True).first
        if btn.is_visible():
            btn.click(); pg.wait_for_timeout(2300); return True
    except Exception:
        pass
    return False


def run(args):
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(args.port), '--bind', '127.0.0.1'], cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    base = f'http://127.0.0.1:{args.port}/prototype/'
    result = {'label': args.label, 'root': str(ROOT), 'viewports': {}, 'generated_at': time.strftime('%Y-%m-%d %H:%M:%S')}
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            result['chromium'] = b.version
            result['env'] = {'dpr': 2, 'locale': 'zh-CN', 'ua': UA, 'run': f'python3 -m http.server {args.port} (package root) + Playwright Chromium headless', 'fonts': subprocess.run(['fc-match', 'PingFang SC'], capture_output=True, text=True).stdout.strip()}
            for (w, h) in VIEWPORTS:
                key = f'{w}x{h}'; R = result['viewports'][key] = {}
                # ---------------- S01 six states
                for st, q in S01_STATES.items():
                    c = new_ctx(b, w, h); pg = c.new_page(); errs = attach(pg)
                    d = {'state': st, 'url': S01 + q}
                    try:
                        pg.goto(base + S01 + q); pg.wait_for_timeout(1600)
                        if st != 'unlocated':
                            d['locationAllowed'] = allow_location(pg)
                        else:
                            d['locationAllowed'] = False
                        if st in SET_STATE:
                            pg.evaluate('''(s)=>{if(typeof setState==='function'){setState(s);return true}return false}''', st)
                            pg.wait_for_timeout(700)
                            d['viaSetState'] = True
                        pg.wait_for_timeout(300)
                        pg.screenshot(path=str(out / f'S01_{st}_{key}.png'))
                        d['vars'] = pg.evaluate(JS_VARS, VAR_NAMES)
                        d['styles'] = pg.evaluate(JS_STYLES, [S01_SEL, PROPS])
                        d['textAudit'] = pg.evaluate(JS_TEXT_AUDIT)
                        d['overflow'] = pg.evaluate(JS_OVERFLOW)
                        d['head'] = pg.evaluate(JS_S01_HEAD)
                        d['cards'] = pg.evaluate(JS_CARDS)
                        d['fabScan'] = fab_scan(pg, FAB_TARGETS_S01)
                        d['fabVisibleHits'] = visible_hits(d['fabScan'])
                        long_shot(pg, str(out / f'S01_{st}_{key}_long.png'))
                        if st == 'browse':
                            # expanded FAB state (also a collision check)
                            jsclick(pg, '#miniSupportLauncher'); pg.wait_for_timeout(300)
                            d['fabExpanded'] = pg.evaluate(JS_FAB, FAB_TARGETS_S01)
                            d['fabExpanded']['actions'] = pg.evaluate('''()=>[...document.querySelectorAll('#miniSupportActions button')].map(b=>{const r=b.getBoundingClientRect();const cs=getComputedStyle(b);return {id:b.id,text:b.textContent.trim(),rect:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],visible:cs.visibility!=='hidden'&&cs.display!=='none'&&r.height>0,fontSize:getComputedStyle(b.querySelector('span')||b).fontSize}})''')
                            d['fabExpanded']['wrapperVisibility'] = pg.evaluate('''()=>getComputedStyle(document.querySelector('#miniGlobalSupport')).visibility''')
                            pg.screenshot(path=str(out / f'S01_browse_fab_expanded_{key}.png'))
                            d['phoneHandler'] = pg.evaluate('''()=>String(document.querySelector('#miniSupportPhone').onclick||'')''')[:160]
                            jsclick(pg, '#miniSupportChat'); pg.wait_for_timeout(300)
                            d['chatMaskShown'] = pg.evaluate('''()=>document.querySelector('#miniSupportMask').classList.contains('show')''')
                            pg.screenshot(path=str(out / f'S01_browse_fab_chat_{key}.png'))
                            jsclick(pg, '#miniSupportClose'); pg.wait_for_timeout(200)
                            d['chatMaskClosed'] = pg.evaluate('''()=>!document.querySelector('#miniSupportMask').classList.contains('show')''')
                            d['fabAfterChat'] = pg.evaluate(JS_FAB, FAB_TARGETS_S01)
                            # ---- filter panels
                            inter = d['interactions'] = {}
                            base_cards = [(x['kind'], x['id'], x['name']) for x in d['cards']]
                            for btn, sheet, name in [('#sortFilterBtn', '#sortFilterSheet', 'sort'), ('#distanceFilterBtn', '#distanceFilterSheet', 'distance'), ('#filterBtn', '#filterSheet', 'service')]:
                                pg.click(btn); pg.wait_for_timeout(350)
                                inter[name + 'Panel'] = pg.evaluate('''([btn,sheet])=>{const b=document.querySelector(btn),s=document.querySelector(sheet),inner=s.querySelector('.sheet');const br=b.getBoundingClientRect(),sr=inner.getBoundingClientRect(),bar=document.querySelector('.controls').getBoundingClientRect();return {expanded:b.getAttribute('aria-expanded'),shown:s.classList.contains('show'),sheetDisplay:getComputedStyle(s).display,sheetTopStyle:getComputedStyle(s).top,anchorGap:Math.round(sr.top-bar.bottom),sheetRect:[Math.round(sr.left),Math.round(sr.top),Math.round(sr.width),Math.round(sr.height)],options:[...inner.querySelectorAll('button,.option')].map(o=>o.textContent.trim().replace(/\\s+/g,' ')).slice(0,12),optionHeights:[...inner.querySelectorAll('button')].map(o=>Math.round(o.getBoundingClientRect().height)).slice(0,10)}}''', [btn, sheet])
                                pg.screenshot(path=str(out / f'S01_browse_panel_{name}_{key}.png'))
                                ta = pg.evaluate(JS_TEXT_AUDIT); inter[name + 'PanelTextAudit'] = {'lt12': ta['lt12'], 'small': ta['small'], 'contrastFail': ta['contrastFail'], 'contrast': ta['contrast']}
                                if name == 'service':
                                    pg.click('#filterSheet .pill[data-value="24h"]'); pg.click('#filterSheet .pill[data-value="elevator"]'); pg.wait_for_timeout(150)
                                    pg.screenshot(path=str(out / f'S01_browse_panel_service_selected_{key}.png'))
                                    pg.click('#applyFilter'); pg.wait_for_timeout(600)
                                    inter['serviceApplied'] = {'head': pg.evaluate(JS_S01_HEAD), 'cards': [(x['kind'], x['id'], x['name']) for x in pg.evaluate(JS_CARDS)], 'fab': pg.evaluate(JS_FAB, FAB_TARGETS_S01)}
                                    pg.screenshot(path=str(out / f'S01_browse_service_applied_{key}.png'))
                                    pg.click('#filterBtn'); pg.wait_for_timeout(300)
                                    pg.click('#filterSheet .pill[data-value="24h"]'); pg.click('#filterSheet .pill[data-value="elevator"]'); pg.wait_for_timeout(100)
                                    pg.click('#applyFilter'); pg.wait_for_timeout(600)
                                    inter['serviceCancelled'] = {'head': pg.evaluate(JS_S01_HEAD), 'cards': [(x['kind'], x['id'], x['name']) for x in pg.evaluate(JS_CARDS)]}
                                    inter['serviceCancelRestoresList'] = inter['serviceCancelled']['cards'] == base_cards
                                else:
                                    pg.click(btn); pg.wait_for_timeout(250)
                                    inter[name + 'PanelClosed'] = pg.evaluate('''(sheet)=>!document.querySelector(sheet).classList.contains('show')''', sheet)
                            # ---- quick chips
                            pg.click('[data-quick="special"]'); pg.wait_for_timeout(500)
                            inter['quickSpecial'] = {'head': pg.evaluate(JS_S01_HEAD), 'cards': [(x['kind'], x['id'], x['name'], x['tags']) for x in pg.evaluate(JS_CARDS)], 'chipStyle': pg.evaluate(JS_STYLES, [['.quick-store-filters button.active', '.quick-store-filters button'], PROPS]), 'fab': pg.evaluate(JS_FAB, FAB_TARGETS_S01)}
                            pg.screenshot(path=str(out / f'S01_browse_quick_special_{key}.png'))
                            pg.click('[data-quick="moving"]'); pg.wait_for_timeout(500)
                            inter['quickSpecialMoving'] = {'head': pg.evaluate(JS_S01_HEAD), 'cards': [(x['kind'], x['id'], x['name'], x['tags']) for x in pg.evaluate(JS_CARDS)]}
                            pg.screenshot(path=str(out / f'S01_browse_quick_special_moving_{key}.png'))
                            pg.click('[data-quick="special"]'); pg.click('[data-quick="moving"]'); pg.wait_for_timeout(500)
                            inter['quickCleared'] = {'head': pg.evaluate(JS_S01_HEAD), 'cards': [(x['kind'], x['id'], x['name']) for x in pg.evaluate(JS_CARDS)]}
                            inter['quickClearRestoresList'] = inter['quickCleared']['cards'] == base_cards
                            # ---- pagination
                            before_n = len(pg.evaluate(JS_CARDS))
                            lm_visible = pg.evaluate('''()=>{const n=document.querySelector('#loadMore');return getComputedStyle(n).display!=='none'}''')
                            if lm_visible:
                                pg.evaluate(JS_SCROLL, 100000); pg.wait_for_timeout(200)
                                pg.click('#loadMore'); pg.wait_for_timeout(700)
                                cards2 = pg.evaluate(JS_CARDS)
                                inter['pagination'] = {'before': before_n, 'after': len(cards2), 'loadMoreText': pg.evaluate(JS_S01_HEAD)['loadMore'], 'estoreIndexAfter': [x['index'] for x in cards2 if x['kind'] == 'estore'], 'fabAfterPagination': pg.evaluate(JS_FAB, FAB_TARGETS_S01), 'fabScanAfterPagination': visible_hits(fab_scan(pg, FAB_TARGETS_S01, step=160))}
                                pg.screenshot(path=str(out / f'S01_browse_paginated_{key}.png'))
                            # window resize re-check (390 -> 375 or vice versa)
                            pg.set_viewport_size({'width': w + (15 if w == 375 else -15), 'height': h}); pg.wait_for_timeout(400)
                            inter['resizeFab'] = pg.evaluate(JS_FAB, FAB_TARGETS_S01)
                            pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(300)
                        if st == 'unlocated':
                            # permission sheet rendering (unchanged scope) — screenshot only
                            pg.click('#useLocation'); pg.wait_for_timeout(500)
                            d['permissionSheet'] = pg.evaluate('''()=>{const m=document.querySelector('.mk-location-mask');if(!m)return null;const b=[...m.querySelectorAll('button')];return {visible:true,buttons:b.map(x=>({text:x.textContent.trim(),bg:getComputedStyle(x).backgroundColor,color:getComputedStyle(x).color,fontSize:getComputedStyle(x).fontSize}))}}''')
                            pg.screenshot(path=str(out / f'S01_unlocated_permission_{key}.png'))
                    except Exception as e:
                        d['exception'] = repr(e)[:300]
                    d['errors'] = errs
                    R[f'S01_{st}'] = d; c.close()
                # ---------------- O01 real path
                c = new_ctx(b, w, h); pg = c.new_page(); errs = attach(pg); d = {}
                try:
                    pg.goto(base + U01); pg.wait_for_timeout(1700)
                    d['u01Shot'] = str(out / f'U01_{key}.png'); pg.screenshot(path=d['u01Shot'])
                    pg.get_by_text('继续租用', exact=True).first.click(); pg.wait_for_timeout(1900)
                    d['url'] = pg.url.split('/')[-1][:160]
                    pg.screenshot(path=str(out / f'O01_{key}.png'))
                    d['vars'] = pg.evaluate(JS_VARS, VAR_NAMES)
                    d['styles'] = pg.evaluate(JS_STYLES, [O01_SEL, PROPS])
                    d['textAudit'] = pg.evaluate(JS_TEXT_AUDIT)
                    d['overflow'] = pg.evaluate(JS_OVERFLOW)
                    d['texts'] = pg.evaluate(JS_O01_TEXTS)
                    d['bottombar'] = pg.evaluate(JS_BOTTOMBAR)
                    d['longAmount'] = pg.evaluate('''()=>{const b=document.querySelector('#pay');const keep=b.textContent;const out={};for(const t of ['确认并支付 ¥13,863','确认并支付 ¥113,863']){b.textContent=t;const rg=document.createRange();rg.selectNodeContents(b);const rr=rg.getBoundingClientRect();const cs=getComputedStyle(b);out[t]={textW:Math.round(rr.width),textH:Math.round(rr.height),clientW:b.clientWidth,padL:parseFloat(cs.paddingLeft),padR:parseFloat(cs.paddingRight),fits:rr.width<=b.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)+1&&rr.height<=(parseFloat(cs.lineHeight)||20)*1.5+1,btnW:Math.round(b.getBoundingClientRect().width)}}b.textContent=keep;return out}''')
                    d['fabScan'] = fab_scan(pg, FAB_TARGETS_O01)
                    d['fabVisibleHits'] = visible_hits(d['fabScan'])
                    long_shot(pg, str(out / f'O01_{key}_long.png'))
                    # expanded FAB
                    jsclick(pg, '#miniSupportLauncher'); pg.wait_for_timeout(300)
                    d['fabExpanded'] = pg.evaluate(JS_FAB, FAB_TARGETS_O01)
                    d['fabExpanded']['actions'] = pg.evaluate('''()=>[...document.querySelectorAll('#miniSupportActions button')].map(b=>{const r=b.getBoundingClientRect();const cs=getComputedStyle(b);return {id:b.id,text:b.textContent.trim(),rect:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],visible:cs.visibility!=='hidden'&&cs.display!=='none'&&r.height>0,inViewport:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth}})''')
                    pg.screenshot(path=str(out / f'O01_fab_expanded_{key}.png'))
                    d['phoneHandler'] = pg.evaluate('''()=>String(document.querySelector('#miniSupportPhone').onclick||'')''')[:160]
                    jsclick(pg, '#miniSupportChat'); pg.wait_for_timeout(300)
                    d['chatMaskShown'] = pg.evaluate('''()=>document.querySelector('#miniSupportMask').classList.contains('show')''')
                    pg.screenshot(path=str(out / f'O01_fab_chat_{key}.png'))
                    jsclick(pg, '#miniSupportClose'); pg.wait_for_timeout(200)
                    d['chatMaskClosed'] = pg.evaluate('''()=>!document.querySelector('#miniSupportMask').classList.contains('show')''')
                    # four sheets
                    sheets = {}
                    for opener, sheet, closer in [('#contractOpen', '#contractSheet', '#contractClose'), ('#prohibitedOpen', '#prohibitedSheet', '#prohibitedClose'), ('#rulesOpen', '#rulesSheet', '#rulesClose'), ('#depositInfo', '#depositSheet', '#depositClose')]:
                        pg.evaluate('''(s)=>document.querySelector(s).scrollIntoView({block:'center'})''', opener); pg.wait_for_timeout(150)
                        pg.click(opener); pg.wait_for_timeout(350)
                        sheets[sheet] = pg.evaluate('''([s,c])=>{const m=document.querySelector(s);const inner=m.querySelector('.sheet');const btn=document.querySelector(c);const r=btn.getBoundingClientRect();return {shown:m.classList.contains('show'),h3:inner.querySelector('h3').textContent.trim(),confirmText:btn.textContent.trim(),confirmHeight:Math.round(r.height),confirmFont:getComputedStyle(btn).fontSize,confirmBg:getComputedStyle(btn).backgroundColor,sheetRadius:getComputedStyle(inner).borderRadius,descFont:inner.querySelector('.sheet-desc')?getComputedStyle(inner.querySelector('.sheet-desc')).fontSize:null}}''', [sheet, closer])
                        if sheet == '#rulesSheet':
                            pg.screenshot(path=str(out / f'O01_sheet_rules_{key}.png'))
                        pg.click(closer); pg.wait_for_timeout(250)
                        sheets[sheet]['closed'] = pg.evaluate('''(s)=>!document.querySelector(s).classList.contains('show')''', sheet)
                    d['sheets'] = sheets
                    pg.evaluate(JS_SCROLL, 0)
                    # agreement validation: pay without agreement
                    pg.click('#pay'); pg.wait_for_timeout(400)
                    d['payWithoutAgree'] = pg.evaluate('''()=>({toast:document.querySelector('#toast').textContent,toastVisible:getComputedStyle(document.querySelector('#toast')).display!=='none',attention:document.querySelector('#agreementBox').classList.contains('agreement-attention'),url:location.pathname.split('/').pop()})''')
                    pg.screenshot(path=str(out / f'O01_agree_validation_{key}.png'))
                    pg.wait_for_timeout(1500)
                    pg.check('#agreeContract'); pg.wait_for_timeout(150)
                    d['agreeStyle'] = pg.evaluate(JS_STYLES, [['#agreeContract', '.agreement', '.agreement label span'], PROPS])
                    pg.click('#pay'); pg.wait_for_timeout(450)
                    d['phoneAuth'] = pg.evaluate('''()=>({shown:document.querySelector('#phoneAuthSheet').classList.contains('show'),buttons:[...document.querySelectorAll('#phoneAuthSheet button')].map(b=>({text:b.textContent.trim(),h:Math.round(b.getBoundingClientRect().height),bg:getComputedStyle(b).backgroundColor,color:getComputedStyle(b).color}))})''')
                    pg.screenshot(path=str(out / f'O01_phone_auth_{key}.png'))
                    pg.click('#phoneAuthAllow'); pg.wait_for_timeout(1800)
                    d['afterAuthUrl'] = pg.url.split('/')[-1][:120]
                    d['reachedO02'] = 'order_o02' in pg.url
                    pg.screenshot(path=str(out / f'O02_after_pay_{key}.png'))
                except Exception as e:
                    d['exception'] = repr(e)[:300]
                d['errors'] = errs
                R['O01'] = d; c.close()
                # ---------------- O01 direct URL (no snapshot)
                c = new_ctx(b, w, h); pg = c.new_page(); errs = attach(pg); d = {}
                try:
                    pg.goto(base + O01); pg.wait_for_timeout(1500)
                    d['texts'] = pg.evaluate(JS_O01_TEXTS)
                    d['textAudit'] = pg.evaluate(JS_TEXT_AUDIT)
                    d['bottombar'] = pg.evaluate(JS_BOTTOMBAR)
                    d['longAmount'] = pg.evaluate('''()=>{const b=document.querySelector('#pay');const keep=b.textContent;const out={};for(const t of ['确认并支付 ¥13,863','确认并支付 ¥113,863']){b.textContent=t;const rg=document.createRange();rg.selectNodeContents(b);const rr=rg.getBoundingClientRect();const cs=getComputedStyle(b);out[t]={textW:Math.round(rr.width),textH:Math.round(rr.height),clientW:b.clientWidth,padL:parseFloat(cs.paddingLeft),padR:parseFloat(cs.paddingRight),fits:rr.width<=b.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)+1&&rr.height<=(parseFloat(cs.lineHeight)||20)*1.5+1,btnW:Math.round(b.getBoundingClientRect().width)}}b.textContent=keep;return out}''')
                    d['fabScan'] = fab_scan(pg, FAB_TARGETS_O01)
                    d['fabVisibleHits'] = visible_hits(d['fabScan'])
                    pg.screenshot(path=str(out / f'O01_direct_{key}.png'))
                except Exception as e:
                    d['exception'] = repr(e)[:300]
                d['errors'] = errs
                R['O01_direct'] = d; c.close()
                # ---------------- H01 / S5 no-change fingerprints
                for name, url, sels in [('H01', H01, H01_SEL), ('S5', S5, S5_SEL)]:
                    c = new_ctx(b, w, h); pg = c.new_page(); errs = attach(pg); d = {'url': url}
                    try:
                        pg.goto(base + url); pg.wait_for_timeout(1800)
                        if name == 'S5':
                            try:
                                pg.evaluate('''()=>{if(typeof go==='function'){go('s5')}}''')
                            except Exception:
                                pass
                            pg.wait_for_timeout(600)
                        d['styles'] = pg.evaluate(JS_STYLES, [sels, PROPS])
                        d['vars'] = pg.evaluate(JS_VARS, VAR_NAMES)
                        d['textAudit'] = {k: v for k, v in pg.evaluate(JS_TEXT_AUDIT).items() if k in ('total', 'lt12', 'contrastFail')}
                        d['stylesheets'] = pg.evaluate('''()=>[...document.querySelectorAll('link[rel=stylesheet]')].map(l=>l.getAttribute('href'))''')
                        d['layers'] = pg.evaluate('''()=>{const names=new Set();for(const ss of document.styleSheets){try{for(const r of ss.cssRules){if(r instanceof CSSLayerBlockRule)names.add(r.name);if(r instanceof CSSLayerStatementRule)r.nameList.forEach(n=>names.add(n))}}catch(e){}}return [...names]}''')
                        pg.screenshot(path=str(out / f'{name}_{key}.png'))
                    except Exception as e:
                        d['exception'] = repr(e)[:300]
                    d['errors'] = errs
                    R[name] = d; c.close()
            b.close()
    finally:
        srv.terminate()
    (out / 'probe.json').write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding='utf-8')
    # ---- short summary
    for key, R in result['viewports'].items():
        print('==', key)
        for name, d in R.items():
            ta = d.get('textAudit') or {}
            e = d.get('errors') or {}
            fv = d.get('fabVisibleHits')
            sc = d.get('fabScan') or []
            hid = sum(1 for r in sc if r.get('hidden'))
            print(f"  {name:14s} lt12={ta.get('lt12')} contrastFail={ta.get('contrastFail')} overflowOutside={len((d.get('overflow') or {}).get('outside', []))} fabVisibleHits={len(fv) if fv is not None else '-'} fabHidden={hid}/{len(sc)} errors={len(e.get('pageerror', []))}/{len(e.get('console', []))}/{len(e.get('requestfailed', []))} {('EXC ' + d['exception']) if d.get('exception') else ''}")
    print('written', out / 'probe.json')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--label', default='probe')
    ap.add_argument('--out', default='outputs/mk_v3_pilot/probe')
    ap.add_argument('--port', type=int, default=8810)
    run(ap.parse_args())
