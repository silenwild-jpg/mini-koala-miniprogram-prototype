const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const h=fs.readFileSync(path.join(root,'prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html'),'utf8');
const dataSrc=fs.readFileSync(path.join(root,'data/mini_koala_data.js'),'utf8');
const dataApi=require(path.join(root,'data/mini_koala_data.js'));
const s01=fs.readFileSync(path.join(root,'prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'),'utf8');
const s02=fs.readFileSync(path.join(root,'prototype/mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'),'utf8');
const u=fs.readFileSync(path.join(root,'prototype/mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'),'utf8');
const q=fs.readFileSync(path.join(root,'prototype/mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html'),'utf8');
const o=fs.readFileSync(path.join(root,'prototype/mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html'),'utf8');
const doc=fs.readFileSync(path.join(root,'docs/V2_7_4_17_DATA_SEMANTICS_HOME_FACT_INTEGRITY.md'),'utf8');
function ok(cond,msg){if(!cond){console.error('FAIL',msg);process.exit(1)}console.log('PASS',msg)}
ok(h.includes('HOME_PRICE_RADIUS_KM=5'),'home price radius is 5km');
ok(h.includes('radius:HOME_PRICE_RADIUS_KM')&&h.includes("row.price<HOME_RECOMMENDATIONS[0]?.price?'稍远更省':'价格备选'"),'home radius is passed explicitly and savings badge requires a cheaper price');
ok(h.includes('HOME_PROMO_CONFIG')&&h.includes('promoStore'),'promo recommendation is configurable');
ok(h.includes("img.alt='仓储环境展示'")&&h.includes('homeStoreFactTags(profile)')&&h.includes('renderHomeStoreCard(card,profile,index)'),'home evidence is fact-safe and unified');
ok(!h.includes('按当前正价每立方米月租递减'),'old high-price-first recommendation removed');
ok(dataSrc.includes("inventory_identity_type: 'SIZE_OPTION'")&&dataSrc.includes('actual_unit_id: null'),'data adapter exposes size-option semantics');
ok(s01.includes('selected_size_option_id')&&s01.includes('selected_actual_unit_id:null'),'S01 stores size-option identity');
ok(s02.includes("selection_source:'S02_SIZE_OPTION'")&&s02.includes("selectionContext:reselected?'estimate_size_option':'browse_size_option'"),'S02 passes size-option identity');
ok(u.includes('const sizeOptionId=')&&u.includes("inventoryIdentity=actualUnitId?'ACTUAL_UNIT':'SIZE_OPTION'"),'U01 resolves semantic identity');
ok(u.includes('ACTUAL_UNIT_HELD_DEMO_ONLY')&&u.includes("String(representativeUnitNo).split(/[、,，]/)[0].trim()")&&u.includes("const isSoldOut=sameCapacityAvailable===0||!actualUnitId"),'U01 selects one available demo unit without bypassing sold-out');
ok(q.includes("unit_id_semantics:actualUnitId?'ACTUAL_UNIT':'LEGACY_REPRESENTATIVE_DISPLAY'")&&q.includes('size_option_id:sizeOptionId'),'Q01 persists selected actual-unit and capacity-option identities');
ok(o.includes("unit_id_semantics:actualUnitId?'ACTUAL_UNIT':'LEGACY_REPRESENTATIVE_DISPLAY'")&&o.includes('actual_unit_id:actualUnitId||null'),'O01 persists selected actual-unit identity');
ok(doc.includes('源月租价格是否属于“折扣前基准价”尚未确认')&&doc.includes('不修改 `display_price_min`'),'price basis remains explicit business gate');

const vm=require('vm');
const masterCtx={window:{},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},console};masterCtx.window=masterCtx.window;vm.createContext(masterCtx);vm.runInContext(fs.readFileSync(path.join(root,'prototype/mini_storage_business_ssot_v274.js'),'utf8'),masterCtx);
const routeBase=masterCtx.window.MINI_STORAGE_MASTER_V222.route_base.guomao;
const revAlias=Object.fromEntries(Object.entries(dataApi.legacyAliases).map(([alias,id])=>[id,alias]));
function routeKm(profile){const alias=revAlias[profile.store_id];if(alias&&routeBase[alias])return routeBase[alias].drive[1];const seed=[...profile.store_id].reduce((sum,ch)=>sum+ch.charCodeAt(0),0);return Number(((profile.district||'').includes('朝阳')?4.8:7.6+(seed%21)/10).toFixed(1));}
const candidates=dataApi.stores.filter(x=>x.city==='北京市'&&Number(x.available_unit_count)>0&&Number(x.size_max)>=3.5).map(x=>({id:x.store_id,name:x.store_name,km:routeKm(x),unitPrice:dataApi.storeUnitPriceFrom(x.store_id),count:Number(x.available_unit_count)||0})).filter(x=>x.unitPrice>0);
const nearest=[...candidates].sort((a,b)=>a.km-b.km||b.count-a.count||a.name.localeCompare(b.name,'zh-CN'))[0];
const within=candidates.filter(x=>x.id!==nearest.id&&x.km<=5);const lower=within.filter(x=>x.unitPrice<nearest.unitPrice);const value=[...(lower.length?lower:(within.length?within:candidates.filter(x=>x.id!==nearest.id)))].sort((a,b)=>a.unitPrice-b.unitPrice||a.km-b.km||b.count-a.count)[0];
ok(nearest.name==='三元桥店'&&nearest.km===3.2,'default first card is nearest demo-route store');
ok(value.name==='大山子店'&&value.km<=5&&value.unitPrice===100,'default second card is lower per-m3 monthly rent within 5km');
ok(dataApi.getStore('MK_BJ_04547515').store_name==='安贞店','default simulated promo config resolves to a distinct Beijing store');

console.log('V2.7.4.17 QA PASS');
