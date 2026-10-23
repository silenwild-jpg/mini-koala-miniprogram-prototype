'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),p=path.join(root,'prototype');
let count=0;function t(n,f){f();++count;console.log('PASS',n);}
const read=n=>fs.readFileSync(path.join(p,n),'utf8');
const home=read('mini_storage_home_H01_Visual_V2_7_4_SSOT.html');
const s01=read('mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html');
const s02=read('mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html');
const m01=read('mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html');
let ctx={window:{}};ctx.globalThis=ctx.window;
ctx.window.MINI_KOALA_DATA={
 getStore:id=>({store_id:id}),
 stores:[{store_id:'STORE_A'},{store_id:'STORE_B'},{store_id:'STORE_C'}],
 getLegacyUnits:id=>[{id:id+'_U1',v:3,base:100,available_count:1},{id:id+'_U2',v:5,base:120,available_count:2}]
};
vm.runInNewContext(read('mini_koala_store_activity_demo_v1.js'),ctx);
vm.runInNewContext(read('mk-uxb-common-store-tags.js'),ctx);
const activity=ctx.window.MINI_KOALA_STORE_ACTIVITY_DEMO,shared=ctx.window.MINI_KOALA_UXB_TAGS;
t('01 same home and store-list tag source',()=>{
 assert(home.includes('MINI_KOALA_UXB_TAGS.html(profile.store_id,window.MINI_KOALA_STORE_ACTIVITY_DEMO.forStore(profile.store_id))'));
 assert(s01.includes('MINI_KOALA_UXB_TAGS.forStore(id,demoActivityFor(id))'));
 assert(s02.includes('MINI_KOALA_UXB_TAGS.html(storeId,window.MINI_KOALA_STORE_ACTIVITY_DEMO.forStore(storeId))'));
});
t('02 real demo activity and shared tags execute for 3 stores',()=>{
 for(const id of ['STORE_A','STORE_B','STORE_C']){
  let tags=Array.from(shared.forStore(id,activity.forStore(id))),markup=shared.html(id,activity.forStore(id));
  assert(tags.length>=2&&tags.length<=4);
  assert(tags.every((tag,i)=>markup.indexOf(tag)>=0));
  assert(tags.findIndex(x=>!shared.isPromo(x))>=0);
  let promoFinished=false;
  tags.forEach(x=>{if(shared.isPromo(x))assert(!promoFinished);else promoFinished=true});
 }
});
t('03 only approved promo tags get special class',()=>{
 for(const s of ['特价仓','双11大促','送搬运','近地铁','24小时'])
  assert.strictEqual(shared.isPromo(s),s==='特价仓'||s==='双11大促');
});
t('04 same deterministic tags for repeated store ID',()=>{
 let a=shared.html('STORE_A',activity.forStore('STORE_A'));
 assert.strictEqual(a,shared.html('STORE_A',activity.forStore('STORE_A')));
});
t('05 all 3 tabs have matching order and icons',()=>{
 for(const h of [home,s01,m01]){
  let b=h.match(/<div class="(?:bottomnav|tabbar)">([\s\S]*?)<\/div>\s*<(?:div|script)/); 
  assert(h.includes('mk-uxc-main-tabbar.css'));assert(h.includes('koala-uxc-nav'));
  let labels=['首页','找仓','门店','我的'];
  let pos=-1;for(const x of labels){let next=h.indexOf('>'+x+'</',h.indexOf('<div class="bottomnav">')>=0?h.indexOf('<div class="bottomnav">'):h.indexOf('<div class="tabbar">'));assert(next>pos);pos=next;}
  assert(h.includes('<div class="ico">◉</div>'));
 }
});
t('06 nav styles never target checkout buttons',()=>{
 let css=read('mk-uxc-main-tabbar.css');assert(css.includes('body.koala-uxc-nav'));
 assert(!/\.bottombar|\.coupon-bottom|\.bottom(?!nav)/.test(css));
});
t('07 scrollbar-only presentation (no overflow changes)',()=>{
 let css=read('mk-uxc-scrollbar-hide.css');assert(css.includes('scrollbar-width: none'));assert(css.includes('::-webkit-scrollbar'));
 assert(!/\boverflow\s*:|touch-action\s*:|pointer-events\s*:/.test(css));
});
t('08 promo CSS is distinct from normal tag',()=>{
 let css=read('mk-uxc-home-tags.css');assert(css.includes('.tag.mk-promo-tag'));assert(css.includes('background:transparent'));
});
t('09 all runnable standalone pages contain scroll indicator stylesheet',()=>{
 let files=fs.readdirSync(p).filter(x=>x.endsWith('.html'));
 let standalone=files.filter(x=>read(x).includes('</head>'));
 assert.strictEqual(standalone.length,47);
 for(const x of standalone)assert(read(x).includes('mk-uxc-scrollbar-hide.css'),x);
});
t('10 only H01/S01/M01 use four-tab component',()=>{
 let files=fs.readdirSync(p).filter(x=>x.endsWith('.html'));
 assert.strictEqual(files.filter(x=>read(x).includes('mk-uxc-main-tabbar.css')).length,3);
});
console.log('UX-PATCH C',count+'/'+count,'PASS; browser not tested');
