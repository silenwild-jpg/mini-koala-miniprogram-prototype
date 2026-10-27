'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {create}=require('./demo/demo-core.js');
const out=path.join(__dirname,'evidence/auth01e');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--disable-background-networking','--no-first-run']});try{
for(const width of [375,390])for(const [label,port] of [['before',4250],['after',4240]]){
const context=await browser.newContext({viewport:{width,height:width===375?812:844}}),page=await context.newPage(),base=`http://127.0.0.1:${port}/demo/`;
await page.goto(base+'index.html?page=S01');const c=create();c.setRequirement(3,6,true);await page.evaluate(s=>sessionStorage.setItem('mk_independent_sim_v1',JSON.stringify(s)),c.state());await page.goto(base+'index.html?page=S5');const f=page.frameLocator('#br04-frame');await f.locator('#main-price').click();if(label==='after')await page.locator('.mk-auth-sheet').waitFor();else await f.locator('#modal:not([hidden])').waitFor();await page.screenshot({path:path.join(out,`${width}-${label}-auth.png`)});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await context.close();
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
