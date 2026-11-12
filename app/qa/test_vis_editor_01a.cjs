#!/usr/bin/env node
// VIS-EDITOR-01A static smoke check (does not claim browser QA).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root,'tools/vis-editor-s01.html'),'utf8');
const source = fs.readFileSync(path.join(root,'prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'),'utf8');
function check(ok, message) {
  if (!ok) throw new Error('FAIL '+message);
  console.log('PASS '+message);
}
check(html.includes('../prototype/mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html'),'S01 source path');
check(html.includes('localStorage.setItem') && html.includes('const drafts'),'A/B local storage');
check(html.includes('MutationObserver(scheduleApply)'),'dynamic render observer');
check(html.includes('375 × 812') && html.includes('390 × 844'),'supported widths');
check(html.includes('已选需求') && html.includes('无匹配') && html.includes('未定位'),'scene options');
check(source.includes('id="storeList"') && source.includes('function makeCard('),'source dynamic store list');
check(source.includes('class="store') && source.includes('class="fact pricefact'),'source store and price markup');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
check(scripts.length===1,'one editor script');
new vm.Script(scripts[0][1],{filename:'vis-editor-s01.js'});
console.log('PASS editor JavaScript syntax');
console.log('BROWSER QA: NOT TESTED');
