# NUDAIM ↔ Bambu Lab (über bambu-gateway)

Wir bauen **kein** eigenes FTPS/MQTT nach. Stattdessen nutzen wir
[**bambu-gateway**](https://github.com/leolobato/bambu-gateway)
(FTPS Upload + MQTT `project_file`) und einen dünnen NUDAIM-Adapter.

```
Admin QC freigeben
  → Supabase Edge `dispatch-print`
  → Webhook (Tunnel) → tools/bambu-bridge (Adapter)
  → bambu-gateway POST /api/print-sessions (STL)
  → optional Slice (orcaslicer-headless)
  → POST /api/print-sessions/{id}/print
  → Gateway: FTPS + MQTT → Bambu-Drucker
```

## 1. bambu-gateway starten

```bash
docker run -d --name bambu-gateway \
  -p 4844:4844 \
  -v $(pwd)/bambu-data:/data \
  -e ORCASLICER_API_URL=http://host.docker.internal:8070 \
  -e ALLOW_AGENT_PRINT=true \
  ghcr.io/leolobato/bambu-gateway:latest
```

Oder: `docker compose -f tools/bambu-bridge/docker-compose.yml up -d`

Dann im Browser **http://localhost:4844/settings** Drucker anlegen
(IP, Access Code, Serial – Developer Mode am Drucker).

Für STL→Slice zusätzlich [orcaslicer-headless](https://github.com/leolobato/orcaslicer-headless)
mit `ORCASLICER_API_URL` am Gateway.

## 2. NUDAIM-Adapter

```bash
cd tools/bambu-bridge
BAMBU_GATEWAY_URL=http://127.0.0.1:4844 \
BAMBU_PRINTER_ID=DEIN_SERIAL \
BAMBU_BRIDGE_SECRET=dein-secret \
BAMBU_AUTO_PRINT=true \
node server.mjs
```

| Env | Bedeutung |
|-----|-----------|
| `BAMBU_GATEWAY_URL` | z. B. `http://127.0.0.1:4844` |
| `BAMBU_PRINTER_ID` | Serial / ID aus Gateway-Settings |
| `BAMBU_BRIDGE_SECRET` | = Supabase `PRINT_DISPATCH_SECRET` |
| `BAMBU_AUTO_PRINT` | `true` = nach Slice sofort drucken |
| `BAMBU_SLICE` | default `true` |
| `BAMBU_MACHINE_PROFILE` | optional Orca-Maschinenprofil |
| `BAMBU_PROCESS_PROFILE` | optional Orca-Prozessprofil |

Adapter per Tunnel (ngrok/Cloudflare) erreichbar machen → URL als
`PRINT_DISPATCH_WEBHOOK_URL` in Supabase (siehe [`AUTO_PRINT.md`](../../AUTO_PRINT.md)).

## 3. Was der Adapter aufruft

1. `POST /api/print-sessions` – STL hochladen, Session anlegen (`slice=true`)
2. Session pollen bis `sliced` / `ready`
3. bei `BAMBU_AUTO_PRINT=true`: `POST /api/print-sessions/{id}/print`  
   (Gateway braucht `ALLOW_AGENT_PRINT=true`)

Ohne Auto-Print: `handoff_url` öffnen und in der Gateway-UI starten.

## Hinweis

Bambu-Protokolle sind **nicht offiziell supportet** (Developer Mode).  
Gateway/Adapter nur im eigenen Netz / VPN betreiben.
