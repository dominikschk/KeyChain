# NUDAIM Profi-To-do – zum Abhaken

Stand: 2026-07-19  
Ziel: komplette Profi-Software – **Anhänger zuerst**, dann Shop-Ops, dann Microsite.

**So nutzen:** von oben nach unten. Ein Block erst abschließen, bevor der nächste groß wird.  
Legende: **[DU]** = du in Dashboard/Shopify · **[CODE]** = schon im Repo / Agent · **[SPÄTER]** = bewusst nach Go-Live

Doku-Links: [`SHOPIFY_DASHBOARD_WEBHOOK.md`](SHOPIFY_DASHBOARD_WEBHOOK.md) · [`SECURITY_ISSUES.md`](SECURITY_ISSUES.md) · [`LEGAL_COPY.md`](LEGAL_COPY.md) · [`SUPPORT_PLAYBOOK.md`](SUPPORT_PLAYBOOK.md)

---

## Phase 0 – Live schalten (diese Woche)

Ohne Phase 0 kein echter Betrieb.

### 0.1 Datenbank
- [ ] **[DU]** SQL aus `supabase/migrations/q1_q2_orders_webhook.sql` im Supabase SQL Editor ausführen
- [ ] **[DU]** Kontrolle: Funktionen `upsert_order_from_shopify` + `record_nfc_scan` existieren
- [ ] **[DU]** Kontrolle: Spalten `print_qc_status`, `print_qc_note`, `print_qc_at` an `orders`
- [ ] **[DU]** Rest aus `SECURITY_ISSUES.md` Deployment-Checkliste (Schema/Policies falls noch nicht)

### 0.2 Shopify ↔ Admin Auto-Sync
- [ ] **[DU]** Edge Function `shopify-order-webhook` anlegen (Code aus Repo)
- [ ] **[DU]** **Verify JWT = AUS**
- [ ] **[DU]** Shopify Webhook `orders/paid` → Function-URL
- [ ] **[DU]** Signing Secret → Supabase Secret `SHOPIFY_WEBHOOK_SECRET`
- [ ] **[DU]** Smoke: Testorder mit `Config-ID` → Admin zeigt Status `paid`  
  Anleitung: [`SHOPIFY_DASHBOARD_WEBHOOK.md`](SHOPIFY_DASHBOARD_WEBHOOK.md)

### 0.3 App-Deploy (Vercel)
- [ ] **[DU]** Branch/PR mergen oder Preview deployen
- [ ] **[DU]** Env setzen: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- [ ] **[DU]** Optional: `VITE_SENTRY_DSN`
- [ ] **[DU]** Optional: `VITE_SHOPIFY_VARIANT_KEYCHAIN`, `VITE_SHOPIFY_VARIANT_BADGE` (echte IDs)
- [ ] **[DU]** Smoke: Konfigurator speichern → Cart → Mail/CCP → Microsite

### 0.4 Security-Basics live
- [ ] **[DU]** Edge Function `send-microsite-email` deployed (falls noch alt)
- [ ] **[DU]** Secret `ALLOWED_MICROSITE_HOSTS` = eure Domain(s)
- [ ] **[DU]** Cloudflare/WAF Rate-Limit auf App + Supabase-API (grob 60 req/min/IP)
- [ ] **[DU]** Admin-User in `admin_users` + Login testen

**Exit Phase 0:** Eine echte bezahlte Order erscheint **ohne Handarbeit** im Admin, Print-PNG/STL sind sichtbar, CCP aus der Mail funktioniert.

---

## Phase 1 – Fertigung Profi (Anhänger)

Kernprodukt. Hier entscheidet sich Reprint-Rate und Stress in der Druckerei.

### 1.1 Print-QC Alltag
- [ ] **[DU]** Erste 10 Orders: Print-PNG prüfen → im Admin freigeben/zurückweisen
- [ ] **[DU]** CSV-Export einmal mit der Druckerei durchspielen
- [ ] **[DU]** Festlegen: Wann gilt „freigegeben“ → Status `in_production`
- [ ] **[DU]** SLA 48h nach `paid` intern kommunizieren (Admin zeigt Überziehung)

### 1.2 Assets & Qualität
- [x] **[CODE]** STL + Print-PNG Pipeline ist im Repo (headless Export)
- [ ] **[DU]** Stichprobe: Raster-Logo → Print-PNG ok? STL = Platte?
- [ ] **[DU]** Stichprobe: SVG-Logo → STL mit Logo-Geometrie?
- [x] **[CODE]** Material-/Farbtoleranzen: [`MANUFACTURING_TOLERANCES.md`](MANUFACTURING_TOLERANCES.md)
- [x] **[CODE]** Filament-Profile (`lib/filamentProfiles.ts`)

### 1.3 Produktvarianten
- [ ] **[DU]** Echte Shopify Variant-ID für **Schlüsselanhänger** in Vercel setzen
- [ ] **[DU]** Echte Shopify Variant-ID für **Messe-Badge** setzen (sonst gleicher Fallback)
- [ ] **[DU]** Preise/Varianten im Shop stimmen mit Konfigurator überein (`VITE_PRICE_*` + Shop-Katalog)
- [ ] **[DU]** Optional: Staffel-Varianten Q10/Q25 anlegen und Env setzen (sonst Rabatt nur im Shop)
- [x] **[CODE]** Preisschichtung im Konfigurator → passende Variant-ID + Preis-Property an Shopify-Cart
- [x] **[CODE]** Draft Orders Edge Function (`create-draft-order`) + Client-Fallback auf Cart
- [ ] **[DU]** Shopify Custom App (`write_draft_orders`) + Secrets – siehe [`SHOPIFY_DRAFT_ORDER.md`](SHOPIFY_DRAFT_ORDER.md)
- [ ] **[SPÄTER]** Weitere Materialien/Größen nur mit eigener Variant-ID
- [ ] **[SPÄTER]** Draft Order: Versandzeilen / Steuer-Feintuning im Shop prüfen
- [x] **[CODE]** Reprint-Grund bei QC-Ablehnung + STL-URL-Batch-Liste im Admin
- [x] **[CODE]** CCP Scan-Insights (verständliche Zusammenfassung)

**Exit Phase 1:** Druckerei arbeitet aus Admin/CSV ohne Chat-Chaos; ≤ Reprint-Quote intern trackbar.

---

## Phase 2 – Shop & Support Profi

### 2.1 Bestellflow
- [ ] **[DU]** Liquid-Mail noch einmal live prüfen (CCP + Handy-Seite)
- [ ] **[DU]** Optional: Property `CCP-URL` sichtbar (statt nur `_CCP-URL`)
- [ ] **[DU]** Support-Playbook lesen/anpassen: [`SUPPORT_PLAYBOOK.md`](SUPPORT_PLAYBOOK.md)
- [x] **[CODE]** Kunden-CX: Bestellen primär, Legal einmal, klare Speichern-Texte, freundliche Fehler
- [ ] **[DU]** Legal-Texte in Konfigurator/Checkout gegen [`LEGAL_COPY.md`](LEGAL_COPY.md) prüfen

### 2.2 Observability
- [ ] **[DU]** Sentry-Projekt anlegen → `VITE_SENTRY_DSN` in Vercel
- [ ] **[DU]** Ein Testfehler provozieren → erscheint in Sentry?
- [ ] **[SPÄTER]** Error-Budget / wöchentlicher Blick auf Failed Webhooks

### 2.3 Admin-Alltag
- [ ] **[DU]** Filter „QC offen“ / „Bezahlt“ als Tagesstart nutzen
- [ ] **[DU]** Shopify-Deep-Link aus Admin testen
- [ ] **[SPÄTER]** Batch-ZIP aller STLs einer Woche

**Exit Phase 2:** Support braucht selten Entwickler; Webhook-Fails &lt; spürbar selten.

---

## Phase 3 – Microsite „kleine Markenwebsite“

Erst wenn Phase 0–1 stabil sind. Anhänger bleibt Priorität.

### 3.1 Schon nutzbar
- [x] **[CODE]** FAQ-, Öffnungszeiten-, Galerie-Blöcke
- [x] **[CODE]** Preise-Block + Ausrichtung/Abstand pro Section
- [x] **[CODE]** Share-Meta (Titel/Beschreibung/og:image) für öffentliche Microsite
- [x] **[CODE]** „Jetzt geöffnet“-Hinweis bei Öffnungszeiten (grob)
- [x] **[CODE]** Logo-Health-Check vor Speichern + Hinweis in der Anhänger-Vorschau
- [x] **[CODE]** Print-QC Side-by-Side (Vorschau vs. Print-PNG) im Admin
- [x] **[CODE]** Landing-Layout, Schriften, Branchen-Vorlagen, Brand-Chat MVP

### 3.2 Als Nächstes (Produkt)
- [x] **[CODE]** Anker-Navigation + Mini-Seite Kontakt
- [x] **[CODE]** Favicon-Upload
- [x] **[CODE]** Brand-Chat: Website-URL / PDF (https, sanitize; Edge `brand-scrape`)
- [x] **[CODE]** CCP: Versionierung / Rollback (lokal, max. 5)

### 3.3 Qualität Microsite
- [ ] Mobile Smoke auf echtem Handy (iOS + Android)
- [ ] Kontraste Dark/Light prüfen (WCAG grob)
- [ ] Keine `javascript:`-Links, nur https-Bilder

**Exit Phase 3:** Microsite wirkt wie kleine Markenseite, nicht wie Linktree – ohne Webflow-Komplexität.

---

## Phase 4 – Skala & Moat

- [ ] i18n: EN-Texte im Konfigurator (nicht nur Admin-Keys)
- [ ] Multi-Currency Shopify (wenn EN-Markt)
- [ ] Nachbestellung gleiches Logo (Config wiederverwenden)
- [ ] Partner-/Agentur-Handoff (API oder Bulk)
- [ ] NFC-Batch-Encoding Doku für Produktion
- [ ] Staging-Environment getrennt von Prod
- [ ] Backup-Drill Supabase (Restore einmal testen)
- [ ] DSGVO-Paket: AVV, Impressum/Datenschutz-Flows prüfen

---

## Phase 5 – „Perfekt“-Ideen (Profi-Extras)

Bewusst optional – nur wenn Kern läuft.

### Fertigung
- [x] Print-QC: Side-by-Side Kunden-Vorschau vs. 3-Farben-Druck
- [ ] Automatische E-Mail an Druckerei bei QC-Freigabe
- [ ] Reprint-Grund erfassen (Dropdown) → Metrik
- [ ] G-Code/Export-Hinweise pro Material

### Konfigurator
- [x] Logo-Health-Check vor Save („zu viele Farben → wird vereinfacht“)
- [x] Fortschrittsbalken Speichern verständlicher (1/4 … 4/4)
- [x] Entwurf teilen-Link (ohne Checkout, `?draft=`)
- [x] B2B: Mengenrabatt-Hinweis + Stückzahl im Warenkorb

### Digital
- [ ] Scan-Insights im CCP (ohne Spam, Rate-Limit schon da)
- [x] Versionierung Microsite (Rollback, lokal max. 5)
- [x] Öffnungszeiten mit „jetzt geöffnet“-Badge

### Betrieb
- [ ] Statusseite / Uptime-Ping Microsite
- [ ] Wöchentliches Dashboard: Conversion, Reprints, Webhook-Fails
- [ ] On-Call-Notiz: wer bei Webhook-Fail reagiert

---

## Schon erledigt (Repo – nicht nochmal bauen)

Zum Abhaken mental, nicht nochmal implementieren:

- [x] STL headless + Print-PNG Upload + Admin-Downloads
- [x] CI: typecheck, lint, unit, build, Playwright
- [x] Shopify Webhook **Code** + Docs
- [x] Scan Rate-Limit RPC
- [x] Print-QC UI + CSV + Filter + SLA-Hinweis
- [x] FAQ / Hours / Gallery
- [x] i18n-Grundlage + Design-Tokens + Skip-Link
- [x] Legal-Copy + Support-Playbook

---

## Deine Reihenfolge (empfohlen)

1. **Phase 0** komplett (Webhook JWT aus + Secret + eine Testorder)  
2. **Phase 1.1–1.3** (QC-Alltag + echte Variant-IDs)  
3. **Phase 2** (Sentry + Support)  
4. Dann erst **Phase 3** Microsite-Feinschliff  
5. **Phase 4–5** nur mit klarem Nutzen

---

## Eine Frage an dich (nur wenn du sie hast)

Schick mir die **echte Shopify Variant-ID für den Messe-Badge** (und ggf. Keychain, falls anders) – dann kann sie fest ins Repo/Env, statt Fallback.

Alles andere aus Phase 0 kannst du allein mit der Dashboard-Anleitung durchklicken. Wenn irgendwo 401/500 kommt: Screenshot von Shopify „Recent deliveries“ oder Function-Logs reicht.
