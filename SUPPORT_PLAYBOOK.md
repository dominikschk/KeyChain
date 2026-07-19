# Support-Playbooks – Mail / CCP / Order

Stand: 2026-07-19  
Kurz für Kundensupport – Alltagssprache.

## 1. Kunde findet CCP-Link nicht

1. Shopify-Bestellung öffnen → Line-Item-Properties: `Bearbeiten-Link` oder `_CCP-URL`
2. Bestellmail erneut senden (Shopify → Bestellung → Benachrichtigung)
3. Nie den Write-Token öffentlich posten; Link nur an die Bestell-E-Mail

## 2. Microsite leer / falsch

1. Short-ID aus Property `Config-ID` prüfen
2. Öffentliche URL: `https://…/?id=SHORTID`
3. Wenn Landing „eigene Website“: Property `Ziel-URL` prüfen

## 3. Druck / Farben anders als erwartet

Text (aus [`LEGAL_COPY.md`](LEGAL_COPY.md)):

> Die Vorschau am Bildschirm dient der Orientierung. Beim Druck können Farben und Oberfläche etwas abweichen – Logos werden auf bis zu drei Farben vereinfacht.

Admin: Print-PNG prüfen → Print-QC freigeben oder zurückweisen.

## 4. Bestellung fehlt im Admin

1. Webhook-Deploy prüfen ([`SHOPIFY_WEBHOOK.md`](SHOPIFY_WEBHOOK.md))
2. Property `Config-ID` in der Shopify-Order vorhanden?
3. Manuell verknüpfen: Admin → Short-ID + Bestellnummer → Status `paid`

## 5. SLA (48h)

Bezahlt (`paid`) ohne Print-QC-Freigabe länger als 48h → in Admin rot markiert. Freigabe setzt bei Bedarf Status auf `in_production`.
