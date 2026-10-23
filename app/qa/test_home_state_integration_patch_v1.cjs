const fs=require('fs'), path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const home=fs.readFileSync(path.join(root,'prototype','mini_storage_home_H01_Visual_V2_7_4_SSOT.html'),'utf8');
const css=fs.readFileSync(path.join(root,'prototype','mini_koala_home_state_integration_patch_v1.css'),'utf8');
const cases=[
 ['style loaded',home.includes('mini_koala_home_state_integration_patch_v1.css')],
 ['task mount before original double entry',home.includes("document.querySelector('.dual-task-grid').before(hsiMount)")],
 ['five existing state cards reused',home.includes("const hsiTaskIds=['pendingCard','viewingCard','estimatedCard','quotedCard','activeCard']")],
 ['new homepage stable across states',home.includes("const shouldShow=st==='new'?state!=='b2b':st===state")],
 ['original acquisition modules unchanged', ['id="newHero"','class="dual-task-grid state-new"','id="nearNew"','id="scenesNew"','id="homeServiceFlow"','id="brandTrust"','id="homeBottomProofs"'].every(x=>home.includes(x))],
 ['single visible state task decision',home.includes("if(!el.classList.contains('hsi-task'))el.classList.add('hidden')")],
 ['urgent state based on lifecycle',home.includes("['ending','returning'].includes(lc.state)")],
 ['pending payments have first priority',home.includes("if(hsiValidPending(o))return 'pending'")],
 ['estimated is prioritized above routine active',home.indexOf("if(hsiValidEstimate(r))return 'estimated'") < home.lastIndexOf("if(o?.status==='PAID'&&lc.is_current)return 'active'")],
 // 2026-10-19 user decision: an existing confirmed demand makes nearby stores matched.
 ['home store cards enter matched state with confirmed demand',home.includes("const matched=mode==='matched'||Number(r.target_volume)>0;")],
 ['explicit matched mode is still honoured by goStoreDetail',home.includes("function goStoreDetail(storeId,mode='browse')")&&/state:\s*matched\s*\?\s*['"]matched['"]\s*:\s*['"]browse['"]|matched\?'matched':'browse'/.test(home)],
 ['secondary task shortcut backed by mine',home.includes('hsiOther.onclick=()=>location.href=m01File')],
 ['referral entry relocated into original homepage',home.includes("document.getElementById('homeBottomProofs').after(hsiReferral)")],
 ['no hidden task cards leakage',css.includes('#hsiTaskMount .hsi-task.hidden{display:none!important}')],
 ['card compact metrics',css.includes('#hsiTaskMount .hsi-task .stategrid{display:none!important}')],
 ['main CTA retained',css.includes('.stateactions button.primary')],
 ['small width accommodation',css.includes('@media(max-width:380px)')],
];
let fail=0;for(const [name,ok] of cases){console.log((ok?'PASS':'FAIL')+' '+name);if(!ok)fail++}
console.log(`${cases.length-fail}/${cases.length}`);process.exit(fail?1:0);
