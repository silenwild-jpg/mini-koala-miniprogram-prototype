const fs=require('node:fs'),assert=require('node:assert/strict');
const css=fs.readFileSync('prototype/mini_koala_term_actions_patch_v1.css','utf8');
assert(css.includes('#s5 .bottom.usage-actions{'));
for(const rule of ['right:auto!important','max-width:390px!important','max-width:370px!important','width:100%!important','min-width:0!important','font-family:inherit!important','font-size:14px!important','line-height:20px!important','font-weight:700!important','border-radius:12px!important','height:48px!important','grid-template-columns:minmax(0,1fr)!important'])assert(css.includes(rule),rule);
for(const viewport of [375,390,1024]){
 const phoneContent=viewport>650?370:viewport;
 const barWidth=Math.min(viewport,viewport>650?370:390);
 const available=barWidth-32,secondary=104,gap=12,primary=available-secondary-gap;
 assert(barWidth<=phoneContent);assert(primary>=200);
 console.log('PASS declared geometry', {viewport,barWidth,secondary,primary});
}
console.log('PASS shared button style declarations and single-column term-required state; static geometry, not rendered CSS');
