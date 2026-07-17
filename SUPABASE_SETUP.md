# Supabase einrichten

Damit Admin, CCP und Microsite funktionieren, brauchst du in Supabase:

1. **Projekt-URL und Anon-Key** in `.env.local`
2. **Schema inkl. RLS und RPCs** aus `supabase-schema.sql`
3. **Storage-Bucket:** `nudaim` (für Screenshots/Bilder)
4. **Auth-User + Eintrag in `admin_users`** für `/admin`

---

## 1. Umgebungsvariablen (`.env.local`)

Im Projektroot eine Datei `.env.local` anlegen (oder anpassen):

```env
VITE_SUPABASE_URL=https://DEIN_PROJEKT.supabase.co
VITE_SUPABASE_ANON_KEY=dein_anon_key_hier
```

- **VITE_SUPABASE_URL:** Project Settings → API → Project URL  
- **VITE_SUPABASE_ANON_KEY:** Project Settings → API → `anon` / `publishable` (public)

Ohne diese Variablen startet der Client nicht (`supabase = null`). Es gibt **keine** hartcodierten Fallbacks mehr.

---

## 2. Schema ausführen

In Supabase: **SQL Editor** → New query → Inhalt von **`supabase-schema.sql`** einfügen und ausführen.

Das legt an:

- Tabellen `nfc_configs` (inkl. `write_token`), `nfc_blocks`, `nfc_scans`, `orders`, `admin_users`
- Funktion `is_admin()`
- Öffentliche RPCs: `get_config_by_short_id` (ohne `write_token`), `get_blocks_for_config`, `get_scan_count`, `get_scan_count_last_30_days`, `set_nfc_config_stl_url` (Token + einmalig)
- Enge RLS (kein offenes `SELECT`/`UPDATE` für Bestellungen)
- Storage: nur INSERT mit erlaubten Endungen, **kein** anon UPDATE

Details zu Fixes: siehe **SECURITY_ISSUES.md**.

---

## 3. Admin-Zugang (Supabase Auth)

1. **Authentication → Providers:** E-Mail aktivieren  
2. **Authentication → Users:** Admin-User mit E-Mail/Passwort anlegen  
3. In SQL:

```sql
INSERT INTO public.admin_users (email)
VALUES ('dein-admin@example.com')
ON CONFLICT (email) DO NOTHING;
```

Die E-Mail muss **exakt** der Auth-User-E-Mail entsprechen (Vergleich ist case-insensitive).

Login unter `/admin` mit dieser E-Mail und dem Passwort. Ohne Eintrag in `admin_users` wird die Session sofort wieder beendet.

---

## 4. Row Level Security (Kurz)

| Ressource | Anon | Admin (`is_admin()`) |
|-----------|------|----------------------|
| `nfc_configs` | nur INSERT (mit Checks) | SELECT |
| `nfc_blocks` | kein direktes INSERT (RPC + `write_token`) | SELECT |
| Microsite/CCP | RPCs nach `short_id` | – |
| `nfc_scans` | INSERT | SELECT |
| `orders` | kein Zugriff | SELECT, INSERT, UPDATE |
| Storage `nudaim` | INSERT (Endungen) + public SELECT | – |

**Wichtig:** Alte Policies mit `USING (true)` / `WITH CHECK (true)` für SELECT/UPDATE auf `orders` entfernen (macht das Schema-Skript über `DROP POLICY IF EXISTS`). Storage-UPDATE für anon ist absichtlich entfernt.

---

## 5. Storage-Bucket „nudaim“

Wird im Schema angelegt. Alternativ manuell:

- **Storage** → **New bucket** → Name: `nudaim`, Public aktivieren

---

## Kurzüberblick

| Was | Wo | Zweck |
|-----|-----|--------|
| URL + Anon Key | Project Settings → API | `.env.local` |
| Schema + RLS + RPCs | `supabase-schema.sql` | Daten + Sicherheit |
| Admin-User | Auth + `admin_users` | `/admin` |
| Bucket `nudaim` | Storage | Screenshots / STL |

Nach dem Einrichten: App neu starten (`npm run dev`).

---

## Key rotieren

Falls früher ein Anon-Key im Quellcode lag: In Supabase **API Keys rotieren** und die neuen Werte nur in `.env.local` / Vercel setzen.
