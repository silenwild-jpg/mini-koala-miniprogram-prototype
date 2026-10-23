@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Mini Koala Internal Demo Release V1 Local Demo Diagnostic
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\start_demo.ps1" -StartPort 8765
set RC=%ERRORLEVEL%
echo.
if "%RC%"=="0" (
  echo [OK] 本地 HTTP 服务已通过自检，浏览器已尝试打开。
) else (
  echo [FAIL] 本地服务诊断未通过，错误码 %RC%。
  echo 请打开同目录 LOCAL_SERVICE_DIAGNOSTIC.txt 查看具体原因。
)
echo.
pause
