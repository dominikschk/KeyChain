# Vorhaben – KeyChain / NUDAIM Konfigurator

Stand: 2026-07-19  
Prioritäten und offene Themen, damit wir nichts verlieren.

**Langfristig (12 Monate, 40-Personen-Org):** siehe [`ROADMAP_PROFESSIONAL_2026_2027.md`](ROADMAP_PROFESSIONAL_2026_2027.md).  
**Deine Abhak-Liste bis Profi-Niveau:** siehe [`PROFI_TODO.md`](PROFI_TODO.md).

---

## Später (nicht jetzt)

### Kunden-Zugang: `_CCP-URL` / Bestellmail

CCP-Edit funktioniert. Zustellung über Shopify-Liquid ist **live**.

- [x] Prüfen / absichern: Properties `Microsite-URL`, `Bearbeiten-Link`, `_CCP-URL` am Cart
- [ ] Optional Property sichtbar machen (`CCP-URL` statt `_CCP-URL`), falls Warenkorb-Anzeige gewünscht
- [x] Shopify-Bestellbestätigung (Liquid) fertig (`Shopify besttel,txt` + App-Menü)
- [x] Edge Function `send-microsite-email` Texte Uwe-freundlich inkl. `ccp_url` (Deploy optional)
- [x] Liquid in Shopify Admin einmalig einfügen / speichern
- [x] Link-Übergabe im Konfigurator vor Warenkorb (Handy-Seite + Bearbeiten kopieren)
- [x] Live-Smoke: echte Order → Properties in Admin → Mail erneut senden → CCP testen (Dominik, 2026-07-19)

**Offen danach:** Shopify-Order-Webhook → Admin (`paid`) – **Code fertig**, Deploy siehe [`SHOPIFY_WEBHOOK.md`](SHOPIFY_WEBHOOK.md).

---

## Als Nächstes (Fokus): Design-Freiheit & „kleine Website“

Ziel: Weg von starren Baustein-Listen hin zu **deutlich mehr Anpassung** und **freierem Layout** – näher an einer kleinen Website als an einer Linktree-Kachelreihe.

> Hinweis: Laut Jahres-Roadmap haben **STL/Print + CI + Shopify-Webhook** in Q1 Vorrang vor großen Microsite-Slices – Anhänger zuerst.

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

- [x] Reichhaltigere Inhaltsblöcke: FAQ, Öffnungszeiten, Galerie (erster Slice)
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

- Vollständiger Website-Builder à la Webflow
- Serverseitige Stempelkarten / Anti-Cheat
- Shopify-Order-Sync (→ Jahres-Roadmap Q1, Squad Commerce)

---

## Vorgeschlagene Reihenfolge (nächste Sessions)

1. ~~**STL/Print-Pipeline + CI** (Jahres-Roadmap Q1)~~ – erledigt
2. ~~**Shopify-Order-Webhook** → Admin~~ – Code erledigt; Deploy laut `SHOPIFY_WEBHOOK.md`
3. Schema/Secrets deployen (Mensch) + Cloudflare Rate-Limit
4. Dann Q2: Print-QC Freigabe, echte Variant-IDs; Microsite-Slices ohne Print zu blockieren

Kurzfristig Digital (wenn Kapazität frei):

1. Farben + Schriften erweitern
2. Section-Modell vertiefen
3. Reichere Blöcke + Vorlagen
4. Multi-Section-Layout / leichte Navigation

---

## Kurznotiz Produktziel

> Kunden sollen ihre NFC-Microsite wie eine **kleine, eigene Website** gestalten können – mit echter Markenwirkung (Schrift, Farbe, Layout) – ohne den 3D/STL-Teil zu vermischen.

> Kernprodukt bleibt der **physische Anhänger**; siehe Jahres-Roadmap.
