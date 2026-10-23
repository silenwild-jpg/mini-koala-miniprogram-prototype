const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'prototype',name),'utf8');
const html=read('mini_storage_home_H01_Visual_V2_7_4_SSOT.html');
const css=read('mk-v3-page-h01.css');
const patch=read('mini_koala_home_visual_closeout_patch_v1.js');
const support=read('mini_storage_global_support_v274.js');

assert(html.includes('href="mk-v3-page-h01.css"'));
assert(html.includes('src="mini_koala_home_visual_closeout_patch_v1.js"'));
assert(patch.includes("support.classList.add('home-support-float')"));
assert(patch.includes("page.addEventListener('scroll',schedulePosition"));
assert(patch.includes("document.addEventListener('scroll',schedulePosition,true)"));
assert(patch.includes(".home-brand-materials .materials-action"));
assert(patch.includes("!support.classList.contains('expanded')||support.contains(event.target)"));
assert(!patch.includes("support.style.width='100%'"));
assert(!patch.includes("support.style.background='#fff'"));

assert(css.includes('.mini-global-support.home-support-float'));
assert(css.includes('right: max(12px, env(safe-area-inset-right)) !important'));
assert(css.includes('background: transparent !important; border: 0 !important'));
assert(css.includes('pointer-events: none !important'));
assert(css.includes('margin-right: 56px !important'));

assert(support.includes("location.href='tel:4000358805'"));
assert(support.includes("document.dispatchEvent(new CustomEvent('mini-storage-open-wechat-service'))"));
assert(support.includes("mask.classList.add('show')"));

console.log('PASS H01-004B help float: compact geometry, collision guard, close behavior, phone/chat paths');
