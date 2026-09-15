# TASKS.md – Agent-Backlog

Stand: 2026-09-14  

**Für dich zum Abhaken (Mensch + Betrieb):** → [`PROFI_TODO.md`](PROFI_TODO.md)  
**Jahresplan:** → [`ROADMAP_PROFESSIONAL_2026_2027.md`](ROADMAP_PROFESSIONAL_2026_2027.md)

## Code-Stand (Agent) – Roadmap-Abgleich

| Bereich | Status |
|---------|--------|
| Q1 Fundament (STL, Print-PNG, CI, Tests, Webhook-Code, Scan-RPC, Sentry-Hook) | **Code erledigt** |
| Q2 Print-QC, Admin-Queue/CSV/STL-Liste, Filament-Profile, Reprint-Grund | **Code erledigt** |
| Q3 Microsite-Blöcke, Nav, Favicon, Share, Brand-Scrape, CCP-Rollback, Scan-Insights | **Code erledigt** |
| Kunden-CX Anhänger-Flow | **erledigt** |
| Auto-Druck → bambu-gateway (FTPS/MQTT) | **Code erledigt** – Deploy: [`AUTO_PRINT.md`](AUTO_PRINT.md) |
| Deploy Webhook/Schema/JWT/Secrets / echte Variant-IDs | **bei dir** – Phase 0 |

## Bewusst offen (braucht dich / später)

- Preview-Deploys, Branch-Schutz, Staging
- Echte Shopify-Mengenrabatte / Firmenrechnung
- Stempelkarte serverseitig, Partner-API, volle EN-i18n
- DSGVO-Paket, Error-Budget-Dashboards
- orcaslicer-headless + Drucker-Serial in bambu-gateway verdrahten

## Nächster Schritt

1. **[`GO_LIVE.md`](GO_LIVE.md)** – Bestellen über Warenkorb (ohne Draft-Secrets)
2. Auto-Druck: Migration + `dispatch-print` + bambu-gateway ([`AUTO_PRINT.md`](AUTO_PRINT.md))
3. Später: Webhook Order→Admin, Draft Orders (`PHASE0_GO_LIVE.md`)
