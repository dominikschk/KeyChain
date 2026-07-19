# NUDAIM Keychain / Konfigurator

NFC-Schlüsselanhänger konfigurieren → Shopify Checkout → Produktion (STL + Print-PNG) → Microsite/CCP.

## Entwicklung

```bash
npm ci
npm run dev
```

## Qualität / CI

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
# oder:
npm run ci
```

GitHub Actions: `.github/workflows/ci.yml` (typecheck, lint, unit, build, Playwright).

## Docs

| Datei | Inhalt |
|-------|--------|
| [`AGENTS.md`](AGENTS.md) | Agent-Arbeitsregeln |
| [`TASKS.md`](TASKS.md) | Priorisiertes Backlog |
| [`ROADMAP_PROFESSIONAL_2026_2027.md`](ROADMAP_PROFESSIONAL_2026_2027.md) | Jahresplan |
| [`VORHABEN.md`](VORHABEN.md) | Kurzfristige Produkt-Slices |
| [`SECURITY_ISSUES.md`](SECURITY_ISSUES.md) | Security + Deploy-Checkliste |
| [`SHOPIFY_WEBHOOK.md`](SHOPIFY_WEBHOOK.md) | Order-Sync deployen |
| [`SHOPIFY_DRAFT_ORDER.md`](SHOPIFY_DRAFT_ORDER.md) | Berechneter Preis → Draft Order / Kasse |
| [`PHASE0_GO_LIVE.md`](PHASE0_GO_LIVE.md) | Go-Live Checkliste in einer Sitzung |
| [`LEGAL_COPY.md`](LEGAL_COPY.md) | Vorschau vs. Druck – Kundentexte |

## Env

Siehe [`.env.example`](.env.example) (`VITE_SUPABASE_*`, optional `VITE_SENTRY_DSN`).
