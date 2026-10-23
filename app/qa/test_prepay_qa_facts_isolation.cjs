// SOURCE_VM_NOT_BROWSER: verify opt-in isolation against the actual data module.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),data=fs.readFileSync(path.join(root,'data/mini_koala_data.js'),'utf8'),adapter=fs.readFileSync(path.join(root,'prototype/mini_storage_prepay_qa_facts.js'),'utf8');
const facts={version:1,source:'PREPAY_QA_CONSOLE',kind:'price_change',store_id:'MK_BJ_2CDB7BEE',size_option_id:'MK_BJ_2CDB7BEE__4.72',created_at:Date.now()};
function run(value,host='127.0.0.1'){const ctx={location:{hostname:host},sessionStorage:{getItem:()=>JSON.stringify(value)},Date,console};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(data,ctx);const d=ctx.MINI_KOALA_DATA,opt=d.getSizeOption(facts.store_id,facts.size_option_id),others=d.options.filter(o=>o!==opt).map(o=>JSON.stringify(o)),before={price:d.positivePrice(opt),stock:opt.available_count};vm.runInContext(adapter,ctx);assert.deepEqual(d.options.filter(o=>o!==opt).map(o=>JSON.stringify(o)),others,'other source rows unchanged');return {ctx,before,after:{price:d.positivePrice(opt),stock:opt.available_count}};}
let passed=0;
for(const value of [null,{...facts,source:'UNKNOWN'},{...facts,kind:'UNKNOWN'},{...facts,created_at:Date.now()-3600000},{...facts,store_id:'OTHER'},{...facts,version:2}]){const r=run(value);assert.deepEqual(r.after,r.before);assert(!r.ctx.MINI_KOALA_PREPAY_QA_FACTS);passed++;}
let r=run(facts,'example.com');assert.deepEqual(r.after,r.before);passed++;
r=run(facts);assert.equal(r.after.price,r.before.price+120);assert.equal(r.after.stock,r.before.stock);passed++;
r=run({...facts,kind:'stock_change'});assert.equal(r.after.stock,0);assert.equal(r.after.price,r.before.price);passed++;
console.log(JSON.stringify({evidence_kind:'SOURCE_VM_NOT_BROWSER',pass:passed,fail:0}));
