# Shopify Bestellmail – warum CCP fehlt & wie richtig testen

## Kurz: Warum deine Testmail leer war

Der Button **„Test-E-Mail senden“** in  
Einstellungen → Benachrichtigungen → Bestellbestätigung  
nutzt **Dummy-Daten**. Darin gibt es **keine** Line-Item-Properties wie:

- `Microsite-URL`
- `_CCP-URL`
- `Config-ID`

Deshalb erscheint der NUDAIM-Block **absichtlich nicht** – der Liquid-Code ist ok, die Testdaten fehlen.

---

## Richtig testen (3 Schritte)

### 1. Vorlage speichern
Aktuellen Inhalt aus `Shopify besttel,txt` in die Bestellbestätigung kopieren → **Speichern**.

### 2. Echte Bestellung über den Konfigurator
1. Konfigurator öffnen → Seite bauen → Anhänger → **Bestellen**
2. Checkout durchlaufen (auch 0 € / Testgateway ok)
3. Im Shopify-Admin die Bestellung öffnen

### 3. Properties an der Bestellung prüfen
Unter dem Produkt müssen u. a. stehen:

| Property | Bedeutung |
|----------|-----------|
| `Config-ID` | Short-ID |
| `Microsite-URL` | Öffentliche Handy-Seite |
| `_CCP-URL` | Privater Bearbeiten-Link (oft nur in Admin sichtbar, nicht im Warenkorb) |
| `Preview` | Vorschaubild |

Wenn **diese Properties fehlen**, kann die Mail sie auch nicht anzeigen → Problem liegt vor der Mail (Cart-Add), nicht im Liquid.

Wenn Properties **da** sind: an der Order → **E-Mail erneut senden** (Bestellbestätigung). Dann muss der NUDAIM-Block kommen.

---

## Wenn Properties an der Order fehlen

Dann kam der Warenkorb **nicht** über `buildShopifyCartUrl` (Konfigurator), z. B.:

- Produkt manuell in den Shop gelegt
- Alte Variante / anderer Add-to-Cart
- Bestellung abgebrochen vor Redirect

Nochmal **nur über den Konfigurator** bestellen und im Network-Tab `cart/add` prüfen (Query enthält `properties[Microsite-URL]` und `properties[_CCP-URL]`).

---

## Optional: Preview im Editor

Die Vorschau in Shopify zeigt Properties oft auch nicht. Verlasse dich auf **echte Order + erneut senden**.
