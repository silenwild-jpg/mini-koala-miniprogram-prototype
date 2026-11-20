// Planning inventory only. Static references are not a visual, licensing, or unused-asset audit.
const fs = require('fs'), path = require('path'), cp = require('child_process'), crypto = require('crypto'), assert = require('assert/strict');
const native = path.resolve(__dirname, '..'), root = path.join(native, 'miniprogram');
const out = path.join(native, 'docs/next-stage-20261120');
fs.mkdirSync(out, { recursive: true });
const git = (...args) => cp.execFileSync('git', args, { cwd: path.resolve(native, '..'), encoding: 'utf8' }).trim();
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const rel = f => path.relative(root, f).replaceAll('\\', '/');
const read = f => fs.readFileSync(f, 'utf8');
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const csv = rows => rows.map(r => r.map(v => '"' + String(v ?? '').replaceAll('"', '""') + '"').join(',')).join('\n') + '\n';
const writeCsv = (file, rows) => fs.writeFileSync(path.join(out, file), csv(rows));
assert.equal(git('status', '--porcelain', '--', 'wx-native/miniprogram'), '', 'Runtime must be clean');
const prior = JSON.parse(read(path.join(native, 'evidence/inventory-display-20261120/verification.json')));
assert.equal(git('rev-parse', 'HEAD:wx-native/miniprogram'), prior.runtime_tree, 'Rebase the planning baseline after any runtime change');
const app = JSON.parse(read(path.join(root, 'app.json')));
const routes = app.pages.concat(...app.subpackages.map(p => p.pages.map(r => p.root + '/' + r)));
const routeInfo = require(path.join(root, 'services/routes')).TABLE;
assert.equal(new Set(routes).size, routes.length);
const group = r => /pages\/(home|stores|store|match|estimate)/.test(r) || r.startsWith('pkg-estimate') ? '01C 找仓试点' : r === 'pkg-trade/quick/index' || r === 'pkg-trade/confirm/index' ? '01D-1 交易与公共交互' : r.startsWith('pkg-after') || r === 'pkg-trade/order/index' || r === 'pages/orders/index' || r === 'pkg-trade/agreement/index' ? '01D-2 订单与租后' : '01D-3 账户与留资';
const tagsIn = f => [...new Set([...read(f).matchAll(/<(mk-[\w-]+)\b/g)].map(m => m[1]))].sort();
const pageRows = routes.map(route => {
  for (const ext of ['.js', '.json', '.wxml', '.wxss']) assert.ok(fs.existsSync(path.join(root, route + ext)), route + ext);
  const info = routeInfo.find(x => x.route === '/' + route);
  return { code: info?.code || route, title: info?.title || '', route: '/' + route, batch: group(route), direct_components: tagsIn(path.join(root, route + '.wxml')), current_state_count: 'TO_REBUILD', visual_status: 'NOT_REVIEWED_FOR_NEXT_STAGE' };
});
writeCsv('PAGE_SCOPE.csv', [['页面ID', '标题', '路由', '推广批次', '直接组件', '当前有效状态数', '视觉状态'], ...pageRows.map(p => [p.code, p.title, p.route, p.batch, p.direct_components.join(';'), p.current_state_count, p.visual_status])]);
const components = fs.readdirSync(path.join(root, 'components'), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => {
  const base = 'components/' + e.name + '/index';
  return { component: e.name, base, children: tagsIn(path.join(root, base + '.wxml')), direct_pages: pageRows.filter(p => p.direct_components.includes(e.name)).map(p => p.code), registered_globally: Object.hasOwn(app.usingComponents || {}, e.name), audit_status: 'NOT_VISUALLY_AUDITED' };
});
writeCsv('COMPONENT_SCOPE.csv', [['组件', '源码', '直接页面调用', '子组件', '全局注册', '审计状态'], ...components.map(c => [c.component, c.base, c.direct_pages.join(';'), c.children.join(';'), c.registered_globally, c.audit_status])]);
const sourceFiles = walk(root).filter(f => /\.(js|json|wxml|wxss)$/.test(f));
const sources = sourceFiles.map(f => ({ file: rel(f), text: read(f) }));
const assets = walk(path.join(root, 'assets')).map(f => {
  const relative = rel(f);
  return { file: relative, bytes: fs.statSync(f).size, sha256: hash(f), literal_references: sources.filter(s => s.text.includes(relative)).map(s => s.file), source_review: 'NOT_REVIEWED', note: '无字面引用不能据此判定未使用；动态图标和门店图片路径需人工追踪' };
});
writeCsv('ASSET_SCOPE.csv', [['资源', '字节', 'SHA256', '字面引用文件', '来源核验', '限制'], ...assets.map(a => [a.file, a.bytes, a.sha256, a.literal_references.join(';'), a.source_review, a.note])]);
const hashGroups = Object.values(Object.groupBy(assets, a => a.sha256)).filter(a => a.length > 1).map(a => a.map(x => x.file));
const tokenPath = path.join(root, 'styles/tokens.wxss');
const result = {
  kind: 'STATIC_PLANNING_INVENTORY_NOT_VISUAL_ACCEPTANCE', date_shanghai: '2026-11-20',
  planning_input_commit: git('rev-parse', 'HEAD'), runtime_source_sha: prior.source_sha, runtime_tree: prior.runtime_tree,
  pages: pageRows.length, components: components.length, wxml_templates: sourceFiles.filter(f => f.endsWith('.wxml')).length,
  assets: assets.length, svg_icons: assets.filter(a => a.file.startsWith('assets/icons/') && a.file.endsWith('.svg')).length,
  raster_images: assets.filter(a => /\.(png|webp|jpg|jpeg|gif)$/.test(a.file)).length,
  asset_bytes: assets.reduce((sum, a) => sum + a.bytes, 0), exact_duplicate_groups: hashGroups,
  runtime_tokens: { file: 'styles/tokens.wxss', sha256: hash(tokenPath), declared_variables: [...read(tokenPath).matchAll(/--mk-[\w-]+\s*:/g)].length },
  state_counts: 'REBUILD_FROM_CURRENT_PATHS; legacy 578 is not the new denominator',
  screenshots_for_runtime_source: 'NOT_CAPTURED', visually_audited_pages: 0,
  limitations: ['Counts are file and route inventory, not full 01A audit completion', 'Dynamic references and transitive component callers require review', 'Hashes do not establish image rights or physical store identity', 'No current network retry was performed by this script']
};
fs.writeFileSync(path.join(out, 'BASELINE_INVENTORY.json'), JSON.stringify(result, null, 2) + '\n');
const tasks = [
  ['BASELINE-02','P0','STATIC_PREPARED','无','核对HEAD/运行时树并建立静态清单；更新项目入口','BASELINE_INVENTORY.json;PAGE_SCOPE.csv;COMPONENT_SCOPE.csv;ASSET_SCOPE.csv','与已验证运行时树一致；静态盘点与视觉审计状态分开'],
  ['INV-DENSITY-02A','P1','READY_TO_RECHECK','BASELINE-02','核验当前微信工具连接；同因失败则保存回执并定点排查','tool-status.json;blocker.md','连接及正式AppID可用，或明确当前可复现阻塞；不循环重试'],
  ['INV-DENSITY-02B','P1','WAITING_FOR_TOOL','INV-DENSITY-02A','对S01/S5/S02/QUICK密度候选执行原生双尺寸与关键态检查','screenshots;receipts;G_TECH;G_VIS','关键差额/组合/价格/无库存信息可见；新SHA证据；未测不标PASS'],
  ['VIS-COMPONENT-SYSTEM-01A','P1','STATIC_INPUTS_PREPARED','BASELINE-02','35页22组件审计；动态资源追踪；有效状态重建','AUDIT.md;COMPONENT_IMPACT.csv;ASSET_REVIEW.csv;VALID_STATE_MATRIX.csv','逐项结果有定位；原生未测与来源未核实项明确；不用578充当新分母'],
  ['VIS-COMPONENT-SYSTEM-01B','P2','PLANNED','VIS-COMPONENT-SYSTEM-01A;INV-DENSITY-02B','建立信息层级、图标语义与组件变体/状态约定','COMPONENT_CONTRACT.md;CHANGE_SCOPE.csv','每项变化对应调用方和回归；保留业务硬边界；可审查实施差异'],
  ['VIS-COMPONENT-SYSTEM-01C','P2','PLANNED','VIS-COMPONENT-SYSTEM-01B','最小共享组件试点；H01/CAP/ITEMS/S5/S02与看仓；关联回归S01/QUICK/O01','源码;截图;路径回执;问题与修复记录','G-TECH通过；双尺寸视觉与关键状态完成；未签收单独记录'],
  ['VIS-COMPONENT-SYSTEM-01D-1','P3','PLANNED','VIS-COMPONENT-SYSTEM-01C','推广交易、登录、租期、价格/费用和公共弹层','源码;调用方回归;双尺寸证据','鉴权/价变/不可租与长金额均通过；不变更正式政策'],
  ['VIS-COMPONENT-SYSTEM-01D-2','P3','PLANNED','VIS-COMPONENT-SYSTEM-01D-1','推广订单列表/详情、协议、租后7页','逐页状态结果;源码与证据','订单阶段、续租/退仓/押金/发票状态不回归错误'],
  ['VIS-COMPONENT-SYSTEM-01D-3','P3','PLANNED','VIS-COMPONENT-SYSTEM-01D-2','推广我的、账户与留资服务页','逐页状态结果;源码与证据','PAGE_SCOPE全部页面归属闭合；匿名/登录与线索边界通过'],
  ['VIS-COMPONENT-SYSTEM-01E','P3','PLANNED','VIS-COMPONENT-SYSTEM-01D-3','全站状态与跨页回归；iOS/Android真机；素材来源复核','全站台账;端到端回执;真机记录;来源台账','35页及有效状态清单明确结果；P0关闭；其他遗留可追溯且结论明确'],
  ['VIS-COMPONENT-SYSTEM-01F','P4','PLANNED','VIS-COMPONENT-SYSTEM-01E','冻结候选并整理体验版/归并评审与回滚包','候选包;差异;证据索引;回滚;发布前置清单','候选同源；人工结论明确；实际上传/归并依授权另行执行'],
  ['NATIVE-DATA-PREP-01','并行','PLANNED','BASELINE-02','准备真实库存/鉴权/报价/线索契约及真实素材','接口问题清单;字段映射;资料缺口','建议与已实现端点分开；不阻塞01A；接真实服务前核实业务口径']
];
writeCsv('TASKS.csv', [['任务ID','优先级','当前状态','依赖','工作','交付物','退出标准','执行角色','复核角色'], ...tasks.map(t => [...t,'Codex（当前执行代理）','用户产品/视觉裁定；真实资料由业务或接口负责人核实'])]);
const cases = [
 ['D01','02B','P1','S01','游客；无需求；有库存','浏览标准/紧凑卡','可租容量与起价清晰；标题区最多两个标签位；无全店库存数量主显'],
 ['D02','02B','P1','S01','游客；3.1m³；12个月','浏览推荐行并进入门店','体积/起价/报价行动清晰；泛化用途和另有N个可租不主显'],
 ['D03','02B','P1','S01','已登录；有效需求与租期','浏览正式报价','月均/整期/租期可辨；大金额不遮挡按钮'],
 ['D04','02B','P1','S01','长门店名/地址及两个标签fixture','点门店标题进入S02','布局不横溢；完整资料从既有详情可达；无新增说明卡'],
 ['D05','02B','P0','S5','需求10m³；仅8m³可租fixture','选择接近方案','小2m³始终可见；不伪装足额；行动与现行规则一致'],
 ['D06','02B','P1','S5','3.1m³；有足额与更大仓；游客','对比两个方案','体积/差额可辨；不露正式价差；主次行动明确'],
 ['D07','02B','P1','S5','同上；已登录','查看月租与升级差额','价差与统一报价一致；标签和文案不重复堆叠'],
 ['D08','02B','P0','S5','30m³；仅16+15m³可组合fixture','查看并选择组合','组合为多仓的事实、数量与合计体积明确；不跳强制顾问'],
 ['D09','02B','P1','S5','10m³；仅单个5m³可租fixture','查看无匹配及修改需求','无匹配诚实展示；可修改或咨询，不伪造库存'],
 ['D10','02B','P1','S02','游客；有库存','查看仓位行','仓号/体积/尺寸/面积保留；无泛化用途重复；主按钮不被遮挡'],
 ['D11','02B','P0','S02','需求10m³；8m³接近fixture','查看接近仓与行动','小2m³直接可见；不被标签预算裁掉'],
 ['D12','02B','P1','S02','可组合fixture；有足额与无足额两态','展开/收起组合','各仓编号和组合事实可查；展开位置可发现、无嵌套说明卡堆叠'],
 ['D13','02B','P0','S02','全部不可租fixture','浏览/尝试选择','明确暂无可租；不显示有效可租报价或允许有效下单'],
 ['D14','02B','P1','S02','长地址与服务资料fixture','切服务设施/交通路线','三个同级页签不变；完整地址与服务可达且内容不截断'],
 ['D15','02B','P1','S02','游客；有需求；打开看仓层','输入电话/时间/可选容量；唤起键盘','门店带入；字段/错误/提交按钮可达；安全区与键盘不遮挡'],
 ['D16','02B','P0','S02','看仓提交失败/超时fixture','重试与核对回执','输入保留；同请求不重复线索；成功独立于订阅；不锁仓/下单'],
 ['D17','02B','P1','QUICK','游客；门店未选/已选','打开门店选择层','距离和地址突出；无库存数量串联；长地址可识别并可查完整资料'],
 ['D18','02B','P0','QUICK','门店全部仓位被占用fixture','打开选择层/尝试选仓','暂无可租明确；不显示有效可租起价'],
 ['D19','02B','P0','QUICK','游客；门店/仓位/日期齐全','点击查看报价并完成演示登录','登录后查看整期报价；登录守卫留在QUICK；游客无正式整期金额'],
 ['D20','02B','P1','QUICK','已登录；大整期金额fixture','打开费用明细再关闭','金额/租期/优惠口径一致；按钮不遮挡；已有费用入口可发现'],
 ['D21','02B','P0','QUICK','已选仓位随后不可租fixture','继续下一步','不能生成有效订单；提示更换并保留其他合理输入'],
 ['P01','01C','P1','H01','无订单；未定位/定位拒绝','浏览与选择找仓入口','主任务清晰；定位可手动替代；不新增解释卡占据主行动'],
 ['P02','01C','P1','H01','待支付/在租fixture','查看任务卡与推荐变化','主任务符合订单阶段；不同时重复主任务与推荐行动'],
 ['P03','01C','P0','CAP','输入3.01m³/0.11m³/1.1㎡/200㎡','完成输入并进入匹配','分别按现行归一与上下限；原单位和输入保留；提示不抢改逐字输入'],
 ['P04','01C','P0','CAP','输入30.01m³','继续找仓','继续自助，轻顾问提醒不阻断；不以规则开放为由造库存'],
 ['P05','01C','P1','ITEMS','15m³无大件；>15m³；小容量冰箱三组fixture','估算并继续','OR提醒正确且可继续；无常驻长说明抢占行动'],
 ['P06','01C','P0','S5','分别来自CAP/ITEMS；保存原输入','点击修改并返回','回需求来源且返填；修改后统一需求及报价重算'],
 ['P07','01C','P0','O01','游客直达/登录后会话失效','访问或回到确认订单','不露游客订单内容；按来源登录守卫恢复；无错误生成订单'],
 ['P08','01D-1','P0','O01','已登录；价变/报价过期fixture','继续下单/确认新报价','清楚展示变化与重验；用户确认新报价后继续；UI不另算金额'],
 ['P09','01D-1','P0','O01','演示身份/签署/待支付单','生成演示订单再取消','确认条件齐全；取消释放共享库存；S01/S02/S5/QUICK重读一致'],
 ['P10','01D-1','P1','QUICK','登录失败/拒绝与租期其他输入','操作登录/租期/弹层返回','错误和恢复入口清楚；关闭不丢已有合理选择；无弹层层层叠加'],
 ['R01','01D-2','P0','O03','待支付/支付失败/已取消/已过期fixture','查看详情与可用行动','阶段、截止与行动一致；不能恢复无效支付'],
 ['R02','01D-2','P0','RN01','可续租/退仓中/累计上限fixture','查看续租报价与提交','资格、报价和禁用原因清楚；不新增定价政策'],
 ['R03','01D-2','P0','EX01','提前/到期退仓及处理中fixture','查看结算与提交','金额与费用明细同源；必需确认和错误可见'],
 ['R04','01D-2','P1','DP01','待验仓/退款中/失败/已退还fixture','查看进度与恢复入口','不同阶段可区分；不用颜色单独表达状态'],
 ['R05','01D-2','P1','IV01','开票/失败/已开具fixture','核对抬头/金额/状态','表单、错误、金额和结果可读；隐私信息遵循现行展示'],
 ['R06','01D-3','P1','M01','游客/登录且有订单fixture','浏览账户服务入口','登录状态与主任务一致；分组层级不全部卡片化'],
 ['R07','01D-3','P0','BOOKING','游客手填电话；提交失败/成功fixture','提交预约用仓','独立销售线索；不借手填电话解锁正式报价或创建订单'],
 ['R08','01E','P1','S02','全部目标页面；长内容/系统字体放大','触控/滚动/键盘/安全区与读屏检查','关键内容和行动不遮挡；语义图标名称完整；44逻辑像素触控目标或记录冲突'],
 ['R09','01E','P1','S5','离线/加载/接口失败fixture','查看状态并重试','错误恢复清楚；不显示未知库存为可租；加载不造成关键布局跳动']
];
assert.equal(new Set(cases.map(c => c[0])).size, cases.length);
const lookup = code => { const p = pageRows.find(p => p.code === code); assert.ok(p, 'Unknown page code: ' + code); return p.route; };
writeCsv('ACCEPTANCE_MATRIX.csv', [['场景ID','阶段','优先级','页面ID','入口路由','前置/fixture','操作','验收点','逻辑尺寸','执行状态','证据目录'], ...cases.map(c => [c[0],c[1],c[2],c[3],lookup(c[3]),c[4],c[5],c[6],'375x812;390x844','NOT_RUN','evidence/next-stage-20261120/<任务ID>/<运行时SHA>/'+c[0]])]);
console.log(JSON.stringify({ prepared_tasks: tasks.length, initial_scenarios: cases.length, default_page_checks: pageRows.length, note: 'All new acceptance scenarios are NOT_RUN; per-page valid state matrix still to rebuild' }));
console.log(JSON.stringify(result));
