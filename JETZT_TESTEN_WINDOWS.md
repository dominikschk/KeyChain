# Windows – ZUERST installieren (sonst geht gar nichts)

PowerShell **neu öffnen** und **nur das** ausführen:

```powershell
winget install --id Git.Git -e --source winget
winget install --id OpenJS.NodeJS.LTS -e --source winget
winget install --id Python.Python.3.12 -e --source winget
```

Wenn `winget` fehlt: Browser-Installer
- Git: https://git-scm.com/download/win
- Node LTS: https://nodejs.org
- Python: https://www.python.org/downloads/ → **Add to PATH** anhaken

Dann **PowerShell komplett schließen und neu öffnen**. Prüfen:

```powershell
git --version
node --version
npm --version
python --version
```

Alle vier zeigen eine Versionsnummer → weiter:

```powershell
cd $HOME
git clone https://github.com/dominikschk/KeyChain.git
cd KeyChain
git checkout cursor/auto-print-dispatch-da6f
npm ci
npm run bambu:go
```

Muss: `SOFTWARE KLAPPT`

Danach Drucker:

```powershell
cd tools\bambu-bridge
Set-ExecutionPolicy -Scope Process Bypass
.\setup-windows.ps1
```
