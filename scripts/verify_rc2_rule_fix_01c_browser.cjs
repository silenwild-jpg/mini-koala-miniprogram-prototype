#!/usr/bin/env node
'use strict';
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../app'),results=path.resolve(__dirname,'../release-evidence/rc2-fix-01c');
fs.mkdirSync(results,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const p=path.resolve(root,'.'+pathname);
 if(!p.startsWith(root+path.sep)&&p!==root){res.writeHead(403).end();return;}
 fs.readFile(p,(error,bytes)=>{if(error){res.writeHead(404).end('missing');return;}res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'}).end(bytes);});
});
(async()=>{
 await new Promise(resolve=>server.listen(4371,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const base='http://127.0.0.1:4371',out=[];
 try{
  for(const [width,height] of [[375,812],[390,844]]){
   const page=await browser.newPage({viewport:{width,height}});
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto(base+'/central-review-02g.html?catalog=sim&page=S01');
   let frame=page.frameLocator('#central-host');
   await frame.locator('#screen').waitFor();
   await frame.locator('#screen').evaluate(()=>{
    const seed=window.SIM_DEMO.core.state(),f=window.SIM_FIXTURES;
    const st=f.stores[0],u=f.units.find(x=>x.store_id===st.id);
    const start=new Date(Date.now()-86400000).toISOString().slice(0,10);
    seed.orders=[
     {id:'SIM_ORDER_BROWSER_PAID',kind:'SIMULATED_ORDER',status:'paid_simulated',store_id:st.id,unit_ids:[u.id],term_months:6,start_date:start,payable:4857,deposit:687},
     {id:'SIM_ORDER_BROWSER_FAILED',kind:'SIMULATED_ORDER',status:'payment_failed',store_id:st.id,unit_ids:[u.id],term_months:3,start_date:start,payable:2000,deposit:400}
    ];
    seed.services={SIM_ORDER_BROWSER_PAID:{identity:'verified',useStatus:'active',renewals:[],exit:null,deposit:'held',invoices:[]}};
    seed.auth={status:'verified',phone:'13800138000',method:'sim',expiresAt:Date.now()+86400000};
    seed.stock={[u.id]:'occupied'};
    sessionStorage.setItem('mk_independent_sim_v1',JSON.stringify(seed));
   });
   await page.goto(base+'/central-review-02g.html?catalog=sim&page=M01');
   frame=page.frameLocator('#central-host');
   await frame.getByText('我的订单').first().waitFor();
   await frame.locator('button[data-action="orderDetail"][data-value="SIM_ORDER_BROWSER_PAID"]').click();
   await frame.getByText('订单详情').first().waitFor();
   await frame.locator('button[data-value="RN01"]').click();
   await frame.locator('#renew-months').fill('3');
   await frame.locator('button[data-action="requestRenewal"]').click();
   await frame.getByText('QUOTE_PENDING').first().waitFor();
   assert.equal(await frame.locator('button[data-action="reviewRenewal"]').count(),0);
   await page.screenshot({path:path.join(results,'central-'+width+'x'+height+'.png'),fullPage:true});
   await page.goto(base+'/prototype/parallel/core-journey-fix-01/demo/index.html?page=RN01&review=1');
   await page.locator('#renew-review-price').fill('700');
   await page.locator('button[data-action="reviewRenewal"]').click();
   await page.getByText('QUOTE_READY').first().waitFor();
   await page.locator('button[data-action="confirmRenewal"]').click();
   await page.getByText('COMPLETED').first().waitFor();
   const renewal=await page.evaluate(()=>window.SIM_DEMO.core.lifecycleView('SIM_ORDER_BROWSER_PAID'));
   assert.equal(renewal.total_months,9);assert.equal(renewal.payments.length,2);
   await page.getByRole('button',{name:'返回订单详情'}).click();
   await page.locator('button[data-value="IV01"]').click();
   await page.locator('#invoice-title').fill('测试个人');
   await page.locator('#invoice-email').fill('demo@example.com');
   await page.locator('button[data-action="requestInvoice"]').click();
   await page.getByText('SUBMITTED').first().waitFor();
   await page.getByRole('button',{name:'返回订单详情'}).click();
   await page.locator('button[data-value="EX01"]').click();
   const planned=new Date(Date.now()+86400000*3).toISOString().slice(0,10);
   await page.locator('#exit-date').fill(planned);
   await page.locator('button[data-action="requestExit"]').click();
   await page.getByText('REQUESTED').first().waitFor();
   await page.locator('button[data-action="requestInspection"]').click();
   await page.getByText('WAITING_INSPECTION').first().waitFor();
   await page.locator('button[data-action="reviewInspectPass"]').click();
   await page.getByText('INSPECTION_PASSED').first().waitFor();
   await page.getByRole('button',{name:'返回订单详情'}).click();
   await page.locator('button[data-value="DP01"]').click();
   await page.getByText('REFUND_PENDING').first().waitFor();
   await page.locator('button[data-action="reviewRefund"]').click();
   await page.getByText('REFUNDED').first().waitFor();
   const final=await page.evaluate(()=>window.SIM_DEMO.core.lifecycleView('SIM_ORDER_BROWSER_PAID'));
   assert.equal(final.access_allowed,false);assert.equal(final.deposit_status,'REFUNDED');
   assert.equal((await page.evaluate(()=>window.SIM_DEMO.core.state())).orders.length,2);
   await page.screenshot({path:path.join(results,'review-'+width+'x'+height+'.png'),fullPage:true});
   assert.deepEqual(errors,[]);
   const scroll=await page.evaluate(()=>document.documentElement.scrollWidth);
   assert(scroll<=width+2,'horizontal overflow '+width+' '+scroll);
   out.push({width,height,orders:2,renewal:'COMPLETED',exit:'INSPECTION_PASSED',deposit:'REFUNDED',invoice:'SUBMITTED',javascriptErrors:0});
   await page.close();
  }
  fs.writeFileSync(path.join(results,'summary.json'),JSON.stringify({result:'PASS',screens:out},null,2));
  console.log('RC2_RULE_FIX_01C_BROWSER_PASS',JSON.stringify(out));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
