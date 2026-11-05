[CmdletBinding()]
param(
  [ValidateSet('contract', 'browser', 'full')]
  [string]$Mode = 'contract'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

function Invoke-Checked {
  param([string]$Executable, [string[]]$ArgumentList)
  & $Executable @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed (exit $LASTEXITCODE): $Executable $($ArgumentList -join ' ')"
  }
}

Push-Location $root
try {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js 22 is required'
  }
  $branch = (& git branch --show-current).Trim()
  $sha = (& git rev-parse HEAD).Trim()
  Write-Host "RC2_LOCAL_QA mode=$Mode branch=$branch sha=$sha"

  foreach ($file in @(
    'app/prototype/parallel/core-journey-fix-01/demo/app.js',
    'app/prototype/parallel/core-journey-fix-01/demo/demo-core.js',
    'app/prototype/parallel/core-journey-fix-01/demo/br04/bridge.js',
    'app/prototype/parallel/core-journey-fix-01/demo/lifecycle-contract.js',
    'app/prototype/parallel/core-journey-fix-01/demo/lifecycle-ui.js',
    'scripts/verify_rc2_rule_fix_01c_browser.cjs',
    'scripts/verify_rc2_rule_fix_01d_browser.cjs'
  )) {
    if (-not (Test-Path $file)) { throw "Missing source: $file" }
    Invoke-Checked -Executable 'node' -ArgumentList @('--check', $file)
  }

  foreach ($file in @(
    'scripts/verify_rc2_rule_fix_01b.cjs',
    'scripts/verify_rc2_rule_fix_01c.cjs',
    'scripts/verify_rc2_single_candidate_01_source.cjs',
    'scripts/verify_rc2_final_integration_01_contract.cjs'
  )) {
    if (-not (Test-Path $file)) { throw "Missing contract test: $file" }
    Invoke-Checked -Executable 'node' -ArgumentList @($file)
  }
  Write-Host 'RC2_CONTRACT_PASS'

  if ($Mode -in @('browser', 'full')) {
    if (-not (Test-Path 'node_modules/playwright')) {
      throw 'Install browser deps first: npm install --no-save --no-package-lock playwright@1.56.1 ; npx playwright install chromium'
    }
    foreach ($file in @(
      'scripts/verify_rc2_rule_fix_01c_browser.cjs',
      'scripts/verify_rc2_rule_fix_01d_browser.cjs'
    )) {
      Invoke-Checked -Executable 'node' -ArgumentList @($file)
    }
    Write-Host 'RC2_BROWSER_PASS'
  }

  if ($Mode -eq 'full') {
    if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
      throw 'Python 3 is required'
    }
    $env:RC2_BUNDLE_LABEL = 'RC2-CANDIDATE-DELTA-02-S5-NATIVE'
    $env:RC2_BUNDLE_BRANCH = $branch
    $env:RC2_BUNDLE_ARCHIVE = 'MiniKoala_RC2_CANDIDATE_DELTA_02.zip'
    Invoke-Checked -Executable 'python' -ArgumentList @('scripts/build_rc2_isolated_demo.py')
    foreach ($file in @(
      'scripts/verify_rc2_s5_delta_02a_price_and_flow.cjs',
      'scripts/verify_s5_ux_review_03_browser.cjs',
      'scripts/verify_s5_ux_close_01_browser.cjs',
      'scripts/verify_rc2_s5_final_01_browser.cjs',
      'scripts/verify_rc2_final_vis_delta_01_browser.cjs',
      'scripts/verify_rc2_vis_integration_02_browser.cjs',
      'scripts/verify_proto_rule_restore_06_browser.cjs'
    )) {
      if (-not (Test-Path $file)) { throw "Missing full-suite script: $file" }
      Invoke-Checked -Executable 'node' -ArgumentList @($file)
    }
    Write-Host 'RC2_FULL_PASS'
  }
}
finally {
  Pop-Location
}
