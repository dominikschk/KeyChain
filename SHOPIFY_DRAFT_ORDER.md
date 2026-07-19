# Shopify Draft Orders – berechneter Preis zur Kasse

Der Konfigurator kann den **Staffelpreis echt an Shopify übergeben** (nicht nur als Hinweis).
Dafür legt eine Edge Function eine **Draft Order** an und leitet zur `invoice_url` (Checkout) weiter.

Ohne diese Secrets fällt der Flow automatisch auf den klassischen Cart-Link zurück (`/cart/add`).

---

## 1. Custom App in Shopify

1. Shopify Admin → **Einstellungen** → **Apps und Vertriebskanäle** → **Apps entwickeln**
2. App anlegen (z. B. `NUDAIM Konfigurator`)
3. **Admin-API-Berechtigungen**:
   - `write_draft_orders`
   - `read_draft_orders`
   - sinnvoll zusätzlich: `read_products` (optional)
4. **Admin-API-Zugriffstoken** installieren/kopieren (`shpat_…`)

---

## 2. Supabase Secrets

```bash
supabase secrets set SHOPIFY_SHOP_DOMAIN="dein-shop.myshopify.com"
supabase secrets set SHOPIFY_ADMIN_ACCESS_TOKEN="shpat_…"
```

Optional (gleiche Staffeln wie Frontend, ohne `VITE_`-Präfix):

```bash
supabase secrets set PRICE_KEYCHAIN_CENTS="24.90"
supabase secrets set PRICE_KEYCHAIN_Q10_CENTS="21.90"
supabase secrets set PRICE_KEYCHAIN_Q25_CENTS="18.90"
supabase secrets set PRICE_BADGE_CENTS="39.90"
```

Optional: `SHOPIFY_API_VERSION=2024-10`

**Shop-Domain:** am besten `….myshopify.com` (nicht die Custom Domain).

---

## 3. Edge Function deployen

**CLI:**

```bash
supabase functions deploy create-draft-order
```

**Dashboard:** Code aus `supabase/functions/create-draft-order/index.ts` als Function `create-draft-order` anlegen.

JWT-Verify kann **an** bleiben (Client sendet anon key).

---

## 4. Flow

1. Kunde konfiguriert → Speichern → Design landet im Korb (mehrere Designs möglich)  
2. „Zur Kasse“ → `POST /functions/v1/create-draft-order` mit `lines: [...]`  
3. Function berechnet **pro Zeile** den Stückpreis (Staffel nur aus `line.quantity`)  
4. Shopify Draft Order mit mehreren Custom-Line-Items + Properties  
5. Redirect zur `invoice_url`

Wenn Secrets fehlen → **503** → bei einer Position Cart-Permalink; bei mehreren Designs Fehlerhinweis.

## 4b. Sicherheit: Preis pro Design

Mengenstaffeln gelten **nur für die Stückzahl einer Config-ID / Zeile**.

Beispiel: 50× Design A + 1× Design B → A bekommt Mengenpreis, B bleibt Einzelpreis.
Die Summe (51) wird für die Staffel **nicht** verwendet.

Cart-Fallback nutzt immer die **Basis-Variante** (kein günstiger Bulk-Variant × 1).

---

## 5. Webhook / Admin

Bezahlt die Draft Order, entsteht eine normale Shopify-Order.  
Der bestehende `orders/paid`-Webhook (`shopify-order-webhook`) funktioniert weiter über Property `Config-ID`.

---

## Checkliste

- [ ] Custom App mit `write_draft_orders`
- [ ] Secrets `SHOPIFY_SHOP_DOMAIN` + `SHOPIFY_ADMIN_ACCESS_TOKEN`
- [ ] Function `create-draft-order` deployed
- [ ] Testbestellung: Preis in der Kasse = Staffelpreis aus dem Konfigurator
- [ ] Properties Config-ID / Preview sichtbar
- [ ] Nach Zahlung: Eintrag im NUDAIM-Admin (wenn Webhook live)
