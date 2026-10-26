from pathlib import Path
r=Path(__file__).resolve().parent
p=r/'demo/business-bridge.js';s=p.read_text(encoding='utf-8')
s=s.replace('lead_id:null,size:null','lead_id:null,lead_updated_at:null,size:null')
s=s.replace("const requested=requestedId?core.state().enterpriseLeads.find(l=>l.id===requestedId):null;", "const targetId=requestedId||draft?.value?.lead_id;const requested=targetId?core.state().enterpriseLeads.find(l=>l.id===targetId):null;")
s=s.replace("if(requested){form={...fresh(),lead_id:requested.id,size:", "if(requested&&!(draft?.version===1&&draft.value?.lead_id===requested.id&&draft.value?.lead_updated_at===requested.updated_at)){form={...fresh(),lead_id:requested.id,lead_updated_at:requested.updated_at,size:")
s=s.replace("form.lead_id=lead.id;persist();", "form.lead_id=lead.id;form.lead_updated_at=lead.updated_at;persist();")
p.write_text(s,encoding='utf-8')
p=r/'demo/demo-core.js';s=p.read_text(encoding='utf-8')
a="if(input.note!==undefined)lead[lead.type==='SIMULATED_BOOKING_LEAD'?'note':'notes']=String(input.note).slice(0,200);return copy(lead);"
b="if(input.note!==undefined)lead[lead.type==='SIMULATED_BOOKING_LEAD'?'note':'notes']=String(input.note).slice(0,200);if(lead.type==='ENTERPRISE_REQUIREMENT')lead.updated_at=now();return copy(lead);"
assert a in s;s=s.replace(a,b)
a="q.previous_end_date!==rentalPeriod(id).end_date||o.unit_ids.some"
b="q.previous_end_date!==rentalPeriod(id).end_date||q.new_end_date!==addCalendarMonths(o.start_date,rentalPeriod(id).total_months+q.months)||o.unit_ids.some"
assert a in s;s=s.replace(a,b);p.write_text(s,encoding='utf-8')
p=r/'qa_browser.cjs';s=p.read_text(encoding='utf-8')
a="await page.locator('#company').fill('从记录补充的完整资料');await page.locator('#submit').click();"
b="await page.locator('#company').fill('从记录补充的完整资料');await page.reload();assert.equal(await page.locator('#company').inputValue(),'从记录补充的完整资料');await page.locator('#submit').click();"
assert a in s;s=s.replace(a,b);p.write_text(s,encoding='utf-8')
print('Dirty enterprise draft and period consistency checks completed')
