-- ============================================================
-- KeyChain / NUDAIM – Supabase Schema (gesichert)
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

-- Admin-Allowlist (E-Mail muss mit Auth-User übereinstimmen)
CREATE TABLE IF NOT EXISTS public.admin_users (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_short_id ON public.orders(short_id);
CREATE INDEX IF NOT EXISTS idx_orders_shopify_order_id ON public.orders(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_nfc_configs_short_id ON public.nfc_configs(short_id);
CREATE INDEX IF NOT EXISTS idx_nfc_blocks_config_id ON public.nfc_blocks(config_id);
CREATE INDEX IF NOT EXISTS idx_nfc_scans_config_id ON public.nfc_scans(config_id);
CREATE INDEX IF NOT EXISTS idx_nfc_scans_scanned_at ON public.nfc_scans(scanned_at);

-- 2. Admin-Hilfsfunktion
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users a
    WHERE lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- 3. Öffentliche RPCs (Microsite / CCP / STL-Update nach Save)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_config_by_short_id(p_short_id text)
RETURNS SETOF public.nfc_configs
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.nfc_configs
  WHERE short_id = p_short_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_blocks_for_config(p_config_id uuid)
RETURNS SETOF public.nfc_blocks
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.nfc_blocks
  WHERE config_id = p_config_id
  ORDER BY sort_order ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_scan_count(p_config_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint
  FROM public.nfc_scans
  WHERE config_id = p_config_id;
$$;

CREATE OR REPLACE FUNCTION public.get_scan_count_last_30_days(p_config_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint
  FROM public.nfc_scans
  WHERE config_id = p_config_id
    AND scanned_at >= (now() - interval '30 days');
$$;

CREATE OR REPLACE FUNCTION public.set_nfc_config_stl_url(p_config_id uuid, p_stl_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_stl_url IS NULL OR length(trim(p_stl_url)) = 0 THEN
    RAISE EXCEPTION 'stl_url required';
  END IF;
  IF p_stl_url !~* '^https?://' THEN
    RAISE EXCEPTION 'stl_url must be http(s)';
  END IF;
  UPDATE public.nfc_configs
  SET stl_url = p_stl_url
  WHERE id = p_config_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_config_by_short_id(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_blocks_for_config(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_scan_count(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_scan_count_last_30_days(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_nfc_config_stl_url(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_config_by_short_id(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_blocks_for_config(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_scan_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_scan_count_last_30_days(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_nfc_config_stl_url(uuid, text) TO anon, authenticated;

-- 4. Row Level Security
-- ------------------------------------------------------------

ALTER TABLE public.nfc_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfc_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfc_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Alte offene Policies entfernen
DROP POLICY IF EXISTS "nfc_configs_select" ON public.nfc_configs;
DROP POLICY IF EXISTS "nfc_configs_insert" ON public.nfc_configs;
DROP POLICY IF EXISTS "nfc_configs_update" ON public.nfc_configs;
DROP POLICY IF EXISTS "nfc_blocks_select" ON public.nfc_blocks;
DROP POLICY IF EXISTS "nfc_blocks_insert" ON public.nfc_blocks;
DROP POLICY IF EXISTS "nfc_scans_select" ON public.nfc_scans;
DROP POLICY IF EXISTS "nfc_scans_insert" ON public.nfc_scans;
DROP POLICY IF EXISTS "orders_select" ON public.orders;
DROP POLICY IF EXISTS "orders_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_update" ON public.orders;
DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;

-- nfc_configs: anon darf nur INSERT; Admin SELECT
CREATE POLICY "nfc_configs_insert_anon"
  ON public.nfc_configs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "nfc_configs_select_admin"
  ON public.nfc_configs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- nfc_blocks: anon INSERT; Admin SELECT
CREATE POLICY "nfc_blocks_insert_anon"
  ON public.nfc_blocks FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "nfc_blocks_select_admin"
  ON public.nfc_blocks FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- nfc_scans: anon INSERT; Admin SELECT
CREATE POLICY "nfc_scans_insert_anon"
  ON public.nfc_scans FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "nfc_scans_select_admin"
  ON public.nfc_scans FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- orders: nur Admin
CREATE POLICY "orders_select_admin"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "orders_insert_admin"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "orders_update_admin"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- admin_users: nur Admins dürfen die Liste sehen (Verwaltung über SQL Editor / service role)
CREATE POLICY "admin_users_select_admin"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 5. Storage-Bucket „nudaim“
-- ------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('nudaim', 'nudaim', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "nudaim_upload" ON storage.objects;
DROP POLICY IF EXISTS "nudaim_public_read" ON storage.objects;
DROP POLICY IF EXISTS "nudaim_update" ON storage.objects;

CREATE POLICY "nudaim_upload" ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'nudaim');

CREATE POLICY "nudaim_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'nudaim');

-- Upsert für STL/Screenshots
CREATE POLICY "nudaim_update" ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'nudaim')
  WITH CHECK (bucket_id = 'nudaim');

-- 6. Ersten Admin eintragen (nach Auth-User-Anlage anpassen)
-- ------------------------------------------------------------
-- INSERT INTO public.admin_users (email) VALUES ('dein-admin@example.com')
--   ON CONFLICT (email) DO NOTHING;
