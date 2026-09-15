# Lokaler Bambu-Test (NUDAIM → Adapter → Gateway)

## Schnelltest ohne Drucker (1 Befehl)

Im Repo-Root:

```bash
npm run test:bambu-local
```

Das startet Mock-Gateway + Adapter, schickt einen Fake-Auftrag und prüft Slice/Print.
Erwartung: `✅ Lokaler Test OK`

## Mit echtem Bambu (Developer Mode)

### 1. Env-Datei

```bash
cp tools/bambu-bridge/.env.bambu.local.example tools/bambu-bridge/.env.bambu.local
# BAMBU_PRINTER_ID = Serial vom Drucker-Display
# BAMBU_BRIDGE_SECRET = beliebiges Secret (später = PRINT_DISPATCH_SECRET)
```

### 2. Gateway starten

```bash
docker compose -f tools/bambu-bridge/docker-compose.yml --env-file tools/bambu-bridge/.env.bambu.local up -d
```

UI: http://localhost:4844/settings → Drucker (IP, Access Code, Serial) anlegen.

Für STL-Slice zusätzlich [orcaslicer-headless](https://github.com/leolobato/orcaslicer-headless)
und am Gateway `ORCASLICER_API_URL` setzen.

### 3. Adapter mit echtem Gateway

```bash
cd tools/bambu-bridge
set -a && source .env.bambu.local && set +a
BAMBU_GATEWAY_URL=http://127.0.0.1:4844 \
BAMBU_AUTO_PRINT=false \
node server.mjs
```

Zuerst `BAMBU_AUTO_PRINT=false` – Auftrag erscheint im Gateway, du startest manuell.
Wenn das sitzt: `BAMBU_AUTO_PRINT=true` (Gateway: `ALLOW_AGENT_PRINT=true`).

### 4. Test-Auftrag mit Fixture-STL

In einem zweiten Terminal (Adapter läuft):

```bash
# kleines File-Serving der Fixture
npx --yes serve -l 8790 tools/bambu-bridge/fixtures
```

```bash
curl -sS -X POST http://127.0.0.1:8787/print \
  -H 'Content-Type: application/json' \
  -H "x-webhook-secret: $(grep BAMBU_BRIDGE_SECRET tools/bambu-bridge/.env.bambu.local | cut -d= -f2)" \
  -d "{
    \"event\":\"print.dispatch\",
    \"target\":\"bambu_lab\",
    \"order_id\":\"manual-1\",
    \"short_id\":\"MANUALTEST1\",
    \"stl_url\":\"http://127.0.0.1:8790/test-keychain.stl\",
    \"needs_slice\":true,
    \"file_hints\":{
      \"preferred_name\":\"nudaim-MANUALTEST1\",
      \"stl_filename\":\"nudaim-MANUALTEST1.stl\",
      \"print_png_filename\":null
    }
  }" | jq .
```

Dann Gateway-UI prüfen / Druck starten.

## Admin-UI (optional, braucht Supabase)

1. Migration `auto_print_dispatch.sql` in Supabase
2. `dispatch-print` deployen
3. Lokal Tunnel auf Adapter-Port 8787 → `PRINT_DISPATCH_WEBHOOK_URL`
4. Im Admin eine Test-Order QC-freigeben

Ohne Supabase reicht `npm run test:bambu-local` + der manuelle curl oben.
