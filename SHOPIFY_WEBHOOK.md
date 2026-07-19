# Shopify Order-Webhook → Admin

Stand: 2026-07-19

Automatischer Sync: bezahlte Shopify-Orders mit Line-Item-Property `Config-ID` landen in `orders` (Status `paid`).

## 1. Schema

Im Supabase SQL Editor den Abschnitt **Q1 2026: Shopify Order-Sync** in [`supabase-schema.sql`](supabase-schema.sql) ausführen (oder die ganze Datei).

Enthält:
- Unique auf `orders.shopify_order_id`
- RPC `upsert_order_from_shopify` (nur `service_role`)

## 2. Edge Function deployen

```bash
supabase functions deploy shopify-order-webhook --no-verify-jwt
supabase secrets set SHOPIFY_WEBHOOK_SECRET="dein-shopify-webhook-signing-secret"
```

`SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` sind in Edge Functions i. d. R. schon gesetzt.

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
