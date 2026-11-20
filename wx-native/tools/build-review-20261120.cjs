const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const native=path.join(__dirname,'..'),project=path.join(native,'miniprogram'),out=path.join(native,'docs/implementation-20261120');
const sha=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:native,encoding:'utf8'}).trim();
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=walk(project).filter(f=>!f.includes('project.private.config.json'));
let errors=[],jsCount=0;
for(const f of files) {
 if(f.endsWith('.js')) {jsCount++;try {new (require('vm').Script)(fs.readFileSync(f,'utf8'),{filename:f});}catch(e){errors.push(e.message);}}
 if(f.endsWith('.json')) {try{JSON.parse(fs.readFileSync(f,'utf8'));}catch(e){errors.push(e.message);}}
 if(f.endsWith('.wxml')) {
  const s=fs.readFileSync(f,'utf8');for(const m of s.matchAll(/src="(\/assets\/[^"{]+)"/g)) if(!fs.existsSync(path.join(project,m[1])))errors.push('Missing asset '+m[1]);
 }
}
const manifest=Object.fromEntries(files.map(f=>[path.relative(project,f).replaceAll('\\','/'),crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
fs.writeFileSync(path.join(native,'evidence/20261120/source-manifest.json'),JSON.stringify({source_sha:sha,files:manifest},null,2));
fs.writeFileSync(path.join(native,'evidence/20261120/static-result.json'),JSON.stringify({source_sha:sha,js_files:jsCount,total_files:files.length,total_bytes:files.reduce((n,f)=>n+fs.statSync(f).size,0),errors},null,2));
if(errors.length)throw Error(errors.join('\n'));
const routes=require(path.join(project,'services/routes')).TABLE;
const captured={HOME:'home',CAPACITY:'cap-normal;cap-large',MATCH:'match-normal;match-large',STORE_DETAIL:'store;visit',QUICK:'quick',CONFIRM:'confirm'};
const csv=rows=>rows.map(r=>r.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(',')).join('\n')+'\n';
fs.writeFileSync(path.join(out,'STATE_MATRIX.csv'),csv([['页面','路由','源码SHA','Node全页冒烟','原生核心路径','原生375/390截图','人工视觉签收'],...routes.map(r=>[r.name,r.route,sha,'见smoke-pages.txt',captured[r.name]?'有覆盖；仅实际执行路径':'NOT_RUN',captured[r.name]||'NOT_CAPTURED','NOT_SIGNED'])]));
const map={
 1:['pkg-trade/confirm;services/mock-adapter','Node+原生取消路径'],2:['components/mk-demand-sheet;pages/match','Node路由；原生返回手势待真机'],3:['pkg-lead/booking','Node；成功不等订阅'],4:['components/mk-store-card','双尺寸原生截图；人工签收待定'],5:['pages/store/detail','原生截图；覆盖式导航与全状态视觉仍待验收'],6:['pages/match;services/state','Node+原生修改路径'],7:['components/mk-task-card','Node三状态；首页原生截图'],8:['pkg-trade/confirm;services/auth','Node会话失效+原生登录守卫'],9:['pages;components','核心页双尺寸；全35页逐状态未签收'],10:['services/order-view','Node赠送条件'],11:['core/config;core/requirement','Node边界'],12:['mock/specials;core/pricing','Node金额与分配'],13:['pkg-after/renew','Node续租及全页冒烟'],14:['components/mk-advisor-card;pages/estimate','原生窄提醒；不中断主任务'],15:['core/requirement','Node精度/上下限+原生输入'],16:['pkg-estimate/items;core/requirement','Node OR与冰箱漏报回归；真实客服未验收'],17:['pkg-estimate/items;i18n/find','Node目录；长件点击原生模板已编译'],18:['i18n/find','建议摘要'],19:['services/finder;pages/match','原生需求条截图'],20:['components/mk-visit-sheet;services/mock-ext/lead','Node幂等/失败+原生提交/截图'],21:['components/mk-store-card','地址左侧距离；原生截图'],22:['i18n/lead;pages/estimate','大容量建议顾问文案；10分钟服务承诺未生产核实'],23:['i18n/find;pages/store/detail','无匹配文案与contact入口；客服账号能力未验收'],24:['pages/match;services/finder','原生截图+Node排序'],25:['services/finder;components/mk-store-card','Node精简与差额；原生截图'],26:['pages/match;components/mk-demand-sheet','Node；S5回来源替代弹层'],27:['core/matching;services/finder','Node80%与浮点边界'],28:['i18n/find;i18n/zh;services/auth','Node+原生登录'],29:['pages/estimate/capacity','Node单位快捷项+原生截图'],30:['core/matching;services/finder','Node+原生30.1m³推荐'],31:['pkg-trade/quick','原生选齐未登录截图与登录路径'],32:['components/mk-login-sheet','原生失败转短信；受控演示事件'],33:['pkg-trade/confirm;i18n/trade','Node四行核对+原生取消'],34:['core/lead;pkg-lead/business','Node48m³自助路径'],35:['services/auth;pkg-trade/quick','Node QUICK来源守卫'],36:['pkg-lead/booking','Node手填电话，不改变登录'],37:['docs/implementation-20261120','规则/代码交叉检查；冻结Web不冒充更新'],38:['assets/images;mock/media','来源图片+SHA，缺专属图用通用示意'],39:['i18n/find;i18n/lead;pages/match','已精简所列页面；其他文案保留既有语义'],40:['docs/implementation-20261120','本报告是原生候选交叉评审；全状态视觉/真机未签收']};
const rows=[['规则ID','源码定位（miniprogram相对路径）','验收范围与限制','实现阶段','源码SHA']];
for(let i=1;i<=40;i++)rows.push(['NR-'+String(i).padStart(2,'0'),map[i][0],map[i][1],[9,37,39,40].includes(i)?'部分完成；按列示范围验收':'已实现候选；原生能力见限制',sha]);
fs.writeFileSync(path.join(out,'CHANGE_MATRIX.csv'),csv(rows));
console.log(JSON.stringify({source_sha:sha,pages:routes.length,files:files.length,js_files:jsCount,static_errors:errors.length}));
