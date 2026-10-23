from pathlib import Path
import os
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[2]
p=root/'prototype'
qs=root/'qa'/'acceptance_v11'/'patch_d_visual'
qs.mkdir(parents=True,exist_ok=True)
js=(p/'mini_koala_acceptance_v11_layout_patch.js').read_text()
common=(p/'mini_storage_global_support_v274.js').read_text()
support_style=common.split('style.textContent=`',1)[1].split('`;',1)[0]
css=(p/'mini_koala_acceptance_v11_layout_patch.css').read_text()
scenarios={
 'S02':'mini_storage_store_detail_s02_v1_23_self_service_Visual_V2_7_4.html',
 'Q01':'mini_storage_quote_q01_v1_20_self_service_Visual_V2_7_4.html',
 'M01':'mini_storage_mine_m01_v1_11_self_service_Visual_V2_7_4.html',
 'B2B':'mini_storage_business_b2b01_r113_Visual_V2_7_4.html',
 'O03':'mini_storage_order_o03_v1_17_self_service_Visual_V2_7_4.html',
 'CW01':'mini_storage_coupon_wallet_c01_v1.html',
 'RN01':'mini_storage_renew_rn01_v2_7_4.html',
 'T01':'mini_storage_transport_t01_v4_self_service.html'
}
help_markup='''<div id="miniGlobalSupport" class="mini-global-support"><div class="mini-support-actions" id="miniSupportActions"><button id="miniSupportPhone" type="button"><i>☎</i><span>电话</span></button><button id="miniSupportChat" type="button"><i>◉</i><span>客服</span></button></div><button id="miniSupportLauncher" class="mini-support-launcher" type="button"><i>＋</i><span>帮助</span></button></div>'''

def html_for(file):
 soup=BeautifulSoup((p/file).read_text(),'html.parser')
 for script in list(soup.find_all('script')):script.decompose() # no fixtures/network: isolate layout behavior
 for link in list(soup.find_all('link',href=True)):
  if link.get('rel')!=['stylesheet']:continue
  file_css=p/link['href']
  if file_css.is_file():
   st=soup.new_tag('style');st.string=file_css.read_text();link.replace_with(st)
  else:link.decompose()
 st=soup.new_tag('style');st.string=support_style+css;soup.head.append(st)
 sb=BeautifulSoup(help_markup,'html.parser')
 soup.body.append(sb.div)
 script=soup.new_tag('script');script.string="document.getElementById('miniSupportLauncher').onclick=()=>document.getElementById('miniGlobalSupport').classList.toggle('expanded');"+js.replace("const page=(location.pathname||'').split('/').pop().toLowerCase();","const page="+repr(file.lower())+";");soup.body.append(script)
 return str(soup)

def nonoverlap(a,b):
 if not a or not b:return True
 return a['right']<=b['left'] or a['left']>=b['right'] or a['bottom']<=b['top'] or a['top']>=b['bottom']

def getrect(page,sel):
 
 if not page.locator(sel).count():return None
 r=page.locator(sel).first.bounding_box()
 return dict(left=r['x'],right=r['x']+r['width'],top=r['y'],bottom=r['y']+r['height'],width=r['width'],height=r['height']) if r else None

passed=0
with sync_playwright() as playwright:
 browser=playwright.chromium.launch(headless=True,**({'executable_path':os.environ['PLAYWRIGHT_CHROMIUM_EXECUTABLE']} if os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE') else {}),args=['--no-sandbox','--disable-dev-shm-usage'])
 for width in [375,390]:
  for name,file in scenarios.items():
   page=browser.new_page(viewport={'width':width,'height':812 if width==375 else 844},device_scale_factor=1)
   page.set_content(html_for(file),wait_until='load')
   assert page.locator('body.mkd-page').count(),f'{name}: patch not initialized'
   assert not page.locator('#miniGlobalSupport.mkd-inline-support').count(),f'{name}: help should float'
   assert page.locator('#miniSupportLauncher').is_visible()
   assert not page.locator('#miniSupportPhone').is_visible()
   page.locator('#miniSupportLauncher').click()
   assert page.locator('#miniSupportPhone').is_visible() and page.locator('#miniSupportChat').is_visible()
   page.locator('#miniSupportLauncher').click()
   # Rollback keeps original fixed launcher above bottom actions.
   position=page.locator('#miniGlobalSupport').evaluate('(e)=>getComputedStyle(e).position')
   assert position=='fixed',(name,width,position)
   rail=page.locator('#miniGlobalSupport')
   rail.scroll_into_view_if_needed()
   r=getrect(page,'#miniGlobalSupport')
   assert r and r['width']<=width and r['left']>=-1,(name,width,r)
   if page.locator('.bottombar').count():
    b=getrect(page,'.bottombar')
    assert nonoverlap(r,b),f'{name}: service rail overlaps bottom CTA: {r} vs {b}'
   if name in ['S02','Q01']:
    for i in range(page.locator('details.section-collapsible,details.quote-secondary').count()):
     d=page.locator('details.section-collapsible,details.quote-secondary').nth(i)
     em=d.locator('summary em')
     original=d.evaluate('(e)=>e.open')
     assert em.inner_text().startswith('收起' if original else '展开'),f'{name} incorrect initial accordion'
     d.locator('summary').click(force=True)
     assert d.evaluate('(e)=>e.open')!=original,'accordion did not toggle'
     page.wait_for_function("([n,exp]) => document.querySelectorAll('details.section-collapsible,details.quote-secondary')[n].querySelector('summary em').textContent.startsWith(exp)",arg=[i,'展开' if original else '收起'],timeout=2000)
   if name=='CW01':
    # Simulate wallet results appended by original coupon renderer after patch loaded.
    page.evaluate('''() => {document.getElementById('list').innerHTML = `<div class="coupon-card"><div class="coupon-card-top"><div><div class="coupon-card-value">¥200<small>搬运补贴</small></div><div class="coupon-card-name">搬运补贴券</div></div></div><div class="coupon-card-desc">符合条件时适用</div><div class="coupon-card-foot"><span>有效期至10月31日</span></div></div>`;}''')
    page.locator('.mkd-coupon-info').wait_for(timeout=2000)
    assert page.locator('.mkd-coupon-info').inner_text()=='查看使用说明'
    assert not page.locator('.mkd-coupon-explain').is_visible()
    page.locator('.mkd-coupon-info').click()
    assert page.locator('.mkd-coupon-explain').is_visible()
    assert not page.locator('[data-use]').count(),'service voucher must not obtain rent coupon action'
    page.locator('#miniGlobalSupport').scroll_into_view_if_needed()
   if name=='B2B':
    title=page.locator('.hero h1')
    assert title.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),f'B2B title overflow at {width}'
    # Original validation remains; field-level guidance for a bad phone is additive.
    page.locator('#submit').click(force=True)
    assert page.locator('#mkd-error-phone').inner_text()=='请先填写联系电话'
   # Browser-based layout check: reconstructed static DOM, not full app E2E.
   if width==375 and name in ['S02','B2B','CW01']:
    page.screenshot(path=str(qs/f'{name}_375_static.png'))
   print(f'PASS VISUAL-ISOLATED {name} {width} scroll-safe help, target layout/control')
   passed+=1
   page.close()
 browser.close()
print(f'RESULT {passed}/16 isolated browser-DOM visual checks PASS; NOT full runtime E2E')
