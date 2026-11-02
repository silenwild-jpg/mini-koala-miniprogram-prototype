#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const demo=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const read=p=>fs.readFileSync(path.join(demo,p),'utf8'),html=read('s01-r2-live.html'),bind=read('s01-r2-bind.js'),app=read('app.js');
const contract=read('central-contract.js'),gate=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../docs/RC2_MERGE_PREP_02_SOURCE_GATE.json'),'utf8'));
assert.equal((html.match(/<div class="filter">/g)||[]).length,4);
assert(html.includes('排序 <span class="chevron"')&&html.includes('距离 <span class="chevron"')&&html.includes('价格 <span class="chevron"')&&html.includes('服务 <span class="chevron"'));
assert(!html.includes('<section class="searchbar"')&&!html.includes('全部区域 <span')&&!html.includes('全部容量 <span')&&!html.includes('全部租期 <span'));
assert(html.includes('class="nav-more" aria-label="搜索门店"'));
assert(app.includes("modal==='r2-search'")&&app.includes("modal==='r2-distance'"));
assert(app.includes("modal=['r2-region','r2-capacity','term']")===false);
assert(app.includes("filter(index){if(![0,1,2,3].includes(index))return"));
assert(app.includes("handlers.priceFilter()")&&app.includes("handlers.serviceFilter()")&&app.includes("handlers.setSort('distance')"));
assert(app.includes("r2Filters.region='all';r2Filters.capacity='all';saveR2Filters();"));
assert(bind.includes("bridge.action('searchModal')")&&bind.includes("state.filterActive"));
assert(!bind.includes("document.querySelector('.search-pill span')"));
assert(!/\bU01\s*:|\bQ01\s*:/.test(contract));
assert.equal(gate.h01.status,'HIFI06_ABANDONED');assert.equal(gate.h01.next_final_visual,'NOT_SELECTED');
assert.deepEqual(gate.h01.retired_prs,[34,38]);
assert.equal(gate.release.allow_merge_main,false);
const git=(...xs)=>cp.execFileSync('git',xs,{encoding:'utf8'}).trim();
for(const a of ['assets/s01-r2-a-1.webp','assets/s01-r2-a-2.webp']){
 const key='app/prototype/parallel/core-journey-fix-01/demo/'+a;
 assert.equal(git('rev-parse','HEAD:'+key),git('rev-parse',gate.baseline_commit+':'+key),'original approved photo drift: '+a);
}
const home='app/prototype/parallel/core-journey-fix-01/demo/home.html';
assert.equal(git('rev-parse','HEAD:'+home),git('rev-parse',gate.baseline_commit+':'+home),'unapproved H01 swap');
console.log('RC2_MERGE_PREP_04_STATIC_PASS',JSON.stringify({filterControls:4,searchLocation:'navbar-more',h01:'HOLD',masterImages:'UNCHANGED',production:'UNTOUCHED'}));
