# Sicherheitsprobleme & Fixes (KeyChain / NUDAIM)

Stand: 2026-07-17  
Dieses Dokument listet die gefundenen Sicherheitslücken, den jeweiligen Fix und was du in Supabase noch ausführen musst.

---

## Kritisch

### S1 – Offenes Storage UPDATE/INSERT (`nudaim`)

**Problem:** Anon konnte beliebige Dateien im Bucket hochladen und bestehende Objekte überschreiben (z. B. `stl/{shortId}.stl`). Bekannte Short-IDs → Datei-Takeover, Missbrauch als öffentliches Hosting.

**Fix:**
- Policy `nudaim_update` entfernt (kein anon UPDATE mehr).
- INSERT nur noch für erlaubte Dateiendungen (`png`, `jpg`, `jpeg`, `webp`, `gif`, `svg`, `stl`).
- Client nutzt eindeutige Pfade (UUID-Suffix), kein `upsert` mehr für STL.

**Aktion:** `supabase-schema.sql` im SQL Editor erneut ausführen (Policies-Abschnitt).

---

### S2 – `set_nfc_config_stl_url` ohne Auth

**Problem:** Jeder mit Anon-Key konnte die STL-URL setzen. Über `get_config_by_short_id` bekam man die Config-UUID → Umbiegen der STL-URL möglich.

**Fix:**
- Spalte `write_token` (nur beim INSERT gesetzt, wird von öffentlichen RPCs **nicht** zurückgegeben).
- RPC verlangt `p_write_token` und setzt STL nur einmal (`stl_url IS NULL`).
- Nur `https://`-URLs erlaubt.

**Aktion:** Schema ausführen; bestehende Configs ohne Token können STL nicht mehr clientseitig nachsetzen (Admin/SQL ggf. manuell).

---

### S2b – Cross-User-Block-Injection (`nfc_blocks`)

**Problem:** Anon konnte beliebige Blöcke an fremde `config_id` anhängen (Phishing/Defacement), sobald die UUID über die Short-ID bekannt war.

**Fix:**
- Direktes INSERT-Policy für `nfc_blocks` entfernt.
- Neues RPC `insert_nfc_blocks(config_id, write_token, blocks)` – nur mit Token, nur wenn noch keine Blöcke existieren (einmalig).

**Aktion:** Schema ausführen + App-Deploy (Client nutzt RPC).

---

## Hoch

### S3 – Unbegrenztes anon INSERT (Configs / Blocks / Scans)

**Problem:** Spam, Fake-Microsites, DB-/Storage-Kosten, Scan-Flooding; früher auch freie Block-INSERTs.

**Fix:**
- `WITH CHECK` an Config-INSERT: Short-ID-Format, `write_token`-Länge, Titellänge.
- Tabellen-Constraints für Feldlängen.
- Block-INSERT nur noch über `insert_nfc_blocks` + Token (siehe S2b).
- Rate-Limiting bleibt Infrastruktur-Thema (Cloudflare / Supabase).

**Aktion:** Schema ausführen.

---

### S4 – Schwache Short-IDs

**Problem:** `Math.random().toString(36).substring(2, 10)` – geringe Entropie, teils kürzer als 8 Zeichen. Short-ID = Zugang zu Microsite/CCP und früher UUID-Leak für STL-Update.

**Fix:** `generateShortId()` mit `crypto.getRandomValues`, 16 Zeichen aus sicherem Alphabet (ohne mehrdeutige Zeichen).

**Datei:** `lib/utils.ts`

---

## Mittel

### S5 – Google-ID-Token ohne Signaturprüfung

**Problem:** Token wurde nur Base64-dekodiert. Beliebige „Sessions“ in `localStorage` möglich. (Backend nutzte Anon-Key ohnehin; Login war UI-Gate.)

**Fix:** Verifikation über Google `tokeninfo` (Aud = `VITE_GOOGLE_CLIENT_ID`, Expiry, `sub` Pflicht).

**Datei:** `lib/auth.ts`

---

### S6 – E-Mail-Webhook (Secret-Compare, Phishing-URL)

**Problem:** Secret-Vergleich mit `===` (Timing); beliebige `http(s)`-Links in Mails → Phishing bei geleaktem Secret.

**Fix:**
- Timing-sicherer Vergleich (`crypto.subtle` / byteweise).
- Optional `ALLOWED_MICROSITE_HOSTS` (Komma-separierte Hostnames); wenn gesetzt, nur diese Hosts.

**Datei:** `supabase/functions/send-microsite-email/index.ts`  
**Aktion:** Function neu deployen; Secret `ALLOWED_MICROSITE_HOSTS` setzen (z. B. `konfigurator.nudaim3d.de`).

---

### S7 – Microsite-Links ohne Protokoll-Whitelist

**Problem:** Social-/Custom-Links öffneten URLs, sobald sie mit `http` begannen – ohne harte `http:`/`https:`-Prüfung.

**Fix:** Hilfsfunktion `isSafeHttpUrl()`; nur `http:`/`https:` werden geöffnet.

**Datei:** `components/Microsite.tsx`, `lib/validation.ts`

---

## Bereits zuvor behoben (Referenz)

- Admin über Supabase Auth + `admin_users` / `is_admin()` + RLS auf Orders
- Kein hartcodiertes Admin-Passwort / keine Anon-Key-Fallbacks im Client
- Öffentliche Reads über SECURITY DEFINER RPCs statt offenem SELECT

---

## Deployment-Checkliste

1. [ ] `supabase-schema.sql` im Supabase SQL Editor ausführen
2. [ ] Edge Function `send-microsite-email` neu deployen
3. [ ] Secret `ALLOWED_MICROSITE_HOSTS` setzen (empfohlen)
4. [ ] App neu bauen/deployen (Short-ID, write_token, Storage-Pfade)
5. [ ] Smoke-Test: Konfigurator speichern → Shopify → Microsite → CCP → Admin-Login

---

## Restrisiken (bewusst / Infrastruktur)

| Thema | Hinweis |
|-------|---------|
| Anon darf weiterhin Configs anlegen | Produktflow (Konfigurator ohne Login); Härtung über Constraints + kurze IDs |
| CCP nur per Short-ID | Capability-URL-Modell; Entropie der Short-ID ist die Absicherung |
| Öffentlicher Storage-Read | Microsite/STL müssen öffentlich lesbar sein |
| Scan-INSERT | Weiterhin anonym möglich (Statistik); Missbrauch verfälscht Zähler |
| Kein App-Level-Rate-Limit | Über WAF / Supabase Dashboard absichern |

---

## Nachprüfung (2026-07-17)

Security-Review der ungecommitten Fixes: **keine medium+/high/critical Findings** mehr mit realistischer Cross-User- oder Privilege-Escalation-Ausnutzung. S2b (Block-Injection) geschlossen. Verbleibendes = dokumentierte Restrisiken oben.
