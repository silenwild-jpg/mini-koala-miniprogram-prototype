// Source audit for the mini-program; this does not execute every branch or certify accessibility.
const fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto'), assert = require('assert/strict');
const native = path.resolve(__dirname, '..'), project = path.join(native, 'miniprogram'), repo = path.resolve(native, '..');
const out = path.join(native, 'docs/visual-audit-01a-20261120'); fs.mkdirSync(out, { recursive: true });
const read = f => fs.readFileSync(f, 'utf8');
const rel = f => path.relative(project, f).replaceAll('\\', '/');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const git = (...args) => cp.execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 16e6 }).trim();
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const csv = rows => rows.map(r => r.map(v => '"' + String(v ?? '').replaceAll('"', '""') + '"').join(',')).join('\n') + '\n';
const writeCsv = (name, rows) => fs.writeFileSync(path.join(out, name), csv(rows));
const line = (s, index) => s.slice(0, index).split('\n').length;
assert.equal(git('status', '--porcelain', '--', 'wx-native/miniprogram'), '');
const runtimeSource = 'cbffc52201ab61b0896887a46520e4388ac70c70', runtimeTree = git('rev-parse', 'HEAD:wx-native/miniprogram');
assert.equal(runtimeTree, '71ee450e0631d78f2d2045456617963ff001b3f9');
const app = JSON.parse(read(path.join(project, 'app.json'))), routeInfo = require(path.join(project, 'services/routes')).TABLE;
const routes = app.pages.concat(...app.subpackages.map(s => s.pages.map(p => s.root + '/' + p)));
const components = fs.readdirSync(path.join(project, 'components')).filter(n => fs.existsSync(path.join(project, 'components', n, 'index.wxml')));
function tags(file) {
  const source = read(file), result = [];
  for (const m of source.matchAll(/<([\w:-]+)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/g)) {
    const attrs = Object.fromEntries([...m[2].matchAll(/([:\w-]+)(?:\s*=\s*"([^"]*)")?/g)].map(x => [x[1], x[2] ?? '']));
    result.push({ tag: m[1], attrs, line: line(source, m.index), raw: m[0] });
  }
  return result;
}
const units = routes.map(r => ({ kind: 'page', key: routeInfo.find(p => p.route === '/' + r)?.code || r, base: r })).concat(components.map(c => ({ kind: 'component', key: c, base: 'components/' + c + '/index' })));
const parsed = new Map(units.map(u => [u.base, tags(path.join(project, u.base + '.wxml'))]));
const children = base => [...new Set(parsed.get(base).filter(t => t.tag.startsWith('mk-')).map(t => t.tag))];
const descend = (names, seen = new Set()) => { for (const name of names) { if (seen.has(name)) continue; seen.add(name); if (components.includes(name)) descend(children('components/' + name + '/index'), seen); } return seen; };
const pageReach = new Map(routes.map(r => [r, descend(children(r))]));
writeCsv('COMPONENT_IMPACT.csv', [['组件','直接页面','全部受影响页面（递归WXML调用）','直接调用组件','子组件','全局注册','边界'], ...components.map(c => [c, routes.filter(r => children(r).includes(c)).join(';'), routes.filter(r => pageReach.get(r).has(c)).join(';'), components.filter(p => children('components/' + p + '/index').includes(c)).join(';'), children('components/' + c + '/index').join(';'), Object.hasOwn(app.usingComponents || {}, c), '包含条件分支与slot内容的源码引用；不等于每条路径都已执行'])]);
const branches = [], states = [], interactions = [];
for (const unit of units) {
  const file = unit.base + '.wxml';
  states.push([unit.kind,unit.key,'default',file,1,'默认数据及守卫满足','需fixture执行','NOT_RUN','NOT_SIGNED']);
  for (const t of parsed.get(unit.base)) {
    for (const attr of ['wx:if','wx:elif','wx:else']) if (attr in t.attrs) {
      const expression = t.attrs[attr] || '上一同级if/elif均为false';
      const retired = /(?:mode|situation) === 'sales'/.test(expression) && ['S01','S02','S5'].includes(unit.key);
      const entry = [unit.kind, unit.key, unit.key + ':' + t.line + ':' + attr, file, t.line, expression, retired ? 'RETIRED_UNREACHABLE: matching.salesOnly=false' : 'SOURCE_BRANCH_REQUIRES_FIXTURE_AND_REACHABILITY_CHECK', 'NOT_RUN', 'NOT_SIGNED'];
      branches.push([...entry,t.tag]);
      states.push(entry);
    }
    if (Object.keys(t.attrs).some(k => /^(bind|catch)(tap|:tap)$/.test(k))) interactions.push([unit.kind, unit.key, file, t.line, t.tag, t.attrs.class || '', t.attrs['aria-role'] || '', t.attrs['aria-label'] || '', t.tag === 'image', 'SOURCE_REVIEW_ONLY; measured hit rect and reading order not established']);
  }
}
writeCsv('BRANCH_INVENTORY.csv', [['范围','页面或组件','分支ID','源码','行','条件','可达性','运行状态','视觉签收','节点'], ...branches]);
writeCsv('VALID_STATE_MATRIX.csv', [['范围','页面或组件','状态/分支键','源码','行','成立条件','可达性裁定','本轮运行状态','视觉签收'], ...states]);
writeCsv('INTERACTION_REVIEW.csv', [['范围','页面或组件','源码','行','节点','class','role','显式label','节点自身为image（未推断子节点）','限制'], ...interactions]);
const sourceFiles = walk(project).filter(f => /\.(js|json|wxml|wxss)$/.test(f)), sources = sourceFiles.map(f => ({ file: rel(f), text: read(f) }));
const tokenFile = path.join(project, 'styles/tokens.wxss'), tokenSource = read(tokenFile).replace(/\/\*[\s\S]*?\*\//g, '');
const tokenValues = Object.fromEntries([...tokenSource.matchAll(/(--mk-[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
const uses = Object.fromEntries(Object.keys(tokenValues).map(k => [k, []])); const undefinedUses = [];
for (const s of sources.filter(s => s.file.endsWith('.wxss'))) for (const m of s.text.matchAll(/var\((--mk-[\w-]+)/g)) {
  const use = s.file + ':' + line(s.text, m.index); if (uses[m[1]]) uses[m[1]].push(use); else undefinedUses.push({ token: m[1], use });
}
writeCsv('TOKEN_USAGE.csv', [['令牌','值','引用次数','引用位置','注释'], ...Object.entries(tokenValues).map(([k,v]) => [k,v,uses[k].length,uses[k].join(';'), '未引用仅代表WXSS var字面引用未发现，不据此自动删除'])]);
const hexRgb = hex => { const h = hex.replace('#',''); return (h.length === 3 ? h.split('').map(x => x+x).join('') : h).match(/../g).map(v => parseInt(v,16)/255); };
const lum = h => hexRgb(h).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4).reduce((s,v,i) => s+v*[.2126,.7152,.0722][i],0);
const pairs = [['--mk-color-ink-primary','--mk-color-canvas-card'],['--mk-color-ink-secondary','--mk-color-canvas-card'],['--mk-color-ink-tertiary','--mk-color-canvas-card'],['--mk-color-brand-text','--mk-color-brand-tint'],['--mk-color-ink-inverse','--mk-color-action-primaryFill'],['--mk-color-accent-promoText','--mk-color-accent-promoFill']];
const contrasts = pairs.map(([fg,bg]) => { const a=lum(tokenValues[fg]),b=lum(tokenValues[bg]); return { foreground: fg, background:bg, ratio: Number(((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2)), applicability: 'static declared opaque colors; actual inheritance/background still needs native inspection' }; });
writeCsv('CONTRAST_REVIEW.csv', [['前景令牌','背景令牌','对比度','普通文本4.5','适用边界'], ...contrasts.map(x => [x.foreground,x.background,x.ratio,x.ratio >= 4.5 ? 'PASS_PAIR' : 'BELOW_4_5_PAIR',x.applicability])]);
const assets = walk(path.join(project, 'assets')), icons = assets.filter(f => f.endsWith('.svg'));
const frozenFiles = walk(path.join(native,'design-frozen/assets'));
const frozenHashes = new Map(); for(const f of frozenFiles) { const h=hash(f); if(!frozenHashes.has(h))frozenHashes.set(h,[]); frozenHashes.get(h).push(path.relative(native,f).replaceAll('\\','/')); }
const media = require(path.join(project, 'mock/media'));
const assetRows = assets.map(f => {
  const file=rel(f),s=f.endsWith('.svg')?read(f):'', literal=sources.filter(x=>x.text.includes(file)).map(x=>x.file), frozen=frozenHashes.get(hash(f)) || [];
  return [file,fs.statSync(f).size,hash(f),literal.join(';'),frozen.join(';'),file.includes('/images/stores/')?'SOURCE_PACKAGE_DEMO_NOT_PHYSICAL_STORE_VERIFIED':'SOURCE_PACKAGE_ASSET; RIGHTS_NOT_INDEPENDENTLY_VERIFIED',file.endsWith('.svg')?[...new Set([...s.matchAll(/(?:stroke|fill)="([^"]+)"/g)].map(m=>m[1]))].join(';'):'',file.endsWith('.svg')?[...new Set([...s.matchAll(/stroke-width="([^"]+)"/g)].map(m=>m[1]))].join(';'):'','字面未引用须结合动态引用表；哈希匹配只证明字节来源，不证明授权'];
});
writeCsv('ASSET_REVIEW.csv', [['资源','字节','SHA256','字面引用','冻结包字节相同来源','素材裁定','SVG颜色','SVG描边','限制'], ...assetRows]);
const dynamic=[];
for (const s of sources) for(const m of s.text.matchAll(/(?:\/assets\/[^"'<>\n]*\{\{[^\n]*|['"]\/assets\/[^'"\n]+['"]\s*\+)/g)) dynamic.push([s.file,line(s.text,m.index),m[0].slice(0,240),'SOURCE_TRACED; resolve enumerated keys separately']);
writeCsv('DYNAMIC_ASSETS.csv', [['源码','行','动态表达式','结论'], ...dynamic, ['mock/media.js',1,media.join(';'),'12 source-backed demo image IDs; other store cards/heroes use SIM_BJ01 fallback via services/finder and pages/store/detail']]);
// Enumerate both image families by their real runtime keys, including the common fallback.
const stores = require(path.join(project, 'mock/stores'));
writeCsv('STORE_MEDIA_MAPPING.csv', [['演示门店ID','图片目录ID','使用共用示意','card文件存在','hero文件存在','实体照片核验'], ...stores.map(s => { const id=(media.includes(s.id)?s.id:'SIM_BJ01').replace('_','-'); return [s.id,id,!media.includes(s.id),fs.existsSync(path.join(project,'assets/images/stores',id,'card.webp')),fs.existsSync(path.join(project,'assets/images/stores',id,'hero.webp')),'NOT_VERIFIED']; })]);
const summary={ task:'VIS-COMPONENT-SYSTEM-01A', source_sha:runtimeSource, runtime_tree:runtimeTree, audit_input_commit:git('rev-parse','HEAD'), pages:routes.length, components:components.length, active_token_declarations:Object.keys(tokenValues).length, commented_token_declarations:94-Object.keys(tokenValues).length, undefined_token_uses:undefinedUses, branch_records:branches.length, state_matrix_rows:states.length, retired_sales_branches:states.filter(s=>s[6].startsWith('RETIRED')).length, interaction_nodes:interactions.length, assets:assets.length, icons:icons.length, currentColor_icons:icons.filter(f=>read(f).includes('currentColor')).length, exact_frozen_asset_matches:assetRows.filter(r=>r[4]).length, store_media_mappings:stores.length, fallback_store_count:stores.filter(s=>!media.includes(s.id)).length, contrasts, total_effective_state_count:'NOT_ESTABLISHED: rows are source branch inventory, not combinations or verified reachability', visual_status:'See native current-SHA evidence; full-site visual acceptance pending', scores:'Do not score unmeasured startup, gestures, screen reader or Dynamic Type from source alone' };
fs.writeFileSync(path.join(out,'AUDIT_DATA.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
