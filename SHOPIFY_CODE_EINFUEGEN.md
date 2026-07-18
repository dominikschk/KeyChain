# Wo du in Shopify den Code einfügst (Handy-Seite + Bearbeiten-Link)

Die **komplette** Bestellbestätigung liegt als Vorlage in:

`Shopify besttel,txt`

→ In Shopify: **Einstellungen → Benachrichtigungen → Bestellbestätigung** → Inhalt ersetzen/einfügen → Speichern.

---

## Was darin steckt (NUDAIM-Stil)

- Begrüßung im NUDAIM-Ton („Danke … bei NUDAIM“, Versandtext zum Anhänger)
- Karte **vor** der Produktliste (nur wenn Properties da sind):
  - Navy-Button **Handy-Seite öffnen** (`Microsite-URL`)
  - Petrol-Button **Seite bearbeiten** (`_CCP-URL`)
- Kein „keine url gefunden“ mehr bei normalen Produkten
- Farben: Navy `#11235A`, Petrol `#006699`, Cream `#FDFCF8`

---

## Nur den NUDAIM-Block nachträglich einfügen

Falls du die Standard-Vorlage behältst: nach der Überschrift **Bestellübersicht** den Block aus `lib/shopifyOrderEmailLiquid.ts` einfügen (oder App-Menü → **Shopify: Bestellmail** → kopieren).

---

## Kurz prüfen nach dem Speichern

1. Testbestellung über den Konfigurator
2. In der Mail müssen beide Buttons erscheinen (wenn `_CCP-URL` an der Order hängt)
3. Öffentlicher Link ohne `t=`, Bearbeiten-Link mit `t=`
