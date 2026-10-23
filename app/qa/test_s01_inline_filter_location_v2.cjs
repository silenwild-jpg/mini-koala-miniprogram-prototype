const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'),'utf8');
let count=0;function check(label,fn){fn();count++;console.log('PASS '+label)}
const between=(start,end)=>html.split(start)[1]?.split(end)[0]||'';
check('sort / radius / services appear in intended left-middle-right order',()=>{
 const row=between('<div class="controls compact-filters">','<div class="legacy-filter-inputs"');
 assert(row.indexOf('id="sortFilterBtn"')<row.indexOf('id="distanceFilterBtn"'));
 assert(row.indexOf('id="distanceFilterBtn"')<row.indexOf('id="filterBtn"'));
});
check('location, search, travel occupy one shared row',()=>{
 const row=between('<div class="location-inline-row">','</div>\n</div>\n\n<div class="demand');
 for(const id of ['locationBar','locationText','locationSearchEntry','travelBtn'])assert(row.includes('id="'+id+'"'));
 assert(html.includes('.location-unified-box{display:flex'));
 assert(html.includes('min-height:44px;max-height:44px'));
});
check('location and search remain independent click targets',()=>{
 assert(html.includes("$('#locationBar').onclick=()=>openSheet('#locationSheet')"));
 assert(html.includes("$('#locationSearchEntry').onclick=()=>{"));
});
check('three popovers are children of the anchor toolbar, not detached bottom sheets',()=>{
 const v=between('<div class="toolbar"','<div id="fallbackScopeLabel"');
 for(const id of ['sortFilterSheet','distanceFilterSheet','filterSheet'])assert(v.includes('class="sheet-mask inline-filter-sheet" id="'+id+'"'));
 assert(html.includes('.toolbar .inline-filter-sheet.show{display:block!important}'));
 assert(html.includes('top:calc(100% + 5px)!important'));
});
check('popovers have non-modal semantics',()=>{
 for(const id of ['distanceFilterSheet','sortFilterSheet','filterSheet']){
  assert(html.includes('id="'+id+'"'));
 }
 assert(!html.includes('class="sheet compact-sheet" role="dialog" aria-modal="true"'));
});
check('switching popovers closes the prior one',()=>{
 const body=between('function openSheet(id){','function closeSheet(el,commit=false){');
 assert(body.includes("$$('.inline-filter-sheet.show').forEach(open=>closeSheet(open))"));
 assert(body.includes('if(isInline&&wasOpen)return'));
});
check('outside tap / escape close dropdowns',()=>{
 assert(html.includes("if(!e.target.closest('.toolbar,.location-context'))$$('.inline-filter-sheet.show').forEach(mask=>closeSheet(mask))"));
 assert(html.includes("event.key!=='Escape'"));
});
check('service edits commit only on apply',()=>{
 assert(html.includes("closeSheet($('#filterSheet'),true)"));
 assert(html.includes("if(!commit)$$('#filterSheet [data-group=\"service\"] .pill')"));
});
check('four radius options and three sort options preserved',()=>{
 for(const v of ['any','3','5','10'])assert(html.includes('data-distance-choice="'+v+'"'));
 for(const v of ['recommended','distance','price'])assert(html.includes('data-sort-choice="'+v+'"'));
});
check('live sort updates old model used by cost calculations',()=>{
 assert(html.includes("$('#sortSelect').dispatchEvent(new Event('change'"));
 assert(html.includes("$('#distanceSelect').dispatchEvent(new Event('change'"));
 assert(html.includes("state==='browse'?browseUnitPrice(a)-browseUnitPrice(b):cardPrice(a)-cardPrice(b)"));
});
check('two store card representations remain, no rewrite',()=>{
 for(const x of ['参考单价','整期租金 · ${termMonths}个月','matchedAvailableCount'])assert(html.includes(x));
});
check('fallback still leaves user selected distance alone',()=>{
 assert(html.includes('当前筛选条件外的补充选择，原筛选未改变'));
 assert(html.includes("const expandedIds=[];"));
});
console.log(`PASS ${count}/${count} S01 inline compact controls`);
