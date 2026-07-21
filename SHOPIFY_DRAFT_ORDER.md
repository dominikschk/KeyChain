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

Beliebig viele Staffeln (muss zu Vercel `VITE_PRICE_KEYCHAIN_TIERS` passen):

```bash
supabase secrets set PRICE_KEYCHAIN_TIERS="1:1.50,20:1.50,50:1.45,100:1.40,250:1.30,400:1.20,600:1.10,800:1.00,1000:0.95"
```

Ohne Secret = NFC-Preisliste als Default. Anleitung: [`GO_LIVE_PREIS.md`](GO_LIVE_PREIS.md).
---

## Deploy

```bash
supabase functions deploy create-draft-order
```

---

## Sicherheit: Preis pro Design

Staffel nur aus der Stückzahl **dieser** Config-ID – nie aus der Warenkorb-Summe.
