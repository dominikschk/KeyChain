# Deine 20 Minuten – nur das hier machen

Ziel: **Software muss laufen.** Kein Nachdenken, nur abtippen.

---

## Minute 0–5: Branch + Check

Im Terminal **im KeyChain-Ordner**:

```bash
git fetch origin
git checkout cursor/auto-print-dispatch-da6f
git pull
npm run bambu:go
```

**Erfolg = diese Zeile:**
```text
✅ SOFTWARE KLAPPT (Mock-Druck-Flow grün)
```

Siehst du das → der Auto-Druck-Code funktioniert. Fertig für den Soft-Test.

---

## Minute 5–15: echter Bambu (nur wenn du jetzt drucken willst)

1. Am Drucker-Display:
   - **Developer Mode** / LAN Mode an
   - **IP**, **Access Code**, **Serial** abschreiben

2. Datei `tools/bambu-bridge/.env.bambu.local` öffnen, setzen:
   ```env
   BAMBU_PRINTER_ID=DEIN_SERIAL_HIER
   BAMBU_BRIDGE_SECRET=local-test-secret
   BAMBU_AUTO_PRINT=false
   ```

3. Docker (einmal):
   ```bash
   docker compose -f tools/bambu-bridge/docker-compose.yml --env-file tools/bambu-bridge/.env.bambu.local up -d
   ```

4. Browser: http://localhost:4844/settings  
   → Drucker mit IP / Code / Serial speichern

5. Adapter:
   ```bash
   cd tools/bambu-bridge
   set -a && source .env.bambu.local && set +a
   BAMBU_GATEWAY_URL=http://127.0.0.1:4844 node server.mjs
   ```

Ohne Docker / ohne Slice-Server landet der Job im Gateway zur **manuellen** Freigabe – das ist OK für den ersten Test.

---

## Minute 15–20: fertig melden

Schreib mir nur:

- `bambu:go` grün? ja/nein  
- echten Drucker angebunden? ja/nein  
- Modell: P1S / X1C / A1 / …

---

## Nicht machen

- Keine anderen Branches
- Kein PR mergen in diesen 20 Min nötig
- Kein Supabase-Deploy nötig für den lokalen Mock-Test
