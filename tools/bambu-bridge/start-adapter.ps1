# Adapter starten (zweites PowerShell-Fenster)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$envFile = Join-Path $Root ".env.bambu.local"
if (-not (Test-Path $envFile)) {
  Write-Host "Fehlt .env.bambu.local - zuerst setup-windows.ps1" -ForegroundColor Red
  exit 1
}

Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $k, $v = $_.Split('=', 2)
  if ($k -and $v) { Set-Item -Path "Env:$k" -Value $v.Trim() }
}

if (-not $env:BAMBU_GATEWAY_URL) { $env:BAMBU_GATEWAY_URL = "http://127.0.0.1:4844" }
if (-not $env:PORT) { $env:PORT = "8787" }

Write-Host ("Adapter -> Gateway {0} Drucker {1}" -f $env:BAMBU_GATEWAY_URL, $env:BAMBU_PRINTER_ID)
node server.mjs
