# TASKS.md – Agent-Backlog

Stand: 2026-07-19  
Abgeleitet aus [`ROADMAP_PROFESSIONAL_2026_2027.md`](ROADMAP_PROFESSIONAL_2026_2027.md) und [`VORHABEN.md`](VORHABEN.md).

**Priorität:** P0 = Q1-Must · P1 = Q1 parallel · P2 = Q2+

---

## P0 – Q1 Fundament

| ID | Aufgabe | Status |
|----|---------|--------|
| T1–T8 | STL/Print, CI, Tests, Webhook-Code, Security-RPC, Sentry, E2E, Lint | **erledigt** |

## P2 – Q2+ (dieser Stand)

| ID | Aufgabe | Status |
|----|---------|--------|
| T9 | Print-QC Freigabe-Workflow | **erledigt** – Admin QC + Schema-Spalten |
| T10 | Shopify Variant-IDs | **teilweise** – Env `VITE_SHOPIFY_VARIANT_*`; Badge-ID noch Fallback |
| T11 | Microsite FAQ / Öffnungszeiten / Galerie | **erledigt** |
| T12 | Admin 2.0 Queue/Filter/CSV-Export | **erledigt** |
| T13 | Design-Tokens + A11y (Skip-Link, Focus, Labels) | **erledigt** (Kern) |
| T14 | i18n DE/EN Grundlage | **erledigt** (Admin + Shared-Keys) |

---

## Deploy-Pflicht (Mensch)

1. `supabase-schema.sql` (Q1 + Q2 Print-QC) ausführen  
2. `shopify-order-webhook` + Secrets + Shopify `orders/paid`  
3. Optional: `VITE_SENTRY_DSN`, Cloudflare Rate-Limit  
4. Optional: echte Badge-Variant-ID als `VITE_SHOPIFY_VARIANT_BADGE`

## Docs

- [`SHOPIFY_WEBHOOK.md`](SHOPIFY_WEBHOOK.md) · [`LEGAL_COPY.md`](LEGAL_COPY.md) · [`SUPPORT_PLAYBOOK.md`](SUPPORT_PLAYBOOK.md)
