@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "KOALA_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%KOALA_PYTHON%" (
 "%KOALA_PYTHON%" serve.py
) else (
 py -3 serve.py
)
if errorlevel 1 pause
