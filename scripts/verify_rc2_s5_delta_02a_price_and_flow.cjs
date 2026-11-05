#!/usr/bin/env node
'use strict';
/* Source-backed isolated Chromium geometry check, NOT a full app navigation test. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const baseDir=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo/br04');
const css=fs.readFileSync(path.join(baseDir,'s5/style.css'),'utf8')+'\n'+
  fs.readFileSync(path.join(baseDir,'s5/s5-native-flow.css'),'utf8');
const bridge=fs.readFileSync(path.join(baseDir,'bridge.js'),'utf8');
const helper=bridge.match(/^  function fitS5VisiblePrices\(\)\{[\s\S]*?^  \}/m);
assert(helper&&helper[0].includes('node.scrollWidth>node.clientWidth'),'price helper missing measured-width guard');
const artifact=path.resolve(__dirname,'../release-evidence/rc2-candidate-delta-02a');
const specs=[
  {id:'two-stores',match:'matched',stores:2,prices:['¥12,480','¥27,600','¥9,900','¥18,800']},
  {id:'one-store',match:'matched',stores:1,prices:['¥12,480','¥27,600']},
  {id:'large-price',match:'matched',stores:2,prices:['¥1,234,567,890','¥12,345,678,901','¥999,999,999','¥88,888,888']},
  {id:'no-match',match:'none',stores:0,prices:[]},
  {id:'incomplete',match:'incomplete',stores:0,prices:[]}
];
const escape=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const photo='<img alt="门店环境" src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'340\' height=\'130\'%3E%3Crect width=\'340\' height=\'130\' fill=\'%23e7f0ea\'/%3E%3C/svg%3E">';
function card(i,prices){
  const rows=prices.map(p=>{
    const len=p.length>10?'extreme':p.length>7?'long':'normal';
    return '<div class="s5-unit-row"><div class="s5-unit-thumb"></div>'+
      '<div class="s5-unit-info"><strong>独立仓 · 3m³</strong><p>纸箱、行李与家居闲置物品</p><span class="s5-unit-price-label">整期租金</span></div>'+
      '<div class="s5-unit-terms"><button type="button" class="s5-unit-price" data-price-length="'+len+'">'+escape(p)+'</button>'+
      '<small>月均约 ¥1,040</small><button type="button" class="s5-unit-buy">立即下单</button></div></div>';
  }).join('');
  return '<article class="'+(i===0?'major-unit':'minor-unit')+' s5-store-card" data-rank="'+i+'">'+
    '<div class="s5-store-photo">'+photo+'</div><div class="s5-store-info"><div class="s5-store-title"><strong>迷你考拉仓·测试门店'+(i+1)+'</strong><button class="s5-store-open">查看门店 ›</button></div>'+
    '<div class="s5-store-services"><span>24小时存取</span></div><div class="s5-store-address"><span>测试路 18 号</span><button>导航 ›</button></div>'+
    '<p class="s5-store-distance">附近 · 1.8km</p></div><div class="s5-unit-list">'+rows+'</div></article>';
}
function markup(spec){
  const cards=Array.from({length:spec.stores},(_,i)=>card(i,spec.prices.slice(i*2,i*2+2))).join('');
  return '<!doctype html><html lang="zh"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>'+
    '<body data-page="s5"><div id="app-viewport"><main id="artboard" data-term-compact="true" data-match="'+spec.match+'" data-count="'+spec.stores+'">'+
    '<div class="scene-bg"></div><div class="top-ambient"></div><header class="nav"><h1>租期与推荐</h1></header>'+
    '<section class="demand surface"><div class="demand-kicker">您的存储需求</div><div class="capacity-row"><strong>3<span>m³</span></strong><button class="modify">修改</button></div></section>'+
    '<section class="location-line"><span class="location-caption">用仓位置</span><span class="location-name">上海 · 全城门店</span><button class="location-edit">修改 ›</button></section>'+
    '<section class="term surface"><div class="term-heading"><h2>用仓租期</h2></div><div class="term-summary"><strong>已选 12 个月</strong><button>修改 ›</button></div></section>'+
    '<section class="recommend-wrap surface"><header class="rec-heading"><h2>为您推荐 '+spec.stores+' 家门店</h2></header>'+cards+'</section>'+
    '<section class="more-units"><span class="more-units-note">其他门店</span><button>查看更多仓位 ›</button></section>'+
    '<section class="s5-advisor" hidden><span>顾问协助</span></section>'+
    '<section class="estore"><div class="estore-copy"><h2>考拉E存</h2><p>上门取送</p></div></section>'+
    '<section class="no-match"><div class="nm-kicker">暂无完全匹配</div><p>查看其他门店</p></section>'+
    '</main></div></body></html>';
}
(async()=>{
  fs.mkdirSync(artifact,{recursive:true});
  const launch={headless:true,args:['--no-sandbox']};
  if(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE)launch.executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const browser=await chromium.launch(launch);
  const results=[];
  try{
    for(const [width,height] of [[375,812],[390,844]]){
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
      for(const spec of specs){
        const page=await context.newPage();
        await page.setContent(markup(spec));
        await page.addStyleTag({content:css});
        await page.addScriptTag({content:helper[0]+'\nwindow.__fitS5Prices=fitS5VisiblePrices;'});
        await page.evaluate(()=>window.__fitS5Prices());
        const measure=await page.evaluate(()=>{
          const px=el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width};};
          const visibleCards=[...document.querySelectorAll('.s5-store-card')].filter(el=>getComputedStyle(el).display!=='none');
          const prices=[...document.querySelectorAll('.s5-unit-price')].map(el=>({value:el.textContent,actual:el.scrollWidth,available:el.clientWidth,
            fontSize:getComputedStyle(el).fontSize,nowrap:getComputedStyle(el).whiteSpace,
            full:el.dataset.priceFits==='true',ellipsis:getComputedStyle(el).textOverflow==='ellipsis'}));
          const board=document.getElementById('artboard');
          const view=document.getElementById('app-viewport');
          return {viewportWidth:innerWidth,scrollWidth:document.documentElement.scrollWidth,
            viewScrollWidth:view.scrollWidth,viewClientWidth:view.clientWidth,board: px(board),
            transform:getComputedStyle(board).transform,prices,cardRects:visibleCards.map(px),
            estore:px(document.querySelector('.estore')),moreDisplay:getComputedStyle(document.querySelector('.more-units')).display,
            noMatchDisplay:getComputedStyle(document.querySelector('.no-match')).display};
        });
        assert.equal(measure.transform,'none','fixed scaled canvas returned');
        assert(measure.scrollWidth<=width+2&&measure.viewScrollWidth<=measure.viewClientWidth+2,'horizontal overflow');
        assert(measure.board.width<=width+1,'artboard escapes viewport');
        assert.equal(measure.cardRects.length,spec.stores,'incorrect store count');
        for(let i=1;i<measure.cardRects.length;i++)assert(measure.cardRects[i-1].bottom<=measure.cardRects[i].top+1,'card overlap');
        assert(measure.prices.every(p=>p.full&&p.actual<=p.available+1&&p.nowrap&&!p.ellipsis),'amount clipped or wrapped');
        if(spec.stores===0){
          assert.equal(measure.moreDisplay,'none','empty state shows more units');
          assert.notEqual(measure.noMatchDisplay,'none','empty state missing');
        }else assert(measure.cardRects.at(-1).bottom<=measure.estore.top+1,'E-storage overlaps store cards');
        await page.screenshot({path:path.join(artifact,spec.id+'-'+width+'.png'),fullPage:true});
        const scrollReach=await page.evaluate(()=>{
          const scroll=document.getElementById('app-viewport');
          scroll.scrollTop=scroll.scrollHeight;
          return {scrollTop:scroll.scrollTop,scrollHeight:scroll.scrollHeight,viewportHeight:innerHeight,
            estoreBottom:document.querySelector('.estore').getBoundingClientRect().bottom};
        });
        assert(scrollReach.estoreBottom<=height+2,'E-storage inaccessible after scrolling');
        await page.screenshot({path:path.join(artifact,spec.id+'-'+width+'-bottom.png'),fullPage:true});
        results.push({width,height,scenario:spec.id,status:'PASS',measure,scrollReach});
        await page.close();
      }
      await context.close();
    }
  }finally{await browser.close();}
  fs.writeFileSync(path.join(artifact,'results.json'),JSON.stringify({status:'PASS',source:'actual S5 CSS + extracted price-fit function; isolated controlled DOM, not full app',results},null,2));
  console.log('RC2_S5_DELTA_02A_ISOLATED_PRICE_AND_FLOW_PASS cases='+results.length);
})().catch(e=>{console.error('RC2_S5_DELTA_02A_ISOLATED_PRICE_AND_FLOW_FAIL',e.stack||e);process.exitCode=1;});
