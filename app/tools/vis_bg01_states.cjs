const fs=require('fs'),path=require('path'),S=require('./vis_bg01_support.cjs'),BG=require('./vis_bg01_audit.cjs');
const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,x)=>v.startsWith('--')?[...a,[v.slice(2),x[i+1]]]:a,[]));
(async()=>{const out=path.resolve(args.out),rows=[],rt=await S.start(args.root,out);try{for(const[w,h]of[[375,812],[390,844]]){const{page:p,context,logs}=await rt.page(w,h);p.setDefaultTimeout(15000);
 const go=async n=>{await p.goto(rt.base+S.files[n]+(n==='home'?'?state=new&loc=unknown':''));await S.settle(p)};
 const nav=async s=>{const old=p.url();await Promise.all([p.waitForURL(u=>u.href!==old),p.locator(s).first().click()]);await S.settle(p)};
 const seed=async s=>{await go('hub');await nav(s)};
 async function capture(label){for(const position of ['top','middle','bottom']){await p.evaluate(pos=>{for(const e of [document.scrollingElement,...document.querySelectorAll('.page,#page,.screen.active')])if(e.scrollHeight>e.clientHeight+5)e.scrollTo({top:pos==='top'?0:pos==='middle'?(e.scrollHeight-e.clientHeight)/2:e.scrollHeight,behavior:'instant'})},position);await p.waitForTimeout(100);const screenshot=w+'-'+label+'-'+position+'.png';await p.screenshot({path:path.join(out,screenshot)});rows.push({label,position,viewport:w+'x'+h,screenshot,background:await BG.background(p),metrics:await S.metrics(p)});}}
 await seed('[data-home="estimated"]');await capture('h01-estimated');
 await go('hub');await p.locator('#resetAll').click();await go('home');await nav('#estimateBtn');await p.locator('#s2 .scene[data-id="moving"]').click();await p.locator('#s3 .amount-card').first().click();await p.locator('#s5').waitFor({state:'visible'});await capture('s5-first');
 await nav('#r113PlanCards .rplan');await nav('#back');await p.locator('#s5').waitFor({state:'visible'});await capture('s5-u01-return');
 await nav('#r113PlanCards .rplan');await nav('#viewStoreDetail');await nav('#backBtn');await p.locator('#s5').waitFor({state:'visible'});await capture('s5-s02-return');
 await seed('[data-story="coupon"]');await p.locator('#s5').waitFor({state:'visible'});await p.locator('#couponEstimateGrantV1 summary').click();await capture('s5-coupon-expanded');
 fs.writeFileSync(path.join(out,'runtime-'+w+'.json'),JSON.stringify(logs,null,2));await context.close();console.log(w+' state captures complete');}
 }finally{await rt.stop();fs.writeFileSync(path.join(out,'states.json'),JSON.stringify({root:args.root,browser:rt.browser.version(),rows},null,2));}})().catch(e=>{console.error(e);process.exitCode=1});
