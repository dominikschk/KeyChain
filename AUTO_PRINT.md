# Auto-Druck → Bambu Lab (über bambu-gateway)

Nach **Druck freigeben** im Admin gehen STL + Print-PNG an deine lokale
Kette: **NUDAIM-Adapter → [bambu-gateway](https://github.com/leolobato/bambu-gateway) → FTPS + MQTT → Drucker**.

Wir implementieren **kein** eigenes Bambu-Protokoll. Gateway übernimmt Upload
(`FTPS :990`) und Start (`MQTT project_file` auf `:8883`).

## Architektur

```
Kunde bestellt → Admin QC freigeben
  → Edge Function `dispatch-print`
  → HTTPS Webhook (Tunnel) → tools/bambu-bridge
  → bambu-gateway /api/print-sessions (STL)
  → Slice (orcaslicer-headless) → /print
  → Drucker
```

## Setup

### 1. Datenbank

SQL: `supabase/migrations/auto_print_dispatch.sql`

### 2. Edge Function

```bash
supabase functions deploy dispatch-print
```

| Secret | Bedeutung |
|--------|-----------|
| `PRINT_DISPATCH_WEBHOOK_URL` | öffentliche URL des Adapters, z. B. `https://…/print` |
| `PRINT_DISPATCH_SECRET` | = `BAMBU_BRIDGE_SECRET` |
| `PRINT_SHOP_EMAIL` | optional parallel Mail |
| `RESEND_API_KEY` / `FROM_EMAIL` | für Mail |

### 3. bambu-gateway + Adapter

Siehe [`tools/bambu-bridge/README.md`](tools/bambu-bridge/README.md).

Kurz:

```bash
docker compose -f tools/bambu-bridge/docker-compose.yml up -d
# Gateway: Drucker unter http://localhost:4844/settings anlegen
# Adapter-Env: BAMBU_PRINTER_ID, BAMBU_BRIDGE_SECRET, BAMBU_AUTO_PRINT=true
```

Für STL-Slice: [orcaslicer-headless](https://github.com/leolobato/orcaslicer-headless)
+ `ORCASLICER_API_URL` am Gateway. Für Auto-Start: `ALLOW_AGENT_PRINT=true`.

## Webhook-Payload (an den Adapter)

```json
{
  "event": "print.dispatch",
  "target": "bambu_lab",
  "order_id": "…",
  "short_id": "…",
  "stl_url": "https://…/file.stl",
  "print_png_url": "https://…/print.png",
  "needs_slice": true,
  "file_hints": { "stl_filename": "nudaim-SHORT.stl" },
  "dispatched_at": "…"
}
```

## Admin

- Freigabe → automatischer Dispatch
- Status `print_dispatch_status`
- **Nochmal senden** bei Bedarf

## Grenzen

- Bambu Developer Mode / LAN: **nicht offiziell supportet**
- STL muss gesliced werden (Gateway + Orca), sonst kein Druckstart
- Adapter/Gateway nur im eigenen Netz oder per abgesichertem Tunnel
