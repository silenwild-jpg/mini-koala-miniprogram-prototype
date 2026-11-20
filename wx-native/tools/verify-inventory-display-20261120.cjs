// Independent evidence directory: do not replace the previous native baseline's receipts.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const crypto = require('crypto'), assert = require('assert/strict');
const native = path.resolve(__dirname, '..'), repo = path.resolve(native, '..');
const project = path.join(native, 'miniprogram');
const out = path.join(native, 'evidence/inventory-display-20261120');
fs.mkdirSync(out, { recursive: true });
const git = (...args) => cp.execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
const sha = git('rev-parse', 'HEAD');
assert.equal(git('status', '--porcelain', '--', 'wx-native/miniprogram', 'wx-native/tests'), '', 'Commit runtime and tests before verification');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
function run(name, command, args, cwd = native) {
  const r = cp.spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  fs.writeFileSync(path.join(out, name + '.txt'), (r.stdout || '') + (r.stderr || '') + (r.error ? '\n' + r.error.message : ''));
  assert.equal(r.status, 0, name + ': see evidence log');
  return r.stdout;
}
const tests = walk(path.join(native, 'tests')).filter(f => f.endsWith('.test.js'));
const testLog = run('node-tests', process.execPath, ['--test', '--test-reporter=tap', ...tests]);
const summary = Object.fromEntries([...testLog.matchAll(/^# (tests|pass|fail) (\d+)$/gm)].map(m => [m[1], Number(m[2])]));
assert.equal(summary.fail, 0);
const smoke = run('smoke-pages', process.execPath, [path.join(__dirname, 'smoke_run.js'), project]);
const smokeSummary = JSON.parse(smoke.trim().split(/\r?\n/).filter(l => l.startsWith('{')).at(-1));
assert.equal(smokeSummary.errors, 0);
const templates = walk(project).filter(f => f.endsWith('.wxml')).map(f => path.relative(project, f));
const wcc = 'C:/Program Files (x86)/Tencent/微信web开发者工具/resources/app.asar.unpacked/node_modules/wcc-exec/wcc.exe';
run('wxml-compile', wcc, ['-o', path.join(out, 'wxml-compiled.js'), ...templates], project);
// The compiler output is regenerable, not a review asset.
fs.unlinkSync(path.join(out, 'wxml-compiled.js'));
const env = require('./fake_wx').install(project);
env.loadApp();
const model = { id: 'store', name: '门店', rankTag: '距离最近', tags: [{ t: '近地铁' }, { t: '电梯直达' }], row: { id: 'unit', name: '仓位 · 8m³', price: { amount: 200, unit: '/月起' }, cta: '查看仓位' }, nearText: '小2m³' };
const card = env.newComponent('components/mk-store-card/index', { card: model });
card.build();
assert.equal(card.data.visibleTags.length, 1);
assert.equal(card.data.lines[0].nearText, '小2m³');
assert.equal(card.data.lines[0].cta, '查看仓位');
assert.equal(card.data.lines[0].price.unit, '/月起');
assert.equal(model.tags.length, 2, 'Presentation must not mutate the full store services');
const files = walk(project).filter(f => !f.endsWith('project.private.config.json'));
const manifest = Object.fromEntries(files.map(f => [path.relative(project, f).replaceAll('\\', '/'), crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
fs.writeFileSync(path.join(out, 'source-manifest.json'), JSON.stringify({ source_sha: sha, files: manifest }, null, 2) + '\n');
const result = {
  source_sha: sha, branch: git('branch', '--show-current'), runtime_tree: git('rev-parse', 'HEAD:wx-native/miniprogram'),
  tests: summary, smoke: smokeSummary, native_wxml_compile: { exit_code: 0, template_count: templates.length },
  display_contract: 'PASS: two tag positions; capacity shortfall and guest price/action preserved; full services unchanged',
  native_simulator: 'BLOCKED: developer tools proxy 127.0.0.1:7892 refused connection; AppID permission lookup fails',
  screenshots_375_390: 'NOT_CAPTURED_FOR_THIS_SHA', visual_acceptance: 'HOLD', real_device: 'NOT_TESTED',
  merge: 'NOT_MERGED', experience_upload: 'NOT_UPLOADED'
};
fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
