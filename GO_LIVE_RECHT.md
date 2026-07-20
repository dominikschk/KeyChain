# Recht & Datenschutz vor Go-Live

Stand: 2026-07-20  
Für: Dominik  

**Wichtig:** Der Code liefert **Vorlagen und Pflicht-Links**. Das ist **keine anwaltliche Prüfung**.  
Finaltexte (AGB, Widerruf bei Personalisierung, Datenschutzerklärung) solltest du mit einer Fachperson / einem Generator (z. B. IT-Recht Kanzlei, eRecht24) abstimmen.

Nimm dir Ruhe. Checkboxen helfen.

---

## Was der Code schon kann

- Seiten: `/impressum` · `/datenschutz` · `/agb` · `/widerruf`
- Links im Konfigurator, Login, Microsite, vor „Zur Kasse“
- Cookie-Hinweis (notwendig vs. Sentry)
- Preise mit **inkl. MwSt.**
- Druck-Hinweis (Vorschau unverbindlich)
- Google-Login-Script nur noch auf dem Login (nicht global)

---

## BLOCK 1 – Firmendaten in Vercel

Production Environment Variables setzen, dann **Redeploy**:

| Variable | Beispiel |
|----------|----------|
| `VITE_LEGAL_COMPANY_NAME` | `Dominik Schkalei` oder `NUDAIM3D GmbH` |
| `VITE_LEGAL_STREET` | `Musterstraße 1` |
| `VITE_LEGAL_ZIP_CITY` | `12345 Musterstadt` |
| `VITE_LEGAL_EMAIL` | `hallo@nudaim3d.de` |
| `VITE_LEGAL_PHONE` | optional |
| `VITE_LEGAL_REPRESENTATIVE` | dein Name |
| `VITE_LEGAL_REGISTER` | z. B. `Amtsgericht … HRB …` oder `Einzelunternehmen` |
| `VITE_LEGAL_VAT_ID` | `DE…` oder `Kleinunternehmer § 19 UStG` |
| `VITE_LEGAL_SHOP_URL` | `https://nudaim3d.de` |

### Kontrolle
- [ ] `/impressum` zeigt **keine** eckigen `[Platzhalter]` mehr
- [ ] E-Mail ist klickbar und erreichbar

---

## BLOCK 2 – Shopify Policies (Pflicht für Checkout)

Im Shopify Admin → **Einstellungen** → **Rechtliches** / **Policies**:

- [ ] Datenschutzrichtlinie (kann auf Konfigurator-`/datenschutz` verweisen oder denselben Text enthalten)
- [ ] AGB / Nutzungsbedingungen
- [ ] Widerrufsrichtlinie / Rückerstattung
- [ ] Kontakt / Impressum-Link

Checkout-Seiten sollten die Policies anzeigen (Shopify Standard).

---

## BLOCK 3 – Texte finalisieren (mit Beratung)

- [ ] Impressum: alle Pflichtangaben korrekt (Rechtsform, Register, USt)
- [ ] Datenschutz: Aufbewahrungsdauer Scans, AVV mit Shopify/Supabase/Vercel/Google/OpenAI
- [ ] AGB: Lieferzeit, Versandkosten, Gerichtsstand
- [ ] Widerruf: ob personalisierte Anhänger vom Widerruf ausgeschlossen sind (§ 312g BGB) – **nur mit Rechtsberatung festlegen**
- [ ] OS-Plattform / Streitschlichtung-Satz anpassen

---

## BLOCK 4 – Kurz testen

- [ ] Cookie-Banner erscheint → „Nur notwendige“ / „Alle“
- [ ] Login: Links zu AGB + Datenschutz funktionieren
- [ ] Vor „Zur Kasse“: Vorschau-Hinweis + Legal-Links
- [ ] Microsite-Fußzeile: Impressum/Datenschutz erreichbar
- [ ] Preis zeigt „inkl. MwSt.“

---

## Was du nicht vom Code erwarten sollst

- Keine Garantie „DSGVO-fertig ohne Anwalt“
- Keine Steuerberatung (Kleinunternehmer vs. USt)
- Keine fertigen AVV-Verträge (musst du mit den Anbietern abschließen)

Wenn Block 1–2 grün sind, kannst du die **Draft-Order-Checkliste** weiter machen – Rechtliches parallel finalisieren.
