const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');const base=path.resolve(__dirname,'../prototype');
const saved={target_volume:6,min_volume:6,max_volume:0,size_mode:'atleast',item_summary:'旧订单的衣柜',has_oversize:true,term_months:12};
const map=new Map([['mini_storage_requirement_current',JSON.stringify(saved)]]);const localStorage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v))};
const nodes=new Map();function node(id){if(nodes.has(id))return nodes.get(id);const cls=new Set();const n={textContent:'',innerHTML:'',style:{},value:'',classList:{add:x=>cls.add(x),remove:x=>cls.delete(x),toggle:(x,force)=>force?(cls.add(x),true):(cls.delete(x),false),contains:x=>cls.has(x)},querySelector:s=>node(id+' '+s),querySelectorAll:()=>[],addEventListener(){},setAttribute(){},scrollIntoView(){}};nodes.set(id,n);return n}
const document={querySelector:node,querySelectorAll:()=>[]},location={search:'?unit=C008&store=jianguo&target=4.8&term=6&fromS01State=estimated&source=estimator_unit_list',href:''};
const context={window:null,document,location,localStorage,URLSearchParams,Date,Math,JSON,String,Number,Array,Object,Boolean,Error,setTimeout:()=>0,clearTimeout:()=>{},console};context.window=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(base,'mini_storage_business_ssot_v274.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(base,'..','data','mini_koala_data.js'),'utf8'),context);
const html=fs.readFileSync(path.join(base,'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html'),'utf8');const js=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]);assert.equal(js.length,1);vm.runInContext(js[0],context);
assert(!node('#unitPlain').textContent.includes('旧订单的衣柜'));assert(!node('#unitPlain').textContent.includes('超长/超大件'));assert(!html.includes('和您的需求匹配'));assert(node('#len').textContent.startsWith('约'));assert.equal(node('#hei').textContent,'2.5m');
node('#back').onclick();assert(location.href.includes('entry=resume_unit_list'));assert(location.href.includes('term=6'));
console.log('PASS U01 ignores previous demand snapshot and returns to estimator selection');
