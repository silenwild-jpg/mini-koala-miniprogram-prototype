const fs=require('fs'),vm=require('vm'),assert=require('assert');
const data=new Map();
function makeContext(search){
 const storage={getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};const nodes=new Map();
 function node(sel){if(nodes.has(sel))return nodes.get(sel);const classes=new Set();const n={textContent:'',value:'',style:{},dataset:{},classList:{add:(...x)=>x.forEach(y=>classes.add(y)),remove:(...x)=>x.forEach(y=>classes.delete(y)),toggle:(x,on)=>on===undefined?(classes.has(x)?(classes.delete(x),false):(classes.add(x),true)):(on?(classes.add(x),true):(classes.delete(x),false)),contains:x=>classes.has(x)}};nodes.set(sel,n);return n}
 const document={querySelector:node,querySelectorAll:()=>[]},location={search,href:'',reloaded:false,reload(){this.reloaded=true}},history={length:2,back(){}};
 const ctx={console,localStorage:storage,document,location,history,URLSearchParams,Date,Math,JSON,String,Number,Array,Object,Boolean,Error,confirm:()=>true,setTimeout:()=>0,clearTimeout:()=>{},window:null};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(process.argv[2],'utf8'),ctx);return {ctx,node};
}
function inline(file){const h=fs.readFileSync(file,'utf8');const a=[...h.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]);assert.equal(a.length,1);return a[0]}
let {ctx,node}=makeContext('?source=S02&scope=STORE&store=jianguo&target=4.8&term=6');vm.runInContext(inline(process.argv[3]),ctx);assert.equal(typeof node('#confirm').onclick,'function');node('#confirm').onclick();
let booking=JSON.parse(data.get('mini_storage_viewing_current'));assert.equal(booking.status,'BOOKED');assert.equal(booking.store_id,'jianguo');assert.equal(booking.target_volume,4.8);assert.equal(booking.term_months,6);assert(ctx.location.href.includes('mini_storage_viewing_v02'));
({ctx,node}=makeContext('?viewingId='+booking.viewing_id));vm.runInContext(inline(process.argv[4]),ctx);assert.equal(node('#time').textContent.includes(booking.appointment_date),true);node('#cancel').onclick();booking=JSON.parse(data.get('mini_storage_viewing_current'));assert.equal(booking.status,'CANCELLED');assert.equal(ctx.location.reloaded,true);
console.log('PASS viewing runtime: booking saved and restored');console.log('PASS viewing runtime: cancellation updates lifecycle');
