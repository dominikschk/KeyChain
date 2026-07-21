# Go-Live – Draft Order (Dev Dashboard 2026)

Stand: 2026-07-21  
Ziel: Bestellen → Shopify-Kasse mit **Konfigurator-Preis**.

Der Tab „API-Anmeldedaten“ mit `shpat_` existiert **nicht mehr**.  
„Apps entwickeln“ → Dev Dashboard ist **richtig**.

---

## Auf deiner Seite „Version erstellen“ jetzt

1. **App-URL:** `https://shopify.dev/apps/default-app-home`
2. Embed-Haken **aus**
3. Unten **Scopes / Zugriffsrechte:**
   - `write_draft_orders`
   - `read_draft_orders`
4. Oben **Veröffentlichen**
5. Links **Einstellungen** → **Anmeldedaten**:
   - Client-ID kopieren
   - Schlüssel (Auge) kopieren → `shpss_…`
6. App im **Shop installieren** (Dev Dashboard → Install)

---

## Supabase Secrets

| Name | Wert |
|------|------|
| `SHOPIFY_SHOP_DOMAIN` | `xxx.myshopify.com` |
| `SHOPIFY_CLIENT_ID` | Client-ID |
| `SHOPIFY_CLIENT_SECRET` | `shpss_…` |
| `PRICE_KEYCHAIN_CENTS` | z. B. `1.50` |

Dann Function `create-draft-order` **neu deployen** (PR mit Client-Credentials muss gemerged sein).

---

## Checkliste

- [ ] Scopes + Version published  
- [ ] App im Shop installiert  
- [ ] 3 Secrets in Supabase  
- [ ] Function deployed  
- [ ] Test: Zur Kasse → Preis stimmt  
