#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),site=path.join(root,'release-evidence/rc2-merge-prep-10/site');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const central=read('app/central-review-02g.html');
const app=read('app/prototype/parallel/core-journey-fix-01/demo/app.js');
const phone=read('app/prototype/parallel/core-journey-fix-01/demo/phone-auth.js');
const bridge=read('app/prototype/parallel/core-journey-fix-01/demo/br04/bridge.js');
const contract=read('app/prototype/parallel/core-journey-fix-01/demo/central-contract.js');
assert.match(central,/\(p\.get\('page'\)\|\|' '\)\.toUpperCase\(\)==='U01'|\(p\.get\('page'\)\|\|''\)\.toUpperCase\(\)==='U01'/,'retired U01 route needs safe fallback');
assert.match(central,/safe\.search='';/,'legacy query must be discarded');
assert.match(central,/safe\.searchParams\.set\('page','S01'\)/);
assert.match(central,/safe\.searchParams\.set\('legacy','u01'\)/);
assert(!/U01\s*:/.test(contract),'central route must not revive U01');
assert.match(app,/const r2Mode=\(\)=>new URLSearchParams\(location\.search\)\.get\('s01_r2'\)==='1'/);
assert.doesNotMatch(app,/sessionStorage\.getItem\('mk_s01_r2_preview_v1'\)/);
assert.doesNotMatch(phone,/sessionStorage\.getItem\('mk_s01_r2_preview_v1'\)/);
assert.doesNotMatch(bridge,/sessionStorage\.getItem\('mk_s01_r2_preview_v1'\)/);
assert.match(bridge,/secondaryNav\.hidden=false/,'secondary S5 navigation missing');
const links=fs.readFileSync(path.join(site,'_redirects'),'utf8').trim().split(/\r?\n/);
assert(links.length>=6,'legacy alias coverage too small');
for(const line of links){
 const [src,dst,status]=line.split(/\s+/);
 assert(src.startsWith('/'),'source path must be absolute');
 assert.equal(status,'302');
 assert(dst.includes('page=S01')&&dst.includes('legacy=u01'));
 assert(!dst.includes('unit=')&&!dst.includes('store='));
}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'release-evidence/rc2-merge-prep-10/manifest.json'),'utf8'));
const files=manifest.map(x=>x.path);
assert(files.includes('_redirects'),'netlify redirects must be in artifact');
assert(!files.some(x=>/u01[^/]*\.html$/i.test(x)),'archival U01 HTML must be absent');
for(const row of manifest){
 const bytes=fs.readFileSync(path.join(site,row.path));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),row.sha256,row.path);
}
const result={result:'PASS',scope:'isolated RC2 build',s01_mode:'URL_EXPLICIT',s5_secondary_map:true,legacy_u01_aliases:links.length,legacy_orders_allowed:false,manifest_files:files.length,main_merge:false,deploy:false};
const out=path.join(root,'release-evidence/rule-restore-04');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'static.json'),JSON.stringify(result,null,2)+'\n');console.log('PROTO_RULE_RESTORE_04_STATIC_PASS',JSON.stringify(result));
