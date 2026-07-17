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
  write_token TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bestehende Installationen: Spalte nachziehen
ALTER TABLE public.nfc_configs
  ADD COLUMN IF NOT EXISTS write_token TEXT;

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

-- Längen-Limits (Spam-/Payload-Härtung). NOT VALID: bestehende kurze Short-IDs bleiben lesbar.
DO $$
BEGIN
  ALTER TABLE public.nfc_configs
    DROP CONSTRAINT IF EXISTS nfc_configs_short_id_format;
  ALTER TABLE public.nfc_configs
    ADD CONSTRAINT nfc_configs_short_id_format
    CHECK (short_id ~ '^[A-Z0-9]{12,32}$') NOT VALID;

  ALTER TABLE public.nfc_configs
    DROP CONSTRAINT IF EXISTS nfc_configs_profile_title_len;
  ALTER TABLE public.nfc_configs
    ADD CONSTRAINT nfc_configs_profile_title_len
    CHECK (char_length(profile_title) BETWEEN 1 AND 200) NOT VALID;

  ALTER TABLE public.nfc_blocks
    DROP CONSTRAINT IF EXISTS nfc_blocks_title_len;
  ALTER TABLE public.nfc_blocks
    ADD CONSTRAINT nfc_blocks_title_len
    CHECK (title IS NULL OR char_length(title) <= 200) NOT VALID;

  ALTER TABLE public.nfc_blocks
    DROP CONSTRAINT IF EXISTS nfc_blocks_content_len;
  ALTER TABLE public.nfc_blocks
    ADD CONSTRAINT nfc_blocks_content_len
    CHECK (content IS NULL OR char_length(content) <= 5000) NOT VALID;

  ALTER TABLE public.nfc_blocks
    DROP CONSTRAINT IF EXISTS nfc_blocks_type_len;
  ALTER TABLE public.nfc_blocks
    ADD CONSTRAINT nfc_blocks_type_len
    CHECK (char_length(type) <= 64) NOT VALID;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Constraint setup: %', SQLERRM;
END $$;

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

-- Wichtig: write_token wird NICHT zurückgegeben
CREATE OR REPLACE FUNCTION public.get_config_by_short_id(p_short_id text)
RETURNS TABLE (
  id UUID,
  short_id TEXT,
  profile_title TEXT,
  preview_image TEXT,
  stl_url TEXT,
  header_image_url TEXT,
  profile_logo_url TEXT,
  accent_color TEXT,
  theme TEXT,
  font_style TEXT,
  plate_data JSONB,
  product_type TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.short_id,
    c.profile_title,
    c.preview_image,
    c.stl_url,
    c.header_image_url,
    c.profile_logo_url,
    c.accent_color,
    c.theme,
    c.font_style,
    c.plate_data,
    c.product_type,
    c.created_at
  FROM public.nfc_configs c
  WHERE c.short_id = p_short_id
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

-- STL-URL: nur mit write_token, nur einmal (stl_url IS NULL), nur https
CREATE OR REPLACE FUNCTION public.set_nfc_config_stl_url(
  p_config_id uuid,
  p_stl_url text,
  p_write_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  IF p_write_token IS NULL OR length(trim(p_write_token)) < 32 THEN
    RAISE EXCEPTION 'write_token required';
  END IF;
  IF p_stl_url IS NULL OR length(trim(p_stl_url)) = 0 THEN
    RAISE EXCEPTION 'stl_url required';
  END IF;
  IF p_stl_url !~* '^https://' THEN
    RAISE EXCEPTION 'stl_url must be https';
  END IF;
  IF length(p_stl_url) > 2048 THEN
    RAISE EXCEPTION 'stl_url too long';
  END IF;

  UPDATE public.nfc_configs
  SET stl_url = p_stl_url
  WHERE id = p_config_id
    AND write_token IS NOT NULL
    AND write_token = p_write_token
    AND stl_url IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count = 0 THEN
    RAISE EXCEPTION 'not allowed or already set';
  END IF;
END;
$$;

-- Blöcke: nur mit write_token, nur einmal (keine nachträgliche Fremd-Injection)
CREATE OR REPLACE FUNCTION public.insert_nfc_blocks(
  p_config_id uuid,
  p_write_token text,
  p_blocks jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  block_count integer;
  elem jsonb;
  i integer := 0;
BEGIN
  IF p_write_token IS NULL OR length(trim(p_write_token)) < 32 THEN
    RAISE EXCEPTION 'write_token required';
  END IF;
  IF p_blocks IS NULL OR jsonb_typeof(p_blocks) <> 'array' THEN
    RAISE EXCEPTION 'blocks must be a json array';
  END IF;
  IF jsonb_array_length(p_blocks) > 40 THEN
    RAISE EXCEPTION 'too many blocks';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.nfc_configs c
    WHERE c.id = p_config_id
      AND c.write_token IS NOT NULL
      AND c.write_token = p_write_token
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT count(*)::integer INTO block_count
  FROM public.nfc_blocks
  WHERE config_id = p_config_id;

  IF block_count > 0 THEN
    RAISE EXCEPTION 'blocks already set';
  END IF;

  FOR elem IN SELECT value FROM jsonb_array_elements(p_blocks)
  LOOP
    INSERT INTO public.nfc_blocks (
      config_id, type, title, content, button_type, image_url, settings, sort_order
    ) VALUES (
      p_config_id,
      left(coalesce(elem->>'type', 'text'), 64),
      left(nullif(elem->>'title', ''), 200),
      left(nullif(elem->>'content', ''), 5000),
      left(nullif(elem->>'button_type', ''), 64),
      left(nullif(elem->>'image_url', ''), 2048),
      CASE
        WHEN elem->'settings' IS NULL OR jsonb_typeof(elem->'settings') = 'null' THEN NULL
        ELSE elem->'settings'
      END,
      i
    );
    i := i + 1;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.get_config_by_short_id(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_blocks_for_config(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_scan_count(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_scan_count_last_30_days(uuid) FROM PUBLIC;
-- Alte 2-Argument-Signatur entfernen (war ungeschützt)
DROP FUNCTION IF EXISTS public.set_nfc_config_stl_url(uuid, text);
REVOKE ALL ON FUNCTION public.set_nfc_config_stl_url(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.insert_nfc_blocks(uuid, text, jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_config_by_short_id(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_blocks_for_config(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_scan_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_scan_count_last_30_days(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_nfc_config_stl_url(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_nfc_blocks(uuid, text, jsonb) TO anon, authenticated;

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
DROP POLICY IF EXISTS "nfc_configs_insert_anon" ON public.nfc_configs;
DROP POLICY IF EXISTS "nfc_configs_select_admin" ON public.nfc_configs;
DROP POLICY IF EXISTS "nfc_blocks_select" ON public.nfc_blocks;
DROP POLICY IF EXISTS "nfc_blocks_insert" ON public.nfc_blocks;
DROP POLICY IF EXISTS "nfc_blocks_insert_anon" ON public.nfc_blocks;
DROP POLICY IF EXISTS "nfc_blocks_select_admin" ON public.nfc_blocks;
DROP POLICY IF EXISTS "nfc_scans_select" ON public.nfc_scans;
DROP POLICY IF EXISTS "nfc_scans_insert" ON public.nfc_scans;
DROP POLICY IF EXISTS "nfc_scans_insert_anon" ON public.nfc_scans;
DROP POLICY IF EXISTS "nfc_scans_select_admin" ON public.nfc_scans;
DROP POLICY IF EXISTS "orders_select" ON public.orders;
DROP POLICY IF EXISTS "orders_insert" ON public.orders;
DROP POLICY IF EXISTS "orders_update" ON public.orders;
DROP POLICY IF EXISTS "orders_select_admin" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_admin" ON public.orders;
DROP POLICY IF EXISTS "orders_update_admin" ON public.orders;
DROP POLICY IF EXISTS "admin_users_select" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_select_admin" ON public.admin_users;

-- nfc_configs: anon INSERT nur mit gültigem short_id + write_token; Admin SELECT
CREATE POLICY "nfc_configs_insert_anon"
  ON public.nfc_configs FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    short_id ~ '^[A-Z0-9]{12,32}$'
    AND write_token IS NOT NULL
    AND char_length(write_token) >= 32
    AND char_length(profile_title) BETWEEN 1 AND 200
  );

CREATE POLICY "nfc_configs_select_admin"
  ON public.nfc_configs FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "nfc_blocks_insert_anon" ON public.nfc_blocks;
DROP POLICY IF EXISTS "nfc_blocks_select_admin" ON public.nfc_blocks;

-- nfc_blocks: kein direktes anon INSERT mehr (nur RPC insert_nfc_blocks + write_token)
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
DROP POLICY IF EXISTS "Allow Upload" ON storage.objects;

-- Nur INSERT, keine UPDATE/DELETE für anon (kein Datei-Overwrite)
CREATE POLICY "nudaim_upload" ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'nudaim'
    AND lower(coalesce(storage.extension(name), '')) = ANY (
      ARRAY['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'stl']
    )
  );

CREATE POLICY "nudaim_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'nudaim');

-- 6. Ersten Admin eintragen (nach Auth-User-Anlage anpassen)
-- ------------------------------------------------------------
-- INSERT INTO public.admin_users (email) VALUES ('dein-admin@example.com')
--   ON CONFLICT (email) DO NOTHING;
