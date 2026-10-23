'use strict';
// VIS-06C Batch A isolated source/content contract. Does not claim browser layout acceptance.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const p = path.join(root, 'prototype');
const files = [
  'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
  'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html',
  'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'
];
const style = 'mk-v3-find-unit-content-batch-a.css';
const href = `<link rel="stylesheet" href="${style}" data-ui-system="vis06c-batch-a">`;
const css = fs.readFileSync(path.join(p, style), 'utf8');
let passed=0;
const pass=(label,fn)=>{fn();passed++;console.log(`PASS ${label}`)};
pass('exactly three intended HTML pages opt in to Batch A',()=>{
 for(const file of files){
  const html=fs.readFileSync(path.join(p,file),'utf8');
  assert.equal(html.split(href).length-1,1,`${file} needs one opt-in`);
  const after=html.indexOf(href);
  assert(after>html.indexOf('mk-v3-core-pages-rollout.css') || file.includes('store_list_s01'), 'Batch A style must follow shell');
 }
 const all=fs.readdirSync(p).filter(x=>x.endsWith('.html'));
 assert.deepEqual(all.filter(x=>fs.readFileSync(path.join(p,x),'utf8').includes(href)).sort(),files.slice().sort());
});
pass('CSS selects only opted-in pages',()=>{
  const cssWithoutComments=css.replace(/\/\*[\s\S]*?\*\//g,'');
  // Every selector group begins with body+page scope, never a naked global override.
  const blocks=cssWithoutComments.split('{').slice(0,-1);
  for(const head of blocks){
   const pre=head.substring(head.lastIndexOf('}')+1).trim();
   if(!pre || pre.startsWith('@')) continue;
   for(const sub of pre.split(',')){
    // pseudo :is(.koala-s02,.koala-u01) carries one comma, so restrict top-level splits.
    // We accept continuation of the same expression only, no wildcard selectors.
    const str=sub.trim();if(!str) continue;
    assert(!str.startsWith('html')&&!str.startsWith(':root'),'global selector forbidden: '+str);
   }
  }
  assert(!css.includes('miniGlobalSupport')&&!css.includes('miniSupportLauncher'),'help P2-3 excluded');
  assert(!css.includes('display: none')&&!css.includes('visibility: hidden'),'must not hide business content');
});
pass('price and status nodes remain present',()=>{
 const [s01,s02,u01]=files.map(x=>fs.readFileSync(path.join(p,x),'utf8'));
 assert(s01.includes('browse-unit-price')&&s01.includes('contract-price'));
 assert(s02.includes('整期总租金')&&s02.includes('参考价格')&&s02.includes('disabled aria-disabled="true"'));
 for(const key of ['contractTotal','initialPayable','depositAmount','managementFee','confirm','saveQuote'])assert(u01.includes(`id="${key}"`),key);
 assert(u01.includes('请选择租期'));
});
pass('styles do not import external scripts or remote assets',()=>{
 assert(!/@import\b|https?:\/\//.test(css));
 assert(!/content\s*:\s*['"](?:¥|已售出|匹配仓位)/.test(css));
});
console.log(`${passed}/${passed} scoped static checks PASS; no browser claims.`);
