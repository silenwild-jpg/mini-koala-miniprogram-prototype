@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".demo_server_pid" (
  echo 未找到运行中的演示服务 PID。
  pause
  exit /b 0
)
set /p PID=<.demo_server_pid
powershell.exe -NoProfile -Command "try { Stop-Process -Id %PID% -Force -ErrorAction Stop; Write-Host '演示服务已停止。' -ForegroundColor Green } catch { Write-Host '服务可能已经停止。' -ForegroundColor Yellow }"
del /q ".demo_server_pid" >nul 2>&1
pause
