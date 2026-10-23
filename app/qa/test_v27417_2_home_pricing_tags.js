const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const h=fs.readFileSync(path.join(root,'prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html'),'utf8');
const data=require(path.join(root,'data/mini_koala_data.js'));
function ok(v,m){if(!v){console.error('FAIL',m);process.exit(1)}console.log('PASS',m)}
ok(h.includes('首页三类推荐：距离最近 / 稍远更省 / 可配置促销门店。'),'recommendation roles documented');
ok(h.includes("badge:index===0?'距离最近':index===1?'稍远更省':HOME_PROMO_CONFIG.badge"),'second badge uses 稍远更省');
ok(h.includes('unitPrice:Number(window.MINI_KOALA_DATA.storeUnitPriceFrom(profile.store_id))||0'),'home recommendation candidate carries per-m3 unit price');
ok(h.includes('row.unitPrice<Number(nearest?.unitPrice||Infinity)')&&h.includes('a.unitPrice-b.unitPrice'),'saving slot prefers a lower per-m3 unit price');
ok(h.includes('function homeStoreFactTags(profile)')&&h.includes("tags.push('仓型丰富')")&&h.includes("tags.push('大仓可选')"),'home store tags derive from formal store facts');
ok(h.includes('function homeUnitPriceText(value)')&&h.includes('<span class="price-unit">/月/m³起</span>'),'home price uses XX元/月/m³起 structure');
ok(h.includes("font-size:9px!important;font-weight:600!important;color:#8A847C!important"),'price suffix is visually de-emphasized');

const ctx={window:{},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},console};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'prototype/mini_storage_business_ssot_v274.js'),'utf8'),ctx);
const routeBase=ctx.window.MINI_STORAGE_MASTER_V222.route_base.guomao;
const rev=Object.fromEntries(Object.entries(data.legacyAliases).map(([a,id])=>[id,a]));
function route(p){const a=rev[p.store_id],raw=a&&routeBase[a];if(raw)return {km:raw.drive[1],minutes:raw.drive[0]};const seed=[...p.store_id].reduce((s,c)=>s+c.charCodeAt(0),0);const km=Number(((p.district||'').includes('朝阳')?4.8:7.6+(seed%21)/10).toFixed(1));return {km,minutes:Math.max(8,Math.round(km*2.2+(seed%4)))};}
const c=data.stores.filter(p=>p.city==='北京市'&&+p.available_unit_count>0&&+p.size_max>=3.5).map(p=>({id:p.store_id,name:p.store_name,unitPrice:data.storeUnitPriceFrom(p.store_id),count:+p.available_unit_count,route:route(p)})).filter(p=>p.unitPrice>0);
const nearest=[...c].sort((a,b)=>a.route.km-b.route.km||a.route.minutes-b.route.minutes||b.count-a.count)[0];
const within=c.filter(x=>x.id!==nearest.id&&x.route.km<=5);const lower=within.filter(x=>x.unitPrice<nearest.unitPrice);const saving=[...(lower.length?lower:within)].sort((a,b)=>a.unitPrice-b.unitPrice||a.route.km-b.route.km||b.count-a.count)[0];
const promo=c.find(x=>x.id==='MK_BJ_04547515'&&!new Set([nearest.id,saving.id]).has(x.id));
ok(nearest.name==='三元桥店'&&nearest.unitPrice===135,'nearest slot resolves to 三元桥店 at 135元/月/m³起');
ok(saving.name==='大山子店'&&saving.route.km<=5&&saving.unitPrice===100,'saving slot resolves to 大山子店 at 100元/月/m³起');
ok(promo&&promo.name==='安贞店'&&promo.unitPrice===157,'promo slot remains distinct simulated 安贞店');
const tagSummary=p=>{const out=[p.storage_type];if(+p.size_option_count>=8)out.push('仓型丰富');else if(+p.size_option_count>=3)out.push('多尺寸可选');if(+p.size_max>=10)out.push('大仓可选');else if(+p.size_min>0&&+p.size_min<=1.5)out.push('小仓可选');else if(+p.available_unit_count>=10)out.push('可租充足');return [...new Set(out)].slice(0,3)};
ok(tagSummary(data.stores.find(p=>p.store_name==='大山子店')).join('|')==='社区仓|多尺寸可选|大仓可选','default second card factual tags are deterministic');
console.log('V2.7.4.17.2 HOME PRICING & TAGS QA PASS');
