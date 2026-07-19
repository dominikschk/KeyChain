-- ------------------------------------------------------------
-- Q1 2026: Shopify Order-Sync + Scan Rate-Limit
-- ------------------------------------------------------------

-- Eine Shopify-Order kann mehrere NUDAIM-Configs haben → Unique (shopify_order_id, short_id)
DROP INDEX IF EXISTS idx_orders_shopify_order_id_unique;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_shopify_order_id_key;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_shopify_short_unique;
DO $$
BEGIN
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_shopify_short_unique UNIQUE (shopify_order_id, short_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN
    RAISE NOTICE 'orders_shopify_short_unique: %', SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION public.upsert_order_from_shopify(
  p_shopify_order_id text,
  p_order_number text,
  p_short_id text,
  p_status text DEFAULT 'paid'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config_id uuid;
  v_order_id uuid;
  v_status text;
BEGIN
  IF p_shopify_order_id IS NULL OR length(trim(p_shopify_order_id)) = 0 THEN
    RAISE EXCEPTION 'shopify_order_id required';
  END IF;
  IF p_short_id IS NULL OR p_short_id !~ '^[A-Z0-9]{12,32}$' THEN
    RAISE EXCEPTION 'invalid short_id';
  END IF;

  v_status := lower(coalesce(nullif(trim(p_status), ''), 'paid'));
  IF v_status NOT IN ('pending', 'paid', 'in_production', 'shipped', 'delivered', 'cancelled') THEN
    v_status := 'paid';
  END IF;

  SELECT id INTO v_config_id
  FROM public.nfc_configs
  WHERE short_id = p_short_id
  LIMIT 1;

  INSERT INTO public.orders (
    shopify_order_id,
    order_number,
    short_id,
    config_id,
    status,
    updated_at
  )
  VALUES (
    trim(p_shopify_order_id),
    nullif(trim(coalesce(p_order_number, '')), ''),
    p_short_id,
    v_config_id,
    v_status,
    now()
  )
  ON CONFLICT (shopify_order_id, short_id)
  DO UPDATE SET
    order_number = COALESCE(EXCLUDED.order_number, public.orders.order_number),
    config_id = COALESCE(EXCLUDED.config_id, public.orders.config_id),
    status = CASE
      WHEN public.orders.status IN ('in_production', 'shipped', 'delivered')
        AND EXCLUDED.status IN ('pending', 'paid')
      THEN public.orders.status
      ELSE EXCLUDED.status
    END,
    updated_at = now()
  RETURNING id INTO v_order_id;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_order_from_shopify(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_order_from_shopify(text, text, text, text) TO service_role;

-- Scan-Flooding: max. 20 Inserts / config / Minute (nur via RPC)
CREATE OR REPLACE FUNCTION public.record_nfc_scan(p_config_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count bigint;
BEGIN
  IF p_config_id IS NULL THEN
    RETURN false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.nfc_configs WHERE id = p_config_id) THEN
    RETURN false;
  END IF;

  SELECT count(*)::bigint INTO recent_count
  FROM public.nfc_scans
  WHERE config_id = p_config_id
    AND scanned_at >= (now() - interval '1 minute');

  IF recent_count >= 20 THEN
    RETURN false;
  END IF;

  INSERT INTO public.nfc_scans (config_id) VALUES (p_config_id);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.record_nfc_scan(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_nfc_scan(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "nfc_scans_insert_anon" ON public.nfc_scans;

-- ------------------------------------------------------------
-- Q2 2026: Print-QC auf orders
-- ------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS print_qc_status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS print_qc_note TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS print_qc_at TIMESTAMPTZ;

DO $$
BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_print_qc_status_check;
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_print_qc_status_check
    CHECK (print_qc_status IS NULL OR print_qc_status IN ('pending', 'approved', 'rejected'));
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'print_qc constraint: %', SQLERRM;
END $$;

UPDATE public.orders SET print_qc_status = 'pending' WHERE print_qc_status IS NULL;
