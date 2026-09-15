-- Auto-Druck: Status nach QC-Freigabe (Webhook / Druckerei-Mail)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS print_dispatch_status TEXT DEFAULT 'idle';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS print_dispatch_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS print_dispatch_note TEXT;

DO $$
BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_print_dispatch_status_check;
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_print_dispatch_status_check
    CHECK (
      print_dispatch_status IS NULL
      OR print_dispatch_status IN ('idle', 'dispatched', 'failed', 'skipped')
    );
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'print_dispatch constraint: %', SQLERRM;
END $$;

UPDATE public.orders
SET print_dispatch_status = 'idle'
WHERE print_dispatch_status IS NULL;
