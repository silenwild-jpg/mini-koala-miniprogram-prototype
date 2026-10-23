'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const P=path.resolve(__dirname,'../prototype');
const s01=fs.readFileSync(path.join(P,'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'),'utf8');
const s02=fs.readFileSync(path.join(P,'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'),'utf8');
const css=fs.readFileSync(path.join(P,'mk-uxb-store-filter-and-card.css'),'utf8');
const tags=fs.readFileSync(path.join(P,'mk-uxb-common-store-tags.js'),'utf8');
const helper=fs.readFileSync(path.join(P,'mk-v3-s01-tags.js'),'utf8');
let pass=0;function check(name,fn){fn();pass++;console.log('PASS '+name)}
function sharedTags(){const ctx={};vm.createContext(ctx);vm.runInContext(tags,ctx);return ctx.MINI_KOALA_UXB_TAGS;}
const tagAPI=sharedTags();
check('one shared tag API used by S01 and S02',()=>{
 assert(s01.includes('MINI_KOALA_UXB_TAGS.forStore(id,demoActivityFor(id))'));
 assert(s02.includes('MINI_KOALA_UXB_TAGS.html(storeId,window.MINI_KOALA_STORE_ACTIVITY_DEMO.forStore(storeId))'));
 for(const x of [s01,s02])assert(x.includes('src="mk-uxb-common-store-tags.js"'));
});
check('stable 2–4 demo tags and consistent output',()=>{
 for(const id of ['MK_BJ_001','MK_BJ_002','MK_BJ_003', 'MK_BJ_999']){
   const a=tagAPI.forStore(id,{specialUnitIds:new Set([]),moving:false});
   assert(a.length>=2&&a.length<=4);assert.strictEqual(a.join('|'),tagAPI.forStore(id,{}).join('|'));
 }
});
check('promotion only on 特价仓 and 双11大促, not 送搬运',()=>{
 assert.strictEqual(tagAPI.isPromo('特价仓'),true);
 assert.strictEqual(tagAPI.isPromo('双11大促'),true);
 assert.strictEqual(tagAPI.isPromo('送搬运'),false);
 assert(helper.includes("var PROMO = { '特价仓': 1, '双11大促': 1 };"));
 const html=tagAPI.html('promo',{specialUnitIds:new Set(['u1']),moving:true});
 assert(html.includes('特价仓'));assert(html.includes('送搬运'));
 assert(!html.includes('mk-promo-tag\">送搬运'));
});
check('promo tags sorted first without editing inventory facts',()=>{
 const t=tagAPI.forStore('store_x',{specialUnitIds:new Set(['A']),moving:true});
 assert.strictEqual(t[0],'特价仓');
 if(t.includes('双11大促'))assert(t.indexOf('双11大促')<=1);
});
check('common S01 filter dropdown components retained',()=>{
 for(const id of ['sortFilterSheet','distanceFilterSheet','filterSheet']){
  assert(s01.includes('class="sheet-mask inline-filter-sheet" id="'+id+'"'));
 }
 assert(css.includes('.controls.compact-filters{display:grid'));
 assert(css.includes('#filterSheet .pills.multi{display:grid'));
 assert(s01.includes("closeSheet($('#filterSheet'),true)"));
});
check('sort distance and service filters preserve original model',()=>{
 for(const id of ['distanceSelect','sortSelect','applyFilter'])assert(s01.includes('id="'+id+'"'));
 for(const q of ['any','3','5','10'])assert(s01.includes('data-distance-choice="'+q+'"'));
 for(const q of ['recommended','distance','price'])assert(s01.includes('data-sort-choice="'+q+'"'));
 assert(s01.includes("ids=ids.filter(id=>routeFor(id).km<=Number(browseDistanceKm))"));
 assert(s01.includes('services.every(service=>stores[id].services.includes(service))'));
});
check('short requirement summary and browsing CTA',()=>{
 assert(s01.includes('`用仓需求 约${Number(r.target_volume).toFixed(1)}m³'));
 assert(s01.includes("if(a)a.textContent='立即匹配'"));
 assert(!s01.includes('当前按到店时间浏览全部结果；需要时可切换回按您的需求匹配'));
 assert(s02.includes('用仓需求：${r.min.toFixed(1)}–${r.max.toFixed(1)}m³'));
});
check('browse demand restore stays voluntary and keyboard operable',()=>{
 assert(s01.includes('id="estimateStrip" role="button" tabindex="0"'));
 assert(s01.includes("$('#estimateStrip').onclick=()=>{"));
 assert(s01.includes("$('#estimateStrip').onkeydown=e=>"));
 assert(s01.includes("if(entryMode==='browse_nearby' && r){"));
});
check('combo shows proposal count distinct from physical room count',()=>{
 assert(s01.includes("${comboMatch?'组合仓位':'匹配仓位'}"));
 assert(s01.includes("${comboMatch?'1个':matchedSpaces+'个'}"));
 assert(s01.includes('`${combo.capacity.toFixed(1)} m³（${combo.count}间）`'));
 assert(s02.includes('组合仓位 ${combos.length}个'));
});
check('no obsolete S02 supplementary sold-out capacity UI',()=>{
 assert(!s02.includes('id="otherCapacitySection"'));
 assert(!s02.includes('这些容量当前已售出'));
 assert(!s02.includes('本页展示门店实际可租仓位'));
 assert(!s02.includes('已找到 ${combos.length}种组合方案，可咨询后确认'));
 assert(s02.includes('已售出')); // actual unit stock still exists
});
check('S02 store tags get update during existing render',()=>{
 assert(s02.includes('id="s02StoreDemoTags"'));
 assert(s02.includes("const sharedTags=document.getElementById('s02StoreDemoTags')"));
});
check('S01 deleted chevron and has truthful badge labels',()=>{
 assert(!s01.includes('<span class="card-open-chevron" aria-hidden="true">›</span>'));
 assert(s01.includes("window.__s01Highlights[nearest]='离您最近'"));
 assert(s01.includes("window.__s01Highlights[lowest]='区域低价'"));
});
check('area discount defaults 3km but uses selected km',()=>{
 assert(s01.includes("const scopeKm=browseDistanceKm==='any'?3:Number(browseDistanceKm);"));
 assert(s01.includes('if(lowest&&lowest!==nearest)'));
 assert(s01.includes("state!=='unlocated'"));
});
function runFilter({ids,sortMode='recommended',state='browse',radius='any',routes={},prices={},services=[]}){
 const context={state,sortMode,browseDistanceKm:radius,qp:{get:()=>null},window:{MINI_KOALA_RECOMMENDATION_POLICY_V2:{rank(rows){return {estoreFirst:false,rows};}}},
   stores:Object.fromEntries(ids.map(id=>[id,{services:['24h'],availableCount:2}])),
   baseOrder:()=>ids.slice(),passesQuickFilters:()=>true,routeFor:id=>({km:routes[id],m:routes[id]*4}),
   browseUnitPrice:id=>prices[id],cardPrice:id=>prices[id],currentData:()=>({matchType:'single'}),
   $$:()=>services.map(value=>({dataset:{value}}))};
 vm.createContext(context);
 const body=s01.split('function filteredOrder(){')[1].split('\nfunction renderSortSheet(){')[0];
 vm.runInContext('function filteredOrder(){'+body,context);
 return {ids:Array.from(context.filteredOrder()),badges:context.window.__s01Highlights};
}
check('nearest then genuinely cheapest local in recommended mode',()=>{
 const x=runFilter({ids:['b','a','c'],routes:{a:1,b:2,c:4},prices:{a:20,b:10,c:1}});
 assert.deepStrictEqual(x.ids,['a','b','c']);assert.strictEqual(x.badges.a,'离您最近');assert.strictEqual(x.badges.b,'区域低价');assert(!x.badges.c);
});
check('no invented second low price when same store is cheapest',()=>{
 const x=runFilter({ids:['b','a','c'],routes:{a:1,b:2,c:4},prices:{a:8,b:10,c:1}});
 assert.deepStrictEqual(x.ids,['a','b','c']);assert.strictEqual(x.badges.a,'离您最近');assert(!x.badges.b);
});
check('selected 5km radius influences genuine low price selection',()=>{
 const x=runFilter({ids:['a','b','c'],routes:{a:1,b:2,c:4},prices:{a:20,b:10,c:1},radius:'5'});
 assert.deepStrictEqual(x.ids,['a','c','b']);assert.strictEqual(x.badges.c,'区域低价');
});
check('no nearest badge if location is unknown',()=>{
 const x=runFilter({ids:['b','a'],routes:{a:1,b:2},prices:{a:20,b:10},state:'unlocated'});
 assert.deepStrictEqual(x.ids,['b','a']);assert.strictEqual(Object.keys(x.badges).length,0);
});
check('user chose price sort, no artificial recommended order',()=>{
 const x=runFilter({ids:['b','a'],routes:{a:1,b:2},prices:{a:20,b:10},sortMode:'price'});
 assert.deepStrictEqual(x.ids,['b','a']);assert(!x.badges.a);
});
console.log(`PASS ${pass}/${pass} UX-PATCH B targeted checks`);
