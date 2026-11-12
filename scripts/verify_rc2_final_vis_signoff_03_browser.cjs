#!/usr/bin/env node
'use strict';
// RC2 FINAL VISUAL 03 — exact candidate, 375/390, all customer-facing after-sales states.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../app/prototype/parallel/core-journey-fix-01/demo');
const out=path.resolve(__dirname,'../release-evidence/rc2-final-vis-signoff-03');
const host='http://127.0.0.1:4706',ext={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,host).pathname));}catch{res.writeHead(400).end();return;}
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(e,bytes)=>e?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':ext[path.extname(file)]||'application/octet-stream'}).end(bytes));
});
const todayOffset=(date,days)=>{const [y,m,d]=date.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+days)).toISOString().slice(0,10);};
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  await new Promise(ok=>server.listen(4706,'127.0.0.1',ok));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROME_PATH?{executablePath:process.env.PLAYWRIGHT_CHROME_PATH}:{})});
  const records=[];
  try{
   for(const [width,height] of [[375,812],[390,844]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,locale:'zh-CN',timezoneId:'Asia/Shanghai'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const capture=async(name,expected,atBottom=false)=>{
      const txt=await page.locator('#screen').innerText();
      if(expected)assert(txt.includes(expected),name+' missing '+expected);
      const data=await page.evaluate(bottom=>{
        const el=document.querySelector('#scroll');
        if(el)el.scrollTop=bottom?el.scrollHeight:0;
        const controls=[...document.querySelectorAll('#screen button:not([disabled])')].map(x=>{
          const b=x.getBoundingClientRect();return {label:x.textContent.trim().slice(0,24),width:Math.round(b.width),height:Math.round(b.height),visible:b.height>0&&b.width>0};
        });
        return {pageWidth:document.documentElement.scrollWidth,viewport:innerWidth,
          scrollable:el?el.scrollHeight-el.clientHeight:0,scrollTop:el?.scrollTop||0,
          controls:controls.filter(x=>x.visible&&x.height<36)};
      },atBottom);
      assert(data.pageWidth<=width+2,name+' horizontal overflow '+JSON.stringify(data));
      await page.screenshot({path:path.join(out,name+'-'+width+'.png')});
      records.push({name,width,url:page.url().split('?')[1]||'',textLength:txt.length,...data});
    };
    const visit=async(target,id)=>{
      await page.evaluate(({target,id})=>{const b=window.SIM_DEMO;if(id)b.openOrder(id);if(target!=='O03')b.navigate(target);},{target,id});
      await page.locator(target==='O03'?'.mk-order-details':'.m02-service-summary').waitFor();
      assert.equal(new URL(page.url()).searchParams.get('order'),id,'order ID from deep link');
    };
    const fresh=async({months=12,startOffset=0,paid=true,verified=true,fail=false,capacity=3}={})=>page.evaluate(({months,startOffset,paid,verified,fail,capacity})=>{
      const b=window.SIM_DEMO,c=b.core;
      c.setRequirement(capacity,months,true);
      const u=c.matchingUnits().find(x=>x.volume>=capacity&&c.available(x));
      if(!u)throw Error('NO_AVAILABLE_UNIT');
      c.select([u.id]);
      const day=c.today(),date=new Date(day+'T00:00:00Z');
      date.setUTCDate(date.getUTCDate()+startOffset);
      c.setDate(date.toISOString().slice(0,10));c.quote();
      const o=c.submit();
      if(paid){c.pay(o.id,fail?'failed':'success');if(!fail&&verified)c.identity(o.id,'success');}
      b.persist();b.openOrder(o.id);
      return {id:o.id,unit:u.id,date:c.today(),start:o.start_date,status:c.state().orders.find(x=>x.id===o.id).status};
    },{months,startOffset,paid,verified,fail,capacity});
    try{
      await page.goto(host+'/index.html?page=M01',{waitUntil:'domcontentloaded'});
      await page.locator('.m01-profile').waitFor();
      await page.evaluate(()=>{const b=window.SIM_DEMO;b.core.setScenario('normal');b.core.requestPhone();b.core.resolvePhone('success',{phone:'13800138000'});b.persist();});
      const a=await fresh();
      await capture('01-O03-active-top','订单详情');
      await capture('02-O03-active-bottom','订单服务',true);
      await visit('DP01',a.id);await capture('03-DP01-held','押金进度');
      await visit('RN01',a.id);await capture('04-RN01-active','续租申请');
      await page.locator('#renew-months').fill('0');
      await page.locator('[data-action="requestRenewal"]').click();
      await page.locator('#renew-error').waitFor();
      assert.equal(await page.locator('#renew-months').inputValue(),'0','invalid months retained');
      await capture('05-RN01-invalid-input','请输入');
      await page.locator('#renew-months').fill('6');
      await page.locator('[data-action="requestRenewal"]').click();
      await capture('06-RN01-quote-pending','报价确认中');
      await page.evaluate(id=>{
        const b=window.SIM_DEMO,c=b.core,r=c.lifecycleView(id).renewal_requests.at(-1);
        c.lifecycleReviewQuote(id,r.id,315,true);b.persist();b.navigate('RN01');
      },a.id);
      await page.locator('[data-action="confirmRenewal"]').waitFor();
      await capture('07-RN01-quote-ready','待确认续租');
      await page.locator('[data-action="confirmRenewal"]').click();
      await capture('08-RN01-completed','已完成');
      await visit('IV01',a.id);
      assert.equal(await page.locator('#invoice-tax-wrap').isVisible(),false,'personal tax field must be hidden');
      await capture('09-IV01-personal','发票申请');
      await page.locator('[data-action="requestInvoice"]').click();
      await page.locator('.mk-service-field-error').waitFor();
      assert.match(await page.locator('.mk-service-field-error').innerText(),/发票抬头/);
      await capture('10-IV01-blank-title','请填写发票抬头');
      await page.locator('#invoice-title').fill('测试用户');
      await page.locator('#invoice-email').fill('wrong-email');
      await page.locator('[data-action="requestInvoice"]').click();
      assert.match(await page.locator('.mk-service-field-error').innerText(),/邮箱/);
      assert.equal(await page.locator('#invoice-title').inputValue(),'测试用户','form values retained on validation');
      await capture('11-IV01-invalid-email','请填写有效');
      await page.locator('#invoice-email').fill('demo@example.com');
      await page.locator('#invoice-kind').selectOption('enterprise');
      assert.equal(await page.locator('#invoice-tax-wrap').isVisible(),true,'enterprise tax input visible');
      await capture('12-IV01-enterprise','企业税号');
      await page.locator('[data-action="requestInvoice"]').click();
      assert.match(await page.locator('.mk-service-field-error').innerText(),/税号/);
      assert.equal(await page.locator('#invoice-email').inputValue(),'demo@example.com');
      await capture('13-IV01-blank-tax','请填写企业税号');
      await page.locator('#invoice-tax').fill('913100000000000000');
      await page.locator('[data-action="requestInvoice"]').click();
      await capture('14-IV01-submitted','暂无可申请的付款记录');
      assert.equal(await page.locator('#invoice-kind').count(),0,'duplicate invoice for same payment blocked');
      await visit('EX01',a.id);await capture('15-EX01-active','退租安排');
      await page.locator('[data-action="requestExit"]').click();
      await page.locator('.mk-service-field-error').waitFor();
      assert.match(await page.locator('.mk-service-field-error').innerText(),/日期/);
      await capture('16-EX01-invalid-date','请选择今天或之后');
      await page.locator('#exit-date').fill(a.date);
      await page.locator('[data-action="requestExit"]').click();
      await capture('17-EX01-requested','已提交');
      await page.locator('[data-action="requestInspection"]').click();
      await capture('18-EX01-waiting','待验仓');
      await visit('DP01',a.id);await capture('19-DP01-waiting','待验仓');
      await page.evaluate(id=>{const b=window.SIM_DEMO;b.core.lifecycleReviewInspection(id,'failed',true);b.persist();b.navigate('EX01');},a.id);
      await capture('20-EX01-inspection-failed','需重新验仓');
      await page.locator('[data-action="requestInspection"]').click();
      await page.evaluate(id=>{const b=window.SIM_DEMO;b.core.lifecycleReviewInspection(id,'passed',true);b.persist();b.navigate('DP01');},a.id);
      await capture('21-DP01-refund-pending','退款处理中');
      await page.evaluate(id=>{const b=window.SIM_DEMO;b.core.lifecycleReviewRefund(id,true);b.persist();b.navigate('DP01');},a.id);
      await capture('22-DP01-refunded','已退还');
      await visit('O03',a.id);await capture('23-O03-ended','已退租');
      const b=await fresh({verified:false});
      await capture('24-O03-paid-unverified','待完成');
      const c=await fresh({startOffset:2});
      await capture('25-O03-upcoming','待起租');
      const d=await fresh({paid:false});
      await capture('26-O03-pending','继续支付');
      const e=await fresh({paid:true,fail:true});
      await capture('27-O03-payment-failed','重新选择仓位');
      const f=await fresh({months:60,paid:true});
      await visit('RN01',f.id);
      await capture('28-RN01-term-cap','当前状态暂不接受新的续租申请');
      assert.equal(await page.locator('#renew-months').count(),0,'60 month cap no renewal');
      await page.goto(host+'/index.html?page=RN01&order=UNKNOWN_ID',{waitUntil:'domcontentloaded'});
      await page.locator('#screen').getByText('没有可办理租后服务的订单').waitFor();
      await capture('29-RN01-invalid-order','没有可办理租后服务的订单');
      // Four tier thumb visual audit: check legible images; identical image within a capacity class is logged, not treated as exact-unit photo.
      await page.goto(host+'/index.html?page=S02',{waitUntil:'domcontentloaded'});
      const storeId=await page.evaluate(()=>{
        const c=window.SIM_DEMO.core;
        const s=c.fixture.stores.find(st=>st.status==='open'&&[0.8,3.5,5].every(v=>c.fixture.units.some(u=>u.store_id===st.id&&u.volume===v)));
        if(!s)throw Error('S02_STORES_NO_SIZE_SET');
        window.SIM_DEMO.navigate('S02',s.id);return s.id;
      });
      await page.locator('.unit-row').first().waitFor();
      const imageSet=await page.evaluate(()=>{
        const c=window.SIM_DEMO.core;
        const s=c.state().storeId,volumes=[0.8,3.5,5];
        return volumes.map(volume=>{
          const u=c.fixture.units.find(x=>x.store_id===s&&x.volume===volume);
          const card=document.querySelector('.unit-row[data-unit="'+u.id+'"]');
          const img=card?.querySelector('img');
          return {volume,code:u.demo_cabin_no||u.code,src:img?.getAttribute('src'),naturalWidth:img?.naturalWidth,naturalHeight:img?.naturalHeight};
        });
      });
      assert(imageSet.every(x=>x.naturalWidth>=300),'warehouse thumbnail must load at 336px base');
      assert.notEqual(imageSet[0].src,imageSet[1].src,'mini and small category should be visually distinct');
      await capture('30-S02-thumbnails','可选仓位');
      records.push({name:'S02-thumbnail-audit',width,storeId,images:imageSet});
      assert.deepEqual(errors,[],'browser JS errors');
    }finally{await context.close();}
   }
   fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sha:process.env.GITHUB_SHA||'',captured:records.filter(x=>x.name!=='S02-thumbnail-audit').length,records},null,2));
   console.log('RC2-FINAL-VIS-SIGNOFF-03 PASS '+records.length+' observations');
  }finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
