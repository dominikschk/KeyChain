# Sicherheitsprobleme & Fixes (KeyChain / NUDAIM)

Stand: 2026-07-21  
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

### S8 – Draft-Order ohne Caller-Auth (2026-07)

**Problem:** Jeder mit Anon-Key konnte `create-draft-order` aufrufen → Shopify Draft Orders / Invoice-URLs.

**Fix:**
- Optional `DRAFT_ORDER_SHARED_SECRET` (Edge) + `VITE_DRAFT_ORDER_SECRET` (Client-Header `x-draft-order-secret`), timing-safe.
- Wenn `ALLOWED_MICROSITE_HOSTS` gesetzt: Origin-Pflicht.
- Rate-Limit bleibt (~15/min/IP).

**Aktion:** Secrets setzen + Function neu deployen. Hinweis: Client-Secret ist im Bundle lesbar – kombiniert mit Origin + Cloudflare sinnvoll.

---

### S9 – brand-scrape SSRF (2026-07)

**Problem:** `redirect: 'follow'` + Private-IP-Check nur am Hostname → Redirect/DNS-Rebinding/Metadata möglich.

**Fix:** `redirect: 'manual'` (Redirects abgelehnt); erweiterte Blocklist (169.254, CGNAT, Metadata-Hosts); Origin-Allowlist strikt wenn gesetzt.

**Aktion:** `brand-scrape` neu deployen + `ALLOWED_MICROSITE_HOSTS`.

---

### S10 – Stempel-secretKey öffentlich + Chat-DoS (2026-07)

**Problem:** `get_blocks_for_config` lieferte `secretKey`; `microsite-chat` ohne Rate-Limit/Origin.

**Fix:**
- Öffentliche Blocks ohne `secretKey`; Owner via `get_blocks_for_owner(write_token)`.
- Stempel-Check: `verify_nfc_stamp` RPC.
- Chat: Rate-Limit + Origin-Enforcement.
- `insert_nfc_blocks`: `image_url` nur `https://` (wie replace).
- Vercel: CSP + `nosniff` / `X-Frame-Options`.

**Aktion:** Migration `supabase/migrations/security_harden_2026_07.sql` bzw. Schema ausführen; Functions `microsite-chat` / `brand-scrape` / `create-draft-order` deployen.

---

## Bereits zuvor behoben (Referenz)

- Admin über Supabase Auth + `admin_users` / `is_admin()` + RLS auf Orders
- Kein hartcodiertes Admin-Passwort / keine Anon-Key-Fallbacks im Client
- Öffentliche Reads über SECURITY DEFINER RPCs statt offenem SELECT

---

## Deployment-Checkliste

1. [ ] `supabase-schema.sql` **oder** `supabase/migrations/security_harden_2026_07.sql` im SQL Editor ausführen
2. [ ] Edge Function `send-microsite-email` neu deployen
3. [ ] Edge Function `shopify-order-webhook` deployen (`--no-verify-jwt`) – siehe [`SHOPIFY_WEBHOOK.md`](SHOPIFY_WEBHOOK.md)
4. [ ] Edge Functions `create-draft-order`, `brand-scrape`, `microsite-chat` neu deployen (`--no-verify-jwt`)
5. [ ] Secret `ALLOWED_MICROSITE_HOSTS` setzen (empfohlen, z. B. `konfigurator.nudaim3d.de`)
6. [ ] Secrets `DRAFT_ORDER_SHARED_SECRET` (Supabase) + `VITE_DRAFT_ORDER_SECRET` (Vercel, gleicher Wert)
7. [ ] Secret `SHOPIFY_WEBHOOK_SECRET` setzen + Shopify Webhook `orders/paid`
8. [ ] App neu bauen/deployen (Short-ID, write_token, Storage-Pfade, Sentry optional, CSP)
9. [ ] Smoke-Test: Konfigurator speichern → Shopify (`_CCP-URL`) → Microsite → CCP-Edit → Admin-Login
10. [ ] Smoke-Test: bezahlte Order → Admin zeigt Status `paid`
11. [ ] Smoke-Test: Stempelkarte (QR) + Draft-Checkout mit Secret

### Rate-Limits (Infrastruktur)

| Schicht | Maßnahme |
|---------|----------|
| Cloudflare / WAF | Rate-Limit auf `/`, `/ccp`, Supabase REST (z. B. 60 req/min/IP) |
| Supabase | `record_nfc_scan` max. 20 Scans/config/Minute; Direct-INSERT-Policy entfernt |
| Shopify Webhook | HMAC-Pflicht; ohne `Config-ID` → 200/`synced:0` (kein Retry-Loop) |

### Observability

Optional `VITE_SENTRY_DSN` setzen – siehe `.env.example`. Ohne DSN kein Browser-Tracking.

---

## Restrisiken (bewusst / Infrastruktur)

| Thema | Hinweis |
|-------|---------|
| Anon darf weiterhin Configs anlegen | Produktflow (Konfigurator ohne Login); Härtung über Constraints + kurze IDs |
| CCP-Lesen nur per Short-ID | Capability-URL; Scans/Link ohne Token |
| CCP-Edit per write_token in URL | Token in Shopify `_CCP-URL` / Bestellmail; wer den Link hat, kann digital editieren. Nie in öffentlicher Microsite-URL. Shop-Mitarbeiter sehen die Property in der Order. |
| Token in Query-String (CCP) | Browser-History / Referer; CCP setzt `Referrer-Policy: no-referrer` |
| Öffentlicher Storage-Read | Microsite/STL müssen öffentlich lesbar sein |
| Scan-INSERT | Nur noch via `record_nfc_scan` RPC (Rate-Limit); Missbrauch verfälscht weiter Zähler |
| App-Level-Rate-Limit | Scan-RPC + Cloudflare/WAF (siehe oben) |
| WLAN-Passwort in Blocks | Absichtlich öffentlich (Button „WLAN teilen“); Stempel-`secretKey` nicht mehr |
| `VITE_DRAFT_ORDER_SECRET` im Bundle | Obfuscation + Origin; kein Ersatz für WAF |
| Google-Login nur UI-Gate | Backend bleibt anon; Guest-Bypass bewusst |
| SVG in öffentlichem Storage | CSP + nosniff; SVG nicht als HTML öffnen |
| Stempel-Zähler in localStorage | Clientseitig fälschbar – serverseitige Stempelkarte später (Roadmap) |

---

## CCP-Edit (2026-07-17)

Neue RPCs `update_nfc_config_profile` / `replace_nfc_blocks` nur mit `write_token`. Kein Update von `short_id`, `stl_url`, `plate_data`, `write_token`. Image-URLs nur `https://`.
