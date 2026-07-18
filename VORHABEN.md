# Vorhaben – KeyChain / NUDAIM Konfigurator

Stand: 2026-07-17  
Prioritäten und offene Themen, damit wir nichts verlieren.

---

## Später (nicht jetzt)

### Kunden-Zugang: `_CCP-URL` / Bestellmail

CCP-Edit funktioniert. Zustellung über Shopify-Liquid ist vorbereitet.

- [x] Prüfen / absichern: Properties `Microsite-URL`, `Bearbeiten-Link`, `_CCP-URL` am Cart
- [ ] Optional Property sichtbar machen (`CCP-URL` statt `_CCP-URL`), falls Warenkorb-Anzeige gewünscht
- [x] Shopify-Bestellbestätigung (Liquid) fertig (`Shopify besttel,txt` + App-Menü)
- [x] Edge Function `send-microsite-email` Texte Uwe-freundlich inkl. `ccp_url` (Deploy optional)
- [ ] Liquid in Shopify Admin einmalig einfügen / speichern
- [x] Link-Übergabe im Konfigurator vor Warenkorb (Handy-Seite + Bearbeiten kopieren)
- [ ] Live-Smoke: echte Order → Properties in Admin → Mail erneut senden → CCP testen

**Warum teilweise offen:** Code ist fertig; Shopify-Speichern + eine echte Testbestellung musst du/Dominik machen (siehe `SHOPIFY_EMAIL_TESTEN.md`).
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
- [x] Logo-Upload direkt im Chat (Datei wählen, ohne https-Link)
- [ ] Brand-Guide-PDF / Website-URL scrapen
- [x] Freieres Section-Layout (Hero / Story / Actions) – erster Slice erledigt
### 1. Typografie & Farben (viel Auswahl)

- [x] Mehr Schriftarten (kuratiert: luxury, modern, elegant, display, soft)
- [ ] Eigene Schrift-Upload oder Font-Pairing-Vorlagen
- [x] Erweiterte Farbpalette: Accent, Hintergrund, Text (Buttons folgen Accent)
- [ ] Farbverläufe / Section-Hintergründe
- [x] Theme-Presets + Branchen-Vorlagen

### 2. Layout freier machen

- [x] Weg vom reinen vertikalen Block-Stack (`layoutMode: landing`)
- [x] Sections mit eigener Struktur (Hero, Story, Actions-Grid)
- [ ] Abstände, Breite, Ausrichtung (links/mitte/rechts) pro Section
- [ ] Mobile vs. Desktop-Grundregeln (ohne denselben Stack zu erzwingen)
- [ ] Optional: einfacher Section-Builder (Reihenfolge, Duplizieren, Verschachtelung leicht halten)

### 3. Von Bausteinen zu „Mini-Website“

- [ ] Reichhaltigere Inhaltsblöcke: Text + Bild, Galerie, FAQ, Preise, Öffnungszeiten, Embed
- [ ] Mehrere „Seiten“/Tabs innerhalb einer Microsite (Home, Kontakt, …) – oder Anker-Navigation
- [ ] Header/Nav + Footer als eigene editierbare Bereiche
- [ ] Eigenes Favicon / Seitentitel / Share-Preview
- [x] Visuelle Vorlagen („Restaurant“, „Studio“, …) die echte Layouts + Paletten setzen

### 4. CCP & Speichern (mitdenken)

- [x] Neue Design-Felder in plate_data (`layoutMode`, `surfaceColor`, `textColor`, Fonts)
- [ ] Update-RPCs erweitern (weiterhin nur mit `write_token`) — JSON in plate_data reicht aktuell
- [x] Vorschau im CCP/Konfigurator an neues Layout anpassen
- [x] Migration alter Configs (Baustein-Stack bleibt lesbar via `layoutMode: stack`)

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
