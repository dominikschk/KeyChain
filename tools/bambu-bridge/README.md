# NUDAIM ↔ Bambu Lab (über bambu-gateway)

Wir bauen **kein** eigenes FTPS/MQTT nach. Stattdessen nutzen wir
[**bambu-gateway**](https://github.com/leolobato/bambu-gateway)
(FTPS Upload + MQTT `project_file`) und einen dünnen NUDAIM-Adapter.

## Sofort lokal testen (ohne Drucker)

Im Repo-Root:

```bash
npm run test:bambu-local
```

Erwartung: `✅ Lokaler Test OK`  
Details: [`LOCAL_TEST.md`](LOCAL_TEST.md)

## Architektur

```
Admin QC freigeben
  → Supabase Edge `dispatch-print`
  → Webhook (Tunnel) → tools/bambu-bridge (Adapter)
  → bambu-gateway POST /api/print-sessions (STL)
  → optional Slice (orcaslicer-headless)
  → POST /api/print-sessions/{id}/print
  → Gateway: FTPS + MQTT → Bambu-Drucker
```

## Echter Drucker

1. `cp tools/bambu-bridge/.env.bambu.local.example tools/bambu-bridge/.env.bambu.local`
2. Serial / Secret eintragen
3. `docker compose -f tools/bambu-bridge/docker-compose.yml --env-file tools/bambu-bridge/.env.bambu.local up -d`
4. http://localhost:4844/settings → Drucker anlegen
5. Adapter starten – siehe [`LOCAL_TEST.md`](LOCAL_TEST.md)

| Env | Bedeutung |
|-----|-----------|
| `BAMBU_GATEWAY_URL` | z. B. `http://127.0.0.1:4844` |
| `BAMBU_PRINTER_ID` | Serial / ID aus Gateway-Settings |
| `BAMBU_BRIDGE_SECRET` | = Supabase `PRINT_DISPATCH_SECRET` |
| `BAMBU_AUTO_PRINT` | `true` = nach Slice sofort drucken |
| `BAMBU_SLICE` | default `true` |
| `BAMBU_MACHINE_PROFILE` | optional Orca-Maschinenprofil |
| `BAMBU_PROCESS_PROFILE` | optional Orca-Prozessprofil |

## Hinweis

Bambu-Protokolle sind **nicht offiziell supportet** (Developer Mode).  
Gateway/Adapter nur im eigenen Netz / VPN betreiben.
