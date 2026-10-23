const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const files={Q01:'mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html',O01:'mini_storage_order_o01_v1_18_self_service_Visual_V2_7_4.html',O02:'mini_storage_order_o02_v1_17_self_service_Visual_V2_7_4.html',O03:'mini_storage_order_o03_v1_17_self_service_Visual_V2_7_4.html'};
const before=JSON.parse(fs.readFileSync(path.join(__dirname,'acceptance_fix_transaction_body_freeze.json'),'utf8'));
const approvedD=require('./phase3b_batch_d_approved_delta.json');
const approved3C=require('./phase3c_batch_a_approved_delta.json');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function bodyHash(s){const m=s.match(/<body>([\s\S]*?)<\/body>/i);assert(m,'body missing');return crypto.createHash('sha256').update(m[1]).digest('hex')}
for(const [k,f] of Object.entries(files)){
 const s=fs.readFileSync(path.join(proto,f),'utf8');
 const authorized=approvedD.authorized_runtime[f];
 if(authorized){
   assert(['Q01','O01'].includes(k),`unexpected body authorization ${k}`);
   assert.equal(authorized.before_sha256,require('./phase3b_batch_c_approved_delta.json').protected_unchanged['prototype/'+f]);
   assert.equal(authorized.after_sha256,approved3C.authorized_runtime[f].before_sha256,`${k} must retain Batch D as input`);
   assert.equal(sha(s),require('./phase3c_unified_approved_delta.json').authorized_runtime[f].after_sha256,`${k} must match Phase 3C A authorized bytes`);
 } else assert.equal(bodyHash(s),before[k],`${k} body changed during visual closure`);
 assert(s.includes('id="sprint2-transaction-visual-foundation"'),`${k} shared transaction visual layer missing`);
 assert(s.includes(`id="sprint2-${k.toLowerCase()}-hifi"`),`${k} page hi-fi layer missing`);
 assert(s.includes('--vb-bg:#FDFBF7'),`${k} visual baseline background missing`);
 assert(s.includes('--vb-green:#2F6B4F'),`${k} brand green token missing`);
 assert(s.includes('--vb-orange:#D56A1C'),`${k} price orange token missing`);
 assert(s.includes('--vb-tertiary:#6D7671'),`${k} readable tertiary token missing`);
}
const q=fs.readFileSync(path.join(proto,files.Q01),'utf8');assert(q.includes('.total b{font-size:30px'), 'Q01 contract total must be main price');
const o1=fs.readFileSync(path.join(proto,files.O01),'utf8');assert(o1.includes('.payable-hero b{font-size:34px'), 'O01 payable must be main price');
const o2=fs.readFileSync(path.join(proto,files.O02),'utf8');assert(o2.includes('.order .price{margin:14px 0 6px'), 'O02 paid amount hierarchy missing');
const o3=fs.readFileSync(path.join(proto,files.O03),'utf8');assert(o3.includes('#rentTotalText,#paidTotalText{color:var(--vb-orange)'), 'O03 payment/rent emphasis missing');
console.log('PASS Sprint 2 transaction visual closure: Q01/O01/O02/O03 body frozen and visual hierarchy present');
