const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),proto=path.join(root,'prototype');
const hub=fs.readFileSync(path.join(proto,'product_demo_hub_v1.html'),'utf8');
const matrix=fs.readFileSync(path.join(proto,'index_state_machine_demo.html'),'utf8');
const fixture=fs.readFileSync(path.join(proto,'mini_storage_demo_fixture_v2.js'),'utf8');
const runtime=fs.readFileSync(path.join(proto,'mini_koala_internal_demo_v1.js'),'utf8');
const start=fs.readFileSync(path.join(root,'START_HERE.html'),'utf8');
const ps=fs.readFileSync(path.join(root,'tools','start_demo.ps1'),'utf8');
function need(src,needle,label){if(!src.includes(needle))throw new Error('missing '+label+': '+needle);}
for(const needle of ['开始 5 分钟核心演示','6 条核心业务故事','Demo Control Center','按内部角色查看','专业检查入口','当前演示数据与规则边界']) need(hub,needle,'hub section');
for(const story of ['data-story="new_rental"','data-story="stores_first"','data-story="urgency"','data-story="coupon"','data-story="lifecycle"','data-story="exception"']) need(hub,story,'guided story');
for(const state of ['data-home="new"','data-home="estimated"','data-s01="estimated"','data-s02="soldout"','data-mine="pending_use"','data-mine="active"','data-mine="ending"']) need(hub,state,'control center state');
for(const needle of ['H01_PENDING_USE','S01_ESTIMATED_NO_MATCH','M01_RETURNING','O03_PENDING_USE','EST_LEASE_RECOMMEND']) need(matrix,needle,'matrix state');
for(const needle of ['MK_BJ_2CDB7BEE','惠新西街店','BJ0112S01A009','MK_BJ_2CDB7BEE__4.72','monthly:573','total:3440','payable:4063']) need(fixture,needle,'canonical fixture');
for(const needle of ['Story 01｜第一次租仓','Story 04｜优惠券与权益','Story 06｜异常与恢复','重置本故事','返回 Demo Hub','上一页']){if(needle==='上一页')continue; need(runtime,needle,'guided runtime');}
need(start,'prototype/product_demo_hub_v1.html','root hub link');
need(ps,"$TargetPath = 'prototype/product_demo_hub_v1.html'",'launcher target');
console.log('PASS Internal Demo Hub V1: six guided stories, control center, role routes, state matrix, canonical fixtures, launcher target');
