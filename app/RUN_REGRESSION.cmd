@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  py -3 tools\run_regression.py
) else (
  python tools\run_regression.py
)
set CHECK_RC=%ERRORLEVEL%
pause
exit /b %CHECK_RC%
