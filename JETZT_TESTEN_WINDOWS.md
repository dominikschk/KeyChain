# Windows – genau so (CMD reicht nicht für die Linux-Befehle)

Du bist auf **Windows**. Zuerst einmalig installieren (Links im Browser öffnen, Next/Next):

1. **Git** → https://git-scm.com/download/win  
2. **Node.js LTS** → https://nodejs.org  
3. **Python 3** → https://www.python.org/downloads/  
   → Haken setzen: **Add python.exe to PATH**

Danach **alles schließen** und **PowerShell** neu öffnen (nicht CMD).

---

## Schritt 1 – Repo holen

```powershell
cd $HOME
git clone https://github.com/dominikschk/KeyChain.git
cd KeyChain
git checkout cursor/auto-print-dispatch-da6f
git pull
npm ci
```

(Falls der Ordner schon existiert: `cd` dorthin, dann `git pull`.)

## Schritt 2 – Software-Check

```powershell
npm run bambu:go
```

Muss sagen: `SOFTWARE KLAPPT`

## Schritt 3 – Gateway (echter Drucker)

```powershell
cd tools\bambu-bridge
Set-ExecutionPolicy -Scope Process Bypass
.\setup-windows.ps1
```

Browser: http://localhost:4844

## Schritt 4 – Adapter (zweites PowerShell-Fenster)

```powershell
cd $HOME\KeyChain\tools\bambu-bridge
Set-ExecutionPolicy -Scope Process Bypass
.\start-adapter.ps1
```

---

**Nicht** die Linux-Befehle (`chmod`, `<<EOF`, `./start-….sh`) in CMD tippen – die funktionieren unter Windows so nicht.
