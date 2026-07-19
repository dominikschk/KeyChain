# TASKS.md – Agent-Backlog

Stand: 2026-07-19  
Abgeleitet aus [`ROADMAP_PROFESSIONAL_2026_2027.md`](ROADMAP_PROFESSIONAL_2026_2027.md) und [`VORHABEN.md`](VORHABEN.md).

**Priorität:** P0 = Q1-Must / kritischer Pfad · P1 = Q1 parallel · P2 = später

---

## P0 – Q1 Fundament (kritischer Pfad)

| ID | Aufgabe | Status | Hinweis |
|----|---------|--------|---------|
| T1 | **STL/Print-Pipeline** – headless STL, Print-PNG Upload, Admin-Druckspalte | **erledigt** | `lib/stlExport.ts`, `lib/printAssets.ts` |
| T2 | **CI** – GitHub Actions: typecheck, lint, unit, build, e2e | **erledigt** | `.github/workflows/ci.yml` |
| T3 | **Test-Grundlage** – Unit Utils/Validation/STL/Print/Webhook | **erledigt** | Vitest 19 Tests |
| T4 | **Shopify Order-Webhook** → Admin Status `paid` | **erledigt (Code)** | Edge Function + Schema-RPC; Deploy: [`SHOPIFY_WEBHOOK.md`](SHOPIFY_WEBHOOK.md) |
| T5 | **Security-Deploy** – Scan-Rate-Limit + Checkliste | **erledigt (Code)** | `record_nfc_scan`; Cloudflare-Schritte in `SECURITY_ISSUES.md` (manuell) |

## P1 – Q1 parallel

| ID | Aufgabe | Status |
|----|---------|--------|
| T6 | Observability (Sentry optional via `VITE_SENTRY_DSN`) | **erledigt** |
| T7 | Playwright Smoke Routing + Cart-URL | **erledigt** |
| T8 | Lint (ESLint) in CI | **erledigt** |

## P2 – Q2+ (nächste Sessions)

| ID | Aufgabe | Status |
|----|---------|--------|
| T9 | Print-QC Freigabe-Workflow (Mensch-in-the-Loop) | teilweise – Admin Print-PNG-Thumbnail; Freigabe-State offen |
| T10 | Echte Shopify Variant-IDs (Badge etc.) | offen – Platzhalter in `PRODUCTS` |
| T11 | Microsite-Slices laut `VORHABEN.md` | offen – nach Print/Commerce |
| T12 | Admin 2.0 Queue/Filter/Batch-Export | offen |
| T13 | Design System + WCAG AA Kernflows | offen |
| T14 | i18n DE/EN | offen (Q4) |

---

## Erledigt (Referenz)

- [x] Shopify Bestellmail/Liquid live + Smoke Order (2026-07-19)
- [x] CCP-Edit mit `write_token`
- [x] Logo Preview vs. Print (max. 3 Farben)
- [x] Q1 Engineering: STL + CI + Tests + Lint + E2E + Webhook-Code + Scan-RL + Sentry-Hook

---

## Deploy-Pflicht (Mensch)

1. `supabase-schema.sql` (Q1-Abschnitt) ausführen  
2. `shopify-order-webhook` + Secrets deployen  
3. Shopify Webhook `orders/paid` eintragen  
4. Optional: `VITE_SENTRY_DSN`, Cloudflare Rate-Limit  

## Nächste Agent-Session

**T9/T10** (Print-QC Freigabe + echte Variant-IDs) oder Microsite nur wenn Print/Commerce nicht blockiert.
