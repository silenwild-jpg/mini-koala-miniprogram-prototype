param([string]$Run = 'initial')
$ErrorActionPreference = 'Stop'
$wxCli = 'C:\Program Files (x86)\Tencent\微信web开发者工具\wechatide.cmd'
$wxProject = (Resolve-Path (Join-Path $PSScriptRoot '../miniprogram')).Path
$sourceManifest = Get-Content (Join-Path $PSScriptRoot '../evidence/inventory-display-20261120/source-manifest.json') -Raw | ConvertFrom-Json
foreach ($entry in $sourceManifest.files.PSObject.Properties) {
  if ((Get-FileHash -LiteralPath (Join-Path $wxProject $entry.Name) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.Value) { throw "Candidate runtime changed: $($entry.Name)" }
}
$outDir = Join-Path $PSScriptRoot "../evidence/next-stage-20261120/INV-DENSITY-02B/cbffc52201ab61b0896887a46520e4388ac70c70/$Run"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$outDir = (Resolve-Path $outDir).Path
$receipts = [System.Collections.Generic.List[object]]::new()
function Save-Receipts { [IO.File]::WriteAllText((Join-Path $outDir 'receipts.json'), (ConvertTo-Json -InputObject @($receipts) -Depth 45).Replace("`r`n","`n")) }
function Invoke-Wx([string]$Tool, [string[]]$Params) {
  $lines = & $wxCli -c codex $Tool --project $wxProject @Params 2>&1 | Out-String
  $start = $lines.IndexOf('{')
  if ($start -lt 0) { throw $lines }
  $result = $lines.Substring($start, $lines.LastIndexOf('}') - $start + 1) | ConvertFrom-Json
  $receipts.Add([pscustomobject]@{ tool=$Tool; parameters=$Params; receipt=$result; time=(Get-Date).ToString('o') })
  Save-Receipts
  if ($result.ok -ne $true -or $result.result.success -eq $false) { throw $lines }
  return $result.result
}
function Eval([string]$Code) { Invoke-Wx 'automation_evaluate' @('--fn-source',$Code) | Out-Null }
function Navigate([string]$Url, [string]$Action = 'reLaunch') { Invoke-Wx 'automation_navigate' @('--action',$Action,'--url',$Url,'--wait','1') | Out-Null }
function Shot([string]$Name) { Invoke-Wx 'simulator_screenshot' @('--path',(Join-Path $outDir "$Name.png"),'--optimize','false') | Out-Null; Write-Output "Captured $Name" }
function Capacity([string]$Value) {
  Navigate '/pages/estimate/capacity'
  Invoke-Wx 'automation_element_action' @('--selector','.cp-input','--action','input','--value',$Value) | Out-Null
  Invoke-Wx 'automation_element_action' @('--selector','.cp-submit','--action','tap') | Out-Null
}
# Only this project's mk_state_v1 demo state is reset. No real account/payment/CRM calls.
foreach ($width in @(375,390)) {
  Eval "function(){wx.removeStorageSync('mk_state_v1');return true;}"
  Invoke-Wx 'simulator_refresh' @() | Out-Null
  $device = if ($width -eq 390) { 'iPhone 12/13 (Pro)' } else { 'iPhone 12/13 mini' }
  Invoke-Wx 'simulator_set_device' @('--device',$device) | Out-Null
  Navigate '/pages/home/index' 'switchTab'
  Invoke-Wx 'automation_runtime_info' @('--action','systemInfo') | Out-Null
  Shot "H01-guest-$width"
  Navigate '/pages/stores/index' 'switchTab'
  Eval "function(){var p=getCurrentPages().slice(-1)[0];p.hideBubble();return true;}"
  Shot "D01-stores-browse-$width"
  Capacity '3.01'
  Shot "D06-match-guest-$width"
  Navigate '/pages/stores/index' 'switchTab'
  Eval "function(){getCurrentPages().slice(-1)[0].hideBubble();return true;}"
  Shot "D02-stores-demand-$width"
  Navigate '/pages/store/detail?id=SIM_BJ01'
  Shot "D10-store-dims-$width"
  Invoke-Wx 'automation_element_action' @('--selector','.sd-visit','--action','tap') | Out-Null
  Shot "D15-visit-form-$width"
  Eval "function(){var c=getCurrentPages().slice(-1)[0].selectComponent('#visit-sheet');c.onSubmit();return true;}"
  Shot "D16-visit-validation-$width"
  Eval "function(){getCurrentPages().slice(-1)[0].onVisitClose();return true;}"
  Eval "function(){getCurrentPages().slice(-1)[0].onTab({currentTarget:{dataset:{i:2}}});return true;}"
  Shot "D14-store-route-$width"
  Capacity '30.01'
  Invoke-Wx 'automation_page_action' @('--action','getData','--data-path','mode') | Out-Null
  Shot "D05-match-near-$width"
  Navigate '/pages/store/detail?id=SIM_BJ01'
  Shot "D09-store-no-match-$width"
  Capacity '3.01'
  Navigate '/pkg-trade/quick/index?store=SIM_BJ01'
  Eval "function(){getCurrentPages().slice(-1)[0].onStoreSheet();return true;}"
  Shot "D17-store-sheet-$width"
  Eval "function(){var p=getCurrentPages().slice(-1)[0];p.onStoreSheetClose();p.onPickUnit({currentTarget:{dataset:{id:'SIM_BJ01_U03'}}});p.onDate({detail:{value:'2026-12-01'}});return true;}"
  Shot "D19-quick-guest-$width"
  Eval "function(){getCurrentPages().slice(-1)[0].onNext();return true;}"
  Shot "D19-login-$width"
  Eval "function(){var c=getCurrentPages().slice(-1)[0].selectComponent('#login-sheet');c.onGetPhone({detail:{code:'local-demo'}});return true;}"
  Invoke-Wx 'automation_page_action' @('--action','getData','--data-path','est','--wait','1') | Out-Null
  Shot "D20-quick-member-$width"
  Eval "function(){getCurrentPages().slice(-1)[0].onFees();return true;}"
  Shot "D20-quick-fees-$width"
  Navigate '/pages/stores/index' 'switchTab'
  Eval "function(){getCurrentPages().slice(-1)[0].hideBubble();return true;}"
  Shot "D03-stores-member-$width"
  Navigate '/pages/match/index'
  Shot "D07-match-member-$width"
  Navigate '/pages/store/detail?id=SIM_BJ01'
  Shot "D10-store-member-$width"
  # Explicit visual fixture: reserve every unit on this page's isolated copy, then run the real view model.
  Eval "function(){var p=getCurrentPages().slice(-1)[0];p._store=JSON.parse(JSON.stringify(p._store));p._store.units.forEach(function(u){u.status='reserved';});p.paint();return {fixture:'all-units-reserved-on-page-copy',situation:p.data.situation};}"
  Shot "D13-store-soldout-fixture-$width"
  Navigate '/pkg-trade/quick/index?store=SIM_BJ01'
  # Isolated per-page fixture; never writes source inventory or server orders.
  Eval "function(){var p=getCurrentPages().slice(-1)[0];p._stores=JSON.parse(JSON.stringify(p._stores));p._stores.forEach(function(s){s.units.forEach(function(u){u.status='reserved';});});p.onStoreSheet();return {fixture:'all-units-reserved-on-page-copy',rows:p.data.storeRows};}"
  Shot "D18-store-sheet-soldout-fixture-$width"
}
Invoke-Wx 'get_simulator_console' @('--command','grep -n .') | Out-Null
Write-Output "Density capture saved: $outDir"
