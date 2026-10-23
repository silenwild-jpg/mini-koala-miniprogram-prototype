@echo off
setlocal
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python 3 not found. Install Python and run: pip install playwright
  pause
  exit /b 2
)
python -c "import playwright" >nul 2>nul
if errorlevel 1 (
  echo Please install Playwright: pip install playwright
  pause
  exit /b 2
)
python qa\run_four_page_http_visual_acceptance.py
if errorlevel 1 (
  echo QA did not complete. Check outputs\four_page_http_acceptance\results.json
  pause
  exit /b 2
)
echo Screenshots saved in outputs\four_page_http_acceptance\
pause
