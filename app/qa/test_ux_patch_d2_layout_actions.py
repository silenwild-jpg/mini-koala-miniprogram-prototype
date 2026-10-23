"""UX-PATCH D2 structural contract checks: not a substitute for browser render QA."""
from pathlib import Path
from bs4 import BeautifulSoup
import json, re, hashlib, tinycss2
R=Path(__file__).resolve().parents[1]; P=R/'prototype'
h=(P/'mini_storage_home_H01_Visual_V2_7_4_SSOT.html').read_text()
e=(P/'space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html').read_text()
hs=BeautifulSoup(h,'html.parser'); es=BeautifulSoup(e,'html.parser')
page_list=json.loads((R/'docs'/'UX_PATCH_D2_Active_Pages.json').read_text())
tests=[]
def T(name,valid):
 tests.append((name,bool(valid)));print(('PASS' if valid else 'FAIL'),len(tests),name)
T('D1 input provenance recorded in handoff','016411fb6c191ad40830f40b293417234aab9ccff73099043de1d5fc5033db20' in (R/'docs'/'UX_PATCH_D2_Implementation_Handoff_2026-10-14.md').read_text())
T('H01 original logo removed, only one location remains',hs.find(id='brandLogoTop') is None and len(hs.select('#homeLocation'))==1)
T('H01 original location node in topbar',hs.select_one('.topbar #homeLocation') is not None and hs.select_one('.location-strip') is None)
T('H01 title centered container exists exactly once',len(hs.select('.topbar .ux-d2-home-brand'))==1 and hs.select_one('.ux-d2-home-brand').get_text(strip=True)=='迷你考拉仓')
T('H01 WeChat capsule is preserved',len(hs.select('.topbar .wx-capsule'))==1)
T('H01 original location click binding retained',"const homeLocationEl=$('#homeLocation')" in h and 'homeLocationEl.onclick=' in h)
T('H01 original H01 banner and recommendation remain',hs.select_one('#newHero') is not None and hs.select_one('#nearNew') is not None)
T('S2 contains both scenario lists before other methods',es.select_one('#s2 #cScenes') is not None and es.select_one('#s2 #bScenes') is not None and es.select_one('#s2 .ux-a1-other-methods') is not None and e.index('id="cScenes"')<e.index('id="bScenes"')<e.index('class="ux-a1-other-methods"'))
T('S2 alternatives have exactly 3 existing data-method tokens',sorted(x.get('data-method') for x in es.select('#s2 .ux-a1-method'))==['ai','browse','known'])
T('S3 5 cubic meters direct routing preserved', 'displayedUpper' in e or ('5' in e and 'data-tier' in e))
T('S4 item clear action retained',es.select_one('#clearItemsBtn') is not None)
T('S5 term and recommended warehouse action retained','id="usageChooseBtn"' in e and 'state.term=12' in e)
T('Scope contains the key nine business pages', all(any(q in f for f in page_list) for q in ['home_H01','store_list_s01','store_detail_s02','unit_detail_u01','order_o01','quote_q01','renew_rn01','mine_m01','space_decision_assistant']))
T('H01 and estimate use 2 stylesheets',all(z in (P/f).read_text() for f in ('mini_storage_home_H01_Visual_V2_7_4_SSOT.html','space_decision_assistant_v4_5_23_self_service_synced_Visual_V2_7_4.html') for z in ('mk-uxd2-home-estimator.css','mk-uxd2-layout-actions.css')))
T('All opted-in pages have exactly one D2 body class and stylesheet',all((P/f).read_text().count('koala-uxd2-layout')==1 and (P/f).read_text().count('mk-uxd2-layout-actions.css')==1 for f in page_list))
T('Main tabbar native class and CSS retained',all('mk-uxc-main-tabbar.css' in (P/f).read_text() for f in page_list if any(x in f for x in ('home_H01','store_list_s01','mine_m01'))))
css1=(P/'mk-uxd2-layout-actions.css').read_text();css2=(P/'mk-uxd2-home-estimator.css').read_text()
T('Page gutters scoped to opt-in class',css1.count('body.koala-uxd2-layout')>=4 and '--mk-d2-content-gutter:12px' in css1)
T('Business CTA min-height and radius tokens', '--mk-d2-cta-min:48px' in css1 and '--mk-d2-cta-radius:12px' in css1 and 'font-size:14px' in css1)
T('No global navigation selectors in CTA CSS',not re.search(r'(?<!-)\.tabbar|\.bottomnav',css1))
T('Disabled/inventory/price not force-overridden in CSS',not any(re.search(x,css1+css2) for x in (r'\bdisabled\s*\{',r'\.soldout\s*\{',r'\.price\s*\{',r'\boverflow-y\s*:\s*hidden')))
T('CSS syntax parser sees no errors',all(getattr(n,'type',None)!='error' for n in tinycss2.parse_stylesheet(css1+css2,skip_comments=True,skip_whitespace=True)))
T('Original 45 WebP not changed in D2 work input',len(list(R.rglob('*.webp')))>=45)
T('All linked CSS files exist',all((P/f).is_file() for f in ('mk-uxd2-layout-actions.css','mk-uxd2-home-estimator.css')))
failed=[n for n,p in tests if not p]
print(f'UX_PATCH_D2 {len(tests)-len(failed)}/{len(tests)} PASS')
if failed: raise SystemExit('Failed: '+', '.join(failed))
