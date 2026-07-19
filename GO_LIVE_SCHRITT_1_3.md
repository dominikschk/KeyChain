# Go-Live Schritte 1–3 – extrem detailliert

Stand: 2026-07-19  
Für: Dominik  
Ziel nach diesen 3 Schritten: **Eine echte Bestellung** vom Konfigurator in den Shopify-Warenkorb (und idealerweise bezahlt).

Nimm dir Ruhe. Mach **einen** Unterpunkt nach dem anderen. Haken setzen hilft.

---

# SCHRITT 1 – Pull Request #1 mergen

## Was ist das?

GitHub speichert Code in Branches.  
`main` = das, was (meist) live geht.  
`cursor/stl-print-pipeline-ci-da6f` = der Branch mit allen neuen Shop-/Konfigurator-Änderungen.  

**PR #1** = die Anfrage: „Bitte den Feature-Branch in `main` übernehmen.“

Link (merken / bookmarken):  
**https://github.com/dominikschk/KeyChain/pull/1**

---

## 1.1 PR öffnen

1. Browser öffnen (Chrome/Firefox/Safari – egal).
2. Einloggen bei GitHub mit dem Account, der Zugriff auf `dominikschk/KeyChain` hat.
3. Adresse eingeben oder klicken:  
   https://github.com/dominikschk/KeyChain/pull/1
4. Du solltest sehen:
   - Titel ungefähr: **„Q1: STL/Print-Pipeline + CI/Test-Grundlage“**
   - Links/oben: Branch `cursor/stl-print-pipeline-ci-da6f` → `main`
   - Grüne Checks von **CI** / **Vercel** (wenn alles gut ist)

### Wenn die Seite 404 ist
- Falsches Repo / kein Login / Tippfehler in der URL.
- Gehe zu: https://github.com/dominikschk/KeyChain/pulls  
- Dort den offenen PR anklicken.

### Wenn „Conversation“ / viele Kommentare
- Ignorieren. Du brauchst nur den grünen Merge-Button.

---

## 1.2 Checks anschauen (kurz)

Auf der PR-Seite nach unten scrollen bis **Checks** / **Some checks**:

| Check | Soll |
|-------|------|
| CI / build-and-test | grün / Success |
| Vercel | grün / Success |

- **Alles grün** → weiter zu 1.3.
- **Rot** → Screenshot machen, später mit Agent anschauen. **Nicht mergen**, wenn CI rot ist (außer du weißt, warum).

---

## 1.3 Mergen (Code auf `main` bringen)

1. Rechts (oder unten) den großen grünen Button suchen:
   - **„Merge pull request“**  
   - oder **„Squash and merge“** / **„Rebase and merge“**
2. **Empfehlung für dich:**  
   - Wenn GitHub **„Squash and merge“** anbietet: das nehmen (eine saubere Commit-Zusammenfassung).  
   - Sonst normales **„Merge pull request“**.
3. Klick auf den Button.
4. Bestätigen mit **„Confirm merge“** (oder ähnlich).
5. Warte, bis steht: **Merged** (lila/merged Badge).

### Fertig-Kontrolle Schritt 1
- [ ] PR #1 zeigt Status **Merged**
- [ ] Auf https://github.com/dominikschk/KeyChain der Branch `main` ist neuer als vorher

### Optional: Branch löschen
GitHub fragt oft: **„Delete branch“**.  
- Darfst du machen (aufräumen).  
- Muss nicht. Schadet nicht.

---

## 1.4 Was passiert danach automatisch?

Vercel (wenn mit GitHub verbunden) startet einen **neuen Deploy von `main`**.

Das dauert oft **1–3 Minuten**, manchmal 5.

**Du musst jetzt nichts „bauen“** – nur warten und in Schritt 2 die Env prüfen.

---

# SCHRITT 2 – Vercel: Umgebungsvariablen prüfen

## Was ist das?

Die Website auf Vercel braucht zwei Secrets, sonst kann der Konfigurator **nicht speichern** (kein Supabase = keine Config-ID = kaputter Checkout).

| Name | Bedeutung |
|------|-----------|
| `VITE_SUPABASE_URL` | Adresse deines Supabase-Projekts, z. B. `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Öffentlicher Anon-Key (lang, JWT-artig) |

**Wichtig:** Namen **exakt** so schreiben (Groß/Klein, `VITE_` am Anfang).

---

## 2.1 Werte aus Supabase holen

1. Öffne https://supabase.com/dashboard  
2. Einloggen.  
3. Das **richtige Projekt** wählen (NUDAIM / KeyChain – das, das du schon für Configs nutzt).  
4. Links unten / Zahnrad: **Project Settings**.  
5. Links: **API** (manchmal „Data API“).  
6. Dort findest du:

### Project URL
- Steht unter **Project URL**.  
- Sieht aus wie: `https://abcdefghijklmnop.supabase.co`  
- → das wird `VITE_SUPABASE_URL`

### Anon Key
- Unter **Project API keys**.  
- Zeile **`anon`** / **`public`**.  
- Button **Reveal** / Auge, dann **Copy**.  
- → das wird `VITE_SUPABASE_ANON_KEY`  
- **Nicht** den `service_role` Key nehmen (der ist geheim und gehört nicht ins Frontend).

Lege die beiden Werte kurz in einem Notizzettel / Passwortmanager ab (nur für dich).

---

## 2.2 Vercel-Projekt öffnen

1. Öffne https://vercel.com  
2. Einloggen (idealerweise gleicher Account wie GitHub).  
3. Das Projekt finden – früher hieß es in Checks oft so etwas wie **`key-chain`** / NUDAIM-Konfigurator.  
4. Projekt anklicken.

### Wenn du das Projekt nicht findest
- Team/Account oben links wechseln.  
- Oder von GitHub: Repo → Settings → Integrations → Vercel.

---

## 2.3 Environment Variables setzen

1. Im Vercel-Projekt: Tab **Settings**.  
2. Links: **Environment Variables**.  
3. Prüfe, ob schon existieren:

### Fall A – Beide Keys sind schon da
- Namen stimmen: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`  
- Werte sind nicht leer  
- Environments: mindestens **Production** (Haken bei Production; Preview/Development optional mit denselben Werten)

→ Dann nur **Redeploy** (siehe 2.5). Env nicht unnötig ändern.

### Fall B – Keys fehlen oder sind falsch
1. **Add New** / **Create**.  
2. Key: `VITE_SUPABASE_URL`  
3. Value: deine Project URL (mit `https://`, ohne Slash am Ende).  
4. Environments: **Production** anhaken (und Preview, wenn du Preview-URLs testest).  
5. Speichern.  
6. Nochmal **Add New**:  
   - Key: `VITE_SUPABASE_ANON_KEY`  
   - Value: der lange anon public Key  
   - Environments: wie oben  
7. Speichern.

### Optional (später, nicht Pflicht für Schritt 3)
| Key | Wann |
|-----|------|
| `VITE_SHOPIFY_VARIANT_KEYCHAIN` | Wenn du die **echte** Shopify Variant-ID hast (nur Ziffern) |
| `VITE_FEATURES_FULL` | **Nicht** setzen (oder `0`) – sonst kommen unfertige Features zurück |

---

## 2.4 Wichtig: Nach Env-Änderung neu deployen

Env-Änderungen gelten **nicht** sofort für die alte Build.

1. Tab **Deployments**.  
2. Obersten Deployment von Branch **`main`** finden.  
3. Rechts die **⋯** (drei Punkte).  
4. **Redeploy** → bestätigen (ohne Cache ist oft besser, falls angeboten: „Use existing Build Cache“ = aus).  
5. Warten bis Status **Ready** (grün).

### Production-URL merken
Auf dem Deployment steht die URL, z. B.:
- `https://konfigurator.nudaim3d.de` (Custom Domain), oder  
- `https://key-chain-….vercel.app`

Das ist die URL für Schritt 3.

---

## 2.5 Fertig-Kontrolle Schritt 2
- [ ] `VITE_SUPABASE_URL` in Vercel Production gesetzt  
- [ ] `VITE_SUPABASE_ANON_KEY` (anon, nicht service_role) gesetzt  
- [ ] Neues Deployment **Ready** nach dem Setzen/Prüfen  
- [ ] Production-URL notiert  

---

# SCHRITT 3 – Eine Testbestellung durchspielen

## Ziel
Konfigurator → Speichern → Shopify-Warenkorb öffnet sich → Produkt liegt drin (mit Config-ID).

Du musst **nicht** zwingend echt bezahlen. Warenkorb + sichtbare Position reicht als erster Sieg.  
(Echt zahlen = noch besser, wenn Shopify-Testgateway da ist.)

---

## 3.1 Konfigurator öffnen

1. Production-URL aus Schritt 2 öffnen.  
2. Seite soll laden (NUDAIM / Schlüsselanhänger).  
3. Falls Login kommt:
   - Mit deinem normalen Login / Gast, je nachdem was bei dir aktiv ist.  
   - Ohne funktionierenden Login kommst du nicht zum Editor – dann zuerst Auth/Gast klären.

### Wenn die Seite weiß / Error ist
- Hard Refresh: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac).  
- Andere URL? Vielleicht noch alte Preview statt Production.  
- Browser-Konsole (F12) → Screenshot der roten Fehler für später.

---

## 3.2 Anhänger gestalten (Minimum)

1. Du solltest im Bereich **Schlüsselanhänger / Hardware** sein (nicht zwingend Microsite).  
2. **Logo hochladen** (PNG/SVG/JPG – dein normales Logo).  
3. Warten bis die Vorschau das Logo zeigt.  
4. **Stückzahl** auf `1` lassen (einfachster Test).  
5. Optional ignorieren: Chip-Ziel, Farben feintunen – für den Smoke-Test egal.

### Hinweis zur Vorschau
Unten steht oft, dass Farben im Druck abweichen können – normal, weiter.

---

## 3.3 Bestellen klicken

1. Button **„Bestellen“** oder **„In den Warenkorb“** (Desktop oft oben oder im Footer).  
2. Es erscheinen Schritte wie:
   - Bild vom Anhänger…  
   - Design wird hochgeladen…  
   - Bestellung wird vorbereitet…  
3. Dann Dialog: **„Weiter zum Warenkorb“** / speichern geschafft.  
4. Entweder:
   - Button **Zum Warenkorb**, oder  
   - automatischer Countdown → Redirect.

### Wenn Fehler „Speichern hat nicht geklappt“
Meist Env/Supabase:
- Nochmal Schritt 2 prüfen (URL + anon key, Redeploy).  
- In Supabase: Tabelle `nfc_configs` existiert? Storage-Bucket `nudaim`?  
- Siehe auch `SUPABASE_SETUP.md`.

### Wenn Logo-Warnung / Confirm kommt
Im Live-Modus sollte das **nicht** blockieren. Falls doch: „OK“ / weiter.

---

## 3.4 Shopify-Warenkorb prüfen

Du landest auf etwas wie:  
`https://nudaim3d.de/cart/...`  
oder Checkout/Cart von Shopify.

**Prüfen:**
1. Liegt **ein** Produkt im Warenkorb?  
2. Menge = 1 (oder was du gewählt hast)?  
3. Line-Item-Properties (je nach Theme sichtbar):
   - **Config-ID** (langer Code, z. B. 16 Zeichen)  
   - oft **Preview** (Bild-Link)  
   - ggf. Handy-Seite / Bearbeiten-Link  

Wenn Properties im Theme versteckt sind: im Admin unter der Testorder später sichtbar – für jetzt reicht „Produkt ist im Cart“.

### Wenn der Warenkorb leer ist
- Popup-Blocker? Zweiter Tab?  
- Falsche Variant-ID (Produkt gelöscht in Shopify)?  
- Dann in Vercel `VITE_SHOPIFY_VARIANT_KEYCHAIN` auf die echte ID setzen (Shopify Admin → Produkt → Variante → ID aus der URL oder „Variante bearbeiten“).

---

## 3.5 (Optional) Bis zur Zahlung

1. Checkout starten.  
2. Testadresse eingeben.  
3. Wenn Shopify **Bogus Gateway** / Testmodus aktiv: Testdaten laut Shopify-Doku.  
4. Bestellung abschließen.  
5. Bestellmail checken (Preview / Links – nice to have).

**Admin-Sync (`paid` im NUDAIM-Admin) kommt erst später** (Webhook). Für Schritt 3 reicht Warenkorb oder bezahlte Shopify-Order.

---

## 3.6 Fertig-Kontrolle Schritt 3
- [ ] Konfigurator auf Production geladen  
- [ ] Logo hochgeladen, Bestellen geklickt, Speichern ohne Fehler  
- [ ] Redirect in Shopify-Warenkorb  
- [ ] Produkt liegt im Cart  
- [ ] (Optional) Testzahlung durch  

**Dann hast du geschafft, was wir „live genug“ nennen.**

---

# Wenn irgendwo hängen bleibst

Schreib mir **genau**:
1. Welcher Schritt (1.3 / 2.3 / 3.3 …)  
2. Was du siehst (Text der Fehlermeldung / Screenshot-Beschreibung)  
3. Welche URL in der Adresszeile  

Dann machen wir **nur diesen einen Punkt**.

---

# Was bewusst NOCH NICHT

- Shopify Webhook Secret  
- Draft Orders / `shpat_` Token  
- Admin Auto-`paid`  
- Mengenstaffel-Kasse  
- Messe-Badge  

Das kommt **nach** 1–3, einzeln.
