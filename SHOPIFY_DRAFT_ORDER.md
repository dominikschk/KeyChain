# Shopify Draft Orders – berechneter Preis zur Kasse

Der Konfigurator übergibt den **Staffelpreis echt** an Shopify (Draft Order → `invoice_url`).

**Klick für Klick (2026 / Dev Dashboard):** [`GO_LIVE_SCHRITT_DRAFT.md`](GO_LIVE_SCHRITT_DRAFT.md)

---

## Auth seit 2026

Neue Apps zeigen **kein** dauerhaftes `shpat_` mehr im Admin.

Stattdessen:

| Secret | Wert |
|--------|------|
| `SHOPIFY_SHOP_DOMAIN` | `shop.myshopify.com` |
| `SHOPIFY_CLIENT_ID` | Client-ID (Dev Dashboard → Einstellungen) |
| `SHOPIFY_CLIENT_SECRET` | Schlüssel `shpss_…` |

Die Edge Function holt per **Client Credentials** ein kurzlebiges Token und cached es.

Optional Legacy: `SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_…` (alte Custom Apps).

---

## Scopes

In der App-Version:

- `write_draft_orders`
- `read_draft_orders`

App im Shop **installieren**, Version **veröffentlichen**.

---

## Preise (Supabase Secrets)

```bash
supabase secrets set PRICE_KEYCHAIN_CENTS="24.90"
supabase secrets set PRICE_KEYCHAIN_Q10_CENTS="21.90"
supabase secrets set PRICE_KEYCHAIN_Q25_CENTS="18.90"
```

---

## Deploy

```bash
supabase functions deploy create-draft-order
```

---

## Sicherheit: Preis pro Design

Staffel nur aus der Stückzahl **dieser** Config-ID – nie aus der Warenkorb-Summe.
