const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const root=path.join(__dirname,'..');
const pr=path.join(root,'prototype');
const s01=fs.readFileSync(path.join(pr,'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'),'utf8');
const s02=fs.readFileSync(path.join(pr,'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html'),'utf8');
let count=0;const test=(name,fn)=>{fn();console.log('PASS',++count,name)};
const slice=(src,start,end)=>{let a=src.indexOf(start),b=src.indexOf(end,a+1);assert(a>=0&&b>a,`function not found: ${start}`);return src.slice(a,b)};
const evaluation=slice(s01,'function matchedDataFor(id){','\nfunction nomatchDataFor(id){');
const cardSource=slice(s01,'function storeDemoTags(id){','\nfunction baseOrder(){');
const rowTemplate={unit:{id:'SKU-1',v:4.8,base:700},monthly:600,total:3500,matchedUnits:[],alternativeEligible:true}; // 4.8 is a valid near-size alternative for target 5
const wrapEvaluation=(row,months=6)=>{
 const context={requirementRange:()=>({min:4,max:6}),targetVolume:5,termMonths:months,searchLocation:'guomao',travelMode:'drive',
  window:{MINI_STORAGE_REQUIREMENT_RECOMMENDATION_V274:{evaluateStore:()=>row},MINI_KOALA_DATA:{sizeText:v=>`${v.toFixed(1)}m³`}},
  pricingContractFromBase:(base,term,id)=>base*term,
  // The confirmed UX quick filters arrived after this test was authored.
  // Keep the base card regression in the no-filter state rather than failing
  // on an undeclared test fixture global. New filter behavior has its own tests.
  quickStoreFilters:new Set(),demoActivityFor:()=>({specialUnitIds:new Set(),moving:false})};
 vm.createContext(context);vm.runInContext(evaluation,context);return context.matchedDataFor('STORE-A');
};
const one={...rowTemplate,matchedUnits:[{id:'SKU-1',v:4.8,base:650,available_count:2}]};
const many={...rowTemplate,matchedUnits:[{id:'SKU-1',v:4.8,base:800,available_count:2},{id:'SKU-2',v:5.2,base:630,available_count:3}]};
const unmatched={...rowTemplate,matchedUnits:[]};
const matchedOne=wrapEvaluation(one),matchedMany=wrapEvaluation(many),noMatch=wrapEvaluation(unmatched);
test('real matching: one capacity option and two physical spaces',()=>{assert.equal(matchedOne.sizes,'4.8m³');assert.equal(matchedOne.matchedCount,1);assert.equal(matchedOne.availableMatchedCount,2)});
test('real matching: multiple capacity options produce min-max capacities',()=>{assert.equal(matchedMany.sizes,'4.8～5.2m³');assert.equal(matchedMany.matchedCount,2);assert.equal(matchedMany.availableMatchedCount,5)});
test('real matching: displayed starting term price is cheapest matching unit',()=>{assert.equal(matchedMany.total,3780);assert.equal(matchedOne.total,3900)});
test('zero-match case cannot claim physical matches',()=>{assert.equal(noMatch.hasMatch,false);assert.equal(noMatch.availableMatchedCount,0);assert.equal(noMatch.sizes,'4.8m³')});
test('invalid term does not create total',()=>assert.equal(wrapEvaluation(many,0).total,null));
function card(state,data=null){
 const context={state,stores:{'STORE-A':{name:'建国门店',typeTag:'社区仓',area:'朝阳区 · 建国门',range:'0.5–10.0m³',availableCount:13,features:'24小时',services:['24h','elevator'],city:'北京市'}},
 routeFor:()=>({m:9,km:2.2}),travelMeta:()=>({icon:'🚗',label:'驾车'}),currentData:()=>data,browseUnitPrice:()=>99,distanceOverNote:()=>'',recoveryValue:()=>'',termMonths:6,
 demoActivityFor:()=>({specialUnitIds:new Set(),moving:false}),quickStoreFilters:new Set()};
 vm.createContext(context);vm.runInContext(cardSource,context);return context.makeCard('STORE-A',0);
}
const browse=card('browse'),single=card('estimated',matchedOne),multiple=card('estimated',matchedMany),alternative=card('nomatch',noMatch);
test('browse still uses shared photo/name/route/facts layout',()=>{for(const s of ['store-head','store-photo','store-facts','剩余仓位','仓体容量 0.5～10.0m³','参考单价','/月/m³'])assert(browse.includes(s),s)});
test('demand uses same card skeleton, not the old separate demand layout',()=>{for(const output of [browse,single,multiple])for(const s of ['store-head','store-photo','store-title-line','store-facts','card-open-chevron'])assert(output.includes(s),s);assert(!single.includes('demand-main'));assert(!single.includes('demand-price'))});
test('one matched capacity shows exact capacity and actual matched physical count',()=>{assert(single.includes('匹配仓位'));assert(single.includes('2个'));assert(single.includes('仓体容量 4.8m³'));assert(!single.includes('仓体容量 4.8～'))});
test('multiple matching capacities show range and minimum full-term price',()=>{assert(multiple.includes('匹配仓位'));assert(multiple.includes('5个'));assert(multiple.includes('仓体容量 4.8～5.2m³'));assert(multiple.includes('整期租金 · 6个月'));assert(multiple.includes('3,780元'));assert(multiple.includes('price-start'))});
test('alternative shows zero matches while keeping an honest nearby-capacity offer',()=>{assert(alternative.includes('匹配仓位'));assert(alternative.includes('0个'));assert(alternative.includes('相近仓体容量 4.8m³'));assert(alternative.includes('整期租金 · 6个月'))});
test('no large view/appointment footer in either card state',()=>{for(const output of [browse,single,multiple,alternative]){assert(!output.includes('store-card-next'));assert(!output.includes('预约看仓'));assert(!output.includes('查看可租空间'));assert(output.includes('role="link" tabindex="0"'))}});
test('S01 card taps and keyboard activation still route to store detail',()=>{assert(s01.includes('card.onclick=()=>openStoreDetail(card.dataset.id)'));assert(s01.includes("e.key==='Enter'||e.key===' '"))});
test('low-stock status retained without converting count into a second CTA',()=>{assert(single.includes('stock-alert'));assert(s01.includes('strong.stock-alert'))});
test('S02 removes the redundant standalone compact capacity offer',()=>{assert(!s02.includes('id="compactOffer"'));assert(!s02.includes('更紧凑的容量'));assert(!s02.includes("$('#compactOffer')"))});
test('S02 original actual unit cards and show-more action remain',()=>{assert(s02.includes('id="unitList"'));assert(s02.includes('id="allUnits"'));assert(s02.includes('function renderAllUnitsInline()'));assert(s02.includes("cards=''"))});
test('S02 separate sold-out capacity catalog remains, no ghost compact handler',()=>{assert(s02.includes('id="otherCapacitySection"'));assert(s02.includes('已售出'));assert(!s02.includes("$('#compactOffer').onclick"))});
test('sales and price data files were not rewritten as part of card presentation',()=>{assert(s01.includes('pricingContractFromBase(unit.base,termMonths,id)'));assert(s01.includes('window.MINI_STORAGE_REQUIREMENT_RECOMMENDATION_V274.evaluateStore'));assert(s01.includes("if(state==='browse')"))});
console.log(`Store card unification: ${count}/${count} checks passed`);
