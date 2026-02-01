-- ============================================================
-- KeyChain / NUDAIM – Supabase Schema
-- Im Supabase Dashboard: SQL Editor → New query → Einfügen & Run
-- ============================================================

-- 1. Tabellen
-- ------------------------------------------------------------

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

CREATE TABLE IF NOT EXISTS public.nfc_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES public.nfc_configs(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indizes
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_nfc_configs_short_id ON public.nfc_configs(short_id);
CREATE INDEX IF NOT EXISTS idx_nfc_blocks_config_id ON public.nfc_blocks(config_id);
CREATE INDEX IF NOT EXISTS idx_nfc_scans_config_id ON public.nfc_scans(config_id);
CREATE INDEX IF NOT EXISTS idx_nfc_scans_scanned_at ON public.nfc_scans(scanned_at);

-- 3. Row Level Security (RLS)
-- ------------------------------------------------------------

ALTER TABLE public.nfc_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfc_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfc_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nfc_configs_select" ON public.nfc_configs FOR SELECT USING (true);
CREATE POLICY "nfc_configs_insert" ON public.nfc_configs FOR INSERT WITH CHECK (true);

CREATE POLICY "nfc_blocks_select" ON public.nfc_blocks FOR SELECT USING (true);
CREATE POLICY "nfc_blocks_insert" ON public.nfc_blocks FOR INSERT WITH CHECK (true);

CREATE POLICY "nfc_scans_select" ON public.nfc_scans FOR SELECT USING (true);
CREATE POLICY "nfc_scans_insert" ON public.nfc_scans FOR INSERT WITH CHECK (true);

-- 4. Storage-Bucket „nudaim“ (Screenshots/Bilder)
-- ------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('nudaim', 'nudaim', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "nudaim_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'nudaim');

CREATE POLICY "nudaim_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'nudaim');
