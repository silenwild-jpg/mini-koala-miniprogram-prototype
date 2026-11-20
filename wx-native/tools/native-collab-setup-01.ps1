param([Parameter(Mandatory=$true)][string]$Candidate,[int[]]$Widths=@(375,390),[string]$ReceiptName='native-receipts.json',[switch]$SupplementOnly,[switch]$HomeOnly,[switch]$AffectedOnly)
$ErrorActionPreference='Stop'
$wxCli='C:\Program Files (x86)\Tencent\微信web开发者工具\wechatide.cmd'
$wxProject=(Resolve-Path (Join-Path $PSScriptRoot '../miniprogram')).Path
$outDir=(Resolve-Path (Join-Path $PSScriptRoot "../evidence/next-stage-20261120/COLLAB-SETUP-01/$Candidate")).Path
$manifest=Get-Content (Join-Path $outDir 'source-manifest.json') -Raw|ConvertFrom-Json
if(@($manifest.files.PSObject.Properties).Count -ne 421){throw 'Expected complete421-file manifest'}
foreach($entry in $manifest.files.PSObject.Properties){if((Get-FileHash -LiteralPath (Join-Path $wxProject $entry.Name) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.Value){throw "Candidate changed: $($entry.Name)"}}
$receipts=[System.Collections.Generic.List[object]]::new();$shots=[System.Collections.Generic.List[object]]::new()
function Save-Json($File,$Value){[IO.File]::WriteAllText((Join-Path $outDir $File),(ConvertTo-Json -InputObject @($Value) -Depth 45).Replace("`r`n","`n"))}
function Unwrap($Value){while($Value -and ($Value.PSObject.Properties.Name -contains 'result')){$Value=$Value.result};return $Value}
function Invoke-Wx([string]$Tool,[string[]]$Params){
 $raw=& $wxCli -c codex $Tool --project $wxProject @Params 2>&1|Out-String
 $start=$raw.IndexOf('{');if($start -lt 0){throw $raw}
 $r=$raw.Substring($start,$raw.LastIndexOf('}')-$start+1)|ConvertFrom-Json
 $receipts.Add([pscustomobject]@{tool=$Tool;parameters=$Params;receipt=$r;time=(Get-Date).ToString('o')});Save-Json $ReceiptName $receipts
 if($r.ok -ne $true -or $r.result.success -eq $false){throw $raw};return $r.result
}
function Eval([string]$Code){return Unwrap (Invoke-Wx 'automation_evaluate' @('--fn-source',$Code))}
function Nav([string]$Url,[string]$Action='reLaunch'){Invoke-Wx 'automation_navigate' @('--action',$Action,'--url',$Url,'--wait','1')|Out-Null}
function Shot([string]$Scene,[string]$Page,[string]$State,[string]$Fixture,[string]$Pre){
 $obs=Eval "function(){var p=getCurrentPages().slice(-1)[0];return {route:p.route,sys:p.data.sys||'',phoneError:p.selectComponent('#visit-sheet')&&p.selectComponent('#visit-sheet').data.phoneError,info:wx.getSystemInfoSync()};}"
 if($obs.sys){throw "Page not ready: $($obs.route) $($obs.sys)"}
 $file="${Scene}__${Page}__${State}__${width}__sim__$($Candidate.Substring(0,7)).png"
 $r=Invoke-Wx 'simulator_screenshot' @('--path',(Join-Path $outDir $file),'--optimize','false')
 $shots.Add([pscustomobject]@{file=$file;scene_id=$Scene;page_id=$Page;state=$State;fixture_id=$Fixture;pre_actions=$Pre;observation=$obs;image_width=$r.imageWidth;image_height=$r.imageHeight;runtime_sha=$Candidate})
 $shotPrefix=if($HomeOnly){'shots-home-'}elseif($SupplementOnly){'shots-supplement-'}else{'shots-'}
 Save-Json ($shotPrefix+$width+'.json') $shots;Write-Output "Captured $file ($($r.imageWidth)x$($r.imageHeight))"
}
function Capacity([string]$Value){
 Nav '/pages/estimate/capacity'
 Eval "function(){var p=getCurrentPages().slice(-1)[0];p.onUnit({currentTarget:{dataset:{u:'m3'}}});p.onTerm({detail:{months:12}});return true;}"|Out-Null
 Invoke-Wx 'automation_element_action' @('--selector','.cp-input','--action','input','--value',$Value)|Out-Null
 Invoke-Wx 'automation_element_action' @('--selector','.cp-submit','--action','tap')|Out-Null
 Eval "function(){var d=getCurrentPages().slice(-1)[0].data;if(d.capUnit!=='m³'||d.term!==12)throw Error('Fixture unit/term mismatch');return true;}"|Out-Null
}
foreach($width in $Widths){
 $shots.Clear()
 $device=if($width -eq 375){'iPhone 12/13 mini'}else{'iPhone 12/13 (Pro)'}
 Invoke-Wx 'simulator_set_device' @('--device',$device)|Out-Null
 Invoke-Wx 'automation_navigate' @('--action','switchTab','--url','/pages/home/index','--wait','2')|Out-Null
 Eval "function(){wx.setStorageSync('mk_state_v1',{});getApp().onLaunch();getApp().globalData.find=null;return true;}"|Out-Null
 Nav '/pages/home/index' 'switchTab'
 if($HomeOnly){
   Nav '/pages/home/index'
   Shot 'C01' 'H01' 'guest-fresh-launch' 'NONE' 'clear demo session; reLaunch home to reconstruct cached components; supersedes guest-default capture'
   continue
 }
 if($SupplementOnly){
   Nav '/pkg-trade/quick/index?store=SIM_BJ01'
   Invoke-Wx 'automation_element_action' @('--selector','mk-term-seg .ts-cell:last-child','--action','tap')|Out-Null
   Shot 'C09' 'QUICK' 'term-other-sheet' 'NONE' 'actual cross-component selector tap on Other term; no confirm'
   continue
 }
 if(!$AffectedOnly){
 Shot 'C01' 'H01' 'guest-default' 'NONE' 'clear demo state; launch; home'
 Capacity '3.01';Shot 'C02' 'S5' 'guest-full' 'NONE' 'CAP input 3.01m3; select12; submit actual input/tap'
 Capacity '10'
 Invoke-Wx 'automation_evaluate' @('--fn-source','function(patch){getCurrentPages().slice(-1)[0].setData(patch);return true;}','--args-file',(Join-Path $outDir 'near8-args.json'))|Out-Null
 Shot 'C03' 'S5' 'guest-near-single' 'NEAR8_PAGE_RENDER' '10m3/12months; page instance injected from real view model; no actual inventory change/order'
 }
 Capacity '3.01';Nav '/pkg-trade/quick/index?store=SIM_BJ01'
 Eval "function(){var p=getCurrentPages().slice(-1)[0];p.onPickUnit({currentTarget:{dataset:{id:'SIM_BJ01_U03'}}});p.onDate({detail:{value:'2026-12-01'}});p.onNext();return true;}"|Out-Null
 if(!$AffectedOnly){Shot 'C05' 'LOGIN' 'guest-quote-gate' 'NONE' 'QUICK choose demo unit/date; invoke next public handler; quote gate'}
 Eval "function(){var c=getCurrentPages().slice(-1)[0].selectComponent('#login-sheet');if(!c.data.agreed)c.onToggleAgree();c.onGetPhone({detail:{code:'local-demo'}});return true;}"|Out-Null
 Invoke-Wx 'automation_page_action' @('--action','getData','--data-path','est','--wait','1')|Out-Null
 if(!$AffectedOnly){
 Nav '/pkg-trade/confirm/index?unit=SIM_BJ01_U03&term=12&date=2026-12-01'
 Shot 'C04' 'O01' 'member-confirm' 'NONE' 'local-demo login; actual confirm route with unit/term/date; no create/pay'
 Nav '/pages/orders/index' 'switchTab'
 $orderId=Eval "function(){var os=getCurrentPages().slice(-1)[0].data.orders;var o=os.find(function(x){return x.stage==='active';})||os[0];if(!o)throw Error('No seeded demo order');return o.id;}"
 Nav ('/pkg-trade/order/index?id='+$orderId)
 Shot 'C06' 'O03' 'member-seeded-order' 'SEEDED_MOCK_ORDER' 'read seeded demo order list; navigate returned ID; no order creation'
 }
 Nav '/pages/store/detail?id=SIM_BJ01'
 Shot 'C07' 'S02' 'header-readable' 'NONE' 'actual detail route; 3.1m3/12 months carried; local-demo member'
 Eval "function(){return new Promise(function(resolve){var q=wx.createSelectorQuery();['.sd-hours','.sd-share','.sd-at','.sd-visit'].forEach(function(s){q.select(s).fields({rect:true,size:true,computedStyle:['white-space','line-height']});});q.exec(function(r){resolve({headerMetrics:r});});});}"|Out-Null
 Eval "function(){getCurrentPages().slice(-1)[0].onBooking();return true;}"|Out-Null
 Eval "function(){var c=getCurrentPages().slice(-1)[0].selectComponent('#visit-sheet');c.onPhone({detail:{value:'123'}});c.onSubmit();return {phoneError:c.data.phoneError,phoneFocus:c.data.phoneFocus};}"|Out-Null
 Shot 'C08' 'S02' 'visit-phone-error' 'INVALID_PHONE_123' 'invoke booking public handler; invalid123; submit; no lead submitted'
 Eval "function(){return new Promise(function(resolve){var q=wx.createSelectorQuery();q.select('#visit-sheet >>> .vs-phone-field').boundingClientRect();q.select('#visit-sheet >>> .vs-phone-error').boundingClientRect();q.exec(function(r){resolve({phoneErrorMetrics:r});});});}"|Out-Null
 Eval "function(){var p=getCurrentPages().slice(-1)[0],c=p.selectComponent('#visit-sheet');c.onPhoneBlur();wx.hideKeyboard();p.onVisitClose();p.onModify();return true;}"|Out-Null
 Shot 'C10' 'S02' 'demand-edit-sheet' 'NONE' 'close visit; invoke existing modify requirement handler; no save'
 if(!$AffectedOnly){
 Nav '/pkg-trade/quick/index?store=SIM_BJ01'
 Invoke-Wx 'automation_element_action' @('--selector','mk-term-seg .ts-cell:last-child','--action','tap')|Out-Null
 Shot 'C09' 'QUICK' 'term-other-sheet' 'NONE' 'actual selector tap on Other term; no confirm'
 }
}
Nav '/pages/stores/index' 'switchTab'
Invoke-Wx 'get_simulator_console' @('--command','grep -n .')|Out-Null
