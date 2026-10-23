const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'prototype','mini_koala_internal_demo_v1.js'),'utf8');
function store(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(String(k)),clear:()=>m.clear(),get length(){return m.size}}}
const loc={href:'http://demo.local/prototype/product_demo_hub_v1.html',search:''};
const D={
 P:{HOME:'H01.html',S01:'S01.html',S02:'S02.html',EST:'EST.html',U01:'U01.html',Q01:'Q01.html',O01:'O01.html',O02:'O02.html',O03:'O03.html',M01:'M01.html',RN01:'RN01.html',EX01:'EX01.html',DP01:'DP01.html'},
 C:{store_id:'S',unit_id:'U',size_option_id:'SO',target:4.8,term:6,travel:'drive',origin:'sanyuanqiao',monthly:573,total:3440,deposit:573,fee:50},
 K:{req:'req',price:'price',order:'order',hist:'hist'},
 seed:(state)=>{localStorage.setItem('seed',state); if(['pending_use','active','ending','exiting'].includes(state))localStorage.setItem('order',JSON.stringify({order_no:'O-'+state}));},
 requirement:o=>({requirement_id:'R',...o}),priceSnapshot:()=>({store_id:'S',unit_id:'U',term_months:6,total_rent:3440,deposit:573,management_fee:50})
};
const C={WALLET_KEY:'wallet',SELECT_KEY:'sel',ensureAcquisitionWallet:()=>localStorage.setItem('wallet',JSON.stringify([{coupon_id:'CPN-001',user_coupon_id:'UC1',status:'CLAIMED'}])),ensureRenewalWallet:()=>{},setSelection:()=>{},applyToSnapshot:s=>({...s,coupon_id:'CPN-001',user_coupon_id:'UC1',coupon_name:'新客租仓券',coupon_type:'RENT_CASH',coupon_discount_amount:200,rent_after_coupon:3240,total_benefit_amount:200,upfront_payable:3863}),wallet:()=>JSON.parse(localStorage.getItem('wallet')||'[]')};
const localStorage=store(),sessionStorage=store();
const ctx={window:{MINI_KOALA_DEMO_V2:D,MINI_KOALA_COUPON_V1:C},localStorage,sessionStorage,location:loc,URL,URLSearchParams,Date,console,document:{readyState:'loading',addEventListener:()=>{},scripts:[],head:{appendChild:()=>{}},getElementById:()=>null,createElement:()=>({})}};ctx.window.window=ctx.window;vm.createContext(ctx);vm.runInContext(src,ctx);
const I=ctx.window.MINI_KOALA_INTERNAL_DEMO_V1;assert(I);
const expected={new_rental:'H01.html',stores_first:'S01.html',urgency:'S01.html',coupon:'EST.html',lifecycle:'H01.html',exception:'S01.html'};
for(const [id,file] of Object.entries(expected)){loc.href='http://demo.local/prototype/product_demo_hub_v1.html';I.startStory(id);assert(loc.href.includes(file),id+' start route');assert(loc.href.includes('demoStory='+id),id+' story query');assert(loc.href.includes('demoStep=0'),id+' step query')}
loc.href='http://demo.local/prototype/x.html';I.goStep('new_rental',4);assert(loc.href.includes('U01.html')&&loc.href.includes('demoStep=4'),'Story01 U01 step');assert(JSON.parse(localStorage.getItem('price')).upfront_payable===3863,'coupon price snapshot preserved');
loc.href='http://demo.local/prototype/x.html';I.goStep('coupon',2);assert(loc.href.includes('mini_storage_coupon_select_c02_v1.html')&&loc.href.includes('demoStep=2'),'coupon select step');
localStorage.setItem('dirty','1');I.clearAll();assert.equal(localStorage.length,0,'clearAll removes demo state');
console.log('PASS Internal Demo Story Navigation V1: six starts, step routing, coupon snapshot, reset');
