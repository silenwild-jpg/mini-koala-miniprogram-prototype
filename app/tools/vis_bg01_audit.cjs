const fs=require('fs'),path=require('path'),S=require('./vis_bg01_support.cjs');
const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,x)=>v.startsWith('--')?[...a,[v.slice(2),x[i+1]]]:a,[]));
async function background(page){return page.evaluate(()=>{
  const selector=e=>e.id?'#'+CSS.escape(e.id):e===document.documentElement?'html':e===document.body?'body':selector(e.parentElement)+' > '+e.tagName.toLowerCase()+':nth-child('+([...e.parentElement.children].indexOf(e)+1)+')';
  const sheets=[],rules=[];
  function walk(rs,source,conditions=[]){for(const r of rs){if(r.selectorText&&r.style&&(r.style.background||r.style.backgroundColor||r.style.backgroundImage))rules.push({selector:r.selectorText,source,conditions,background:r.style.background,color:r.style.backgroundColor,image:r.style.backgroundImage,important:r.style.getPropertyPriority('background')||r.style.getPropertyPriority('background-color')});else if(r.cssRules){if(r.media&&!matchMedia(r.conditionText).matches)continue;walk(r.cssRules,source,[...conditions,r.conditionText||r.name||r.constructor.name]);}}}
  [...document.styleSheets].forEach((s,i)=>{const source=s.href?new URL(s.href).pathname:'inline-style-'+i;sheets.push(source);try{walk(s.cssRules,source)}catch{}});
  function chain(e){const a=[];for(let n=e;n;n=n.parentElement){const s=getComputedStyle(n);a.push({selector:selector(n),color:s.backgroundColor,image:s.backgroundImage});}return a;}
  const nodes=[...document.querySelectorAll('html,body,div,main,section,article,header,footer,nav,details,aside')].filter(e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return b.width>=120&&b.height>=24&&s.visibility!=='hidden'&&s.display!=='none'});
  return {url:location.href,title:document.title,active:document.querySelector('.screen.active')?.id,styleOrder:sheets,tokens:Object.fromEntries(['--koala-bg','--koala-surface','--koala-surface-2','--bg','--ms-bg','--ve2-paper'].map(x=>[x,getComputedStyle(document.body).getPropertyValue(x).trim()])),nodes:nodes.map(e=>{const s=getComputedStyle(e),b=e.getBoundingClientRect();return {selector:selector(e),id:e.id,cls:typeof e.className==='string'?e.className:'',tag:e.tagName,color:s.backgroundColor,image:s.backgroundImage,textColor:s.color,text:e.innerText?.slice(0,90),bbox:{x:b.x,y:b.y,width:b.width,height:b.height},position:s.position,overflowY:s.overflowY,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,chain:chain(e),inline:e.style.background||e.style.backgroundColor||'',rules:rules.filter(r=>{try{return e.matches(r.selector)}catch{return false}})}})};
});}
module.exports={background};
if(require.main===module)(async()=>{
 const root=path.resolve(args.root),out=path.resolve(args.out);fs.mkdirSync(out,{recursive:true});const rt=await S.start(root,out),rows=[];
 try{const pages=fs.readdirSync(path.join(root,'prototype')).filter(n=>n.endsWith('.html')&&(!args.only||args.only.split(',').some(x=>n.includes(x)))&&/<body[^>]*(?:koala-site-shell|koala-(?:h01|s01|o01|m01)\b)/.test(fs.readFileSync(path.join(root,'prototype',n),'utf8')));
 for(const[w,h]of[[375,812],[390,844]]){for(const file of pages){const{page:p,context,logs}=await rt.page(w,h);try{
 let seed='';
 if(/access_a01|identity_id01|order_o0[23]|mine_m01|renew_rn01|exit_ex01|deposit_dp01|order_history|invoice_iv01/.test(file))seed='[data-mine="active"]';
 else if(file===S.files.o01)seed='[data-o01="coupon"]';else if(file===S.files.q01)seed='[data-q01="coupon"]';else if(file===S.files.u01)seed='[data-open="u01"]';else if(file===S.files.s01||file===S.files.s02)seed='[data-s01="estimated"]';
 if(seed){await p.goto(rt.base+S.files.hub);await S.settle(p);const old=p.url();await Promise.all([p.waitForURL(u=>u.href!==old),p.locator(seed).click()]);await S.settle(p);}
 const order=file.includes('identity_id01')?(await S.snapshot(p)).order:null;const query=file===S.files.home?'?state=new&loc=unknown':order?'?orderNo='+encodeURIComponent(order.order_no):'';
 if(file===S.files.s02){const old=p.url();await Promise.all([p.waitForURL(u=>u.href!==old),p.locator('#storeList .store').first().click()]);await S.settle(p);}
 if(!seed||!new URL(p.url()).pathname.endsWith('/'+file))await p.goto(rt.base+file+query);
 await S.settle(p);await p.waitForTimeout(300);const label=file.replace(/\.html$/,'')+'-'+w;const row={file,seed,viewport:w+'x'+h,browser:rt.browser.version(),styles:await background(p),metrics:await S.metrics(p),logs,screenshots:[]};for(const pos of ['top','middle','bottom']){await p.evaluate(pos=>{for(const e of [document.scrollingElement,...document.querySelectorAll('.page,#page,.screen.active,.phone,.coupon-page-main')]){if(e.scrollHeight>e.clientHeight+5)e.scrollTo({top:pos==='top'?0:pos==='middle'?(e.scrollHeight-e.clientHeight)/2:e.scrollHeight,behavior:'instant'});}},pos);await p.waitForTimeout(100);const shot=label+'-'+pos+'.png';await p.screenshot({path:path.join(out,shot)});row.screenshots.push(shot);}
 const summary=p.locator('details:not([open]) > summary:visible').first();
 if(await summary.count()){await summary.evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));await summary.click({timeout:3000});await S.settle(p);const shot=label+'-expanded.png';await p.screenshot({path:path.join(out,shot)});row.screenshots.push(shot);row.expanded=await background(p);}
 rows.push(row);console.log(w+' '+file+' '+row.styles.nodes.length);}catch(e){rows.push({file,viewport:w+'x'+h,error:String(e),logs});console.log('ERROR '+file+' '+e);}finally{await context.close();}fs.writeFileSync(path.join(out,'inventory.json'),JSON.stringify({root,browser:rt.browser.version(),rows},null,2));}}
 }finally{await rt.stop();}
})().catch(e=>{console.error(e);process.exitCode=1});
