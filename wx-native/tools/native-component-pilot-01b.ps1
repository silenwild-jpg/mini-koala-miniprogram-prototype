param([Parameter(Mandatory=$true)][string]$Candidate,[string]$Task='COMPONENT-PILOT-01B',[switch]$SkipDefaultPages,[int[]]$Widths=@(375,390),[string]$ReceiptName='native-receipts.json')
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
function Nav([string]$Url,[string]$Action='reLaunch'){Invoke-Wx 'automation_navigate' @('--action',$Action,'--url',$Url,'--wait','1')|Out-Null}
function Shot([string]$Name){
 Eval "function(){wx.pageScrollTo({scrollTop:0,duration:0});var p=getCurrentPages().slice(-1)[0],d=p.data;return {capture:'$Name',route:p.route,sys:d.sys||'',empty:!!d.empty,state:d.st||d.phase||d.mode||'',tab:d.tab};}"|Out-Null
 Invoke-Wx 'simulator_screenshot' @('--path',(Join-Path $outDir "$Name.png"),'--optimize','false')|Out-Null
 Write-Output "Captured $Name"
}
function Capacity([string]$Value){
 Nav '/pages/estimate/capacity'
 Eval "function(){var p=getCurrentPages().slice(-1)[0];p.onUnit({currentTarget:{dataset:{u:'m3'}}});p.onTerm({detail:{months:12}});return {unit:p.data.unit,term:p.data.term};}"|Out-Null
 Invoke-Wx 'automation_element_action' @('--selector','.cp-input','--action','input','--value',$Value)|Out-Null
 Invoke-Wx 'automation_element_action' @('--selector','.cp-submit','--action','tap')|Out-Null
 Eval "function(){var p=getCurrentPages().slice(-1)[0];if(p.data.capUnit!=='m³'||p.data.term!==12)throw Error('Capacity fixture must use m3 and 12 months');return {cap:p.data.capNum,unit:p.data.capUnit,term:p.data.term};}"|Out-Null
}
function Patch([string]$File){Invoke-Wx 'automation_evaluate' @('--fn-source',"function(patch){var p=getCurrentPages().slice(-1)[0];p.setData(patch);return {fixture:true,route:p.route,mode:p.data.mode};}",'--args-file',(Join-Path $outDir $File))|Out-Null}
$app=Get-Content (Join-Path $wxProject 'app.json') -Raw|ConvertFrom-Json
$routes=@($app.pages);foreach($package in $app.subpackages){foreach($page in $package.pages){$routes+=($package.root+'/'+$page)}}
$tabs=@($app.tabBar.list|ForEach-Object{$_.pagePath})
foreach($width in $Widths){
 Eval "function(){wx.removeStorageSync('mk_state_v1');return true;}"|Out-Null
 Invoke-Wx 'simulator_refresh' @()|Out-Null
 $device=if($width -eq 375){'iPhone 12/13 mini'}else{'iPhone 12/13 (Pro)'}
 Invoke-Wx 'simulator_set_device' @('--device',$device)|Out-Null
 Invoke-Wx 'automation_navigate' @('--action','switchTab','--url','/pages/home/index','--wait','2')|Out-Null
 Eval "function(){wx.setStorageSync('mk_state_v1',{});getApp().onLaunch();getApp().globalData.find=null;return true;}"|Out-Null
 Invoke-Wx 'automation_runtime_info' @('--action','systemInfo')|Out-Null
 Capacity '3.01'
 Nav '/pkg-trade/quick/index?store=SIM_BJ01'
 Eval "function(){var p=getCurrentPages().slice(-1)[0];p.onPickUnit({currentTarget:{dataset:{id:'SIM_BJ01_U03'}}});p.onDate({detail:{value:'2026-12-01'}});return true;}"|Out-Null
 Eval "function(){getCurrentPages().slice(-1)[0].onNext();return true;}"|Out-Null
 Shot "target-login-$width"
 $close=Eval "function(){var c=getCurrentPages().slice(-1)[0].selectComponent('#login-sheet');var s=c&&c.selectComponent('mk-sheet');if(!s)return {measured:false,reason:'sheet selector unavailable'};return new Promise(function(resolve){s.createSelectorQuery().select('.sh-close').boundingClientRect(function(r){resolve({measured:!!r,rect:r});}).exec();});}"
 if($close.measured){
   if($close.rect.width -lt 48 -or $close.rect.height -lt 48){throw 'Close hit area is below 48 logical pixels'}
   Invoke-Wx 'automation_element_action' @('--action','tap','--x',([string]($close.rect.left+4)),'--y',([string]($close.rect.top+4)))|Out-Null
   $closed=Eval "function(){return {closed:!getCurrentPages().slice(-1)[0].data.loginVisible};}"
   if(!$closed.closed){throw 'Expanded close hit area did not dismiss the login sheet'}
   Eval "function(){getCurrentPages().slice(-1)[0].onNext();return true;}"|Out-Null
 }
 Eval "function(){var c=getCurrentPages().slice(-1)[0].selectComponent('#login-sheet');if(!c.data.agreed)c.onToggleAgree();c.onGetPhone({detail:{code:'local-demo'}});return true;}"|Out-Null
 Invoke-Wx 'automation_page_action' @('--action','getData','--data-path','est','--wait','1')|Out-Null
 Shot "target-quick-member-$width"
 Eval "function(){getCurrentPages().slice(-1)[0].onFees();return true;}"|Out-Null
 Shot "target-quick-fees-$width"
 Nav '/pages/store/detail?id=SIM_BJ01'
 Shot "target-store-header-$width"
 # Isolated long-address fixture. Clicking summary uses the real public route handler.
 Eval "function(){var p=getCurrentPages().slice(-1)[0];p._store=JSON.parse(JSON.stringify(p._store));p._store.address='北京市朝阳区长地址核验园区第二十六号楼地下一层西侧入口，过消防通道后右转至B区仓库';p.paint();return true;}"|Out-Null
 Invoke-Wx 'automation_element_action' @('--selector','.sd-at','--action','tap')|Out-Null
 Invoke-Wx 'automation_element_action' @('--selector','.sd-fulladdr','--action','text')|Out-Null
 # Keep current scroll position: this capture must show the address reached by the actual tap.
 Invoke-Wx 'simulator_screenshot' @('--path',(Join-Path $outDir "target-full-address-$width.png"),'--optimize','false')|Out-Null
 Eval "function(){var p=getCurrentPages().slice(-1)[0];if(p.data.tab!==2)throw Error('Address did not reveal route tab');return {tab:p.data.tab,address:p.data.card.address};}"|Out-Null
 Eval "function(){getCurrentPages().slice(-1)[0].onBooking();return true;}"|Out-Null
 Shot "target-visit-$width"
 Eval "function(){var c=getCurrentPages().slice(-1)[0].selectComponent('#visit-sheet');c.onPhone({detail:{value:'123'}});c.onSubmit();return true;}"|Out-Null
 Shot "target-visit-validation-$width"
 Capacity '10';Patch 'near8-args.json';Shot "target-near8-render-$width"
 Patch 'none5-args.json';Shot "target-none5-render-$width"
 Nav '/pages/store/detail?id=SIM_BJ01'
 Eval "function(){var p=getCurrentPages().slice(-1)[0];p._store=JSON.parse(JSON.stringify(p._store));p._store.units=p._store.units.slice(0,1);p._store.units[0].volume=8;p._store.units[0].area=4;p._store.units[0].dims=[2,2,2];p._store.units[0].code='TEST08';p._store.units[0].status='available';p.paint();return {situation:p.data.situation,near:p.data.near};}"|Out-Null
 Shot "target-store-near8-render-$width"
 Capacity '30';Patch 'combo31-args.json';Shot "target-combo31-render-$width"
 Nav '/pages/store/detail?id=SIM_BJ01'
 Eval "function(){var p=getCurrentPages().slice(-1)[0];p._store=JSON.parse(JSON.stringify(p._store));p._store.units=p._store.units.slice(0,2);p._store.units.forEach(function(u,i){u.volume=i?15:16;u.dims=i?[3,2,2.5]:[4,1.6,2.5];u.area=i?6:6.4;u.status='available';u.code=i?'TEST15':'TEST16';});p.paint();return {situation:p.data.situation,combos:p.data.combos};}"|Out-Null
 Shot "target-store-combo31-render-$width"
 if(!$SkipDefaultPages){
 Capacity '3.01'
 Nav '/pages/orders/index' 'switchTab'
 $orderId=Eval "function(){var os=getCurrentPages().slice(-1)[0].data.orders;var o=os.find(function(x){return x.stage==='active';})||os[0];return o?o.id:'';}"
 foreach($route in $routes){
   $url='/'+$route
   if($route -eq 'pages/store/detail'){$url+='?id=SIM_BJ01'}
   elseif($route -eq 'pkg-trade/quick/index'){$url+='?store=SIM_BJ01'}
   elseif($route -eq 'pkg-trade/confirm/index'){$url+='?unit=SIM_BJ01_U03'}
   elseif($route -eq 'pkg-trade/order/index' -or $route -like 'pkg-after/*') {if($orderId){$url+='?id='+$orderId}}
   $action=if($route -in $tabs){'switchTab'}else{'reLaunch'}
   Nav $url $action
   if($route -eq 'pages/stores/index'){Eval "function(){getCurrentPages().slice(-1)[0].hideBubble();return true;}"|Out-Null}
   Shot ('page-'+$route.Replace('/','-')+'-'+$width)
 }}
}
Nav '/pages/stores/index' 'switchTab'
Invoke-Wx 'get_simulator_console' @('--command','grep -n .')|Out-Null
Write-Output "01B native pilot saved: $outDir"
