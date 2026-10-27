import test from 'node:test';
import assert from 'node:assert/strict';
import {PhoneGate} from '../src/auth-gate.mjs';
import {makeAuthEntrypoints} from '../src/branch-entrypoints.mjs';
import {createTestProvider} from '../adapters/provider-contract.mjs';

let seq=0;
const request=({intent='QUOTE',operationId=`op-${++seq}`,actionKey='GET_OFFICIAL_QUOTE',snapshot={route:'S5',capacityM3:3,months:12},read=()=>snapshot,action=async()=>42}={}) => ({intent,operationId,actionKey,contextSnapshot:snapshot,getCurrentContext:read,action});

test('G1: anonymous official quote is blocked when login cancelled', async()=>{
  const p=createTestProvider({verificationAnswer:{ok:false,reason:'cancelled'}});let calls=0;
  const r=await new PhoneGate({provider:p}).requireVerifiedPhone(request({action:()=>{calls++;}}));
  assert.equal(r.status,'cancelled');assert.equal(calls,0);assert.equal(p.state.prompts,1);
});

test('G1: verified phone resumes pending official quote exactly once', async()=>{
  const p=createTestProvider();let calls=0;
  const gate=new PhoneGate({provider:p});
  const q=request({operationId:'quote-1',action:async()=>{calls++;return 2920;}});
  const r=await gate.requireVerifiedPhone(q);
  assert.equal(r.status,'executed');assert.equal(r.value,2920);
  assert.equal((await gate.requireVerifiedPhone(q)).status,'duplicate');assert.equal(calls,1);
});

test('G2: previously verified order does not show login again', async()=>{
  const p=createTestProvider({verified:true});const gate=new PhoneGate({provider:p});
  const r=await gate.requireVerifiedPhone(request({intent:'ORDER',actionKey:'OPEN_O01'}));
  assert.equal(r.status,'executed');assert.equal(p.state.prompts,0);
});

test('G2: declined authorisation does not enter O01', async()=>{
  const p=createTestProvider({verificationAnswer:{ok:false,reason:'declined'}});let routed=false;
  const r=await new PhoneGate({provider:p}).requireVerifiedPhone(request({intent:'ORDER',actionKey:'OPEN_O01',action:()=>{routed=true;}}));
  assert.equal(r.status,'cancelled');assert.equal(routed,false);
});

test('failure: rejected verification does not open protected data', async()=>{
  const p=createTestProvider({verificationAnswer:{ok:false,reason:'sms_wrong_code'}});
  const r=await new PhoneGate({provider:p}).requireVerifiedPhone(request());
  assert.equal(r.status,'failed');
});

test('stale: switching unit, months or discount during login prevents replay', async()=>{
  const p=createTestProvider();let current={route:'S5',capacityM3:3,months:12,discountRevision:'v1'};let hit=0;
  p.requestVerification=async()=>{p.state.verified=true;current={...current,months:24};return {ok:true};};
  const r=await new PhoneGate({provider:p}).requireVerifiedPhone(request({snapshot:{...current},read:()=>current,action:()=>{hit++;}}));
  assert.equal(r.status,'stale');assert.equal(hit,0);
});

test('fail closed: a forged provider ok but not server verified is blocked', async()=>{
  const p=createTestProvider({verificationAnswer:{ok:true}});p.requestVerification=async()=>({ok:true});
  const r=await new PhoneGate({provider:p}).requireVerifiedPhone(request());
  assert.equal(r.status,'blocked');assert.equal(r.reason,'session_not_verified');
});

test('fail closed: session service outage rejects quote', async()=>{
  const p=createTestProvider();p.isVerified=async()=>{throw new Error('network')};
  const r=await new PhoneGate({provider:p}).requireVerifiedPhone(request());
  assert.equal(r.status,'failed');assert.equal(r.reason,'session_check_error');
});

test('expired at final check: do not execute order', async()=>{
  const p=createTestProvider({verified:true});let c=0;let ran=0;
  p.isVerified=async()=>{c++;return c<3;};
  const r=await new PhoneGate({provider:p}).requireVerifiedPhone(request({intent:'ORDER',actionKey:'SUBMIT_O01',action:()=>{ran++;}}));
  assert.equal(r.status,'blocked');assert.equal(r.reason,'session_expired');assert.equal(ran,0);
});

test('simultaneous same operation is idempotent', async()=>{
  const p=createTestProvider({verified:true});const gate=new PhoneGate({provider:p});let calls=0;
  const req=request({operationId:'same',action:async()=>{calls++;await new Promise(r=>setTimeout(r,20));}});
  const [a,b]=await Promise.all([gate.requireVerifiedPhone(req),gate.requireVerifiedPhone(req)]);
  assert.equal(a.status,'executed');assert.equal(b.status,'executed');assert.equal(calls,1);
});

test('different concurrent operation remains busy', async()=>{
  const p=createTestProvider({verified:true});const gate=new PhoneGate({provider:p});
  let release;const delay=new Promise(r=>release=r);
  const first=gate.requireVerifiedPhone(request({operationId:'first',action:()=>delay}));
  const second=await gate.requireVerifiedPhone(request({operationId:'second'}));
  assert.equal(second.status,'busy');release();await first;
});

test('BRANCH-01 home immediate order must cross ORDER gate', async()=>{
  const p=createTestProvider({verificationAnswer:{ok:false,reason:'declined'}});let ran=0;
  const gate=new PhoneGate({provider:p});const entry=makeAuthEntrypoints({gate,getContext:()=>({route:'H01'}),quoteAction:()=>{},orderAction:()=>{ran++},submitOrderAction:()=>{},makeOperationId:k=>'br01-'+k});
  assert.equal((await entry.onImmediateOrder()).status,'cancelled');assert.equal(ran,0);
});

test('BRANCH-02 CAP->S5 official quote after verification', async()=>{
  const p=createTestProvider();let quotes=0;
  const entry=makeAuthEntrypoints({gate:new PhoneGate({provider:p}),getContext:()=>({route:'CAP',capacityM3:3,months:12}),quoteAction:()=>{quotes++},orderAction:()=>{},submitOrderAction:()=>{},makeOperationId:k=>'br02-'+k});
  assert.equal((await entry.onRequestQuote()).status,'executed');assert.equal(quotes,1);
});

test('BRANCH-03 S01/S02/U01 immediate order when verified', async()=>{
  const p=createTestProvider({verified:true});let routes=0;
  const entry=makeAuthEntrypoints({gate:new PhoneGate({provider:p}),getContext:()=>({route:'U01',unitId:'unit-23'}),quoteAction:()=>{},orderAction:()=>{routes++},submitOrderAction:()=>{},makeOperationId:k=>'br03-'+k});
  assert.equal((await entry.onImmediateOrder()).status,'executed');assert.equal(routes,1);
});

test('BRANCH-04 S5 official quote is blocked if no verification', async()=>{
  const p=createTestProvider({verificationAnswer:{ok:false,reason:'cancelled'}});let visible=false;
  const entry=makeAuthEntrypoints({gate:new PhoneGate({provider:p}),getContext:()=>({route:'S5',months:12}),quoteAction:()=>{visible=true},orderAction:()=>{},submitOrderAction:()=>{},makeOperationId:k=>'br04-'+k});
  assert.equal((await entry.onRequestQuote()).status,'cancelled');assert.equal(visible,false);
});

test('O01 direct submit must recheck session and cannot bypass', async()=>{
  const p=createTestProvider({verificationAnswer:{ok:false,reason:'declined'}});let submitted=false;
  const entry=makeAuthEntrypoints({gate:new PhoneGate({provider:p}),getContext:()=>({route:'O01',quoteSnapshotId:'signed-01'}),quoteAction:()=>{},orderAction:()=>{},submitOrderAction:()=>{submitted=true},makeOperationId:k=>'o01-'+k});
  assert.equal((await entry.onSubmitOrder()).status,'cancelled');assert.equal(submitted,false);
});

test('context mismatch in discount revision blocks order replay', async()=>{
  const p=createTestProvider();let changed=false;let action=false;
  p.requestVerification=async()=>{p.state.verified=true;changed=true;return {ok:true};};
  const snapshot={route:'O01',discountRevision:'v1'};
  const r=await new PhoneGate({provider:p}).requireVerifiedPhone(request({intent:'ORDER',actionKey:'SUBMIT_O01',snapshot,read:()=>changed?{...snapshot,discountRevision:'v2'}:snapshot,action:()=>{action=true;}}));
  assert.equal(r.status,'stale');assert.equal(action,false);
});


test('O01 deep-link page entry blocked on anonymous cancelled login', async()=>{
  const p=createTestProvider({verificationAnswer:{ok:false,reason:'cancelled'}});
  const entry=makeAuthEntrypoints({gate:new PhoneGate({provider:p}),getContext:()=>({route:'O01',signedQuoteSnapshotId:'signed-21'}),quoteAction:()=>{},orderAction:()=>{},submitOrderAction:()=>{},makeOperationId:k=>'route-'+k});
  const r=await entry.onEnterOrder();
  assert.equal(r.status,'cancelled');
});

test('O01 deep-link page entry permitted for verified user', async()=>{
  const p=createTestProvider({verified:true});
  const entry=makeAuthEntrypoints({gate:new PhoneGate({provider:p}),getContext:()=>({route:'O01',signedQuoteSnapshotId:'signed-21'}),quoteAction:()=>{},orderAction:()=>{},submitOrderAction:()=>{},makeOperationId:k=>'route-ok-'+k});
  const r=await entry.onEnterOrder();
  assert.equal(r.status,'executed');assert.equal(r.value.allowOrderPage,true);
});
