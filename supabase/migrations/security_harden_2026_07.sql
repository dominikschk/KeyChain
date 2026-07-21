-- Security harden 2026-07: public blocks scrub secretKey, stamp verify RPC,
-- insert_nfc_blocks https image_url (align with replace_nfc_blocks).
-- Im SQL Editor ausführen ODER via supabase db push.

CREATE OR REPLACE FUNCTION public.get_blocks_for_config(p_config_id uuid)
RETURNS SETOF public.nfc_blocks
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.config_id,
    b.type,
    b.title,
    b.content,
    b.button_type,
    b.image_url,
    CASE
      WHEN b.settings IS NULL THEN NULL
      ELSE (b.settings - 'secretKey')
    END AS settings,
    b.sort_order
  FROM public.nfc_blocks b
  WHERE b.config_id = p_config_id
  ORDER BY b.sort_order ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_blocks_for_owner(
  p_config_id uuid,
  p_write_token text
)
RETURNS SETOF public.nfc_blocks
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_write_token IS NULL OR length(trim(p_write_token)) < 32 THEN
    RAISE EXCEPTION 'write_token required';
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
  RETURN QUERY
    SELECT b.*
    FROM public.nfc_blocks b
    WHERE b.config_id = p_config_id
    ORDER BY b.sort_order ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_nfc_stamp(
  p_config_id uuid,
  p_block_id uuid,
  p_candidate text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_recent integer;
BEGIN
  IF p_candidate IS NULL OR length(trim(p_candidate)) < 8 OR length(p_candidate) > 128 THEN
    RETURN false;
  END IF;

  SELECT count(*)::integer INTO v_recent
  FROM public.nfc_scans
  WHERE config_id = p_config_id
    AND scanned_at > now() - interval '1 minute';
  IF v_recent > 60 THEN
    RETURN false;
  END IF;

  SELECT nullif(b.settings->>'secretKey', '') INTO v_key
  FROM public.nfc_blocks b
  WHERE b.id = p_block_id
    AND b.config_id = p_config_id
    AND b.button_type = 'stamp_card'
  LIMIT 1;

  IF v_key IS NULL OR length(v_key) < 8 THEN
    RETURN false;
  END IF;

  RETURN (v_key = trim(p_candidate));
END;
$$;

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
  v_image text;
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
    v_image := nullif(left(nullif(elem->>'image_url', ''), 2048), '');
    IF v_image IS NOT NULL AND v_image !~* '^https://' THEN
      RAISE EXCEPTION 'image_url must be https';
    END IF;

    INSERT INTO public.nfc_blocks (
      config_id, type, title, content, button_type, image_url, settings, sort_order
    ) VALUES (
      p_config_id,
      left(coalesce(elem->>'type', 'text'), 64),
      left(nullif(elem->>'title', ''), 200),
      left(nullif(elem->>'content', ''), 5000),
      left(nullif(elem->>'button_type', ''), 64),
      v_image,
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

REVOKE ALL ON FUNCTION public.get_blocks_for_owner(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_nfc_stamp(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_blocks_for_owner(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_nfc_stamp(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_blocks_for_config(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_nfc_blocks(uuid, text, jsonb) TO anon, authenticated;
