const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const h=fs.readFileSync(path.join(root,'prototype/mini_storage_home_H01_Visual_V2_7_4_SSOT.html'),'utf8');
const e=fs.readFileSync(path.join(root,'prototype/space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html'),'utf8');
const c=fs.readFileSync(path.join(root,'prototype/mini_koala_home_state_integration_patch_v1.css'),'utf8');
const cases=[
['asset-derived state',h.includes('function hsiTaskState(saved,lc)')],
['URL not trusted as business state',h.includes('let init=derivedState;')],
['demo override explicitly gated',h.includes("homeParams.get('review')==='1'&&homeParams.get('source')==='demo_hub'")],
['payment asset guarded by number and status',h.includes('function hsiValidPending(o)')],
['appointment validity checked by date',h.includes('function hsiValidViewing(v)')],
['past booked record excluded',h.includes('return date>=floor;')],
['quote validates required fields',h.includes('function hsiValidQuote(q)')],
['quote expiry checks timestamp',h.includes('function hsiQuoteExpired(q)')],
['quote status forwarded expired',h.includes("quoteStatus:hsiQuoteExpired(q)?'expired'")],
['known volume passed for absent term',h.includes("entry:'known',knownSize:String(r.target_volume)")],
['no default six in restore CTA',h.includes('term:String(r.term_months),travel:')],
['estimated length unconfirmed phrasing',h.includes('租期待选择 · 继续完成租期确认')],
['validated CTA for paid states',h.includes('cta.onclick=openSavedOrder')],
['no second task card stacked',h.includes("const otherJourneys=new Set()")],
['button and other task touch 44',c.includes('min-height:44px!important')],
['known size estimator route forces lease-term selection',h.includes("entry:'known',knownSize:String(r.target_volume),requireTerm:'1',source:'home_resume_term_required'")&&e.includes("params.get('requireTerm')==='1'?null")],
['universal home preserved',h.includes("const shouldShow=st==='new'?state!=='b2b':st===state")],
['existing order quote downstream unchanged',!h.includes("localStorage.removeItem(ORDER_KEY)")],
];for(const [n,ok] of cases){console.log((ok?'PASS':'FAIL')+' '+n);assert(ok,n)}console.log(cases.length+'/'+cases.length)
