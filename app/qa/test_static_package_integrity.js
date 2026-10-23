const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawnSync}=require('child_process');

const root=path.resolve(__dirname,'..','prototype');
const htmlFiles=fs.readdirSync(root).filter(name=>name.endsWith('.html'));
const missing=[];
const syntax=[];
let inlineCount=0;
let referenceCount=0;

for(const name of htmlFiles){
  const file=path.join(root,name);
  const html=fs.readFileSync(file,'utf8');
  const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  for(const [,attrs,body] of scripts){
    const src=attrs.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if(src){
      if(!/^(?:https?:|data:|javascript:|#)/i.test(src)){
        referenceCount++;
        const local=decodeURIComponent(src.split(/[?#]/)[0]);
        if(local&&!fs.existsSync(path.resolve(path.dirname(file),local)))missing.push(`${name} -> ${src}`);
      }
      continue;
    }
    if(!body.trim())continue;
    inlineCount++;
    const temp=path.join(os.tmpdir(),`mini_koala_inline_${process.pid}_${inlineCount}.js`);
    fs.writeFileSync(temp,body);
    const result=spawnSync(process.execPath,['--check',temp],{encoding:'utf8'});
    fs.rmSync(temp,{force:true});
    if(result.status!==0)syntax.push(`${name} script#${inlineCount}: ${(result.stderr||'').trim()}`);
  }
  for(const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)){
    const ref=match[1];
    if(/^(?:https?:|data:|javascript:|#|tel:|wx:)/i.test(ref))continue;
    const local=decodeURIComponent(ref.split(/[?#]/)[0]);
    if(!local)continue;
    referenceCount++;
    if(!fs.existsSync(path.resolve(path.dirname(file),local)))missing.push(`${name} -> ${ref}`);
  }
}

if(syntax.length||missing.length){
  if(syntax.length)console.error('Inline syntax failures:\n'+syntax.join('\n'));
  if(missing.length)console.error('Missing local references:\n'+[...new Set(missing)].join('\n'));
  process.exit(1);
}

console.log(`PASS static package integrity: ${htmlFiles.length} HTML files, ${inlineCount} inline scripts, ${referenceCount} local references`);
