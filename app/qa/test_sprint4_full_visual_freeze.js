const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const support=fs.readFileSync(path.join(proto,'mini_storage_global_support_v274.js'),'utf8');
for(const needle of ['#2F6B4F','#CFE1D6','#FFFFFF','rgba(31,41,35,.12)']){
  if(!support.includes(needle)) throw new Error('final global support visual token missing: '+needle);
}
for(const legacy of ['#2D7154','#D8E5DB','#FFFDFC','rgba(42,57,49,.14)']){
  if(support.includes(legacy)) throw new Error('legacy global support visual token remains: '+legacy);
}
for(const f of ['MINI_KOALA_VISUAL_BASELINE_1_0.md','docs/visual/Mini_Koala_Visual_Design_System_V1.md','prototype/mini_storage_visual_harmonization_v1.css','prototype/mini_storage_sprint3_lifecycle_hifi_v1.css']){
  if(!fs.existsSync(path.join(root,f))) throw new Error('final visual baseline asset missing: '+f);
}
console.log('PASS sprint4 full visual freeze guard: shared help token aligned and frozen visual assets present');
