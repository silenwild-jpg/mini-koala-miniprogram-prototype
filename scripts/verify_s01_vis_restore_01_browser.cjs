#!/usr/bin/env node
'use strict';
/* Native responsive S01 visual gate. One exact source SHA per run; no deployment. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'../release-evidence/rc2-merge-prep-10/site');
const evidence=path.resolve(__dirname,'../release-evidence/s01-vis-restore-01');
const port=4587,base='http://127.0.0.1:'+port;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));}
  catch{res.writeHead(400).end();return;}
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>error?res.writeHead(404).end('not found'):res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data));
});
async function main(){
  fs.mkdirSync(evidence,{recursive:true});
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const reports=[];
  try{
    for(const [w,h] of [[375,812],[390,844]]){
      const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1});
      const page=await ctx.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base+'/central-review-02g.html?catalog=sim&page=S01&s01_r2=1',{waitUntil:'domcontentloaded'});
      const app=page.frameLocator('#central-host'),s01=app.frameLocator('#s01-r2-frame');
      await s01.locator('.s01-estore-photo').waitFor({state:'visible'});
      const geometry=await s01.locator('.canvas').evaluate(canvas=>{
        const rect=canvas.getBoundingClientRect(),stage=document.querySelector('.stage'),main=stage.getBoundingClientRect();
        const css=getComputedStyle(canvas),source=document.querySelector('style').textContent;
        const photos=Array.from(document.querySelectorAll('.store-card .store-photo'));
        return {width:rect.width,left:rect.left,bodyWidth:document.documentElement.scrollWidth,
          viewport:innerWidth,position:css.position,transform:css.transform,
          layout:document.documentElement.dataset.layout,
          legacyScaled:/width\s*:\s*358px|--scale|scaleApprovedReference|VIS-REBUILD-03A/.test(source),
          rules:source.match(/\.store-card\.s01-compact\s*\{/g)?.length||0,
          stageHeight:main.height,photoReady:photos.every(img=>img.complete&&img.naturalWidth>0)};
      });
      assert.equal(geometry.layout,'NATIVE_RESPONSIVE');
      assert.equal(geometry.position,'relative');
      assert.equal(geometry.transform,'none','S01 is still scaled');
      assert(Math.abs(geometry.width-w)<=1,'S01 canvas differs from viewport: '+JSON.stringify(geometry));
      assert.equal(geometry.legacyScaled,false,'legacy CSS survived cleanup');
      assert.equal(geometry.rules,1,'competing compact selector groups detected');
      assert(geometry.bodyWidth<=w+1,'S01 overflow');
      assert(geometry.photoReady,'store photo missing; image mappings degraded');
      const cards=s01.locator('.store-card');
      assert(await cards.count()>=4,'truncated store catalog');
      assert.equal(await s01.locator('.stores').evaluate(el=>Array.from(el.children).slice(0,4).map(n=>n.dataset.service||n.dataset.presentation).join(',')),
        'expanded-two,expanded-two,estore,compact-direct','fixed slots drift');
      assert.equal(await s01.locator('[data-quick="single"],.s01-result-summary').count(),0);
      for(let i=0;i<2;i++){
        const card=cards.nth(i);
        assert.equal(await card.getAttribute('data-presentation'),'expanded-two');
        assert(await card.locator('.units').isVisible(),'full card lost its units');
        assert((await card.locator('.order:visible').count())>0,'full card order path lost');
        const button=await card.locator('.order:visible').first().boundingBox();
        assert(button&&button.height>=40,'full card action tap area too small');
      }
      const estore=s01.locator('.s01-estore-card');
      const estorePhoto=await estore.locator('img').evaluate(n=>({src:n.currentSrc,ok:n.complete&&n.naturalWidth>=100,w:n.naturalWidth,h:n.naturalHeight}));
      assert(estorePhoto.ok,'E-store service image is missing/placeholder');
      assert(!await estore.locator('.s01-estore-mark').count(),'old crude koala tile restored');
      assert.equal(await estore.locator('.s01-estore-name').innerText(),'考拉E存');
      const compact=cards.nth(2);
      const sizes=await compact.evaluate(el=>{
        const image=el.querySelector('.store-photo').getBoundingClientRect();
        const title=el.querySelector('h2').getBoundingClientRect();
        const addr=el.querySelector('.address').getBoundingClientRect();
        const tags=el.querySelector('.store-tags').getBoundingClientRect();
        const card=el.getBoundingClientRect();
        return {imageW:image.width,imageH:image.height,titleW:title.width,
          titleY:title.y,tagY:tags.y,addrY:addr.y,cardH:card.height,
          contentOverflow:el.scrollWidth>el.clientWidth+1,
          font:parseFloat(getComputedStyle(el.querySelector('h2')).fontSize),
          cardCorner:parseFloat(getComputedStyle(el).borderTopLeftRadius),
          images:el.querySelectorAll('.store-photo').length};
      });
      assert(sizes.imageW>=115&&sizes.imageW<=125,'wrong compact image width '+sizes.imageW);
      assert(sizes.imageH>=105&&sizes.imageH<=112,'wrong compact image height '+sizes.imageH);
      assert(sizes.font>=14.5,'compact title too small');
      assert(sizes.cardH>=117&&sizes.cardH<=160,'compact card clipped/distorted');
      assert(sizes.tagY>sizes.titleY&&sizes.addrY>sizes.tagY,'compact card vertical layout collided');
      assert(!sizes.contentOverflow,'compact card overflows');
      assert(sizes.cardCorner>=10,'compact reference lost rounded card');
      assert.equal(await compact.locator('.order:visible,.price:visible,.s01-compact-summary:visible').count(),0);
      await page.screenshot({path:path.join(evidence,'01-top-'+w+'.png')});
      await cards.first().scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(evidence,'02-full-card-'+w+'.png')});
      await estore.scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(evidence,'03-estore-'+w+'.png')});
      await compact.scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(evidence,'04-fourth-store-'+w+'.png')});
      await cards.last().scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(evidence,'05-tail-'+w+'.png')});
      const store=await compact.getAttribute('data-store-id');
      await compact.click();
      await app.locator('#screen.page-S02').waitFor({state:'attached'});
      assert.equal(await app.locator('#screen').evaluate(()=>window.SIM_DEMO.state().storeId),store);
      const nav=await app.locator('#screen').evaluate(x=>({nav:x.querySelector('.bottom-nav')?.getBoundingClientRect().top,frame:x.querySelector('#s01-r2-frame')?.getBoundingClientRect().bottom}));
      assert.deepEqual(errors,[],'runtime errors after native layout');
      reports.push({width:w,height:h,geometry,sizes,estorePhoto:estorePhoto.src.split('/').slice(-3).join('/'),storeToS02:store,errors:0,result:'PASS'});
      await ctx.close();
    }
    fs.writeFileSync(path.join(evidence,'results.json'),JSON.stringify({status:'PASS',reports},null,2));
    console.log('S01_VIS_RESTORE_01_BROWSER_PASS',JSON.stringify(reports));
  }finally{await browser.close();server.close();}
}
main().catch(e=>{console.error('S01_VIS_RESTORE_01_BROWSER_FAIL',e);server.close();process.exitCode=1;});
