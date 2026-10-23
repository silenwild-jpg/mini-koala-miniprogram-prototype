const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'../prototype');
const html=fs.readFileSync(path.join(root,'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'),'utf8');
const source=html.match(/function estimatorReturnContext\(\)\{[\s\S]*?\n\}/)[0];
const ctx={URLSearchParams,state:'estimated',searchLocation:'wangjing',travelMode:'walk',sortMode:'price',browseDistanceKm:'3',accessFrequency:'frequent',targetVolume:2.5,termMonths:12,customerType:'personal',visibleStoreCount:16,$:()=>({scrollTop:350}),$$:()=>[{dataset:{value:'24h'}}]};vm.createContext(ctx);vm.runInContext(source,ctx);
const q=ctx.estimatorReturnContext();for(const [k,v] of Object.entries({returnTo:'S01',returnListState:'estimated',returnOriginKey:'wangjing',returnTravel:'walk',returnSort:'price',returnDistance:'3',returnServices:'24h',returnTerm:'12',returnScroll:'350',returnLoaded:'16'}))assert.equal(q.get(k),v,k);
const storeSearch=html.match(/\$\('#locationSearchBtn'\)\.onclick=\(\)=>\{[\s\S]*?\n\};/)[0];
const node={value:'',click(){this.onclick()}};let selected='',message='';const search={...ctx,stores:{a:{id:'a',name:'安贞店',city:'北京市'},b:{id:'b',name:'芍药居店',city:'北京市'},c:{id:'c',name:'外地店',city:'上海市'}},ACTIVE_STORE_CITY:'北京市',$:()=>node,openStoreDetail:id=>selected=id,closeSheet:()=>{},toast:s=>message=s,resolveLocationQuery:()=>'',applySearchLocation:()=>{throw new Error('wrong location mapping')}};vm.createContext(search);vm.runInContext(storeSearch,search);
for(const [name,id] of [['安贞店','a'],['芍药居店','b']]){node.value=name;node.click();assert.equal(selected,id)}
selected='';node.value='不存在店';node.click();assert.equal(selected,'');assert(message.includes('未找到该门店'));
const global=fs.readFileSync(path.join(root,'mini_koala_acceptance_fix_v1.js'),'utf8');const masks=global.match(/const masks=\(\)=>[^;]+;/)[0];let selector='';const modal={document:{querySelectorAll:s=>{selector=s;return []}}};vm.createContext(modal);vm.runInContext(masks+'this.getMasks=masks;',modal);modal.getMasks();assert(selector.includes('.sheet-mask:not(.inline-filter-sheet)'));assert(selector.includes('.mini-support-mask'));
console.log('PASS S01 search, return context, inline dropdown modal exclusion');
