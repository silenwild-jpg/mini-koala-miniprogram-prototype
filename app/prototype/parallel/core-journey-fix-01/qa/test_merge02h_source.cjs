'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const fixture=require('../demo/fixtures');
const C=require('../demo/central-contract');
const old=require('../../../../data/store_master.json');
const source=require('../demo/store-source.json');
const out=path.resolve(__dirname,'../evidence/merge02h');
fs.mkdirSync(out,{recursive:true});
const clean=s=>String(s||'').replace(/[^\p{L}\p{N}]/gu,'').replace(/北京市|上海市|深圳市|朝阳区|长宁区|海淀区|西城区|东城区|丰台区|宝安区/g,'');
const matches=source.selected_stores.map(s=>{
 const exact=old.stores.filter(x=>x.city===s.city&&clean(x.address)&&clean(s.address)
   &&(clean(x.address).includes(clean(s.address))||clean(s.address).includes(clean(x.address))));
 return {source_id:s.id,source_name:s.name,source_address:s.address,
   possible_address_candidates:exact.map(x=>({store_id:x.store_id,name:x.store_name,address:x.address})),
   status:exact.length?'ADDRESS_CANDIDATE_UNVERIFIED':'NO_ADDRESS_CANDIDATE'};
});
const stats={
 primary_review_source:'SIM_DEMO_ISOLATED_ONLY',old_data_version:old.meta.data_version,old_store_count:old.stores.length,
 old_size_option_count:old.meta.size_option_count,source_stores:source.selected_stores.length,
 fixture_store_count:fixture.stores.length,fixture_unit_count:fixture.units.length,
 exact_address_candidates:matches.filter(x=>x.possible_address_candidates.length===1).length,
 ambiguous_address_candidates:matches.filter(x=>x.possible_address_candidates.length>1).length,
 unmatched:matches.filter(x=>!x.possible_address_candidates.length).length,
 automatic_promotions:0,unit_id_mappings_approved:0,distance_verified:fixture.distanceVerified
};
assert.equal(old.stores.length,126);
assert.equal(old.meta.size_option_count,766);
assert.equal(source.selected_stores.length,33);
assert.equal(stats.exact_address_candidates,2);
assert.equal(fixture.synthetic,true);
for(const s of source.selected_stores)assert(C.storeId(fixture,s.id)===s.id);
for(const row of matches)for(const q of row.possible_address_candidates)
  assert.throws(()=>C.storeId(fixture,q.store_id),/LEGACY_STORE_ID_UNMAPPED/);
fs.writeFileSync(path.join(out,'source-candidates.json'),JSON.stringify({statistics:stats,candidates:matches},null,2));
console.log('SOURCE_AUDIT',JSON.stringify(stats));
console.log('SOURCE_AUDIT_PASS (address match never authorizes unit or price mapping)');
