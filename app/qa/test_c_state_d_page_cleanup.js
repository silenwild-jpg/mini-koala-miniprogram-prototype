const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'../prototype');
const pages={
  m01:'mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html',
  s01:'mini_storage_store_list_s01_v1_27_self_service_Visual_V2_7_4.html',
  s02:'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html',
  u01:'mini_storage_unit_detail_u01_v1_21_self_service_Visual_V2_7_4.html',
};
const read=name=>fs.readFileSync(path.join(root,pages[name]),'utf8');
const scripts=html=>[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(x=>x.trim());
const m01=read('m01'),s01=read('s01'),s02=read('s02'),u01=read('u01');

assert(m01.includes('id="primaryTitle"'));
assert(m01.includes("?'当前服务':'待处理事项'"));
assert(m01.includes('.referral-card{background:#F7F4EE!important'));
assert(!s01.includes('照片区域'));
assert(s01.includes('<small>门店环境</small>'));
assert(!s02.includes('仓内走廊实拍')&&!s02.includes('真实仓位实拍'));
assert(s02.includes('门店环境示意'));
assert(s02.includes('.hv-intro{display:none!important}'));
assert(!s02.includes('rawUnits.find(u=>u.v===7.8)')&&!s02.includes('rawUnits.find(u=>u.v===12.0)'));
assert(s02.includes("left.textContent='顾问协助'; right.textContent='查看推荐仓位'"));
assert(s02.includes('const ordered=[...inventoryUnits()]'));
assert(!u01.includes('实拍')&&!u01.includes('照片区域'));
assert(u01.includes('仓位入口示意')&&u01.includes('仓位环境示意'));

for(const [name,html] of Object.entries({m01,s01,s02,u01})){
  for(const script of scripts(html)) new vm.Script(script,{filename:pages[name]});
}
console.log('PASS C-State P1 + D-Page Cleanup: M01 active title/referral priority and S01/S02/U01 placeholder/high-value cleanup');
