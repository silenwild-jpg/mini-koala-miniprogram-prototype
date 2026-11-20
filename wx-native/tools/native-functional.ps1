$ErrorActionPreference = 'Stop'
$wxCli = 'C:\Program Files (x86)\Tencent\微信web开发者工具\wechatide.cmd'
$wxProject = (Resolve-Path (Join-Path $PSScriptRoot '../miniprogram')).Path
$outDir = Join-Path $PSScriptRoot '../evidence/20261120/functional'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$receipts = [System.Collections.Generic.List[object]]::new()
function Invoke-Wx([string]$Tool, [string[]]$Params) {
  $lines = & $wxCli -c codex $Tool --project $wxProject @Params 2>&1 | Out-String
  $start = $lines.IndexOf('{'); if($start -lt 0) { throw $lines }
  $r = $lines.Substring($start,$lines.LastIndexOf('}')-$start+1) | ConvertFrom-Json
  $receipts.Add([pscustomobject]@{tool=$Tool;parameters=$Params;receipt=$r})
  $receipts | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath (Join-Path $outDir 'receipts.json')
  if($r.ok -ne $true -or $r.result.success -eq $false) { throw $lines }
  return $r.result
}
function Eval([string]$Function) { Invoke-Wx 'automation_evaluate' @('--fn-source',$Function) }
function CheckData([string]$Field,$Expected) {
 $r=Invoke-Wx 'automation_page_action' @('--action','getData','--data-path',$Field,'--wait','1')
 if($r.data -ne $Expected) { throw "Expected $Field=$Expected, got $($r.data)" }
 Write-Output "PASS $Field=$Expected"
}
Eval "function(){wx.removeStorageSync('mk_state_v1');return true;}" | Out-Null
Invoke-Wx 'simulator_refresh' @() | Out-Null
Invoke-Wx 'automation_navigate' @('--action','reLaunch','--url','/pkg-trade/quick/index?store=SIM_BJ01','--wait','2') | Out-Null
Eval "function(){var p=getCurrentPages().slice(-1)[0];p.onPickUnit({currentTarget:{dataset:{id:'SIM_BJ01_U03'}}});p.onDate({detail:{value:'2026-12-01'}});return p.route;}" | Out-Null
CheckData 'btnDisabled' $false
Eval "function(){getCurrentPages().slice(-1)[0].onNext();return true;}" | Out-Null
CheckData 'loginVisible' $true
# 仅向当前mock适配器注入取号事件，不调用真实微信取号或真实短信。
Eval "function(){var c=getCurrentPages().slice(-1)[0].selectComponent('#login-sheet');c.onGetPhone({detail:{errMsg:'getPhoneNumber:fail',errno:1400001}});return c.data.mode;}" | Out-Null
Eval "function(){var c=getCurrentPages().slice(-1)[0].selectComponent('#login-sheet');if(c.data.mode!=='sms')throw Error('NO_SMS_FALLBACK');c.onGetPhone({detail:{code:'local-demo'}});return true;}" | Out-Null
CheckData 'btnText' '下一步：确认订单'
Eval "function(){getCurrentPages().slice(-1)[0].onNext();return true;}" | Out-Null
CheckData 'mode' 'compose'
Eval "function(){var p=getCurrentPages().slice(-1)[0];p.onIdv();p.onIdvName({detail:{value:'张明'}});p.onIdvNo({detail:{value:'110101199001010012'}});p.onIdvSubmit();return true;}" | Out-Null
CheckData 'idv.verified' $true
Eval "function(){var p=getCurrentPages().slice(-1)[0];p.onAgree();p.onSign();p.onSignConfirm();return true;}" | Out-Null
CheckData 'phase' 'pending'
Eval "function(){var p=getCurrentPages().slice(-1)[0];p.onPayLater();return p.data.cardOrder.id;}" | Out-Null
# 调用订单页实际取消处理；只mock原生确认框以确认本地演示订单，不涉及真实支付。
$confirmFixture = Join-Path $outDir 'confirm.json'
'{"confirm":true,"cancel":false}' | Set-Content -LiteralPath $confirmFixture
Invoke-Wx 'automation_wx_api' @('--action','mock','--method','showModal','--result-file',(Resolve-Path $confirmFixture).Path) | Out-Null
Eval "function(){getCurrentPages().slice(-1)[0].onCancel();return true;}" | Out-Null
CheckData 'phase' 'cancelled'
Invoke-Wx 'automation_wx_api' @('--action','restore','--method','showModal') | Out-Null
Invoke-Wx 'automation_navigate' @('--action','navigateTo','--url','/pages/store/detail?id=SIM_BJ01') | Out-Null
Eval "function(){getCurrentPages().slice(-1)[0].onBooking();return true;}" | Out-Null
Eval "function(){var c=getCurrentPages().slice(-1)[0].selectComponent('#visit-sheet');c.onCapacity({detail:{value:'3.01'}});c.onSubmit();return true;}" | Out-Null
Eval "function(){var c=getCurrentPages().slice(-1)[0].selectComponent('#visit-sheet');if(!c.data.success)throw Error(c.data.error||'NO_VISIT_RECEIPT');return {submitted:true};}" | Out-Null
Invoke-Wx 'get_simulator_console' @('--command','grep -i error') | Out-Null
Write-Output 'Native functional flow completed'
