const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto'),assert=require('assert/strict');
const native=path.resolve(__dirname,'..'),repo=path.resolve(native,'..'),project=path.join(native,'miniprogram');
const git=(...args)=>cp.execFileSync('git',args,{cwd:repo,encoding:'utf8'}).trim();
const sha=git('rev-parse','HEAD'),out=path.join(native,'evidence/next-stage-20261120/INV-DENSITY-FIX-01',sha);
assert.equal(git('status','--porcelain','--','wx-native/miniprogram','wx-native/tests'),'');
fs.mkdirSync(out,{recursive:true});
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
function run(name,command,args,cwd=native){const r=cp.spawnSync(command,args,{cwd,encoding:'utf8',maxBuffer:32e6});fs.writeFileSync(path.join(out,name+'.txt'),(r.stdout||'')+(r.stderr||'')+(r.error?.message||''));assert.equal(r.status,0,name);return r.stdout;}
const testLog=run('node-tests',process.execPath,['--test','--test-reporter=tap',...walk(path.join(native,'tests')).filter(f=>f.endsWith('.test.js'))]);
const tests=Object.fromEntries([...testLog.matchAll(/^# (tests|pass|fail) (\d+)$/gm)].map(m=>[m[1],Number(m[2])]));assert.equal(tests.fail,0);
const smokeLog=run('smoke-pages',process.execPath,[path.join(__dirname,'smoke_run.js'),project]);
const smoke=JSON.parse(smokeLog.trim().split(/\r?\n/).filter(s=>s.startsWith('{')).at(-1));assert.equal(smoke.errors,0);
const templates=walk(project).filter(f=>f.endsWith('.wxml')).map(f=>path.relative(project,f));
run('wxml-compile','C:/Program Files (x86)/Tencent/微信web开发者工具/resources/app.asar.unpacked/node_modules/wcc-exec/wcc.exe',['-o',path.join(out,'wxml-compiled.js'),...templates],project);fs.unlinkSync(path.join(out,'wxml-compiled.js'));
const files=Object.fromEntries(walk(project).filter(f=>!f.endsWith('project.private.config.json')).map(f=>[path.relative(project,f).replaceAll('\\','/'),crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
fs.writeFileSync(path.join(out,'source-manifest.json'),JSON.stringify({source_sha:sha,files},null,2)+'\n');
const result={source_sha:sha,runtime_tree:git('rev-parse','HEAD:wx-native/miniprogram'),tests,smoke,wxml:{templates:templates.length,exit_code:0},native_visual:'NOT_RUN_BY_THIS_SCRIPT',real_devices:'NOT_TESTED',main_merge:'NOT_MERGED',experience_upload:'NOT_UPLOADED'};
fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
// Isolated render-only combination fixture: same view model, no server writes or valid order IDs.
const env=require('./fake_wx').install(project);env.loadApp();
const finder=require(path.join(project,'services/finder')),base=require(path.join(project,'mock/stores'))[0],src=require(path.join(project,'mock/inventory')).filter(u=>u.store_id===base.id);
const store={...base,units:[{...src[0],id:'RENDER_A',code:'TEST-D003',volume:16,status:'available'},{...src[1],id:'RENDER_B',code:'TEST-D004',volume:15,status:'available'}]};
const ctx={requirement:{capacity_m3:30.1,term_months:12,source:'manual'},location:{city:base.city,kind:'city'},loggedIn:false};
const model=finder.buildMatch([store],ctx);assert.equal(model.cards[0].lines[0].volText,'31m³');
fs.writeFileSync(path.join(out,'combo-render-args.json'),JSON.stringify([{mode:model.mode,cards:model.cards,advisor:null,hint:'',sub:model.sub,total:model.total,title:'组合方案渲染测试'}],null,2)+'\n');
