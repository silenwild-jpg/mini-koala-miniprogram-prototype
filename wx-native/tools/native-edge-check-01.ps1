param([Parameter(Mandatory=$true)][string]$Candidate,[ValidateSet(375,390)][int]$Width=375,[ValidateSet('before','after')][string]$Stage='before')
$ErrorActionPreference='Stop'
$cli='C:\Program Files (x86)\Tencent\微信web开发者工具\wechatide.cmd'
$project=(Resolve-Path (Join-Path $PSScriptRoot '../miniprogram')).Path
$out=(Resolve-Path (Join-Path $PSScriptRoot "../evidence/next-stage-20261120/COLLAB-SETUP-01/$Candidate")).Path
$receiptFile=Join-Path $out "edge-receipts-$Width.json"
$log=[System.Collections.Generic.List[object]]::new()
if(Test-Path -LiteralPath $receiptFile){foreach($r in (Get-Content -LiteralPath $receiptFile -Raw|ConvertFrom-Json)){$log.Add($r)}}
function Call-Wx($Tool,[string[]]$Params){
 $raw=& $cli -c codex $Tool --project $project @Params 2>&1|Out-String;$i=$raw.IndexOf('{');if($i -lt 0){throw 'No native receipt'}
 $r=$raw.Substring($i,$raw.LastIndexOf('}')-$i+1)|ConvertFrom-Json;$log.Add([pscustomobject]@{tool=$Tool;parameters=$Params;receipt=$r;time=(Get-Date).ToString('o')})
 [IO.File]::WriteAllText($receiptFile,(ConvertTo-Json -InputObject @($log) -Depth 40).Replace("`r`n","`n"))
 if(!$r.ok -or $r.result.success -eq $false){throw $raw};return $r.result
}
function Eval($Code){$v=Call-Wx 'automation_evaluate' @('--fn-source',$Code);while($v.PSObject.Properties.Name -contains 'result'){$v=$v.result};return $v}
if($Stage -eq 'before'){
 $device=if($Width -eq 375){'iPhone 12/13 mini'}else{'iPhone 12/13 (Pro)'}
 Call-Wx 'simulator_set_device' @('--device',$device)|Out-Null
 Call-Wx 'automation_navigate' @('--action','reLaunch','--url','/pkg-trade/quick/index?store=SIM_BJ01','--wait','1')|Out-Null
 Eval "function(){wx.setStorageSync('mk_state_v1',{});getApp().onLaunch();return true;}"|Out-Null
 Call-Wx 'automation_navigate' @('--action','reLaunch','--url','/pkg-trade/quick/index?store=SIM_BJ01','--wait','1')|Out-Null
 Eval "function(){var p=getCurrentPages().slice(-1)[0];p.onPickUnit({currentTarget:{dataset:{id:'SIM_BJ01_U03'}}});p.onDate({detail:{value:'2026-12-01'}});p.onNext();return {loginVisible:p.data.loginVisible};}"|Out-Null
}
$obs=Eval "function(){var p=getCurrentPages().slice(-1)[0];return {route:p.route,sys:p.data.sys||'',closed:!p.data.loginVisible,info:wx.getSystemInfoSync()};}"
if($Stage -eq 'after' -and !$obs.closed){throw 'Edge click did not close sheet'}
if($Stage -eq 'before'){
 $bounds=Eval "function(){return new Promise(function(resolve){wx.createSelectorQuery().select('#login-sheet >>> .sh-close').boundingClientRect(function(r){resolve(r);}).exec();});}"
 [IO.File]::WriteAllText((Join-Path $out "edge-bounds-$Width.json"),($bounds|ConvertTo-Json -Depth 8))
 Write-Output ($bounds|ConvertTo-Json -Compress)
}
$page=if($Stage -eq 'before'){'LOGIN'}else{'QUICK'}
$name="C11__${page}__edge-${Stage}__${Width}__sim__$($Candidate.Substring(0,7)).png"
$shot=Call-Wx 'simulator_screenshot' @('--path',(Join-Path $out $name),'--optimize','false')
$record=[pscustomobject]@{file=$name;scene_id='C11';page_id=$page;state="edge-$Stage";fixture_id='NONE';pre_actions="actual guest gate; $Stage expanded-edge desktop click; native result checked";observation=$obs;image_width=$shot.imageWidth;image_height=$shot.imageHeight;runtime_sha=$Candidate}
[IO.File]::WriteAllText((Join-Path $out "shots-edge-$Width-$Stage.json"),(ConvertTo-Json -InputObject @($record) -Depth 30).Replace("`r`n","`n"))
if($Stage -eq 'after'){Call-Wx 'automation_navigate' @('--action','switchTab','--url','/pages/stores/index','--wait','1')|Out-Null}
