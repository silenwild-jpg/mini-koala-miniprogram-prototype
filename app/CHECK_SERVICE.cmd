@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Mini Koala 本地服务诊断结果：
echo.
if exist "LOCAL_SERVICE_DIAGNOSTIC.txt" (
  type "LOCAL_SERVICE_DIAGNOSTIC.txt"
) else (
  echo 尚未生成诊断日志。请先双击 START_DEMO.cmd。
)
echo.
pause
