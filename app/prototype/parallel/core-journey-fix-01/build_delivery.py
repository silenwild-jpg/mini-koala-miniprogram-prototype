from pathlib import Path
import json,hashlib,html,zipfile,shutil
R=Path(__file__).resolve().parent
P=Path('C:/Users/silence/Documents/Codex/2026-10-26/mini-koala-decisions-apply')
A=R.parent/'CORE_JOURNEY_AUDIT_01_2026-10-26'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
write=lambda p,x:p.write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf-8')
source=read(R/'SOURCE_PROVENANCE.json');assert all(sha(P/n)==h for n,h in source['parent_manifest'].items())
models=read(R/'evidence/model-checks.json');syntax=read(R/'evidence/syntax-checks.json');focused=read(R/'evidence/fix-browser-checks.json');base=read(R/'evidence/base-browser-checks.json')
assert all(x['exit_code']==0 for x in models+syntax)
assert all(x['result']=='PASS' for x in focused['results']) and not focused['errors']
assert all(x['status']=='PASS' for x in base['results']) and not base['errors']
allowed={'demo-core.js','account.js','business-bridge.js','business-adapter.css','br04/bridge.js','br04/adapter.css','index.html','home-bridge.js'}
changed=[];assets=[]
for p in (P/'demo').rglob('*'):
 if not p.is_file():continue
 name=str(p.relative_to(P/'demo')).replace('\\','/')
 if name.startswith('prior-stage-records/') or p.name in {'README.md','START_DEMO.cmd','serve_demo.py'}:continue
 target=R/'demo'/name;assert target.is_file(),name
 if sha(p)!=sha(target):
  assert name in allowed,name
  changed.append({'file':name,'before':sha(p),'after':sha(target)})
 if 'assets' in p.relative_to(P/'demo').parts:
  assert sha(p)==sha(target),name
  assets.append(name)
assert sha(P/'demo/fixtures.js')==sha(R/'demo/fixtures.js')
write(R/'CHANGES.json',{'version':'CORE_JOURNEY_FIX_01_20261026','fixed':['F01','F02','F03'],'modified_parent_runtime_files':changed,'protected_asset_files_unchanged':len(assets),'fixture_unchanged':True,'new_runtime_paths':[]})
write(R/'evidence/source-preservation.json',{'parent_manifest_unchanged':True,'parent_entries':len(source['parent_manifest']),'asset_files_unchanged':len(assets),'beijing30_fixture_unchanged':True,'runtime_change_whitelist':sorted(allowed)})
for n in ['35-estore-advisor-form.png','19-renewal-input-changed-old-quote.png','20-renewal-paid-for-old-six-months.png','29-enterprise-lead-unsent-receipt.png','31-enterprise-second-receipt-top.png']:
 folder=R/'evidence/before';folder.mkdir(exist_ok=True);shutil.copy2(A/'evidence'/n,folder/n)
verification={'version':'CORE_JOURNEY_FIX_01_20261026','date':'2026-10-26','scope':['F01 address layout','F02 renewal quote binding','F03 enterprise updates'],'model_groups':sum(x['summary']['groups'] for x in models),'model_result':'PASS','syntax_checks':len(syntax),'focused_browser_checks':len(focused['results']),'base_browser_checks':len(base['results']),'browser_checks':len(focused['results'])+len(base['results']),'browser_result':'PASS','browser_kind':'isolated headless Chrome','layouts':focused['measurements'],'parent_unchanged':True,'asset_files_unchanged':len(assets),'fixture_unchanged':True,'beijing_stores':30,'beijing_units':120,'remaining':['F04 return to current order','F05 stage actions/use state semantics','F06 duplicate inventory toast','F07 visual consistency','D25 unmatched recovery strategy','D38 enterprise capacity-band strategy','real backend integrations and full accessibility acceptance'],'release_gate':'HOLD'}
write(R/'VERIFICATION.json',verification)
rows=[
 {'id':'F01','title':'地址框恢复为独立完整一行','result':'复查通过','detail':'地址、定位和联系电话分行；375/390宽度下地址框分别约324/337px，不再是18/19px。只填地址仍能提交，E存和个人预约共用同一修复。','criteria':['地址可见、可读、可编辑','地址是唯一必填','未新增门店/仓位绑定，需求继承有效'],'before':['35-estore-advisor-form.png'],'after':['F01-address-375.png','F01-address-390.png','F01-estore-corrected.png']},
 {'id':'F02','title':'修改续租月份使旧报价失效','result':'复查通过','detail':'核价后保留月份；6改12立即清除旧金额并停用付款。重新核价后显示本次月份、旧/新到期日，付款入口和引擎再次核对月份、金额、报价有效期。12个月付款记录与当前到期日一致。','criteria':['不再把6个月旧报价用于12个月输入','空值、无效月份、过期和篡改金额不能付款','付款完成显示12个月记录、累计18个月和新到期日'],'before':['19-renewal-input-changed-old-quote.png','20-renewal-paid-for-old-six-months.png'],'after':['F02-changed-twelve-stale-removed.png','F02-twelve-confirmation.png','F02-twelve-paid.png']},
 {'id':'F03','title':'企业补充资料更新同一需求','result':'复查通过','detail':'初次保存后固定需求ID；继续补充、连续保存、刷新和从我的需求重新打开均更新原记录。只有明确点击新建企业需求才创建第二个ID；不存在或已撤回的需求不能被更新复活。','criteria':['补充保存不增加记录数','刷新保留正在补充的内容与编号','明确新建才产生另一记录'],'before':['29-enterprise-lead-unsent-receipt.png','31-enterprise-second-receipt-top.png'],'after':['F03-same-id-updated.png','F03-explicit-new-record.png']}
]
write(R/'FIX_RESULTS.json',rows)
explanation='''# 核心链路修复版

版本：CORE-JOURNEY-FIX-01，2026-10-26。

本批修复独立评估中的F01、F02、F03，逐项复查通过。新版首页： http://127.0.0.1:4230/demo/home.html ，修复对照： http://127.0.0.1:4230/fix.html 。双击根目录START_FIX.cmd启动；根目录fix.html可离线查看截图和说明。

## 修复结果

'''
for row in rows:explanation+=f"### {row['id']} · {row['title']}\n\n{row['detail']}\n\n验收："+'；'.join(row['criteria'])+'。\n\n'
explanation+=f'''## 如何查看

- 地址：从首页“预约订单→预约用仓”，或推荐页“考拉E存→联系顾问”进入。
- 续租：我的→内部预览设置→载入“租赁中”样本→续租。先核价6个月，再改12个月，付款会停用；重新核价后可按12个月确认。载入样本会明确提示重置当前本地记录。
- 企业：首次保存后关闭回执继续补充，再保存仍是原编号。“我的需求→补充企业资料”可打开同一记录；“新建企业需求”才另建。

## 检查结果

{verification['model_groups']}组业务模型检查、{verification['browser_checks']}项页面检查（14项针对性检查和23项原有链路复查）通过；{len(syntax)}项语法检查通过。地址填写分别在375×812和390×844验证。截图是独立无头Chrome，未操作用户原有应用内标签页。

补充检查覆盖：6改12、清空/无效月份、付款二次月份核对、报价过期/金额篡改、重复付款、企业记录刷新/连续保存/新建区分、未知/撤回ID、已保存三位小数容量不丢失。首次表单刷新检查发生在界面初始化之前，已等待表单就绪后重新完整通过；失败诊断截图不作为通过证据。

## 范围与保留项

父交付204项校验一致，旧评估和旧演示保留。原有图片资源、北京30店120仓配置及业务价格授权规则保持原值；本批只修改三项错误相关运行文件与版本标签。所有源修改列在CHANGES.json。

F04返回原订单、F05阶段动作与入仓语义、F06重复库存浮动提示、F07视觉一致性尚未处理。D25无匹配恢复、D38企业容量区间继续待你裁定。真实微信、支付、库存、门禁、顾问通知、开票及完整真机/读屏/缩放验收未接入；Release Gate保持HOLD，不能把本批通过理解为整体上线验收。

到期日期按起租日顺延累计已付款月份显示；遇目标月缺少同一日则取当月最后一天，保持起租日周年锚点。这是当前原型的日期推演，正式合同日期和退租结算规则仍需业务签收，不据此处理真实资金。

新旧截图为不同的独立测试会话，样本编号和起租日期可能不同；对照的是输入、报价、付款记录和记录数量是否一致，不是逐像素视觉还原。当前测试活动仅保存本地状态，没有真实交易或发送行为。未创建Git提交、推送、合并或更新PR。
'''
(R/'修复交付与复查说明.md').write_text(explanation,encoding='utf-8')
esc=html.escape;cards=''
for row in rows:
 cards+=f'<section id="{row["id"]}"><p class="tag">{row["id"]} · {row["result"]}</p><h2>{esc(row["title"])}</h2><p>{esc(row["detail"])}</p><h3>修复前 · 上轮独立评估截图</h3><div class="shots">'+''.join(f'<a href="evidence/before/{n}" target="_blank"><img src="evidence/before/{n}" alt="修复前 {row["id"]}"></a>' for n in row['before'])+'</div><h3>修复后 · 本轮复查截图</h3><div class="shots">'+''.join(f'<a href="evidence/{n}" target="_blank"><img src="evidence/{n}" alt="修复后 {row["id"]}"></a>' for n in row['after'])+'</div></section>'
report='''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>三项核心问题修复复查 · 迷你考拉</title><style>body{font:15px/1.7 system-ui;color:#193d2d;background:#eff4ee;max-width:1200px;margin:24px auto;padding:0 16px}a{color:#006b50}h1{font-size:28px}h2{font-size:22px}header,section,details{background:white;border:1px solid #d9e6dc;border-radius:14px;padding:22px;margin:20px 0}.links{display:flex;gap:12px;flex-wrap:wrap}.links a{padding:10px;border:1px solid #bbd5c3;border-radius:8px;text-decoration:none}.tag{display:inline-block;padding:4px 10px;border-radius:6px;background:#e7f4e9;color:#006b50}.shots{display:flex;gap:18px;align-items:start;flex-wrap:wrap}.shots img{display:block;max-width:100%;width:260px;max-height:650px;object-fit:contain;object-position:top;border:1px solid #e1e8e1}.shots a{max-width:100%}.muted{font-size:13px;color:#65796b}h3{font-size:16px}</style></head><body><header><p class="muted">CORE-JOURNEY-FIX-01 · 2026-10-26</p><h1>三项核心问题已修复并复查</h1><p>地址完整一行；续租修改月份后重新核价；企业补充更新原编号。</p><p><b>94组业务检查 · 37项页面检查通过</b></p><div class="links"><a href="demo/home.html">打开新版首页</a><a href="demo/business.html">企业需求</a><a href="demo/account.html">个人中心与续租样本</a><a href="修复交付与复查说明.md">完整交付说明</a></div></header><details><summary>体验方法与尚待处理事项</summary><p>地址：预约订单→预约用仓，或推荐页→考拉E存→联系顾问。续租：我的→内部预览设置载入租赁中样本→续租。企业：保存后继续补充资料，编号保持不变；点击新建企业需求才另建。</p><p>保留待处理：F04返回原订单、F05阶段动作、F06库存提示重复、F07视觉一致性；D25/D38仍待裁定。真实后台与真机/读屏验收未接入，Release Gate HOLD。</p><p>到期日期按累计月份顺延、月末取目标月末，仅为当前原型的日期推演，正式合同口径仍需签收。新旧截图来自不同独立会话，不比较样本编号或起租日相等。</p></details>'''+cards+'''<p class="muted">仅本地演示复查；没有真实付款、发送资料或修改旧版本。</p></body></html>'''
(R/'fix.html').write_text(report,encoding='utf-8')
(R/'README.md').write_text('双击START_FIX.cmd启动修复版。首页/demo/home.html；修复对照/fix.html。完整说明见“修复交付与复查说明.md”。\n',encoding='utf-8')
(R/'START_FIX.cmd').write_text('@echo off\r\nchcp 65001 >nul\r\ncd /d "%~dp0"\r\nset "KOALA_PYTHON=%USERPROFILE%\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe"\r\nif exist "%KOALA_PYTHON%" (\r\n "%KOALA_PYTHON%" serve.py\r\n) else (\r\n py -3 serve.py\r\n)\r\nif errorlevel 1 pause\r\n',encoding='utf-8')
(R/'demo/README.md').write_text('当前为CORE-JOURNEY-FIX-01修复候选版。请从上级目录START_FIX.cmd启动，版本范围及复查结果位于上级目录。\n',encoding='utf-8')
(R/'demo/START_DEMO.cmd').write_text('@echo off\r\ncd /d "%~dp0.."\r\ncall START_FIX.cmd\r\n',encoding='utf-8')
(R/'demo/serve_demo.py').write_text("from pathlib import Path\nimport runpy\nrunpy.run_path(str(Path(__file__).resolve().parent.parent/'serve.py'),run_name='__main__')\n",encoding='utf-8')
print(json.dumps({'models':verification['model_groups'],'browser_checks':verification['browser_checks'],'syntax':len(syntax),'changed_runtime_files':len(changed),'protected_assets':len(assets),'layouts':[(x['width'],round(x['address']['width'],1)) for x in focused['measurements']]},ensure_ascii=False))
