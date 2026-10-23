param(
  [int]$StartPort = 8765,
  [switch]$NoBrowser
)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Get-Mime([string]$path) {
  switch ([IO.Path]::GetExtension($path).ToLowerInvariant()) {
    '.html' { 'text/html; charset=utf-8' }
    '.htm'  { 'text/html; charset=utf-8' }
    '.js'   { 'application/javascript; charset=utf-8' }
    '.css'  { 'text/css; charset=utf-8' }
    '.json' { 'application/json; charset=utf-8' }
    '.png'  { 'image/png' }
    '.jpg'  { 'image/jpeg' }
    '.jpeg' { 'image/jpeg' }
    '.svg'  { 'image/svg+xml' }
    '.csv'  { 'text/csv; charset=utf-8' }
    '.md'   { 'text/markdown; charset=utf-8' }
    default { 'application/octet-stream' }
  }
}

$listener = $null
$Port = $StartPort
foreach ($p in $StartPort..($StartPort+9)) {
  try {
    $candidate = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $p)
    $candidate.Start()
    $listener = $candidate
    $Port = $p
    break
  } catch {}
}
if ($null -eq $listener) {
  Write-Host '无法找到可用本地端口。' -ForegroundColor Red
  exit 1
}

$Base = "http://127.0.0.1:$Port/"
$Target = $Base + 'prototype/index_visual_v2_7_4_8.html'
Write-Host 'Mini Koala V2.7.4.8 本地服务已启动' -ForegroundColor Green
Write-Host "地址: $Target"
Write-Host '关闭本窗口即可停止本地服务。'
if (-not $NoBrowser) { Start-Process $Target }

$ascii = [Text.Encoding]::ASCII
while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $stream = $client.GetStream()
    $reader = New-Object IO.StreamReader($stream, $ascii, $false, 4096, $true)
    $requestLine = $reader.ReadLine()
    if ([string]::IsNullOrWhiteSpace($requestLine)) { $client.Close(); continue }
    while ($true) {
      $line = $reader.ReadLine()
      if ($null -eq $line -or $line -eq '') { break }
    }
    $parts = $requestLine.Split(' ')
    if ($parts.Length -lt 2 -or $parts[0] -notin @('GET','HEAD')) {
      $body = [Text.Encoding]::UTF8.GetBytes('405 Method Not Allowed')
      $head = $ascii.GetBytes("HTTP/1.1 405 Method Not Allowed`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n")
      $stream.Write($head,0,$head.Length); if($parts[0] -ne 'HEAD'){$stream.Write($body,0,$body.Length)}; $client.Close(); continue
    }
    $rawPath = $parts[1].Split('?')[0]
    $urlPath = [Uri]::UnescapeDataString($rawPath).TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($urlPath)) { $urlPath = 'prototype/index_visual_v2_7_4_8.html' }
    $candidatePath = Join-Path $Root ($urlPath -replace '/', [IO.Path]::DirectorySeparatorChar)
    $full = [IO.Path]::GetFullPath($candidatePath)
    $rootFull = [IO.Path]::GetFullPath($Root) + [IO.Path]::DirectorySeparatorChar
    if (-not $full.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $full -PathType Leaf)) {
      $body = [Text.Encoding]::UTF8.GetBytes('404 Not Found')
      $head = $ascii.GetBytes("HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n")
      $stream.Write($head,0,$head.Length); if($parts[0] -ne 'HEAD'){$stream.Write($body,0,$body.Length)}; $client.Close(); continue
    }
    $body = [IO.File]::ReadAllBytes($full)
    $mime = Get-Mime $full
    $head = $ascii.GetBytes("HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: $($body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n")
    $stream.Write($head,0,$head.Length)
    if($parts[0] -ne 'HEAD'){$stream.Write($body,0,$body.Length)}
    $stream.Flush()
  } catch {
    Write-Host "请求处理失败: $($_.Exception.Message)" -ForegroundColor Yellow
  } finally {
    try { $client.Close() } catch {}
  }
}
