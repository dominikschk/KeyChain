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
npm run test
npm run build
# alles:
npm run ci
```

GitHub Actions: `.github/workflows/ci.yml` (typecheck, tests, build).

## Docs für Agents

- [`AGENTS.md`](AGENTS.md) – Arbeitsregeln
- [`TASKS.md`](TASKS.md) – priorisiertes Backlog
- [`ROADMAP_PROFESSIONAL_2026_2027.md`](ROADMAP_PROFESSIONAL_2026_2027.md) – Jahresplan
- [`VORHABEN.md`](VORHABEN.md) – kurzfristige Produkt-Slices
- [`SECURITY_ISSUES.md`](SECURITY_ISSUES.md) – Security-Checkliste

## Env

Siehe [`.env.example`](.env.example).
