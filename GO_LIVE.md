# Go-Live – Überblick

Ziel jetzt: **Kunden können bestellen** – mit dem **richtigen Preis** (Draft Order).  
Unfertiges bleibt aus (`VITE_FEATURES_FULL` nicht nötig für Draft).

---

## Reihenfolge

### 1. Bestellen speichern (falls noch nicht)
[`GO_LIVE_SCHRITT_1_3.md`](GO_LIVE_SCHRITT_1_3.md) – Config → Shopify

### 2. Echter Preis (jetzt)
[`GO_LIVE_SCHRITT_DRAFT.md`](GO_LIVE_SCHRITT_DRAFT.md) – Shopify-App + Supabase Secrets + Function

Ohne Draft rechnet Shopify nur den Katalogpreis (z. B. 1,50 €).  
Hintergrund: [`GO_LIVE_PREIS.md`](GO_LIVE_PREIS.md)

### 3. Später
- Handy-UX (PR #3)
- Webhook → Admin `paid`
- Print-QC

---

## Minimum Preis (Checkliste)

- [ ] PR mit Draft-Checkout gemerged (PR #4)
- [ ] Shopify Custom App + `shpat_…`
- [ ] Supabase Secrets: `SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_ADMIN_ACCESS_TOKEN`, `PRICE_KEYCHAIN_CENTS`
- [ ] Function `create-draft-order` deployed
- [ ] Vercel `VITE_PRICE_*` = gleiche Beträge + Redeploy
- [ ] Test: Kasse zeigt Konfigurator-Preis (nicht Katalog 1,50 €)

---

## Kundenpfad (wenn Draft live)

1. Anhänger gestalten  
2. Stückzahl + Preis sehen  
3. Bestellen → **Zur Kasse** (Draft Invoice)  
4. Bezahlen in Shopify  

Siehe `PROFI_TODO.md` / `SHOPIFY_DRAFT_ORDER.md`.
