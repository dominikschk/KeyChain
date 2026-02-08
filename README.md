# NFeC Konfigurator (B2B)

Standalone-App zum Konfigurieren und Bestellen von NFeC-Produkten. B2B-orientiert; Anmeldung per **Google** (Google Identity Services).

## Produktion (Vercel)

**App-URL:** Alle Bereiche laufen unter derselben Domain, z. B. **https://konfigurator.nudaim3d.de**:

| Bereich | URL |
|--------|-----|
| Konfigurator | https://konfigurator.nudaim3d.de |
| Kunden-Panel (CCP) | https://konfigurator.nudaim3d.de/ccp?id=SHORT_ID |
| Admin | https://konfigurator.nudaim3d.de/admin |

Microsite-Links (nach Bestellung) zeigen auf `https://konfigurator.nudaim3d.de/?id=SHORT_ID`. In Vercel die Custom Domain **konfigurator.nudaim3d.de** eintragen (Settings → Domains).

## Bereiche

| Bereich | Pfad | Beschreibung |
|--------|------|--------------|
| **Konfigurator** | `/` oder `/configurator` | Konfigurieren (3D + Microsite) und Bestellen. |
| **Kunden-Panel** | `/ccp?id=SHORT_ID` | Für Kunden nach Bestellung: Microsite-Link, Scan-Statistiken. |
| **Admin** | `/admin` | **Nur per direkter URL** – kein Link in der App. Mit Passwortschutz (siehe unten). Bestellübersicht, Copy-Links für Microsite und Kunden-Panel. |

**Ordner:**  
- `pages/` – ConfiguratorPage, CcpPage, AdminPage  
- `components/configurator/` – Konfigurator-Komponenten (Controls, Viewer)  
- `components/ccp/` – CCP-Komponenten (Statistiken, Microsite-Editor für Kunden)  
- `components/admin/` – Admin-Komponenten (Bestellliste, Microsite-Links)

## Lokal starten

**Voraussetzung:** Node.js

1. Abhängigkeiten installieren: `npm install`
2. App starten: `npm run dev`

## Google-Anmeldung (ohne Supabase)

Die Anmeldung erfolgt **nur über Google** (Google Identity Services). Es wird **kein Supabase** verwendet – das Google-ID-Token wird in der App dekodiert und die Session nur lokal (localStorage) gespeichert. Kein Client-Secret nötig.

1. **Google Cloud Console:** [APIs & Dienste → Anmeldedaten](https://console.cloud.google.com/apis/credentials) → „Anmeldedaten erstellen“ → **OAuth 2.0-Client-ID** → Anwendungstyp **Webanwendung**. Client-ID kopieren.
2. **Umgebung:** In `.env.local` setzen: `VITE_GOOGLE_CLIENT_ID=<deine-Google-Client-ID>`.
3. **Autorisierte JavaScript-Quellen** in der Google-Client-ID: z. B. `http://localhost:5174` (dein Vite-Port).
4. **Autorisierte Weiterleitungs-URIs:** z. B. `http://localhost:5174/`.

(Supabase wird für Speichern/Upload und Bestellübersicht genutzt – nicht für die Anmeldung.)

## Umgebungsvariablen (Übersicht)

| Variable | Pflicht | Beschreibung |
|----------|--------|--------------|
| `VITE_SUPABASE_URL` | Ja | Supabase Project URL (Project Settings → API). |
| `VITE_SUPABASE_ANON_KEY` | Ja | Supabase anon (public) Key. |
| `VITE_ADMIN_PASSWORD` | Ja für Admin | Ohne gesetztes Passwort ist `/admin` gesperrt. Starkes Passwort verwenden. |
| `VITE_ADMIN_SESSION_HOURS` | Nein | Session-Dauer in Stunden (Standard 8). |
| `VITE_GOOGLE_CLIENT_ID` | Nein | Für Google-Login im Konfigurator. |

**Lokal:** `.env.local` anlegen (siehe `.env.example`). **Deploy (z. B. Vercel):** Settings → Environment Variables → alle `VITE_*` eintragen und neu deployen.

## Admin-Panel (nur direkter Link + Passwort)

- **URL:** Nur über direkte Eingabe erreichbar, z. B. `https://konfigurator.nudaim3d.de/admin`. Es gibt **keinen Link** dazu in der App.
- **Passwort:** `VITE_ADMIN_PASSWORD` **muss gesetzt sein**, sonst ist der Admin-Zugang deaktiviert (niemand kommt rein). In `.env.local` (lokal) oder in den Umgebungsvariablen des Hosters (Vercel/Netlify) setzen.
- **Sicherheit:** Nach Login läuft die Sitzung nach 8 Stunden ab (optional: `VITE_ADMIN_SESSION_HOURS`). Nach 5 Fehlversuchen: 15 Minuten Lockout. Kein Zugang ohne Passwort.

## E-Mail nach Bestellung (Microsite + Short-ID)

Siehe **EMAIL_NACH_BESTELLUNG.md**: Option 1 = Microsite-Link in der Shopify-Bestellbestätigung anzeigen. Option 2 = eigene E-Mail per Supabase Edge Function (Resend) nach Bestellung versenden.
