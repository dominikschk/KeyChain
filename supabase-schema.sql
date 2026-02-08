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
  stl_url TEXT,
  header_image_url TEXT,
  profile_logo_url TEXT,
  accent_color TEXT,
  theme TEXT,
  font_style TEXT,
  plate_data JSONB,
  product_type TEXT,
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

-- Bestellungen (manuell oder später per Shopify-Sync): Short-ID ↔ Bestellung ↔ Status
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
CREATE INDEX IF NOT EXISTS idx_orders_shopify_order_id ON public.orders(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_select" ON public.orders;
DROP POLICY IF EXISTS "orders_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_update" ON public.orders;
CREATE POLICY "orders_select" ON public.orders FOR SELECT USING (true);
CREATE POLICY "orders_insert" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "orders_update" ON public.orders FOR UPDATE USING (true);

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

DROP POLICY IF EXISTS "nfc_configs_select" ON public.nfc_configs;
DROP POLICY IF EXISTS "nfc_configs_insert" ON public.nfc_configs;
CREATE POLICY "nfc_configs_select" ON public.nfc_configs FOR SELECT USING (true);
CREATE POLICY "nfc_configs_insert" ON public.nfc_configs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "nfc_blocks_select" ON public.nfc_blocks;
DROP POLICY IF EXISTS "nfc_blocks_insert" ON public.nfc_blocks;
CREATE POLICY "nfc_blocks_select" ON public.nfc_blocks FOR SELECT USING (true);
CREATE POLICY "nfc_blocks_insert" ON public.nfc_blocks FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "nfc_scans_select" ON public.nfc_scans;
DROP POLICY IF EXISTS "nfc_scans_insert" ON public.nfc_scans;
CREATE POLICY "nfc_scans_select" ON public.nfc_scans FOR SELECT USING (true);
CREATE POLICY "nfc_scans_insert" ON public.nfc_scans FOR INSERT WITH CHECK (true);

-- 4. Storage-Bucket „nudaim“ (Screenshots/Bilder)
-- ------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('nudaim', 'nudaim', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "nudaim_upload" ON storage.objects;
DROP POLICY IF EXISTS "nudaim_public_read" ON storage.objects;
CREATE POLICY "nudaim_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'nudaim');
CREATE POLICY "nudaim_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'nudaim');
