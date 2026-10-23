const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const files=[
'mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html','mini_storage_renew_rn01_v2_7_4.html','mini_storage_exit_ex01_v2_7_4.html','mini_storage_deposit_dp01_v2_7_4.html','mini_storage_order_history_oh01_v2_7_4.html','mini_storage_invoice_iv01_v2_7_4.html','mini_storage_business_b2b01_r113_Visual_V2_7_4.html'];
const expected={
'mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html':'9b366d3517188e645a6fa840c8e3946b82d8ac1560b1ebe1d05e342e9dc005a2',
'mini_storage_renew_rn01_v2_7_4.html':'2edce280d0afdc8efe5ad5d92c0b8f9c2829cbcb76d90b756b1eed2ef6440114',
'mini_storage_exit_ex01_v2_7_4.html':'43acaf2d100a8520f5cbb4f27a5d97dbdd13ff1d926c1693490b564c00043eae',
'mini_storage_deposit_dp01_v2_7_4.html':'d8056a8fa363018f0a99abbc2451bab5d8de7af55dfbdef7638266cf2f367e84',
'mini_storage_order_history_oh01_v2_7_4.html':'da025448e7502ef7d6ba3dbc8a66e22386a1d5a333d37755fd59ef4f8d55fed9',
'mini_storage_invoice_iv01_v2_7_4.html':'3c66120e172a0052c55ce18803ed9051663b056778d53ab4e50d2890f8543dcc',
'mini_storage_business_b2b01_r113_Visual_V2_7_4.html':'75c695fe184fec10a675a2e32c0b015e86e098ff2661a0114ec75d5b66bea23f'};
function bodyHash(s){const m=s.match(/<body[\s\S]*?<\/body>/i);return crypto.createHash('sha256').update(m?m[0]:'').digest('hex')}
for(const f of files){const s=fs.readFileSync(path.join(proto,f),'utf8');if(!s.includes('mini_storage_sprint3_lifecycle_hifi_v1.css'))throw new Error(`${f}: sprint3 stylesheet missing`);const h=bodyHash(s);if(h!==expected[f])throw new Error(`${f}: body drift ${h}`)}
const css=fs.readFileSync(path.join(proto,'mini_storage_sprint3_lifecycle_hifi_v1.css'),'utf8');
for(const needle of ['#FDFBF7','#2F6B4F','#D56A1C','#6D7671','.total{color:var(--s3-price)','.lbs>span:first-child','#orders .order .row b'])if(!css.includes(needle))throw new Error('CSS guard missing: '+needle);
console.log('PASS sprint3 lifecycle & secondary visual guard: 7 bodies unchanged, shared visual layer present');
