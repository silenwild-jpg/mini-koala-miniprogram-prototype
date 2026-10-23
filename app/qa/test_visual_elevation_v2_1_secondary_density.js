const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const expected={
  'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html':'af97dc33fcdec812dcdf26fbd659d80de81fabff503ad5812b3bab64ce8a818a',
  'mini_storage_order_o02_v1_17_self_service_Visual_V2_7_4.html':'6262bc397bfd91b474bd5d8dc8c0972ecbf66b87b9917c3a68daca8400fb1fd3',
  'mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html':'ec75d052ec93a443a559ca396df1e8dbef9dcc3745bd639edb30ce3c7805adc1'
};
function bodyHash(s){const m=s.match(/<body\b[^>]*>([\s\S]*)<\/body>/i);return crypto.createHash('sha256').update(Buffer.from(m?m[1]:'')).digest('hex')}
for(const [f,h] of Object.entries(expected)){
  const s=fs.readFileSync(path.join(proto,f),'utf8');
  if(!s.includes('mini_koala_visual_elevation_v2_1_secondary_density.css')) throw new Error(f+' missing secondary density CSS');
  if(bodyHash(s)!==h) throw new Error(f+' body changed');
}
const css=fs.readFileSync(path.join(proto,'mini_koala_visual_elevation_v2_1_secondary_density.css'),'utf8');
for(const token of ['#s5 .usage-summary.capacity-summary','#s5 .term-choice.active','body:has(#statusIcon) #paidPrice','body:has(#primaryAssets) .menu button']){
  if(!css.includes(token)) throw new Error('missing secondary density rule '+token);
}
console.log('V2.1 secondary density guard PASS: recommendation/O02/M01 bodies frozen; polish rules present.');
