# TASKS.md – Agent-Backlog

Stand: 2026-07-19  

**Für dich zum Abhaken (Mensch + Betrieb):** → [`PROFI_TODO.md`](PROFI_TODO.md)  
**Jahresplan:** → [`ROADMAP_PROFESSIONAL_2026_2027.md`](ROADMAP_PROFESSIONAL_2026_2027.md)

## Code-Stand (Agent)

| Bereich | Status |
|---------|--------|
| Q1 Fundament (STL, CI, Tests, Webhook-Code, Security-RPC, Sentry, E2E, Lint) | erledigt |
| Q2 Kern (Print-QC, Admin-Queue/CSV, FAQ/Hours/Gallery, i18n-Keys, Tokens) | erledigt |
| Q3 Microsite (Anker-Nav, Kontakt-Seite, Favicon, CCP-Rollback) | erledigt |
| Q3+ Brand-Scrape, Entwurf teilen, B2B-Stückzahl | erledigt |
| Deploy Webhook/Schema/JWT/Secrets | **bei dir** – siehe `PROFI_TODO.md` Phase 0 |

## Nächster Agent-Fokus (nach Phase 0 live)

1. Echte Variant-IDs eintragen (wenn Dominik liefert)
2. Scan-Insights im CCP
3. i18n EN im Konfigurator

**Deploy-Hinweis (optional):** Edge Function `brand-scrape` für bessere Website-Übernahme:
`npx supabase functions deploy brand-scrape --no-verify-jwt`
