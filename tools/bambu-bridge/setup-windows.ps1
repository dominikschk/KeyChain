# NUDAIM Bambu – Windows Setup (PowerShell als Admin nicht nötig)
# Speichern unter: tools/bambu-bridge/setup-windows.ps1
# Start: Rechtsklick PowerShell → "Hier öffnen", dann:
#   Set-ExecutionPolicy -Scope Process Bypass
#   .\setup-windows.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Need($name, $url) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "FEHLT: $name" -ForegroundColor Red
    Write-Host "Bitte installieren: $url"
    Write-Host "Danach PowerShell NEU öffnen und Skript nochmal starten."
    exit 1
  }
}

Write-Host "=== NUDAIM Bambu Windows Setup ===" -ForegroundColor Cyan
Need "git" "https://git-scm.com/download/win"
Need "node" "https://nodejs.org (LTS)"
Need "python" "https://www.python.org/downloads/ (Haken: Add to PATH)"

$envFile = Join-Path $Root ".env.bambu.local"
if (-not (Test-Path $envFile)) {
  @"
BAMBU_BRIDGE_SECRET=local-test-secret
BAMBU_AUTO_PRINT=false
BAMBU_GATEWAY_URL=http://127.0.0.1:4844
BAMBU_PRINTER_IP=192.168.188.23
BAMBU_PRINTER_ACCESS_CODE=13623236
BAMBU_PRINTER_ID=03900D5A0405958
"@ | Set-Content -Path $envFile -Encoding UTF8
  Write-Host "→ .env.bambu.local angelegt"
} else {
  Write-Host "→ .env.bambu.local vorhanden"
}

# Env laden
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $k, $v = $_.Split('=', 2)
  if ($k -and $v) { Set-Item -Path "Env:$k" -Value $v.Trim() }
}

$gw = Join-Path $Root ".bambu-gateway-src"
if (-not (Test-Path (Join-Path $gw ".git"))) {
  Write-Host "→ bambu-gateway klonen…"
  git clone --depth 1 https://github.com/leolobato/bambu-gateway.git $gw
}

Write-Host "→ Python-Pakete…"
python -m pip install -q -r (Join-Path $gw "requirements.txt")

$env:BAMBU_PRINTER_SERIAL = $env:BAMBU_PRINTER_ID
$env:ALLOW_AGENT_PRINT = "true"
$env:SERVER_PORT = "4844"

Write-Host ""
Write-Host "Gateway startet: http://127.0.0.1:4844" -ForegroundColor Green
Write-Host "Drucker $($env:BAMBU_PRINTER_IP) / $($env:BAMBU_PRINTER_ID)"
Write-Host "Zweites PowerShell-Fenster danach: .\start-adapter.ps1"
Write-Host ""

Set-Location $gw
python -m app
