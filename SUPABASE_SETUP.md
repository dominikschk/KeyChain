# Supabase einrichten

Damit Admin, CCP und Microsite funktionieren, brauchst du in Supabase:

1. **Projekt-URL und Anon-Key** in `.env.local`
2. **Drei Tabellen:** `nfc_configs`, `nfc_blocks`, `nfc_scans`
3. **Storage-Bucket:** `nudaim` (für Screenshots/Bilder)

---

## 1. Umgebungsvariablen (`.env.local`)

Im Projektroot eine Datei `.env.local` anlegen (oder anpassen):

```env
VITE_SUPABASE_URL=https://DEIN_PROJEKT.supabase.co
VITE_SUPABASE_ANON_KEY=dein_anon_key_hier
```

- **VITE_SUPABASE_URL:** In Supabase: Project Settings → API → Project URL  
- **VITE_SUPABASE_ANON_KEY:** In Supabase: Project Settings → API → Project API keys → `anon` (public)

---

## 2. Tabellen anlegen (SQL Editor)

In Supabase: **SQL Editor** → New query → folgenden SQL ausführen:

```sql
-- Tabelle: Konfigurationen (eine Zeile pro Bestellung/Microsite)
CREATE TABLE IF NOT EXISTS public.nfc_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT NOT NULL UNIQUE,
  profile_title TEXT NOT NULL,
  preview_image TEXT,
  header_image_url TEXT,
  profile_logo_url TEXT,
  accent_color TEXT,
  theme TEXT,
  font_style TEXT,
  plate_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabelle: Blöcke pro Konfiguration (Texte, Buttons, Bilder der Microsite)
CREATE TABLE IF NOT EXISTS public.nfc_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES public.nfc_configs(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  content TEXT,
  button_type TEXT,
  image_url TEXT,
  settings JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Tabelle: Scan-Events (optional, für Statistiken im CCP)
CREATE TABLE IF NOT EXISTS public.nfc_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES public.nfc_configs(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ DEFAULT now()
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_nfc_configs_short_id ON public.nfc_configs(short_id);
CREATE INDEX IF NOT EXISTS idx_nfc_blocks_config_id ON public.nfc_blocks(config_id);
CREATE INDEX IF NOT EXISTS idx_nfc_scans_config_id ON public.nfc_scans(config_id);
CREATE INDEX IF NOT EXISTS idx_nfc_scans_scanned_at ON public.nfc_scans(scanned_at);
```

---

## 3. Row Level Security (RLS)

Damit die App mit dem **anon**-Key lesen/schreiben kann:

**Option A – RLS aktivieren und Policies setzen (empfohlen):**

```sql
ALTER TABLE public.nfc_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfc_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfc_scans ENABLE ROW LEVEL SECURITY;

-- Alle dürfen lesen
CREATE POLICY "nfc_configs_select" ON public.nfc_configs FOR SELECT USING (true);
CREATE POLICY "nfc_blocks_select" ON public.nfc_blocks FOR SELECT USING (true);
CREATE POLICY "nfc_scans_select" ON public.nfc_scans FOR SELECT USING (true);

-- Alle dürfen einfügen (für Bestellungen und Scans)
CREATE POLICY "nfc_configs_insert" ON public.nfc_configs FOR INSERT WITH CHECK (true);
CREATE POLICY "nfc_blocks_insert" ON public.nfc_blocks FOR INSERT WITH CHECK (true);
CREATE POLICY "nfc_scans_insert" ON public.nfc_scans FOR INSERT WITH CHECK (true);
```

**Option B – RLS aus (nur für lokale Entwicklung):**  
In Supabase: Table Editor → Tabelle wählen → RLS kann aus bleiben. Dann kann jeder mit dem Anon-Key alles lesen/schreiben.

---

## 4. Storage-Bucket „nudaim“

- **Storage** → **New bucket** → Name: `nudaim`
- **Public bucket** aktivieren (damit Microsite-Bilder/Screenshots per URL geladen werden können)
- Unter **Policies** eine Policy für den anon-Key:
  - **INSERT** erlauben (Upload)
  - **SELECT** erlauben (öffentlicher Abruf der URLs)

Oder per SQL:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('nudaim', 'nudaim', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "nudaim_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'nudaim');

CREATE POLICY "nudaim_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'nudaim');
```

---

## Kurzüberblick

| Was              | Wo in Supabase              | Zweck                          |
|------------------|-----------------------------|--------------------------------|
| URL + Anon Key   | Project Settings → API      | `.env.local` eintragen         |
| `nfc_configs`    | SQL Editor (oben)           | Konfigurationen / Bestellungen |
| `nfc_blocks`     | SQL Editor (oben)           | Microsite-Inhalte pro Config   |
| `nfc_scans`      | SQL Editor (oben)           | Scan-Statistiken (CCP)         |
| Bucket `nudaim`  | Storage → New bucket        | Screenshots / Bilder           |

Nach dem Einrichten: App neu starten (`npm run dev`), dann funktionieren `/admin`, `/ccp?id=…` und `/?id=…` mit deinem Supabase-Projekt.

---

## Erweiterungen (Orders, STL, mehrere Produkte)

Falls du die Tabellen schon angelegt hast und nur **Bestellungen**, **STL-URL** und **Produkttyp** ergänzen willst:

```sql
-- Spalten in nfc_configs (falls noch nicht vorhanden)
ALTER TABLE public.nfc_configs ADD COLUMN IF NOT EXISTS stl_url TEXT;
ALTER TABLE public.nfc_configs ADD COLUMN IF NOT EXISTS product_type TEXT;

-- Tabelle Bestellungen (Short-ID ↔ Bestellung ↔ Status)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_order_id TEXT,
  order_number TEXT,
  short_id TEXT NOT NULL,
  config_id UUID REFERENCES public.nfc_configs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_short_id ON public.orders(short_id);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select" ON public.orders FOR SELECT USING (true);
CREATE POLICY "orders_insert" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_update" ON public.orders FOR UPDATE USING (true);
```

Vollständiges Schema siehe **supabase-schema.sql**.
