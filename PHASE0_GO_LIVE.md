# Phase 0 – Go-Live (eine Sitzung)

Ziel: **Eine bezahlte Testorder** erscheint automatisch im Admin, Draft-Checkout setzt den Staffelpreis, Print-PNG/STL sind da.

Alles mit **[DU]** brauchst du in den Dashboards. Code liegt bereit.

Detaildokus: [`SHOPIFY_DASHBOARD_WEBHOOK.md`](SHOPIFY_DASHBOARD_WEBHOOK.md) · [`SHOPIFY_DRAFT_ORDER.md`](SHOPIFY_DRAFT_ORDER.md) · [`SHOPIFY_WEBHOOK.md`](SHOPIFY_WEBHOOK.md)

---

## A. Supabase (ca. 15 Min)

1. SQL Editor → Inhalt von `supabase/migrations/q1_q2_orders_webhook.sql` ausführen  
2. Kontrolle:
   ```sql
   SELECT proname FROM pg_proc
   WHERE proname IN ('upsert_order_from_shopify', 'record_nfc_scan');
   ```
3. Kontrolle Spalten:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'orders'
     AND column_name IN ('print_qc_status', 'print_qc_note', 'print_qc_at');
   ```
4. Falls Security-Fixes noch fehlen: relevanten Teil aus `supabase-schema.sql` / `SECURITY_ISSUES.md` nachziehen  
5. Admin-User in `admin_users` eintragen + Login testen

---

## B. Edge Functions deployen

| Function | JWT Verify | Secrets |
|----------|------------|---------|
| `shopify-order-webhook` | **AUS** | `SHOPIFY_WEBHOOK_SECRET` |
| `create-draft-order` | AN (ok) | `SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, optional `PRICE_*_CENTS` |
| `send-microsite-email` | je nach Setup | `RESEND_API_KEY`, `EMAIL_WEBHOOK_SECRET`, `ALLOWED_MICROSITE_HOSTS` |

CLI-Beispiel:

```bash
supabase functions deploy shopify-order-webhook --no-verify-jwt
supabase functions deploy create-draft-order
supabase secrets set SHOPIFY_WEBHOOK_SECRET="…"
supabase secrets set SHOPIFY_SHOP_DOMAIN="dein-shop.myshopify.com"
supabase secrets set SHOPIFY_ADMIN_ACCESS_TOKEN="shpat_…"
```

`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` sind bei Functions meist schon gesetzt (Preis-Snapshot-Lookup).

---

## C. Shopify

1. Webhook **Bestellung bezahlt** (`orders/paid`) →  
   `https://<PROJEKT>.supabase.co/functions/v1/shopify-order-webhook`  
2. Signing Secret = `SHOPIFY_WEBHOOK_SECRET`  
3. Custom App mit `write_draft_orders` + `read_draft_orders` → Token in Secrets  
4. Optional: echte Variant-IDs notieren (Cart-Fallback)

---

## D. Vercel / App

Env:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_PRICE_KEYCHAIN_CENTS=24.90
VITE_PRICE_KEYCHAIN_Q10_CENTS=21.90
VITE_PRICE_KEYCHAIN_Q25_CENTS=18.90
# optional:
VITE_SHOPIFY_VARIANT_KEYCHAIN=
VITE_SHOPIFY_VARIANT_BADGE=
VITE_SENTRY_DSN=
```

Branch/PR mergen oder Preview deployen.

---

## E. Smoke-Test (Pflicht)

- [ ] Konfigurator: Logo + 1× Anhänger speichern → im Korb → **Zur Kasse**  
- [ ] Checkout-Betrag = Einzelpreis aus dem Konfigurator  
- [ ] Bezahlen (oder Shopify-Testgateway)  
- [ ] Admin: Order Status `paid`, Config-ID stimmt, Preview/Print-PNG/STL sichtbar  
- [ ] Zweites Design: 25× Design A + 1× Design B → B bleibt Einzelpreis an der Kasse  
- [ ] Mail: Handy-Seite + Bearbeiten-Link (CCP) öffnen  

**Exit:** Alles oben grün → Phase 0 erledigt. Weiter mit Print-QC Alltag (`PROFI_TODO.md` Phase 1).

---

## Neu in diesem Slice (Code)

- Preis-Snapshot in `plate_data.pricing` beim Speichern  
- Draft Order bindet Menge an Snapshot (weniger Tampering)  
- Rate-Limit auf `create-draft-order` (~15/min/IP)  
- Schärfere Logo-Hinweise (klein/unscharf, feine Linien)

---

## Wenn „es irgendwie nicht klappt“

| Symptom | Typische Ursache | Fix |
|---------|------------------|-----|
| Zur Kasse → alter Warenkorb, Katalogpreis | Function/Secrets fehlen | `create-draft-order` deployen + `SHOPIFY_SHOP_DOMAIN` + `shpat_…` |
| Alert „Function fehlt (404)“ | Nicht deployed | Supabase → Edge Functions → `create-draft-order` |
| Alert „Secrets fehlen“ (503) | Domain/Token leer | `supabase secrets set …` |
| Speichern schlägt fehl | Vercel Env / Supabase | `VITE_SUPABASE_URL` + `ANON_KEY` auf **dieser** Deploy-URL |
| Admin zeigt keine Order | Webhook fehlt | `shopify-order-webhook` + `orders/paid` |
| Du testest „Produktion“ ohne Änderungen | PR nicht gemergt | Preview-URL vom PR nutzen oder mergen |

**Wichtig:** Die neuen Kassen-Features liegen auf Branch/`PR #1`. Production (`main`) hat sie erst nach Merge.
