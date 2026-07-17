# Vorhaben – KeyChain / NUDAIM Konfigurator

Stand: 2026-07-17  
Prioritäten und offene Themen, damit wir nichts verlieren.

---

## Später (nicht jetzt)

### Kunden-Zugang: `_CCP-URL` / Bestellmail

CCP-Edit funktioniert. Offen ist nur die **automatische Zustellung** des Edit-Links an Kunden.

- [ ] Prüfen, dass `properties[_CCP-URL]` an der Shopify-Bestellung hängt (Admin / Network `cart/add`)
- [ ] Optional Property sichtbar machen (`CCP-URL` statt `_CCP-URL`), falls Warenkorb-Anzeige gewünscht
- [ ] Shopify-Bestellbestätigung (Liquid) um Edit-Link ergänzen
- [ ] Optional: Edge Function `send-microsite-email` mit `ccp_url` deployen + Shopify Flow

**Warum später:** Feature ist getestet; Delivery ist Betriebs-/Shopify-Thema.

---

## Als Nächstes (Fokus): Design-Freiheit & „kleine Website“

Ziel: Weg von starren Baustein-Listen hin zu **deutlich mehr Anpassung** und **freierem Layout** – näher an einer kleinen Website als an einer Linktree-Kachelreihe.

### 0. AI Brand-Chat (in Arbeit)

Geführtes Gespräch → Microsite-Config (kein freies HTML).

- [x] MVP: Chat-UI + Edge Function `microsite-chat`
- [x] Fragt u. a. nach Logo, Slogan, Wunsch-Funktionen, Branchen-Fit
- [x] Ausgabe = gültige `ModelConfig`-Felder (Titel, Farben, Theme, Blöcke)
- [x] Assistent zuerst im **gleichen Fenster** inkl. Vorschau; danach „selbst weiterbauen“
- [x] Branchen-/Vibe-Paletten (Bäckerei warm, nicht Tech-Dunkel); marken-kohärente Buttons
- [x] Zwei getrennte Arbeitsphasen: **1) Seite** → **2) Anhänger** (nicht vermischt)
- [ ] Logo-Upload direkt im Chat (aktuell: URL oder später im Editor)
- [ ] Brand-Guide-PDF / Website-URL scrapen
- [ ] Freieres Section-Layout (Hero / Spalten) – nächster großer Slice

### 1. Typografie & Farben (viel Auswahl)

- [ ] Mehr Schriftarten (Google Fonts / kuratierte Sets: Display, Sans, Serif, Mono)
- [ ] Eigene Schrift-Upload oder Font-Pairing-Vorlagen
- [ ] Erweiterte Farbpalette: Accent, Hintergrund, Text, Buttons, Hover – nicht nur eine Accent-Farbe
- [ ] Farbverläufe / Section-Hintergründe
- [ ] Theme-Presets + „Custom“-Modus

### 2. Layout freier machen

- [ ] Weg vom reinen vertikalen Block-Stack
- [ ] Sections mit eigener Struktur (Hero, 2-Spalten, Grid, Footer)
- [ ] Abstände, Breite, Ausrichtung (links/mitte/rechts) pro Section
- [ ] Mobile vs. Desktop-Grundregeln (ohne denselben Stack zu erzwingen)
- [ ] Optional: einfacher Section-Builder (Reihenfolge, Duplizieren, Verschachtelung leicht halten)

### 3. Von Bausteinen zu „Mini-Website“

- [ ] Reichhaltigere Inhaltsblöcke: Text + Bild, Galerie, FAQ, Preise, Öffnungszeiten, Embed
- [ ] Mehrere „Seiten“/Tabs innerhalb einer Microsite (Home, Kontakt, …) – oder Anker-Navigation
- [ ] Header/Nav + Footer als eigene editierbare Bereiche
- [ ] Eigenes Favicon / Seitentitel / Share-Preview
- [ ] Visuelle Vorlagen („Restaurant“, „Studio“, „Shop-Teaser“) die echte Layouts setzen, nicht nur 4 Buttons

### 4. CCP & Speichern (mitdenken)

- [ ] Neue Design-Felder in `nfc_configs` / Blocks-Schema (JSON flexibel halten)
- [ ] Update-RPCs erweitern (weiterhin nur mit `write_token`)
- [ ] Vorschau im CCP/Konfigurator an neues Layout anpassen
- [ ] Migration alter Configs (Baustein-Stack bleibt lesbar)

### 5. Security / Qualität (bei jedem Slice)

- [ ] Keine neuen offenen Writes ohne Token
- [ ] Font-/CSS-Injection absichern (nur erlaubte Fonts / sanitize)
- [ ] Bild-URLs weiter `https` only
- [ ] Nach größeren Diffs: Security-Review

---

## Bewusst nicht im nächsten Slice

- Shopify `_CCP-URL`-Mail-Feinschliff (siehe „Später“)
- Vollständiger Website-Builder à la Webflow
- Serverseitige Stempelkarten / Anti-Cheat
- Shopify-Order-Sync

---

## Vorgeschlagene Reihenfolge (nächste Sessions)

1. **Farben + Schriften erweitern** (schnell spürbar, überschaubar)
2. **Section-Modell** (Hero / Inhalt / Footer) statt nur `nfcBlocks`-Liste
3. **Reichere Blöcke + Vorlagen**
4. **Multi-Section-Layout / leichte Navigation**
5. Dann `_CCP-URL`-Delivery nachziehen

---

## Kurznotiz Produktziel

> Kunden sollen ihre NFC-Microsite wie eine **kleine, eigene Website** gestalten können – mit echter Markenwirkung (Schrift, Farbe, Layout) – ohne den 3D/STL-Teil zu vermischen.
