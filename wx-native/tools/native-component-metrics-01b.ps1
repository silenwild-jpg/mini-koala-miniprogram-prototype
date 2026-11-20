param([Parameter(Mandatory=$true)][string]$Candidate,[string]$Task='COMPONENT-PILOT-01B',[string]$ReceiptName='metrics-geometry-receipts.json')
$ErrorActionPreference='Stop'
$wxCli='C:\Program Files (x86)\Tencent\微信web开发者工具\wechatide.cmd'
$wxProject=(Resolve-Path (Join-Path $PSScriptRoot '../miniprogram')).Path
$outDir=(Resolve-Path (Join-Path $PSScriptRoot "../evidence/next-stage-20261120/$Task/$Candidate")).Path
$manifest=Get-Content (Join-Path $outDir 'source-manifest.json') -Raw|ConvertFrom-Json
foreach($entry in $manifest.files.PSObject.Properties){if((Get-FileHash -LiteralPath (Join-Path $wxProject $entry.Name) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.Value){throw "Candidate changed: $($entry.Name)"}}
$receipts=[System.Collections.Generic.List[object]]::new()
function Unwrap($Value){while($Value -and ($Value.PSObject.Properties.Name -contains 'result')){$Value=$Value.result};return $Value}
function Invoke-Wx([string]$Tool,[string[]]$Params){
 $raw=& $wxCli -c codex $Tool --project $wxProject @Params 2>&1|Out-String
 $start=$raw.IndexOf('{');if($start -lt 0){throw $raw}
 $r=$raw.Substring($start,$raw.LastIndexOf('}')-$start+1)|ConvertFrom-Json
 $receipts.Add([pscustomobject]@{tool=$Tool;parameters=$Params;receipt=$r;time=(Get-Date).ToString('o')})
 [IO.File]::WriteAllText((Join-Path $outDir $ReceiptName),(ConvertTo-Json -InputObject @($receipts) -Depth 45).Replace("`r`n","`n"))
 if($r.ok -ne $true -or $r.result.success -eq $false){throw $raw};return $r.result
}
function Eval([string]$Code){return Unwrap (Invoke-Wx 'automation_evaluate' @('--fn-source',$Code))}
foreach($width in @(375,390)){
 $device=if($width -eq 375){'iPhone 12/13 mini'}else{'iPhone 12/13 (Pro)'}
 Invoke-Wx 'simulator_set_device' @('--device',$device)|Out-Null
 Invoke-Wx 'automation_navigate' @('--action','reLaunch','--url','/pkg-trade/quick/index?store=SIM_BJ01','--wait','1')|Out-Null
 Eval "function(){getCurrentPages().slice(-1)[0].setData({loginVisible:true});return true;}"|Out-Null
 $metrics=Eval "function(){return new Promise(function(resolve){var q=wx.createSelectorQuery();q.select('#login-sheet >>> .sh-close').boundingClientRect();q.select('#login-sheet >>> .lg-purpose').fields({computedStyle:['color','font-size']});q.exec(function(r){resolve({close:r[0]||null,purpose:r[1]||null});});});}"
 if(!$metrics.close){throw 'Cross-component public selector did not return close geometry'}
 if($metrics.close.width -lt 48 -or $metrics.close.height -lt 48){throw 'Measured close target is below 48 logical pixels'}
 if(!$metrics.purpose -or ($metrics.purpose.color -replace '\s','') -notin @('rgb(95,107,101)','#5f6b65','#5F6B65','rgba(95,107,101,1)')){throw 'Normal login purpose text did not resolve to the secondary color'}
 Write-Output "Measured $width close target: $($metrics.close.width) x $($metrics.close.height); secondary text color PASS; edge tap UNVERIFIED (native coordinate API unsupported)"
}
Invoke-Wx 'automation_navigate' @('--action','switchTab','--url','/pages/stores/index','--wait','1')|Out-Null
Invoke-Wx 'get_simulator_console' @('--command','grep -n .')|Out-Null
