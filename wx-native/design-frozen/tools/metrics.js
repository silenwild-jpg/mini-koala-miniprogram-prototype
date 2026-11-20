() => {
 const vis = e => { const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'&&parseFloat(cs.opacity)>0; };
 const parse = c => { const m=c.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p=m[1].split(',').map(x=>parseFloat(x)); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; };
 const lum = c => { const f=v=>{v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4)}; return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b); };
 const ratio=(a,b)=>{const l1=lum(a),l2=lum(b);return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)};
 const bgOf = e => { let n=e; while(n && n!==document.documentElement){ const cs=getComputedStyle(n); const bi=cs.backgroundImage; if(bi && bi!=='none') return null; const c=parse(cs.backgroundColor); if(c && c.a>0.9) return c; n=n.parentElement;} const c=parse(getComputedStyle(document.body).backgroundColor); return (c&&c.a>0)?c:{r:255,g:255,b:255,a:1}; };
 const out={small:[],contrast:[],fontSizes:{},colors:{},radii:{},tap:[],textCount:0,h1:[]};
 for(const e of document.body.querySelectorAll('*')){
  if(!vis(e)) continue; if(e.closest('[hidden],dialog:not([open])')) continue;
  const cs=getComputedStyle(e);
  const hasText=[...e.childNodes].some(n=>n.nodeType===3 && n.textContent.trim().length>0);
  if(hasText){
   const fs=parseFloat(cs.fontSize); if(fs<=0) continue;
   out.textCount++; out.fontSizes[fs]=(out.fontSizes[fs]||0)+1; out.colors[cs.color]=(out.colors[cs.color]||0)+1;
   const txt=e.textContent.trim().slice(0,30);
   if(fs<12) out.small.push({fs,txt,cls:(e.className||'').toString().slice(0,50)});
   const fg=parse(cs.color); const bg=bgOf(e);
   if(fg && bg && fg.a>0.5){ const r=ratio(fg,bg); const big=fs>=18.66||(fs>=14&&parseInt(cs.fontWeight)>=700); const need=big?3:4.5; if(r<need) out.contrast.push({ratio:+r.toFixed(2),fs,txt,fg:cs.color,bg:`rgb(${bg.r},${bg.g},${bg.b})`}); }
  }
  const br=cs.borderRadius; if(br && br!=='0px' && (cs.backgroundColor!=='rgba(0, 0, 0, 0)'||cs.borderStyle!=='none')) out.radii[br]=(out.radii[br]||0)+1;
  if(e.matches('a,button,[role=button],input:not([type=hidden]),select,.btn,[onclick]')){ const r=e.getBoundingClientRect(); if(r.height<32||r.width<32) out.tap.push({w:Math.round(r.width),h:Math.round(r.height),txt:e.textContent.trim().slice(0,20)}); }
 }
 out.overflowX=document.documentElement.scrollWidth>window.innerWidth+1;
 out.scrollH=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight);
 out.cssLinks=[...document.querySelectorAll('link[rel=stylesheet]')].map(l=>l.getAttribute('href'));
 out.inlineStyleBytes=[...document.querySelectorAll('style')].reduce((a,s)=>a+s.textContent.length,0);
 out.h1=[...document.querySelectorAll('h1')].map(h=>h.textContent.trim().slice(0,40));
 return out;
}
