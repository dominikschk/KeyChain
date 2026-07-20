# Go-Live – Überblick

Ziel: Shop **nach und nach** fertig – erst Bestellen, dann Admin-Sync, dann Feinschliff.

---

## Erledigt (wenn bei dir schon geklappt)

### Schritte 1–3 → [`GO_LIVE_SCHRITT_1_3.md`](GO_LIVE_SCHRITT_1_3.md)

- [x] PR #1 mergen  
- [x] Vercel Env (`VITE_SUPABASE_*`)  
- [x] Testbestellung → Shopify-Warenkorb  

---

## Jetzt als Nächstes

### Schritt 4 → [`GO_LIVE_SCHRITT_4_WEBHOOK.md`](GO_LIVE_SCHRITT_4_WEBHOOK.md)

**Bezahlte Order → NUDAIM-Admin (`paid`)**

Blöcke:

1. SQL in Supabase  
2. Edge Function `shopify-order-webhook` (JWT **AUS**)  
3. Shopify-Webhook + Signing Secret  
4. Testzahlung → Admin prüfen  

Zusätzlich (kürzer): [`SHOPIFY_DASHBOARD_WEBHOOK.md`](SHOPIFY_DASHBOARD_WEBHOOK.md)

---

## Kundenpfad (jetzt schon)

1. Logo / Anhänger  
2. In den Warenkorb  
3. Bei Shopify bezahlen  

---

## Später (erst nach Schritt 4)

1. Echte Variant-ID  
2. Draft Orders / Staffelpreis  
3. Print-QC Alltag  

Siehe `PROFI_TODO.md`.
