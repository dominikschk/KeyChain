# Shopify Order-Webhook → Admin

Stand: 2026-07-19

Automatischer Sync: bezahlte Shopify-Orders mit Line-Item-Property `Config-ID` landen in `orders` (Status `paid`).

> **Wichtig:** Der Supabase **SQL Editor** akzeptiert nur SQL.  
> `supabase functions deploy …` ist ein **Terminal-/CLI-Befehl** – dort einfügen schlägt mit Syntaxfehler fehl.

## 1. Schema (SQL Editor)

Supabase Dashboard → **SQL** → New query → Datei [`supabase/migrations/q1_q2_orders_webhook.sql`](supabase/migrations/q1_q2_orders_webhook.sql) einfügen und **Run**.

Oder den Abschnitt ab `Q1 2026` in [`supabase-schema.sql`](supabase-schema.sql).

Enthält u. a.:
- RPC `upsert_order_from_shopify` (nur `service_role`)
- RPC `record_nfc_scan` (Rate-Limit)
- Spalten `print_qc_*` auf `orders`

## 2. Edge Function (Terminal / lokal)

Voraussetzung: [Supabase CLI](https://supabase.com/docs/guides/cli) installiert und eingeloggt (`supabase login`, `supabase link`).

```bash
# im Projektordner, NICHT im SQL Editor:
supabase functions deploy shopify-order-webhook --no-verify-jwt
supabase secrets set SHOPIFY_WEBHOOK_SECRET="dein-shopify-webhook-signing-secret"
```

**Ohne CLI:** Dashboard → **Edge Functions** → Code aus `supabase/functions/shopify-order-webhook/index.ts` deployen, JWT-Verify aus, Secret `SHOPIFY_WEBHOOK_SECRET` setzen.

## 3. Shopify Webhook

Shopify Admin → **Einstellungen → Benachrichtigungen → Webhooks**:

| Event | URL |
|-------|-----|
| **Bestellung bezahlt** (`orders/paid`) | `https://<PROJECT>.supabase.co/functions/v1/shopify-order-webhook` |
| Optional: Bestellung erstellt (`orders/create`) | dieselbe URL |

Format: JSON. Signing secret = `SHOPIFY_WEBHOOK_SECRET`.

## 4. Voraussetzungen am Cart

Der Konfigurator setzt bereits:

- `properties[Config-ID]` = Short-ID
- `properties[Handy-Seite]`, `properties[_CCP-URL]`, …

Ohne `Config-ID` antwortet der Webhook mit `synced: 0` (kein Retry-Spam).

## 5. Smoke

1. Testbestellung mit Config-ID abschließen / als bezahlt markieren
2. Admin → Bestellungen: Eintrag mit Status `paid`, Shopify-Order-ID gesetzt
3. Bei HMAC-Fehler: 401 in Function-Logs

## Security

- HMAC (`X-Shopify-Hmac-Sha256`) timing-sicher
- Kein anon-Zugriff auf Upsert-RPC
- JWT-Verify an der Function aus (`--no-verify-jwt`), Auth = HMAC
