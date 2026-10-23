const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'),'utf8');
const fn=(name)=>{const re=new RegExp('function '+name+'\\([^]*?\\n\\}');const m=html.match(re);assert(m,'Function missing: '+name);return m[0]};
const sha=t=>crypto.createHash('sha256').update(t).digest('hex');
let n=0;const check=(desc,test)=>{test();n++;console.log('PASS '+desc)};
check('three unified chips and exactly one current value each',()=>{
 for(const id of ['distanceFilterBtn','filterBtn','sortFilterBtn','distanceFilterValue','serviceFilterValue','sortFilterValue'])assert(html.includes('id="'+id+'"'));
 assert(html.includes('grid-template-columns:repeat(3,minmax(0,1fr))'));
 assert(html.includes('.legacy-filter-inputs{display:none!important}'));
});
check('old select ids retained for current data/filter model',()=>{
 for(const id of ['distanceSelect','sortSelect'])assert((html.match(new RegExp('id="'+id+'"','g'))||[]).length===1)
});
check('four distances available with exact semantics',()=>{
 for(const d of ['any','3','5','10'])assert(html.includes('data-distance-choice="'+d+'"'));
});
check('three sorts with default recommendation in both modes',()=>{
 for(const s of ['recommended','distance','price'])assert(html.includes('data-sort-choice="'+s+'"'));
 assert(fn('renderSortSheet').includes('const needsRecommended=true;'));
});
check('service selection can be cancelled without applying',()=>{
 assert(fn('openSheet').includes('serviceDraftOrigin'));
 assert(fn('closeSheet').includes('if(!commit)'));
 assert(html.includes("closeSheet($('#filterSheet'),true)"));
});
check('one-tap distance and sort change handlers use same model',()=>{
 assert(html.includes("$('#distanceSelect').dispatchEvent(new Event('change'"));
 assert(html.includes("$('#sortSelect').dispatchEvent(new Event('change'"));
});
check('explicit filters never automatically add supplemental stores',()=>{
 assert(html.includes('当前筛选条件外的补充选择，原筛选未改变'));
 assert(html.includes("const expandedIds=[];"));
 assert(html.includes("const shownIds=allIds.length?allIds:expandedIds"));
});
check('browse versus demand store card dual-fact structure stays stable',()=>{
 assert(html.includes('matchedAvailableCount'));
 assert(html.includes('整期租金 · ${termMonths}个月'));
 assert(html.includes('参考单价'));
 assert(html.includes('仓体容量'));
 assert(html.includes('store-head'));
});
check('sort by monthly browse price and exact-term demand total',()=>{
 const ctx={state:'estimated',currentData:id=>({total:id==='a'?4000:3000,price:id==='a'?100:200}),browseUnitPrice:id=>id==='a'?25:30};
 vm.createContext(ctx);vm.runInContext(fn('cardPrice'),ctx);
 assert.strictEqual(ctx.cardPrice('a'),4000);assert.strictEqual(ctx.cardPrice('b'),3000);
 ctx.state='browse';assert.strictEqual(ctx.cardPrice('a'),25);
});
check('missing term total is not silently ranked with monthly price',()=>{
 const ctx={state:'estimated',currentData:()=>({total:null,price:100}),browseUnitPrice:()=>35};
 vm.createContext(ctx);vm.runInContext(fn('cardPrice'),ctx);
 assert.strictEqual(ctx.cardPrice('a'),Infinity);
});
check('sort panel labels and selected value reflect mode',()=>{
 const cls=(initial=[])=>({values:new Set(initial),toggle(c,v){if(v===undefined)v=!this.values.has(c);if(v)this.values.add(c);else this.values.delete(c)},contains(c){return this.values.has(c)}});
 const nodes={sortSelect:{value:'distance',innerHTML:'',querySelector:()=>({textContent:''})},sortFilterValue:{textContent:''},sortFilterBtn:{classList:cls()},'sort-recommended':{classList:cls()}};
 const opts=['recommended','distance','price'].map(sortChoice=>({dataset:{sortChoice},setAttribute(k,v){this[k]=v}}));
 const ctx={state:'browse',sortMode:'distance',$:selector=>nodes[selector.slice(1)]||nodes[selector.slice(1)],$$:selector=>selector==='.quick-sort-option'?opts:[],console};
 // normalize class query for .sort-recommended
 ctx.$=selector=>nodes[selector.slice(1)];
 vm.createContext(ctx);vm.runInContext(fn('renderSortSheet'),ctx);ctx.renderSortSheet();
 assert.strictEqual(nodes.sortFilterValue.textContent,'距离最近');
 assert(!nodes['sort-recommended'].classList.contains('hidden'));
 ctx.state='estimated';ctx.sortMode='price';ctx.renderSortSheet();
 assert.strictEqual(nodes.sortFilterValue.textContent,'低价优先');
 assert.strictEqual(opts[2]['aria-checked'],'true');
 assert(!nodes['sort-recommended'].classList.contains('hidden'));
});
check('distance current selection and active state reflect actual filter',()=>{
 const cls=()=>({value:false,toggle(k,v){this.value=v}});
 const nodes={distanceSelect:{value:'any'},distanceFilterValue:{textContent:''},distanceFilterBtn:{classList:cls()}};
 const opts=['any','3','5','10'].map(distanceChoice=>({dataset:{distanceChoice},setAttribute(k,v){this[k]=v}}));
 const ctx={browseDistanceKm:'5',$:selector=>nodes[selector.slice(1)],$$:selector=>opts};
 vm.createContext(ctx);vm.runInContext(fn('renderDistanceSheet'),ctx);ctx.renderDistanceSheet();
 assert.strictEqual(nodes.distanceFilterValue.textContent,'5公里内');
 assert.strictEqual(nodes.distanceFilterBtn.classList.value,true);
 assert.strictEqual(opts[2]['aria-pressed'],'true');
 ctx.browseDistanceKm='any';ctx.renderDistanceSheet();
 assert.strictEqual(nodes.distanceFilterValue.textContent,'不限距离');
});
check('filtering continues to use original strict filter conditions',()=>{
 const stores={a:{services:['24h','parking']},b:{services:['24h']},c:{services:['parking']}};
 const pills=[{dataset:{value:'24h'},classList:{contains:()=>true}}];
 const ctx={sortMode:'distance',window:{},browseDistanceKm:'3',stores,baseOrder:()=>['a','b','c'],routeFor:id=>({km:{a:2,b:7,c:1}[id]}),$$:()=>pills};
 vm.createContext(ctx);vm.runInContext(fn('filteredOrder'),ctx);
 assert.deepStrictEqual(Array.from(ctx.filteredOrder()),['a']);
 assert.strictEqual(ctx.browseDistanceKm,'3');
});
check('top-of-list extra explanations de-emphasized, risks unchanged',()=>{
 assert(html.includes('#activeDemandCard #demandHint{display:none!important}'));
 assert(html.includes('distanceRecoveryCard{display:none!important}'));
 assert(html.includes('inventoryStatusForStore(id)'));
 assert(html.includes('SOLD_OUT'));
});
console.log(`PASS ${n}/${n} S01 filter/sort targeted checks`);
