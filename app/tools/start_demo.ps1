param([int]$StartPort = 8765)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Log = Join-Path $Root 'LOCAL_SERVICE_DIAGNOSTIC.txt'
$PidFile = Join-Path $Root '.demo_server_pid'
$TargetPath = 'prototype/product_demo_hub_v1.html'

function Log([string]$s) {
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  $line = "[$stamp] $s"
  Add-Content -LiteralPath $Log -Value $line -Encoding UTF8
  Write-Host $s
}
function Port-Free([int]$p) {
  $l = $null
  try {
    $l = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,$p)
    $l.Start(); return $true
  } catch { return $false }
  finally { if($null -ne $l){ try{$l.Stop()}catch{} } }
}

Set-Content -LiteralPath $Log -Value 'Mini Koala Internal Demo Release V1 local service diagnostic' -Encoding UTF8
Log "Root: $Root"
Log "PowerShell: $($PSVersionTable.PSVersion)"

$Port = $null
foreach($p in $StartPort..($StartPort+9)) { if(Port-Free $p){ $Port=$p; break } }
if($null -eq $Port){
  Log 'FAIL: 8765-8774 均不可用。'
  Write-Host "日志: $Log" -ForegroundColor Yellow
  exit 11
}
Log "Selected port: $Port"

$serverProc = $null
$mode = $null
$py = Get-Command py.exe -ErrorAction SilentlyContinue
$python = Get-Command python.exe -ErrorAction SilentlyContinue
if($py){
  $mode='py -3 -m http.server'
  $serverProc = Start-Process -FilePath $py.Source -ArgumentList @('-3','-m','http.server',"$Port",'--bind','127.0.0.1','--directory',"$Root") -WorkingDirectory $Root -WindowStyle Minimized -PassThru
}elseif($python){
  $mode='python -m http.server'
  $serverProc = Start-Process -FilePath $python.Source -ArgumentList @('-m','http.server',"$Port",'--bind','127.0.0.1','--directory',"$Root") -WorkingDirectory $Root -WindowStyle Minimized -PassThru
}else{
  $mode='PowerShell TcpListener fallback'
  $fallback = Join-Path $Root 'tools\portable_server.ps1'
  $args = @('-NoProfile','-ExecutionPolicy','Bypass','-File',"$fallback",'-StartPort',"$Port",'-NoBrowser')
  $serverProc = Start-Process -FilePath 'powershell.exe' -ArgumentList $args -WorkingDirectory $Root -WindowStyle Minimized -PassThru
}
$serverProc.Id | Set-Content -LiteralPath $PidFile -Encoding ASCII
Log "Server mode: $mode"
Log "Server PID: $($serverProc.Id)"

$Url = "http://127.0.0.1:$Port/$TargetPath"
$ok=$false
$status=''
for($i=0;$i -lt 12;$i++){
  Start-Sleep -Milliseconds 400
  try{
    $r=Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    $status=$r.StatusCode
    if($r.StatusCode -eq 200){$ok=$true;break}
  }catch{
    $status=$_.Exception.Message
    if($serverProc.HasExited){break}
  }
}
if(-not $ok){
  Log "FAIL: 本机 HTTP 自检未通过: $status"
  if($serverProc.HasExited){Log "Server exited with code: $($serverProc.ExitCode)"}
  Log '结论：服务进程或端口被系统策略/安全软件阻止，尚未进入浏览器阶段。'
  Write-Host "日志: $Log" -ForegroundColor Yellow
  exit 12
}

Log 'PASS: 本机 HTTP 服务自检返回 200。'
Log "URL: $Url"
Log '下一步将用系统默认浏览器打开。若浏览器显示 ERR_BLOCKED_BY_ADMINISTRATOR，而本日志为 PASS，则说明 HTTP 服务本身正常，限制发生在浏览器/企业策略层。'
Start-Process $Url
Write-Host ''
Write-Host '服务已确认正常。' -ForegroundColor Green
Write-Host "浏览器地址: $Url"
Write-Host "诊断日志: $Log"
Write-Host '停止服务请双击 STOP_DEMO.cmd。'
