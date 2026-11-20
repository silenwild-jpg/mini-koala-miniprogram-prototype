/* MK-VOL v0.2 单调性验证：往清单里加任何一件物品，建议容量不减。用法：node tools/test_volume_model_v02.js */
global.window=global;require('../runtime/items-catalog.js');const M=require('../model/volume-model.js');
const items=window.MK_ITEMS_CATALOG.items.flatMap(x=>x.variants.map(v=>({id:x.id,category:x.category,volume_m3:v.volume_m3,name:x.name+'/'+v.name})));
const rec=b=>M.recommend(b.filter(l=>l.count>0)).recommended;let bad=0,n=0;
let seed=20261118;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
for(let t=0;t<200000;t++){const k=1+Math.floor(rnd()*5),b=[];for(let i=0;i<k;i++){const it=items[Math.floor(rnd()*items.length)];b.push({...it,count:1+Math.floor(rnd()*(rnd()<.2?80:8))});}
  const r0=rec(b),add=items[Math.floor(rnd()*items.length)],r1=rec([...b,{...add,count:1}]);n++;if(r1<r0-1e-9){bad++;if(bad<4)console.log('DECREASE',r0,r1,JSON.stringify(b.map(l=>l.name+'x'+l.count)),'+',add.name);}}
/* 全目录逐项：对每个单品清单，逐件加另一单品直到 60 件 */
for(const a of items)for(const c of items){let b=[{...a,count:3},{...c,count:0}],prev=rec(b);for(let i=1;i<=60;i++){b[1].count=i;const r=rec(b);n++;if(r<prev-1e-9){bad++;if(bad<8)console.log('DECREASE2',a.name,c.name,i,prev,r);}prev=r;}}
const L=(o)=>Object.entries(o).map(([id,count])=>{const x=window.MK_ITEMS_CATALOG.items.find(i=>i.id===id),v=x.variants.find(v=>v.id===x.defaultVariant)||x.variants[0];return {id,category:x.category,volume_m3:v.volume_m3,count};});
for(const [name,o] of [['W15 例1：2沙发+1床+11箱',{sofa3:2,bed180:1,box:11}],['同上 +2箱',{sofa3:2,bed180:1,box:13}],['40箱',{box:40}],['40箱+1衣柜',{box:40,wardrobe:1}],['演示种子 3箱+2行李箱+1沙发',{box:3,luggage28:2,sofa3:1}],['1箱',{box:1}]]){const r=M.recommend(L(o));console.log(name,'net',r.net,'b',r.bulkyShare,'k',r.k,'→',r.recommended);}
console.log('checks',n,'decreases',bad);process.exit(bad?1:0);
