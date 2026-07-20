# Preis stimmt nicht? (Cart zeigt anderen Betrag)

## Was du im Screenshot siehst

| Ort | Beispiel | Bedeutung |
|-----|----------|-----------|
| Text „Preis: 1,00 €“ an der Position | Konfigurator-Hinweis | **Nur Text**, kein echter Shopify-Preis |
| Zeilenpreis **1,50 €** | Shopify-Katalog | **Das wird abgerechnet** |

Ursache: `/cart/add` kann **keinen** eigenen Preis setzen. Shopify nimmt immer den Preis der Produkt-Variante.

---

## Sofort-Fix (ohne Draft) – 2 Minuten

Preis in **Shopify** und **Vercel** auf denselben Betrag bringen.

### A) Shopify anpassen (empfohlen, wenn 1,00 € stimmen soll)

1. Shopify Admin → Produkt **Nudaim3D NFC - Schlüsselanhänger**
2. Variante öffnen → Preis auf **1,00 €** setzen (oder deinen echten Verkaufspreis)
3. Speichern
4. Warenkorb leeren, neu aus dem Konfigurator bestellen

### B) Vercel anpassen (wenn 1,50 € im Shop stimmen soll)

1. Vercel → Project → Settings → Environment Variables → Production  
2. Setzen: `VITE_PRICE_KEYCHAIN_CENTS=1.50`  
3. Redeploy  
4. (Staffeln optional erst später)

**Check:** Nach dem Fix stehen im Cart **kein** widersprüchlicher „Preis:“-Text mehr (Code-Änderung) und der berechnete Betrag = Stück × Shop-Preis.

---

## Echter Staffelpreis (10er / 25er) – Draft Order

Nur so kann der Konfigurator z. B. „ab 25 Stück günstiger“ **wirklich** abrechnen.

Kurz: `SHOPIFY_DRAFT_ORDER.md`

1. Shopify Custom App mit `write_draft_orders`  
2. Supabase Secrets: `SHOPIFY_SHOP_DOMAIN` + `SHOPIFY_ADMIN_ACCESS_TOKEN`  
3. Function `create-draft-order` deployen  
4. Secrets für Preise setzen, z. B. `PRICE_KEYCHAIN_CENTS=1.50` (gleich wie Frontend)

Dann: Bestellen → Draft-Checkout → Betrag = Konfigurator-Staffel.

Ohne diese Secrets: App öffnet weiter den normalen Warenkorb (Katalogpreis) – das ist Absicht.

---

## Checkliste

- [ ] Shopify-Variantenpreis = gewünschter Einzelpreis  
- [ ] `VITE_PRICE_KEYCHAIN_CENTS` = gleicher Betrag (Vercel + Redeploy)  
- [ ] Test: 1 Stück → Cart-Summe = Variantenpreis  
- [ ] Test: 50 Stück → eine Zeile mit Menge 50 (nicht extra Produkt vom Shop dazu)  
- [ ] Optional: Draft Orders für Staffel  
