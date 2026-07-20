# Preis stimmt nicht?

## Kurz

| Weg | Was Shopify abrechnet |
|-----|------------------------|
| Alter **Warenkorb** `/cart/add` | Immer **Katalogpreis** der Variante (z. B. 1,50 €) |
| **Draft Order** (jetzt) | **Konfigurator-/Staffelpreis** aus Supabase `PRICE_*` |

Wenn du 1,00 € im Konfigurator siehst und 1,50 € in der Kasse: Draft ist noch nicht eingerichtet oder Secrets/Preise stimmen nicht.

---

## Was du tun sollst

→ **[`GO_LIVE_SCHRITT_DRAFT.md`](GO_LIVE_SCHRITT_DRAFT.md)** Block A–F abarbeiten.

Technik-Details: [`SHOPIFY_DRAFT_ORDER.md`](SHOPIFY_DRAFT_ORDER.md)

---

## Check nach Setup

- [ ] Bestellen → Dialog „Zur Kasse“ (nicht stiller Produkt-Cart)
- [ ] Summe = `PRICE_KEYCHAIN_CENTS` × Stückzahl
- [ ] 25 Stück → Q25-Preis greift
