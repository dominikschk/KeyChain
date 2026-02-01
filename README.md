# NUDAIM / NFeC Studio

Standalone-App zum Konfigurieren und Bestellen von NFeC-Produkten. Läuft unabhängig; **nur Google** wird für die Anmeldung genutzt (kein Gemini, kein AI Studio).

## Drei Bereiche (Struktur)

| Bereich | Pfad | Beschreibung |
|--------|------|--------------|
| **Konfigurator** | `/` oder `/configurator` | Panel zum Konfigurieren (3D + Microsite) und Bestellen. |
| **CCP (Kunden-Panel)** | `/ccp` | Seite für Kunden nach Bestellung: Microsite bearbeiten, Statistiken (Chip-Scans). |
| **Admin** | `/admin` | Panel für dich: Alle Bestellungen mit Link zur jeweiligen Microsite-URL. |

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

(Supabase wird nur noch für Speichern/Upload genutzt, falls konfiguriert – nicht für die Anmeldung.)

## E-Mail nach Bestellung (Microsite + Short-ID)

Siehe **EMAIL_NACH_BESTELLUNG.md**: Option 1 = Microsite-Link in der Shopify-Bestellbestätigung anzeigen. Option 2 = eigene E-Mail per Supabase Edge Function (Resend) nach Bestellung versenden.
