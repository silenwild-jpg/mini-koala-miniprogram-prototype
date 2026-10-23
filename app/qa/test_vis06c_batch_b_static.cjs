/* VIS-06C Batch B: style-link and business-boundary checks (no browser claims). */
const fs=require('fs'),path=require('path'),assert=require('assert');
const base=path.resolve(__dirname,'..'),proto=path.join(base,'prototype');
const pages={q01:'mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html',
 c02:'mini_storage_coupon_select_c02_v1.html',
 o01:'mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html',
 o02:'mini_storage_order_o02_v1_17_self_service_Visual_V2_7_4.html',
 o03:'mini_storage_order_o03_v1_17_self_service_Visual_V2_7_4.html'};
const css=fs.readFileSync(path.join(proto,'mk-v3-transaction-batch-b.css'),'utf8');
const link='<link rel="stylesheet" href="mk-v3-transaction-batch-b.css" data-ui-system="vis06c-batch-b">';
let passed=0;
function test(name,fn){try{fn();passed++;console.log('PASS',name)}catch(e){console.error('FAIL',name,e.message);process.exitCode=1}}
const html={};for(const [code,name] of Object.entries(pages)) html[code]=fs.readFileSync(path.join(proto,name),'utf8');
test('5 exact opt-in pages; single CSS reference at end of head',()=>{
 for(const [code,h] of Object.entries(html)){
  assert.equal(h.split(link).length-1,1,code); assert(h.includes(link+'</head>'),code);
  assert(h.includes('koala-'+code),code)
 }
});
test('scoped CSS contains no global help selectors or fixed-bar displacement',()=>{
 assert(!/#miniGlobalSupport|\.mini-global-support|mini_storage_global_support/.test(css.replace(/\/\*[\s\S]*?\*\//g,'')));
 assert(!/(?:^|[;\{])\s*(?:transform|visibility|bottom|position)\s*:/m.test(css.replace(/\/\*[\s\S]*?\*\//g,'')));
 const re=/(?:^|\}|\{)\s*([^{}@][^{}]*)\{/gm; let m,selectors=[];
 const stripped=css.replace(/\/\*[\s\S]*?\*\//g,'');
 while((m=re.exec(stripped))){
  let v=m[1].trim();if(!v||v.startsWith('@'))continue;
  if(v.includes(':')&&v.includes(';'))continue;
  selectors.push(v);
 }
 assert(selectors.length>15);
 const scoped=s=>s.split(/,\s*(?=body\.koala-)/).every(t=>/^body\.koala-(?:site-shell|ui-v1)\.koala-(?:q01|c02|o01|o02|o03)\b/.test(t.trim()));
 assert(selectors.every(scoped),'unscoped: '+selectors.filter(s=>!scoped(s)).join('|'));
});
test('coupon P1 transform:none retained in original rollout CSS',()=>{
 const core=fs.readFileSync(path.join(proto,'mk-v3-core-pages-rollout.css'),'utf8');
 assert(/body\.koala-site-shell\.koala-c02\s+\.coupon-bottom\s*\{\s*transform:\s*none\s*!important/.test(core));
});
test('Q01 price / 48-hour quote markers and buttons preserved',()=>{
 const h=html.q01;for(const id of ['total','monthly','initialPayableRow','edit','save','contactSection','transportSection'])assert(h.includes('id="'+id+'"'),id);
 assert(h.includes('48小时'));
});
test('C02 auto/none/manual buttons and coupon scripts preserved',()=>{
 const h=html.c02;for(const id of ['auto','none','usable','unusable'])assert(h.includes('id="'+id+'"'),id);
 assert(h.includes('mini_storage_coupon_benefit_v1.js'));
 assert(css.includes('.coupon-card-desc')&&css.includes('.coupon-action'));
});
test('O01 amount/contract/P1 payment markers preserved',()=>{
 const h=html.o01;for(const id of ['payableTotal','rentFee','depositFee','managementFee','pay','agreeContract','contractSheet','phoneAuthSheet'])assert(h.includes('id="'+id+'"'),id);
 assert(h.includes('mk-v3-page-o01.css'));
});
test('O02 four status states and O03 four lifecycle states intact',()=>{
 const h=html.o02;for(const s of ['paid','pending','failed','inventory_changed'])assert(h.includes('data-state="'+s+'"'),s);
 const x=html.o03;for(const s of ['upcoming','active','ending','ended'])assert(x.includes('data-state="'+s+'"'),s);
 for(const id of ['paidPrice','primaryBtn','secondaryBtn']) assert(h.includes('id="'+id+'"'));
 for(const id of ['paidTotalText','rentTotalText','renewCard','exitCard'])assert(x.includes('id="'+id+'"'));
});
test('non-transaction batch A style still referenced on S01/S02/U01',()=>{
 for(const name of ['mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html','mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html','mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'])
  assert(fs.readFileSync(path.join(proto,name),'utf8').includes('mk-v3-find-unit-content-batch-a.css'));
});
console.log('VIS06C_BATCH_B_STATIC',passed,'/ 8',process.exitCode?'FAIL':'PASS');
