from pathlib import Path
p=Path(__file__).resolve().parent/'qa_browser.cjs';s=p.read_text(encoding='utf-8')
s=s.replace("await page.goto(base+'business.html');", "await page.goto(base+'business.html');await page.locator('#enterprise-edit-status').waitFor();")
s=s.replace("await page.getByRole('link',{name:'补充企业资料'}).click();", "await page.getByRole('link',{name:'补充企业资料'}).click();await page.locator('#enterprise-edit-status').waitFor();")
s=s.replace("await page.reload();assert.equal(await page.locator('#company').inputValue()", "await page.reload();await page.locator('#enterprise-edit-status').waitFor();assert.equal(await page.locator('#company').inputValue()")
p.write_text(s,encoding='utf-8')
print('Enterprise checks wait for editable form initialization')
