# Go-Live – Draft Order (echter Preis)

Stand: 2026-07-20  
Für: Dominik  
Ziel: Beim Bestellen öffnet die **Shopify-Kasse** mit dem **Preis aus dem Konfigurator** (nicht 1,50 € Katalog, wenn du 1,00 € eingestellt hast).

Voraussetzung: Schritte 1–3 klappen (Bestellen speichert Config).  
Nimm dir Ruhe. **Ein Block nach dem anderen.** Checkboxen helfen.

Zuerst Code mergen falls noch offen:  
**https://github.com/dominikschk/KeyChain/pull/4**

---

# BLOCK A – Shopify Custom App + Token

## A.1 App anlegen

1. Browser → Shopify Admin von **nudaim3d.de** (einloggen).
2. Links unten: **Einstellungen** (Zahnrad).
3. **Apps und Vertriebskanäle**.
4. Oben rechts / Link: **Apps entwickeln** (Develop apps).  
   Falls Shopify um Fragt „Custom apps erlauben“ → erlauben (Store-Owner).
5. **App erstellen** / **Create an app**.
6. Name z. B. `NUDAIM Konfigurator` → **App erstellen**.

## A.2 Rechte setzen

1. In der App: **Konfiguration** / **Configuration** → **Admin API-Berechtigungen**.
2. Suchen und setzen:
   - `write_draft_orders` → **Schreiben**
   - `read_draft_orders` → **Lesen**
3. Speichern (**Save**).

## A.3 Token holen

1. Tab **API-Anmeldedaten** / **API credentials**.
2. **Admin-API-Zugriffstoken installieren** / **Install app**.
3. Token einmalig anzeigen → kopieren.  
   Beginnt mit `shpat_…`  
4. **Sofort irgendwo sicher parken** (Passwort-Manager). Du siehst ihn nur einmal.

### Fertig-Kontrolle A
- [ ] App existiert
- [ ] `write_draft_orders` + `read_draft_orders`
- [ ] Token `shpat_…` kopiert

---

# BLOCK B – Shop-Domain notieren

1. Shopify Admin → **Einstellungen** → **Domains** (oder Browser-URL).
2. Du brauchst die **`.myshopify.com`-Adresse**, z. B.  
   `nudaim3d.myshopify.com`  
   **Nicht** nur `nudaim3d.de`.
3. Aufschreiben ohne `https://` und ohne Slash am Ende.

### Fertig-Kontrolle B
- [ ] Domain notiert: `__________.myshopify.com`

---

# BLOCK C – Supabase Secrets

1. Browser → [https://supabase.com/dashboard](https://supabase.com/dashboard) → dein NUDAIM-Projekt.
2. Links: **Project Settings** (Zahnrad) → **Edge Functions** → **Secrets**  
   (manchmal unter **Edge Functions** → oben **Manage secrets**).
3. Secret hinzufügen / setzen:

| Name | Wert |
|------|------|
| `SHOPIFY_SHOP_DOMAIN` | z. B. `nudaim3d.myshopify.com` |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | `shpat_…` (dein Token) |

4. **Preise** (gleich wie im Konfigurator / Vercel). Beispiel Testpreis 1,00 €:

| Name | Wert (Beispiel) |
|------|-----------------|
| `PRICE_KEYCHAIN_CENTS` | `1.00` |
| `PRICE_KEYCHAIN_Q10_CENTS` | `0.90` |
| `PRICE_KEYCHAIN_Q25_CENTS` | `0.80` |

Wenn dein echter Preis 24,90 € ist → `24.90` / `21.90` / `18.90` verwenden.

**Wichtig:** Diese `PRICE_*`-Werte entscheiden, was die Kasse **wirklich** berechnet.  
Vercel `VITE_PRICE_*` sollte dieselben Zahlen haben (Anzeige im Konfigurator).

### Fertig-Kontrolle C
- [ ] `SHOPIFY_SHOP_DOMAIN` gesetzt
- [ ] `SHOPIFY_ADMIN_ACCESS_TOKEN` gesetzt
- [ ] `PRICE_KEYCHAIN_CENTS` = dein Einzelpreis
- [ ] Optional Q10 / Q25 gesetzt

---

# BLOCK D – Edge Function deployen

## Variante 1 – Supabase Dashboard (ohne Terminal)

1. Supabase → **Edge Functions**.
2. Wenn `create-draft-order` schon existiert → öffnen und Code aktualisieren.
3. Wenn nicht: **Deploy a new function** / **Create function**, Name exakt:  
   `create-draft-order`
4. Code aus dem Repo kopieren:  
   Datei `supabase/functions/create-draft-order/index.ts`  
   (GitHub: https://github.com/dominikschk/KeyChain/blob/main/supabase/functions/create-draft-order/index.ts  
   – nach Merge von PR #4 ggf. Branch `cursor/fix-cart-pricing-da6f`).
5. Gesamten Inhalt der Datei in den Function-Editor einfügen → **Deploy**.

## Variante 2 – Terminal (wenn CLI eingerichtet)

```bash
supabase login
supabase link --project-ref DEIN_PROJECT_REF
supabase functions deploy create-draft-order
```

JWT-Verify kann **an** bleiben (die App sendet den anon key).

### Fertig-Kontrolle D
- [ ] Function `create-draft-order` steht auf **Active** / Deployed
- [ ] Kein Deploy-Fehler in den Logs

---

# BLOCK E – Vercel-Preise angleichen

1. Vercel → dein Konfigurator-Projekt → **Settings** → **Environment Variables** → **Production**.
2. Setzen / prüfen (gleiche Zahlen wie Supabase `PRICE_*`):

| Name | Beispiel |
|------|----------|
| `VITE_PRICE_KEYCHAIN_CENTS` | `1.00` |
| `VITE_PRICE_KEYCHAIN_Q10_CENTS` | `0.90` |
| `VITE_PRICE_KEYCHAIN_Q25_CENTS` | `0.80` |

3. **Redeploy** Production (Deployments → … → Redeploy).

### Fertig-Kontrolle E
- [ ] Vercel-Preise = Supabase-Preise
- [ ] Redeploy fertig (Ready)

---

# BLOCK F – Testbestellung

1. Alten Shopify-Warenkorb **leeren** (wichtig).
2. Konfigurator Production öffnen (Gast-Login ok).
3. Logo wählen, Stückzahl z. B. **1**.
4. Im Konfigurator siehst du den Preis (z. B. 1,00 €).
5. **In den Warenkorb** / Bestellen → Dialog **Weiter zur Kasse**.
6. **Zur Kasse** tippen (kurz „Kasse wird vorbereitet…“).
7. Du landest auf einer **Shopify-Checkout / Invoice-URL** (nicht der normale Produkt-Cart mit 1,50 €).
8. Prüfen: **Summe = Konfigurator-Preis** (1× 1,00 € → 1,00 €, nicht 1,50 €).

### Zweiter Test (Staffel)

1. Neu: Stückzahl **25** (oder 50).
2. Zur Kasse.
3. Stückpreis sollte der Q25-Preis sein (z. B. 0,80 €), Gesamt = Stück × Preis.

### Fertig-Kontrolle F
- [ ] Checkout öffnet sich (keine Fehlermeldung „Draft Order fehlt“)
- [ ] Preis in der Kasse = Konfigurator
- [ ] Config-ID / Preview in der Draft Order sichtbar (Shopify Admin → Draft Orders)

---

# Wenn etwas schiefgeht

| Symptom | Was tun |
|---------|---------|
| Meldung „Draft Order fehlt“ / „nicht eingerichtet“ | Secrets prüfen, Function deployen, 1 Min warten, nochmal |
| 404 Function | Name muss exakt `create-draft-order` sein |
| 503 | `SHOPIFY_SHOP_DOMAIN` oder Token falsch / fehlend |
| Kasse öffnet, Preis falsch | `PRICE_KEYCHAIN_CENTS` in Supabase anpassen + Function braucht keine Redeploy für Secrets (sofort aktiv) |
| Weiterhin 1,50 € Cart | Du bist noch im alten Cart-Fallback → PR #4 mergen + Draft Secrets setzen |
| Token verloren | Neuen Admin-API-Token in der Custom App erzeugen, Secret ersetzen |

Technik-Kurzfassung: `SHOPIFY_DRAFT_ORDER.md`

---

# Fertig

Wenn Block F grün ist: **Pricing läuft über Draft Order.**  
Admin-Webhook (`paid`) und Handy-UX (PR #3) sind unabhängig und können danach kommen.
