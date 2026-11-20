param([Parameter(Mandatory=$true)][string]$Candidate)
$ErrorActionPreference='Stop'
$wxCli='C:\Program Files (x86)\Tencent\微信web开发者工具\wechatide.cmd'
$wxProject=(Resolve-Path (Join-Path $PSScriptRoot '../miniprogram')).Path
$outDir=(Resolve-Path (Join-Path $PSScriptRoot "../evidence/next-stage-20261120/INV-DENSITY-FIX-01/$Candidate")).Path
$manifest=Get-Content (Join-Path $outDir 'source-manifest.json') -Raw | ConvertFrom-Json
foreach($entry in $manifest.files.PSObject.Properties){if((Get-FileHash -LiteralPath (Join-Path $wxProject $entry.Name) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.Value){throw "Runtime changed: $($entry.Name)"}}
$receipts=[System.Collections.Generic.List[object]]::new()
function Invoke-Wx([string]$Tool,[string[]]$Params){
 $raw=& $wxCli -c codex $Tool --project $wxProject @Params 2>&1 | Out-String
 $start=$raw.IndexOf('{');if($start -lt 0){throw $raw}
 $r=$raw.Substring($start,$raw.LastIndexOf('}')-$start+1)|ConvertFrom-Json
 $receipts.Add([pscustomobject]@{tool=$Tool;parameters=$Params;receipt=$r;time=(Get-Date).ToString('o')})
 [IO.File]::WriteAllText((Join-Path $outDir 'native-receipts.json'),(ConvertTo-Json -InputObject @($receipts) -Depth 45).Replace("`r`n","`n"))
 if($r.ok -ne $true -or $r.result.success -eq $false){throw $raw};return $r.result
}
function Eval([string]$Code){Invoke-Wx 'automation_evaluate' @('--fn-source',$Code)|Out-Null}
function Nav([string]$Url,[string]$Action='reLaunch'){Invoke-Wx 'automation_navigate' @('--action',$Action,'--url',$Url,'--wait','1')|Out-Null}
function Shot([string]$Name){Eval "function(){wx.pageScrollTo({scrollTop:0,duration:0});return true;}";Invoke-Wx 'simulator_screenshot' @('--path',(Join-Path $outDir "$Name.png"),'--optimize','false')|Out-Null;Write-Output "Confirmed $Name"}
function Capacity([string]$Value){Nav '/pages/estimate/capacity';Invoke-Wx 'automation_element_action' @('--selector','.cp-input','--action','input','--value',$Value)|Out-Null;Invoke-Wx 'automation_element_action' @('--selector','.cp-submit','--action','tap')|Out-Null}
Eval "function(){wx.removeStorageSync('mk_state_v1');return true;}"
Invoke-Wx 'simulator_refresh' @()|Out-Null
foreach($width in @(375,390)){
 $device=if($width -eq 375){'iPhone 12/13 mini'}else{'iPhone 12/13 (Pro)'}
 Invoke-Wx 'simulator_set_device' @('--device',$device)|Out-Null
 Nav '/pages/home/index' 'switchTab'
 Invoke-Wx 'automation_runtime_info' @('--action','systemInfo')|Out-Null
 Capacity '3.01';Shot "confirm-normal-$width"
 Nav '/pages/stores/index' 'switchTab';Eval "function(){getCurrentPages().slice(-1)[0].hideBubble();return true;}";Shot "confirm-stores-$width"
 Capacity '30.01';Shot "confirm-near-combo-$width"
 Invoke-Wx 'automation_evaluate' @('--fn-source',"function(patch){getCurrentPages().slice(-1)[0].setData(patch);return {fixture:'render-only-31m3-combo',cards:getCurrentPages().slice(-1)[0].data.cards};}",'--args-file',(Join-Path $outDir 'combo-render-args.json'))|Out-Null
 Shot "confirm-enough-combo-fixture-$width"
}
Nav '/pages/match/index'
Invoke-Wx 'get_simulator_console' @('--command','grep -n .')|Out-Null
Write-Output "Confirmation saved: $outDir"
