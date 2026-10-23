// Presentation contract unit test: SOURCE_VM_NOT_BROWSER. No business state is written.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const src=fs.readFileSync(path.join(__dirname,'../prototype/demo_price01_b2_display.js'),'utf8');
const results=[];
for(const [name,status,first,expected] of [['claimed-1','CLAIMED',true,true],['claimed-6','CLAIMED',true,true],['claimed-12','CLAIMED',true,true],['no-wallet',null,true,false],['old-customer','CLAIMED',false,false],['locked','LOCKED',true,false],['expired','EXPIRED',true,false],['used','USED',true,false]]){
let image=null;const title={textContent:'已获得 ¥200 新客租仓券'};const summary={querySelector:s=>s==='.coupon-a-original'?image:title,prepend:i=>{image=i}};const classes=new Set();const banner={querySelector:()=>summary,classList:{toggle:(n,on)=>on?classes.add(n):classes.delete(n),remove:n=>classes.delete(n)}};
const api={wallet:()=>status?[{coupon_id:'CPN-001',status}]:[],effectiveStatus:r=>r.status,isFirstPurchaseContext:()=>first};
const ctx={window:{MINI_KOALA_COUPON_V1:api},document:{readyState:'complete',getElementById:()=>banner,body:{matches:()=>false},createElement:()=>({remove:()=>{image=null}})},MutationObserver:class{observe(){}},addEventListener(){},requestAnimationFrame:fn=>fn()};vm.runInNewContext(src,ctx);assert.equal(!!image,expected,name);assert.equal(classes.has('has-a-art'),expected,name);if(!expected)assert(!title.textContent.includes('已获得'),name+' must not claim arrival');results.push({name,status:'PASS'});
}
console.log(JSON.stringify({evidence_kind:'SOURCE_VM_NOT_BROWSER',pass:results.length,results},null,2));
