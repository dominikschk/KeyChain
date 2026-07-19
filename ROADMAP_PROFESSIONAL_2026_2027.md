# NUDAIM Jahres-Roadmap: Hochprofessionell (40 Personen, 24/7)

Stand: 2026-07-19  
Horizont: Q3/2026 – Q2/2027 (12 Monate)  
Kapsel: kanonische Team-Quelle für Langfrist-Prioritäten. Kurzfristiges Backlog bleibt in [`VORHABEN.md`](VORHABEN.md).

---

## 1. Produktprinzip

**Kernprodukt:** physischer NFC-Schlüsselanhänger (3D/Logo-Prägung).  
**Zusatz:** Microsite / Chip-Link / CCP – markenstark, aber sekundär.

Kein Feature-Friedhof: Digitale Seite wächst kontrolliert. **Print + Shopify-Ops + CI** dominieren die ersten 6 Monate.

---

## 2. Ausgangslage (Code-Stand 2026-07-19, aktualisiert)

### Stark heute

- Zwei-Phasen-Konfigurator (`pages/ConfiguratorPage.tsx`) inkl. Kunden-CX (Bestellen primär)
- Logo-Pipeline Preview vs. Print + Logo-Health
- **STL headless** (`lib/stlExport.ts`) + **Print-PNG** (`lib/printAssets.ts`) im Save-/Admin-Flow
- Microsite (Blöcke, Anker-Nav, Favicon, Share-Meta), CCP (Rollback, Scan-Insights), Admin (Print-QC, CSV, STL-Liste)
- Shopify-Cart-Handoff inkl. Line-Item-Properties
- **CI** (typecheck, lint, vitest, build, Playwright) · ESLint · Unit-Tests
- Webhook-**Code** + Scan-Rate-Limit-RPC + optional Sentry
- Filament-Profile + Fertigungs-Doku (`MANUFACTURING_TOLERANCES.md`)
- Security-Fixes dokumentiert (`SECURITY_ISSUES.md`)
- **Erledigt (Dominik, 2026-07-19):** Shopify-Bestellmail/Liquid live + echte Testbestellung (Properties → Mail → CCP)

### Noch offen (Betrieb / Skala)

| Bereich | Ist |
|--------|-----|
| Betrieb | Webhook/Schema/Secrets **deployen** (Code liegt bereit) → siehe `PROFI_TODO.md` Phase 0 |
| Commerce | Echte Shopify Variant-IDs in Env; echte Mengenrabatte im Shop |
| Engineering | Preview-Deploys, Branch-Schutz, Staging-Trennung |
| Digital | Stempelkarte serverseitig; Partner-API; volle EN-i18n |
| Querschnitt | Error-Budgets, Cloudflare-Limits live, DSGVO-Paket |

---

## 3. Zielbild in 12 Monaten

Kunde konfiguriert → unverbindliche, aber ehrliche Vorschau mit Legal-Hinweisen → Checkout läuft vollautomatisch (Shopify ↔ Backend) → Produktion erhält prüfbare Print-Assets + STL → Status/Tracking im CCP → Microsite ist markenstark und messbar → Team hat CI, Observability, SLOs.

---

## 4. Organisationsmodell: 40 Personen, 24/7

**Modell:** Follow-the-Sun (3 Schichten × ~8h) – nicht „jeder arbeitet 24h“. Ziel: jederzeit On-Call, Production-Support und CI-Grün.

```mermaid
flowchart TB
  subgraph leadership [Leadership_4]
    PM[Product_2]
    EngMgr[Engineering_Lead_1]
    OpsLead[Ops_Manufacturing_Lead_1]
  end
  subgraph squads [Squads_36]
    S1[Print_Manufacturing_8]
    S2[Configurator_Commerce_7]
    S3[Digital_Microsite_CCP_6]
    S4[Platform_Security_DevOps_6]
    S5[QA_Design_Support_Data_9]
  end
  leadership --> squads
  S1 --> Factory[Druckerei_Admin_STL]
  S2 --> Shop[Shopify_Checkout]
  S3 --> Chip[NFC_Landing_CCP]
  S4 --> Infra[CI_Observability_RLS]
  S5 --> Quality[Tests_UX_Support]
```

| Squad | Kopf | Auftrag |
|-------|------|---------|
| **Print & Manufacturing** | 8 | STL/G-Code-Pipeline, Print-QC, Admin-Produktionsboard, Material/Farbkalibrierung |
| **Configurator & Commerce** | 7 | Anhänger-UX, Variantenkatalog, Shopify Sync, Pricing, Bulk/B2B |
| **Digital (Microsite + CCP)** | 6 | Mini-Website, Analytics, Brand-Chat, Edit-after-order |
| **Platform, Security, DevOps** | 6 | CI/CD, Monitoring, Rate-Limits, Threat Model, Multi-Env |
| **QA, Design, Support, Data** | 9 | E2E, Design System, CS-Tools, Dashboards, Legal/Copy |
| **Leadership** | 4 | Roadmap, Priorisierung, Vendor (Shopify/Supabase/Druckerei) |

**Kapazität (grob):** ~40 FTE × ~1.600 produktive Stunden/Jahr ≈ **64.000 Personenstunden**.

**Arbeitsrhythmus:** 2-Wochen-Sprints, Release-Train freitags, Hotfix-Lane 24/7, Security-Review nach jedem großen Diff.

### Schichtmodell (24/7)

| Schicht | Fokus |
|---------|--------|
| EU-Tag | Feature-Entwicklung, Produkt, Design-Reviews |
| Überlapp US/APAC | CI-Grün halten, Deploy-Fenster, Pairing |
| Nacht / On-Call | Incidents, Webhook-Fails, Production-Blocker |

---

## 5. KPIs (ganzes Jahr)

| KPI | Zielrichtung |
|-----|----------------|
| Conversion Konfigurator → Checkout | steigern, monatlich tracken |
| Reprint-Rate (Fertigung) | senken (Print-QC + klare Legal-Copy) |
| Support-Tickets / Order | senken |
| p95 Save-Latency (Config speichern) | Budget festlegen & halten |
| Failed Shopify-Webhooks | &lt; 0,5 % / Monat nach Sync-Go-Live |
| Microsite-Uptime | ≥ 99,5 % (ab Q4) |
| Fertigungs-SLA | z. B. Produktionsstart ≤ 48h nach `paid` |
| CI: Main grün | ≥ 99 % der Werktage |

---

## 6. Querschnittsthemen (ganzes Jahr)

- **Legal/UX-Texte:** immer prüfen – nötig? redundant? zu technisch?
- **3D-Druck-Disclaimer:** Vorschau unverbindlich; max. 3 Farben; Farbtöne können abweichen
- **Security:** Threat-Model-Reviews; keine offenen Writes; Token-Rotation
- **Manufacturing SLA:** dokumentiert und im Admin sichtbar
- **Kein Webflow-Klon** im Jahr-1-Kern

---

## 7. Quartalsplan

### Q1 (Monate 1–3) – Fundament & Fertigung (Must)

Fokus: Produktionsfähigkeit und Engineering-Hygiene.

| # | Thema | Status / Hinweis |
|---|--------|------------------|
| 1 | **STL/Print-Pipeline wieder live** | **erledigt** (headless STL + Print-PNG + Admin) |
| 2 | **CI/CD** | **größtenteils** – Actions: typecheck+lint+vitest+build+e2e; Preview-Deploys/Branch-Schutz offen |
| 3 | **Test-Grundlage** | **erledigt** – Unit + Playwright Smoke (voller Upload-Save braucht Staging) |
| 4 | **Security-Deploy** | **Code erledigt** – Scan-RPC; Cloudflare/Schema-Deploy manuell |
| 5a | **Shopify Live-Delivery** | **erledigt 2026-07-19** |
| 5b | **Shopify Order-Sync** | **Code erledigt** – Deploy offen (`SHOPIFY_WEBHOOK.md`) |
| 6 | **Observability** | **teilweise** – optional Sentry (`VITE_SENTRY_DSN`); Error-Budgets offen |

**Exit-Kriterien Q1:** Admin sieht bezahlte Orders automatisch + Print-Assets; Main immer grün. (Mail/CCP-Smoke bereits grün. **Deploy = Phase 0 bei Dominik.**)

---

### Q2 (Monate 4–6) – Commerce-Profi & Varianten

1. **Produktkatalog** – echte Variant-IDs (Badge, Größen, Materialien); Preisregeln · **[DU/Env]**
2. **B2B/Bulk** – Mengenrabatt im Shop · **[DU]**; Stückzahl + Hinweis im Konfigurator · **[CODE erledigt]**
3. **Print-QC UI** · **[CODE erledigt]** inkl. Reprint-Grund + STL-Liste
4. **Farbmanagement** – Filament-Profile + Toleranz-Doku · **[CODE erledigt]** (`filamentProfiles`, `MANUFACTURING_TOLERANCES.md`)
5. **Admin 2.0** – Queue/Filter/CSV/STL-Batch · **[CODE erledigt]**; Shopify-Deep-Links vorhanden
6. **Design System** – Tokens/A11y · teilweise; WCAG-Vollpass offen

**Exit-Kriterien Q2:** ≥2 physische Produktvarianten live; Produktionsqueue ohne manuelles CSV-Chaos.

---

### Q3 (Monate 7–9) – Digitale Seite Enterprise

Anschluss an `VORHABEN.md`, ohne Anhänger zu verwässern:

1. Reichere Blöcke (Galerie, FAQ, Preise, Öffnungszeiten) · **[CODE erledigt]**
2. Section-Builder (Abstände, Ausrichtung, Duplizieren) · **[CODE erledigt]** (Basis)
3. Multi-Page/Anker-Nav + SEO/Share-Preview · **[CODE erledigt]**
4. Brand-Chat 2.0 (URL/PDF scrape) · **[CODE erledigt]** (Edge optional deployen)
5. CCP: Versionierung, Rollback, Scan-Insights · **[CODE erledigt]** (lokal / einfach)
6. Stempelkarte serverseitig (Anti-Cheat) · **offen** (bei B2B-Nachfrage)

**Exit-Kriterien Q3:** Microsite wirkt wie „kleine Markenwebsite“; CCP für Nicht-Techniker bedienbar.

---

### Q4 (Monate 10–12) – Skala, International, Moat

1. **i18n** (DE/EN zuerst), Multi-Currency Shopify
2. **Partner-API** – Agenturen konfigurieren programmatisch
3. **NFC-Ops** – Chip-Programmierung/Batch-Encoding-Doku + Tooling (auch wenn Hardware extern)
4. **Performance** – Edge-Caching Microsite, Image-CDN, Lighthouse-Budgets
5. **Compliance** – DSGVO-Paket, AVV, Auftragsdaten, Impressum-Flows; Print-Disclaimer zentral
6. **Moat-Features** – Nachbestellung gleiches Logo, A/B Landing, White-Label

**Exit-Kriterien Q4:** EN-Markt pilotierbar; ≥99,5 % Microsite-Uptime; dokumentierte Fertigungs-SLA.

---

## 8. Squad-Backlogs (Jahr-1, priorisiert)

### 8.1 Print & Manufacturing (8)

**Q1**
- [x] STL-Pipeline an Save-/Admin-Flow anbinden (statt Stub in `KeychainPreview`) – headless `lib/stlExport.ts`
- [x] Produktions-PNG aus `svgForProduction` / Print-Raster exportieren & speichern (`print_png_url` in `plate_data`)
- [x] Admin: Druck-Assets + Status sichtbar (STL + Print-PNG Downloads)
- [ ] Materialliste + Farbtoleranz-Doku (intern)

**Q2**
- [x] Print-QC-Freigabe (Mensch-in-the-Loop) – Admin QC → optional `in_production`
- [x] Batch-Export für Druckerei (CSV)
- [ ] Filament-/Platten-Profile

**Q3–Q4**
- SLA-Tracking; Nachdruck-Workflow; Qualitätsmetriken (Reprint-Rate)

### 8.2 Configurator & Commerce (7)

**Q1**
- [x] Shopify Webhook → Order/`paid` in Backend (Code + Docs; Deploy manuell)
- [ ] Cart-Properties stabil halten; Variant-Mapping vorbereiten

**Q2**
- Mehrere physische Varianten (Badge etc.) mit echten Shopify Variant-IDs
- Pricing / Mengenstaffeln; B2B-Checkout-Pfad

**Q3–Q4**
- Nachbestellung; Partner-Handoff; Multi-Currency

### 8.3 Digital Microsite + CCP (6)

**Q1**
- Stabilität & Security bei bestehenden Layouts; keine Scope-Explosion

**Q2**
- A11y + Design-Tokens mit Squad QA/Design

**Q3**
- Blöcke, Section-Builder, Nav, Brand-Chat 2.0 (siehe Quartalsplan)
- CCP Versionierung / Insights

**Q4**
- i18n der Microsite; Share-Preview; Performance

### 8.4 Platform, Security, DevOps (6)

**Q1**
- [x] GitHub Actions CI (typecheck + lint + vitest + build + e2e); Preview-Deploys & Branch-Schutz offen
- [x] Sentry-Hook (optional DSN); Rate-Limits dokumentiert + Scan-RPC
- [ ] Rest-Checkliste `SECURITY_ISSUES.md` in Prod ausführen (Mensch)

**Q2**
- Staging/Prod-Trennung; Secrets-Rotation; Backup-Drills

**Q3–Q4**
- SLO-Dashboards; Partner-API Auth; Compliance-Logging

### 8.5 QA, Design, Support, Data (9)

**Q1**
- [x] Unit (Utils/Validation/STL/Print/Webhook) + Playwright Smoke
- [x] Legal-Copy zentral (`LEGAL_COPY.md`)
- [ ] Support-Playbooks (Mail/CCP/Order)

**Q2**
- [x] Admin Queue, Filter, Batch-Export, Shopify-Deep-Links (erster Slice)
- [ ] Weitere UX-Politur / Batch-STL-ZIP

**Q3–Q4**
- Analytics-Dashboards (Conversion, Scans, Tickets); EN-Copy; CS-Tools

### 8.6 Leadership (4)

- Quartals-OKRs; Vendor-Verträge (Shopify, Supabase, Druckerei)
- Kapazitätssteuerung gegen Feature-Creep
- Go/No-Go an Quartals-Exit-Kriterien

---

## 9. Abhängigkeiten (kritischer Pfad)

```mermaid
flowchart LR
  CI[CI_Tests] --> Webhook[Shopify_Webhook]
  STL[STL_Print_Pipeline] --> AdminQC[Admin_Print_QC]
  Webhook --> AdminQC
  AdminQC --> Variants[Produktvarianten]
  Variants --> B2B[B2B_Bulk]
  CI --> MicroExpand[Microsite_Enterprise]
  AdminQC --> MicroExpand
  MicroExpand --> i18n[i18n_EN]
```

Ohne **STL + Webhook + CI** keine seriöse Skalierung von Varianten oder Digital-Enterprise.

---

## 10. Bewusst nicht im Jahr-1-Kern

- Vollständiger Website-Builder à la Webflow
- Beliebige Custom-CSS / freies HTML in der Microsite
- Eigenes ERP ersetzen (Shopify bleibt Source of Truth für Zahlung)
- Hardware-NFC-Writer als Consumer-Produkt (nur Ops-Tooling)

---

## 11. Bezug zu bestehenden Docs

| Doc | Rolle |
|-----|--------|
| [`VORHABEN.md`](VORHABEN.md) | Kurzfristiges Slice-Backlog |
| [`PROFI_TODO.md`](PROFI_TODO.md) | Abhak-Liste Dominik: Deploy → Fertigung → Support → Microsite → Skala |
| [`SECURITY_ISSUES.md`](SECURITY_ISSUES.md) | Security-Schuld & Deploy-Checkliste |
| [`SHOPIFY_EMAIL_TESTEN.md`](SHOPIFY_EMAIL_TESTEN.md) | Mail-Smoke (Live-Test erledigt) |
| [`SHOPIFY_DASHBOARD_WEBHOOK.md`](SHOPIFY_DASHBOARD_WEBHOOK.md) | Webhook Klick-für-Klick ohne CLI |
| Diese Datei | Jahres-Org, Quarters, Squads, KPIs |

---

## 12. Nächster konkreter Schritt

1. ~~Q1 STL + CI + Webhook-Code~~ – erledigt im Repo (siehe `TASKS.md`)
2. **Mensch:** Schema + `shopify-order-webhook` + Shopify `orders/paid` deployen
3. Q2 starten: Print-QC Freigabe + echte Variant-IDs
4. Quartals-Review an Exit-Kriterien – Scope streichen statt strecken
