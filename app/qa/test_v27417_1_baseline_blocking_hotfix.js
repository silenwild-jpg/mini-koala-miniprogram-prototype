const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const h=read('prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html');
const o01=read('prototype/mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html');
const o02=read('prototype/mini_storage_order_o02_v1_17_self_service_Visual_V2_7_4.html');
const o03=read('prototype/mini_storage_order_o03_v1_17_self_service_Visual_V2_7_4.html');
const id01=read('prototype/mini_storage_identity_id01_v2_7_4_5.html');
const a01=read('prototype/mini_storage_access_a01_v2_self_service_Visual_V2_7_4.html');
const v01=read('prototype/mini_storage_viewing_v01_v1_14_self_service_synced.html');
const v02=read('prototype/mini_storage_viewing_v02_v1_14_self_service_synced.html');
const data=require(path.join(root,'data/mini_koala_data.js'));
function ok(v,m){if(!v){console.error('FAIL',m);process.exit(1)}console.log('PASS',m)}

ok(!h.includes('renderHomeStoreEvidence(card,profile,index)'), 'removed broken H01 evidence call with undefined index');
ok(h.includes('function renderHomeStoreCard(card,profile,index)')&&h.includes("document.querySelectorAll('#nearNew .featured-store,.home-store-alts .store-alt')"), 'all three H01 cards use one fact renderer');
ok(h.includes('unitPrice:Number(window.MINI_KOALA_DATA.storeUnitPriceFrom(profile.store_id))||0'), 'second recommendation ranks by store per-m3 monthly unit price');
ok(h.includes("HOME_PROMO_DEFAULT_STORE_ID='MK_BJ_04547515'"), 'simulated promo default is distinct from low-price slot');
ok(h.includes("<span class=\"price-unit\">/月/m³起</span>"), 'home card price communicates per-m3 monthly unit price');

ok(o01.includes('actual_unit_assignment_source:actualUnitId?\'DEMO_PRESELECTED_U01\'')&&o01.includes('当前演示已选定仓位'), 'O01 retains the concrete demonstration unit selected in U01');
ok(o02.includes("actual_unit_assignment_source:existingOrder.actual_unit_id?"), 'O02 preserves the preselected unit and records fallback allocation only for legacy orders');
ok(o02.includes("unit_identity_type:paid&&assignedActualUnitId?'ACTUAL_UNIT'"), 'O02 promotes identity type after actual allocation');
ok(o03.includes("persistedOrder.actual_unit_id||(hasActualUnit?persistedOrder.unit_id:null)"), 'O03 prefers actual physical unit');
ok(id01.includes('lc.lockCodeFor(physicalUnit,orderNo)')&&a01.includes("o.actual_unit_id||(o.unit_id_semantics!=='LEGACY_REPRESENTATIVE_DISPLAY'?o.unit_id:null)"), 'identity/password flow binds to actual unit');

ok(v01.includes('size_option_id:sizeOptionId||null')&&v01.includes('representative_unit_no:representativeUnitNo||null')&&v01.includes('actual_unit_id:actualUnitId||null'), 'V01 persists size-option identity fields');
ok(v02.includes('sizeOption:v.size_option_id||')&&v02.includes('representativeUnit:v.representative_unit_no||v.unit_id'), 'V02 returns size-option identity to U01');

const ctx={window:{},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},console};vm.createContext(ctx);vm.runInContext(read('prototype/mini_storage_business_ssot_v274.js'),ctx);
const routeBase=ctx.window.MINI_STORAGE_MASTER_V222.route_base.guomao;
const rev=Object.fromEntries(Object.entries(data.legacyAliases).map(([a,id])=>[id,a]));
function km(p){const a=rev[p.store_id];if(a&&routeBase[a])return routeBase[a].drive[1];const seed=[...p.store_id].reduce((s,c)=>s+c.charCodeAt(0),0);return Number(((p.district||'').includes('朝阳')?4.8:7.6+(seed%21)/10).toFixed(1));}
const c=data.stores.filter(p=>p.city==='北京市'&&+p.available_unit_count>0&&+p.size_max>=3.5).map(p=>({id:p.store_id,name:p.store_name,km:km(p),unitPrice:data.storeUnitPriceFrom(p.store_id),count:+p.available_unit_count})).filter(p=>p.unitPrice>0);
const nearest=[...c].sort((a,b)=>a.km-b.km||b.count-a.count||a.name.localeCompare(b.name,'zh-CN'))[0];
const pool=c.filter(x=>x.id!==nearest.id&&x.km<=5);const lower=pool.filter(x=>x.unitPrice<nearest.unitPrice);const value=[...(lower.length?lower:pool)].sort((a,b)=>a.unitPrice-b.unitPrice||a.km-b.km||b.count-a.count)[0];
const promo=c.find(x=>x.id==='MK_BJ_04547515'&&!new Set([nearest.id,value.id]).has(x.id));
ok(nearest.name==='三元桥店'&&nearest.km===3.2,'default nearest slot resolves to 三元桥店');
ok(value.name==='大山子店'&&value.unitPrice===100&&value.km<=5,'default value slot resolves to 大山子店 at 100元/月/m³起');
ok(promo&&promo.name==='安贞店','default promo slot resolves to distinct simulated 安贞店');
console.log('V2.7.4.17.1 BASELINE BLOCKING HOTFIX QA PASS');
