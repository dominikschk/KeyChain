# Go-Live – was Kunden jetzt können

Ziel: **Bestellen funktioniert** über den normalen Shopify-Warenkorb.  
Unfertiges (Draft Orders, Multi-Design-Korb, Badge, Setup-Hinweise) ist ausgeschaltet.

Später wieder an: in Vercel `VITE_FEATURES_FULL=1` setzen.

---

## Kundenpfad (jetzt)

1. Logo hochladen / Anhänger gestalten  
2. Stückzahl wählen  
3. **Bestellen** → Speichern → Shopify-Warenkorb (`nudaim3d.de/cart/add`)  
4. Bezahlen im Shop  

Optional: Chip-Ziel (Handy-Seite) – nicht Pflicht für die Bestellung.

---

## Was du für Live brauchst (Minimum)

| Wo | Was |
|----|-----|
| Vercel | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Vercel | optional `VITE_SHOPIFY_VARIANT_KEYCHAIN` = echte Variant-ID |
| Shopify | Produkt/Variante mit dem Preis, den Kunden zahlen sollen |
| PR | Diesen Branch mergen oder Preview nutzen |

**Nicht nötig für die erste Live-Bestellung:** Draft-Order-Secrets, Webhook, Admin-Sync.

---

## Später (Stück für Stück)

1. Webhook → Admin `paid`  
2. Draft Orders → berechneter Staffelpreis  
3. Mehrere Designs in einer Kasse  
4. Messe-Badge  
5. KI-Assistent  

Siehe `PHASE0_GO_LIVE.md` / `PROFI_TODO.md`.
