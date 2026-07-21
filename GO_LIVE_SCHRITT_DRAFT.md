# Go-Live – Draft Order (echter Preis) – 2026

Stand: 2026-07-21  
Für: Dominik  

**Wichtig:** Den Tab „API-Anmeldedaten“ mit dauerhaftem `shpat_` gibt es bei neuen Apps **nicht mehr**.  
Du landest richtig im **Dev Dashboard**. Dort brauchst du:

- **Client-ID**  
- **Schlüssel / Secret** (`shpss_…`)  

Unsere Function holt daraus automatisch das Token.

Nimm dir Ruhe. Ein Block nach dem anderen.

---

# BLOCK A – App im Dev Dashboard (du bist schon da)

App z. B. **NUDAIM Draft** ist ok.

## A.1 Version / Berechtigungen

Auf der Seite **Version erstellen**:

1. **App-URL:** `https://shopify.dev/apps/default-app-home`  
   (Platzhalter reicht – keine echte Website nötig)
2. Haken **„App in den Shopify-Adminbereich einbetten“** kannst du **aus** machen (einfacher).
3. Weiter unten: **Zugriffsrechte / Admin API Scopes** suchen und setzen:
   - `write_draft_orders`
   - `read_draft_orders`
4. Oben rechts: **Veröffentlichen** / Version freigeben (Release).

### Fertig-Kontrolle A.1
- [ ] Version veröffentlicht
- [ ] Scopes `write_draft_orders` + `read_draft_orders`

## A.2 Client-ID + Secret kopieren

1. Links: **Einstellungen**
2. Abschnitt **Anmeldedaten**
3. Kopieren:
   - **Client-ID** (lange Hex-Zahl)
   - **Schlüssel** → Auge → kopieren (`shpss_…`)

Das ist **richtig** – nicht nach `shpat_` suchen.

### Fertig-Kontrolle A.2
- [ ] Client-ID notiert
- [ ] Secret `shpss_…` notiert (sicher aufbewahren)

## A.3 App im Shop installieren

1. Im Dev Dashboard die App öffnen
2. **Installieren** / Store auswählen (dein Live-Shop)
3. Berechtigungen bestätigen

Ohne Installation schlägt der Token-Abruf fehl.

### Fertig-Kontrolle A.3
- [ ] App erscheint unter Shop → Apps als installiert

---

# BLOCK B – Shop-Domain

Notiere die `….myshopify.com`-Adresse (ohne https), z. B. `nudaim3d.myshopify.com`.

---

# BLOCK C – Supabase Secrets

Supabase → Project → **Edge Functions** → **Secrets**:

| Name | Wert |
|------|------|
| `SHOPIFY_SHOP_DOMAIN` | `dein-shop.myshopify.com` |
| `SHOPIFY_CLIENT_ID` | Client-ID aus Einstellungen |
| `SHOPIFY_CLIENT_SECRET` | `shpss_…` |

Preise (wie im Konfigurator / Vercel):

| Name | Beispiel |
|------|----------|
| `PRICE_KEYCHAIN_CENTS` | `1.00` oder `24.90` |
| `PRICE_KEYCHAIN_Q10_CENTS` | … |
| `PRICE_KEYCHAIN_Q25_CENTS` | … |

**Nicht nötig:** `SHOPIFY_ADMIN_ACCESS_TOKEN` (nur falls du noch ein altes `shpat_` hast).

---

# BLOCK D – Function deployen

Function-Name: `create-draft-order`  
Code: `supabase/functions/create-draft-order/index.ts` aus dem Repo (nach Merge dieses Fixes).

```bash
supabase functions deploy create-draft-order
```

Oder Dashboard: Code einfügen → Deploy.

---

# BLOCK E – Test

1. Warenkorb leeren  
2. Konfigurator → Bestellen → **Zur Kasse**  
3. Shopify-Checkout öffnet sich mit **Konfigurator-Preis**

### Wenn Fehler

| Meldung | Was tun |
|---------|---------|
| Draft nicht konfiguriert | Secrets prüfen (CLIENT_ID + SECRET + DOMAIN) |
| Token konnte nicht geholt werden | App installiert? Scopes? Version veröffentlicht? |
| Config-ID ungültig | Neu speichern; Function neu deployen |
| shop_not_permitted | App und Shop müssen zur **gleichen Organisation** gehören |

---

# Kurz: Was du auf dem Screenshot machen sollst

1. App-URL auf `https://shopify.dev/apps/default-app-home`  
2. Scopes Draft Orders setzen  
3. **Veröffentlichen**  
4. **Einstellungen** → Client-ID + Schlüssel (`shpss_`) → Supabase  
5. App **installieren**  
6. Function deployen  

Der fehlende Tab „API credentials / shpat_“ ist normal seit 2026 – du bist nicht falsch.
