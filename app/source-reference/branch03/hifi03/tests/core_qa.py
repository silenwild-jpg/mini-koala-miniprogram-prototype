"""Real Chromium visual and click QA with inline self-contained fixture.
Navigation via http/file/data is blocked by administrator in this runtime.
This harness injects the EXACT local prototype CSS+JS into about:blank.
Image assets are embedded as data: URIs; the app itself remains untouched.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64,json,html as htmlutils,hashlib,traceback

BASE=Path(__file__).resolve().parents[1]
SRC=BASE/'isolated'
E=BASE/'evidence'/'core_qa'
E.mkdir(exist_ok=True)
IMAGES={p.name: 'data:image/jpeg;base64,'+base64.b64encode(p.read_bytes()).decode() for p in (SRC/'assets').glob('*.jpg')}
css=(SRC/'styles.css').read_text('utf8')
js=(SRC/'app.js').read_text('utf8')
assert "(()=>{'use strict';" in js
js=js.replace("(()=>{'use strict';", "(()=>{'use strict';\nconst IMGDATA="+json.dumps(IMAGES)+";")
for before,after in (
    ('assets/${s.photo}','${IMGDATA[s.photo]}'),
    ('assets/${u.photo}','${IMGDATA[u.photo]}'),
    ('assets/${imgs[state.gallery%imgs.length]}','${IMGDATA[imgs[state.gallery%imgs.length]]}'),
    ('assets/unit_medium.jpg',"${IMGDATA['unit_medium.jpg']}"),
):
    js=js.replace(before,after)
markup=(SRC/'index.html').read_text('utf8')
markup=markup.replace('<link rel="stylesheet" href="styles.css">','<style>'+css+'</style>')
markup=markup.replace('<script src="app.js"></script>','<script>'+js+'</script>')
# about:blank is an opaque origin: use test-only storage polyfills before booting the same application code.
storage_shim="""<script>(function(){const slots={};function store(ns){const db=slots[ns]={};return {getItem:k=>Object.prototype.hasOwnProperty.call(db,k)?db[k]:null,setItem:(k,v)=>db[k]=String(v),removeItem:k=>delete db[k],clear:()=>Object.keys(db).forEach(k=>delete db[k])}}Object.defineProperty(window,'sessionStorage',{value:store('session'),configurable:true});Object.defineProperty(window,'localStorage',{value:store('local'),configurable:true})})()</script>"""
markup=markup.replace('<script>'+js+'</script>',storage_shim+'<script>'+js+'</script>')
(E/'inline_fixture_for_chromium_qa.html').write_text(markup,'utf8')
results=[]

def run(name,fn):
    try:
        detail=fn()
        if detail is False:raise AssertionError('Assertion evaluated false')
        results.append({'check':name,'status':'PASS'})
        return True
    except Exception as e:
        results.append({'check':name,'status':'FAIL','error':str(e)[:400]})
        return False

def verify(expr):
    assert expr

def section(page,selector):
    return page.locator(selector)

def bbox(q):
    b=q.bounding_box()
    if not b: raise AssertionError('not visible')
    return b

def image_stable(page):
    return page.evaluate('''()=>[...document.querySelectorAll('img')].every(x=>x.complete&&x.naturalWidth>0)''')

def overflow_report(page):
    return page.evaluate('''() => {
      const sels=['.app-shell','.topline','.demand','.store-row','.store-info','.address','.store-pricing','.tags','.matchline','.bottom-nav','.detail-main','.detail-head','.detail-addr','.tabs','.unit-filter','.unit-row','.unit-card-inner','.unit-bottom'];
      let issues=[];
      for (const sel of sels) for (const el of document.querySelectorAll(sel)) {
        const diff=el.scrollWidth-el.clientWidth;
        if(diff>3) issues.push({selector:sel,excess:diff,text:el.textContent.slice(0,50)});
      }
      return {issues,horizontal:document.documentElement.scrollWidth-window.innerWidth};
    }''')

def check_return_scroll(page):
    page.evaluate("document.querySelector('#scroll01').scrollTop=130")
    page.wait_for_timeout(50)
    before=page.evaluate("document.querySelector('#scroll01').scrollTop")
    page.locator('.store-row').nth(1).click()
    page.locator('[data-action="back"]').click()
    page.wait_for_timeout(80)
    after=page.evaluate("document.querySelector('#scroll01').scrollTop")
    verify(abs(after-before)<=2)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    for width,height in [(375,812),(390,844)]:
        page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=2,is_mobile=True,has_touch=True)
        errors=[]
        page.on('pageerror', lambda e:errors.append(str(e)))
        page.set_default_timeout(4000)
        page.set_content(markup,wait_until='load',timeout=15000)
        page.wait_for_timeout(100)
        prefix=f'{width}x{height}'
        def shot(label):page.screenshot(path=str(E/f'{prefix}_{label}@2x.png'))
        shot('S01_main')
        run(prefix+' S01 four stores',lambda:verify(section(page,'.store-row').count()==4))
        run(prefix+' S01 original service tags preserved',lambda:verify(all(row.locator('.tags .tag').count()==3 for row in section(page,'.store-row').all())))
        run(prefix+' S01 match counts plus term rent',lambda:verify(section(page,'.matchline').count()==4 and '6个月整期租金起' in section(page,'.store-pricing').first.inner_text()))
        run(prefix+' S01 all photos loaded',lambda:verify(image_stable(page)))
        run(prefix+' S01 no clipping',lambda:verify(overflow_report(page)['horizontal']<=0 and len(overflow_report(page)['issues'])==0))
        run(prefix+' S01 sort distance',lambda:(section(page,'[data-action="setSort"]').click(),verify(page.evaluate("BRANCH03_DEMO.getState().sort==='距离'"))))
        run(prefix+' S01 search static',lambda:(section(page,'#search-input').fill('徐汇'),verify(section(page,'.store-row').count()==1)))
        shot('S01_search')
        section(page,'#search-input').fill('')
        run(prefix+' S01 filter drawer',lambda:(section(page,'[data-action="filter"]').click(),verify(section(page,'[role="dialog"]').is_visible())))
        shot('S01_filter_drawer')
        section(page,'[data-action="close"]').last.click()
        run(prefix+' S01 return scroll',lambda:check_return_scroll(page))
        # Start a new detail flow
        section(page,'.store-row').first.click()
        shot('S02_main')
        run(prefix+' S02 three navigation tabs',lambda:verify(section(page,'.tabs .tab').count()==3))
        run(prefix+' S02 five types',lambda:verify(section(page,'.unit-filter .chip').count()==5))
        run(prefix+' S02 clean hero photo',lambda:verify(image_stable(page) and page.evaluate('document.querySelector(".hero img").currentSrc.includes("data:image/")')))
        run(prefix+' S02 no clipping',lambda:verify(overflow_report(page)['horizontal']<=0 and not overflow_report(page)['issues']))
        run(prefix+' S02 favorite toggle',lambda:(section(page,'[data-action="favorite"][data-val="A-102"]').click(),verify(page.evaluate("BRANCH03_DEMO.getState().favorites.includes('A-102')"))))
        run(prefix+' S02 medium type filter',lambda:(section(page,'[data-action="category"][data-val="中型仓"]').click(),verify(section(page,'.unit-row').count()==1)))
        shot('S02_medium')
        run(prefix+' S02 mini type filter',lambda:(section(page,'[data-action="category"][data-val="迷你仓"]').click(),verify('M-101' in section(page,'.unit-row').first.inner_text())))
        shot('S02_mini')
        section(page,'[data-action="category"][data-val="全部"]').click()
        run(prefix+' S02 reviews tab',lambda:(section(page,'[data-action="detailTab"][data-val="用户评价"]').click(),verify(section(page,'.review-row').count()==2)))
        shot('S02_reviews')
        run(prefix+' S02 facilities tab',lambda:(section(page,'[data-action="detailTab"][data-val="服务设施"]').click(),verify(section(page,'.facility-item').count()==6)))
        section(page,'[data-action="detailTab"][data-val="可选仓位"]').click()
        run(prefix+' S02 external nav intent',lambda:(section(page,'[data-action="externalNav"]').click(),verify(page.get_by_role('dialog',name='外部地图导航').is_visible())))
        section(page,'[data-action="close"]').last.click()
        run(prefix+' S02 individual O01 intent',lambda:(section(page,'[data-action="order"][data-val="A-102"]').click(),verify(page.get_by_role('dialog',name='O01 下单意图交接').is_visible()),verify(page.evaluate("JSON.parse(sessionStorage.getItem('mini_koala_branch03_order_intent')).unit_id==='A-102'"))))
        shot('S02_order_intent')
        section(page,'[data-action="close"]').last.click()
        run(prefix+' S02 combo ready',lambda:(section(page,'[data-action="combo"]').last.click(),verify(section(page,'.unit-row').count()==2)))
        shot('S02_combo')
        run(prefix+' S02 combo O01 intent',lambda:(section(page,'[data-action="order"][data-val="combo-01"]').click(),verify(page.evaluate("JSON.parse(sessionStorage.getItem('mini_koala_branch03_order_intent')).units.length===2"))))
        section(page,'[data-action="close"]').last.click()
        # return to single-unit mode before checking its no-term gate
        section(page,'[data-action="combo"]').last.click()
        page.evaluate("BRANCH03_DEMO.showScenario('noTerm')")
        run(prefix+' S02 no-term gate',lambda:(section(page,'[data-action="order"][data-val="A-102"]').click(),verify(page.get_by_role('dialog',name='选择租期').is_visible())))
        shot('S02_term_gate')
        run(prefix+' S02 term confirms intent',lambda:(section(page,'[data-action="confirmTerm"][data-val="12"]').click(),verify(page.get_by_role('dialog',name='O01 下单意图交接').is_visible())))
        section(page,'[data-action="close"]').last.click()
        page.evaluate("BRANCH03_DEMO.showScenario('noMatch')")
        run(prefix+' S02 no match empty',lambda:verify(section(page,'.empty-units').is_visible()))
        shot('S02_no_match')
        run(prefix+' S02 no-map and no-compare UI',lambda:verify(('地图模式' not in page.locator('body').inner_text()) and ('加入对比' not in page.locator('body').inner_text())))
        # Other relevant static/interaction states, without altering the delivered app.
        page.evaluate("document.querySelector('[data-qa=reset]').click()")
        page.evaluate("BRANCH03_DEMO.showScenario('noDemand')")
        run(prefix+' S01 no-demand month reference',lambda:verify(section(page,'.matchline').count()==0 and '/月参考' in section(page,'.store-pricing').first.inner_text()))
        shot('S01_no_demand')
        page.evaluate("document.querySelector('[data-qa=reset]').click()")
        page.evaluate("document.querySelectorAll('.matchline')[0].lastChild.textContent=' 匹配仓位 128 个'")
        run(prefix+' S01 128-count layout stress',lambda:verify(not overflow_report(page)['issues'] and section(page,'.matchline').first.bounding_box()['width']<section(page,'.store-info').first.bounding_box()['width']))
        shot('S01_match_count_stress')
        section(page,'.store-row').first.click()
        run(prefix+' S02 lightweight U01 preview',lambda:(section(page,'.unit-img').first.click(),verify(page.get_by_role('dialog',name='仓位详情（预览）').is_visible())))
        section(page,'[data-action="close"]').last.click()
        page.evaluate("document.querySelector('[data-qa=soldout]').click()")
        run(prefix+' S02 soldout disables booking',lambda:verify(section(page,'.unit-row button.order-button:not([disabled])').count()==0))
        shot('S02_soldout')
        page.evaluate("document.querySelector('[data-qa=reset]').click()")
        section(page,'.store-row').first.click()
        run(prefix+' S02 booking leads to intent',lambda:(section(page,'[data-action="booking"]').click(),section(page,'[data-action="submitBooking"]').click(),verify(page.evaluate("JSON.parse(sessionStorage.getItem('mini_koala_branch03_booking_intent')).type==='BOOKING_LEAD_INTENT'"))))
        run(prefix+' no JS runtime errors',lambda:verify(not errors))
        results.append({'check':prefix+' screenshots geometry','status':'INFO','detail':{'viewport':page.viewport_size,'S02':overflow_report(page)}})
        page.close()
    browser.close()
(E/'test_results.json').write_text(json.dumps({'total':sum(x['status'] in ['PASS','FAIL'] for x in results),'pass':sum(x['status']=='PASS' for x in results),'fail':sum(x['status']=='FAIL' for x in results),'results':results},ensure_ascii=False,indent=2))
print(json.dumps({'pass':sum(x['status']=='PASS' for x in results),'fail':sum(x['status']=='FAIL' for x in results),'failed':[r for r in results if r['status']=='FAIL']},ensure_ascii=False,indent=2))
