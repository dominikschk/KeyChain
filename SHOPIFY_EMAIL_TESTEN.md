# Delivery dichtmachen: Bestellen → Mail → Seite ändern

Checkliste für dich (Dominik) – Reihenfolge einhalten.

---

## A) App (Code) – erledigt im Repo

- [x] Cart sendet: `Microsite-URL`, `Handy-Seite`, `_CCP-URL`, `Bearbeiten-Link`, `Config-ID`
- [x] Nach Speichern: Dialog „Deine Links sind bereit“ (kopieren) **vor** Shopify-Warenkorb
- [x] Bestellmail-Vorlage `Shopify besttel,txt` (NUDAIM-Block, doppelte Alt-Blöcke entfernt)
- [x] Anleitung + Liquid-Schnipsel in der App (Menü → Shopify: Bestellmail)

---

## B) Shopify Admin – einmalig von dir

1. **Einstellungen → Benachrichtigungen → Bestellbestätigung**
2. Inhalt aus `Shopify besttel,txt` einfügen / ersetzen → **Speichern**
3. Optional Shop-Akzentfarbe navy/petrol (wirkt auf Standard-Buttons)

---

## C) Live-Test (echte Bestellung)

1. Konfigurator auf Live-URL öffnen (`konfigurator.nudaim3d.de`)
2. Seite bauen → Anhänger → **Fertig – bestellen**
3. Dialog: Links kopieren / CCP einmal öffnen → **Weiter zum Warenkorb**
4. Checkout abschließen (auch Testgateway)
5. Im Admin die Order öffnen – unter dem Produkt müssen stehen:
   - `Config-ID`
   - `Microsite-URL` und/oder `Handy-Seite`
   - `Bearbeiten-Link` und/oder `_CCP-URL`
6. An der Order: **Bestellbestätigung erneut senden**
7. Mail prüfen: Buttons **Handy-Seite öffnen** + **Seite bearbeiten**
8. Bearbeiten-Link öffnen → Text ändern → Speichern → öffentliche Seite prüfen

---

## Wenn Properties in der Order fehlen

- Bestellung kam **nicht** über den Konfigurator
- Oder Live-Deploy ist noch alt (ohne `Bearbeiten-Link`) → neu bauen/deployen
- Network: `cart/add?...properties%5BBearbeiten-Link%5D=...`

---

## Optional später: Edge Function-Mail

Nur nötig, wenn Shopify-Mail nicht reicht:

```bash
npx supabase functions deploy send-microsite-email
```

Secrets: `RESEND_API_KEY`, `EMAIL_WEBHOOK_SECRET`, `ALLOWED_MICROSITE_HOSTS=konfigurator.nudaim3d.de`  
Dann Shopify Flow: Order created → HTTP POST mit `to`, `microsite_url`, `short_id`, `ccp_url`.

---

## Erfolgskriterium

Uwe bekommt **ohne Admin-Hilfe**:
1. Links direkt nach dem Speichern im Konfigurator  
2. Dieselben Links in der Bestellmail  
3. CCP-Edit funktioniert mit dem privaten Link  
