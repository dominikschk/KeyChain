# TASKS.md – Agent-Backlog

Stand: 2026-07-19  
Abgeleitet aus [`ROADMAP_PROFESSIONAL_2026_2027.md`](ROADMAP_PROFESSIONAL_2026_2027.md) und [`VORHABEN.md`](VORHABEN.md).

**Priorität:** P0 = Q1-Must / kritischer Pfad · P1 = Q1 parallel · P2 = später

---

## P0 – Q1 Fundament (kritischer Pfad)

| ID | Aufgabe | Status | Hinweis |
|----|---------|--------|---------|
| T1 | **STL/Print-Pipeline** – headless STL, Print-PNG Upload, Admin-Druckspalte | **in diesem PR** | `lib/stlExport.ts`, `lib/printAssets.ts`; Raster → Platten-STL + Print-PNG |
| T2 | **CI** – GitHub Actions: typecheck, unit tests, build | **in diesem PR** | `.github/workflows/ci.yml` |
| T3 | **Test-Grundlage** – Unit für Utils/Validation/STL/Print | **in diesem PR** | Vitest `lib/__tests__/q1-foundation.test.ts` |
| T4 | **Shopify Order-Webhook** → Admin Status `paid` | offen | `lib/ordersApi.ts` + Edge Function |
| T5 | **Security-Deploy** – Rest aus `SECURITY_ISSUES.md` | offen | Schema + Edge Functions + Rate-Limit |

## P1 – Q1 parallel

| ID | Aufgabe | Status |
|----|---------|--------|
| T6 | Observability (Sentry + Basis-Analytics) | offen |
| T7 | Playwright Smoke Upload → Save → Cart-URL | offen |
| T8 | Lint (ESLint) in CI | offen |

## P2 – nach Q1-Exit

| ID | Aufgabe | Status |
|----|---------|--------|
| T9 | Print-QC UI / 3-Farben-Produktionstrennung | offen |
| T10 | Produktvarianten mit echten Shopify Variant-IDs | offen |
| T11 | Microsite-Slices laut `VORHABEN.md` (ohne Print zu blockieren) | offen |

---

## Erledigt (Referenz)

- [x] Shopify Bestellmail/Liquid live + Smoke Order (2026-07-19)
- [x] CCP-Edit mit `write_token`
- [x] Logo Preview vs. Print (max. 3 Farben)

---

## Nächste Agent-Session

Nach Merge von T1–T3: **T4 Shopify Order-Webhook** (P0).
