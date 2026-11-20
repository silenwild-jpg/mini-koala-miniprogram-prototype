param([string]$Round = 'round1')
$ErrorActionPreference = 'Stop'
$wxCli = 'C:\Program Files (x86)\Tencent\微信web开发者工具\wechatide.cmd'
$wxProject = (Resolve-Path (Join-Path $PSScriptRoot '../miniprogram')).Path
$outDir = Join-Path $PSScriptRoot "../evidence/20261120/$Round"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$receipts = [System.Collections.Generic.List[object]]::new()
function Invoke-Wx([string]$Tool, [string[]]$Params) {
  $lines = & $wxCli -c codex $Tool --project $wxProject @Params 2>&1 | Out-String
  $start = $lines.IndexOf('{')
  if ($start -lt 0) { throw $lines }
  $result = $lines.Substring($start, $lines.LastIndexOf('}') - $start + 1) | ConvertFrom-Json
  $receipts.Add([pscustomobject]@{ tool=$Tool; parameters=$Params; receipt=$result })
  if ($result.ok -ne $true -or $result.result.success -eq $false) { throw $lines }
  return $result.result
}
function Shot([string]$Name) { Invoke-Wx 'simulator_screenshot' @('--path', (Join-Path (Resolve-Path $outDir) "$Name.png"), '--optimize', 'false') | Out-Null }
Invoke-Wx 'automation_evaluate' @('--fn-source',"function(){wx.removeStorageSync('mk_state_v1');return true;}") | Out-Null
Invoke-Wx 'simulator_refresh' @() | Out-Null
foreach ($width in @(390,375)) {
  $device = if ($width -eq 390) { 'iPhone 12/13 (Pro)' } else { 'iPhone 12/13 mini' }
  Invoke-Wx 'simulator_set_device' @('--device',$device) | Out-Null
  Invoke-Wx 'automation_navigate' @('--action','switchTab','--url','/pages/home/index','--wait','2') | Out-Null
  Invoke-Wx 'automation_runtime_info' @('--action','systemInfo') | Out-Null
  Shot "home-$width"
  Invoke-Wx 'automation_navigate' @('--action','reLaunch','--url','/pages/estimate/capacity','--wait','2') | Out-Null
  Invoke-Wx 'automation_element_action' @('--selector','.cp-input','--action','input','--value','3.01') | Out-Null
  Shot "cap-normal-$width"
  Invoke-Wx 'automation_element_action' @('--selector','.cp-submit','--action','tap') | Out-Null
  Shot "match-normal-$width"
  Invoke-Wx 'automation_navigate' @('--action','reLaunch','--url','/pages/estimate/capacity') | Out-Null
  Invoke-Wx 'automation_element_action' @('--selector','.cp-input','--action','input','--value','30.01') | Out-Null
  Shot "cap-large-$width"
  Invoke-Wx 'automation_element_action' @('--selector','.cp-submit','--action','tap') | Out-Null
  Shot "match-large-$width"
  Invoke-Wx 'automation_page_action' @('--action','getData','--data-path','mode') | Out-Null
  Invoke-Wx 'automation_navigate' @('--action','navigateTo','--url','/pages/store/detail?id=SIM_BJ01') | Out-Null
  Shot "store-$width"
  Invoke-Wx 'automation_element_action' @('--selector','.sd-visit','--action','tap') | Out-Null
  Shot "visit-$width"
  Invoke-Wx 'automation_navigate' @('--action','reLaunch','--url','/pkg-trade/quick/index?store=SIM_BJ01') | Out-Null
  Invoke-Wx 'automation_evaluate' @('--fn-source',"function(){var p=getCurrentPages().slice(-1)[0];p.onPickUnit({currentTarget:{dataset:{id:'SIM_BJ01_U03'}}});p.onDate({detail:{value:'2026-12-01'}});return true;}") | Out-Null
  Shot "quick-$width"
}
Invoke-Wx 'automation_page_action' @('--action','callMethod','--method','onNext') | Out-Null
Invoke-Wx 'automation_evaluate' @('--fn-source',"function(){var c=getCurrentPages().slice(-1)[0].selectComponent('#login-sheet');c.onGetPhone({detail:{code:'local-demo'}});return true;}") | Out-Null
Invoke-Wx 'automation_page_action' @('--action','callMethod','--method','onNext','--wait','1') | Out-Null
foreach ($width in @(375,390)) {
  $device = if ($width -eq 390) { 'iPhone 12/13 (Pro)' } else { 'iPhone 12/13 mini' }
  Invoke-Wx 'simulator_set_device' @('--device',$device) | Out-Null
  Invoke-Wx 'automation_navigate' @('--action','reLaunch','--url','/pkg-trade/confirm/index?unit=SIM_BJ01_U03','--wait','2') | Out-Null
  Shot "confirm-$width"
}
Invoke-Wx 'get_simulator_console' @('--command','grep -n .') | Out-Null
$receipts | ConvertTo-Json -Depth 35 | Set-Content -LiteralPath (Join-Path $outDir 'receipts.json')
Write-Output "Native round saved: $outDir"
