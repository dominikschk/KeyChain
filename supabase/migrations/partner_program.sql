-- ============================================================
-- Partner- / Vertriebsprogramm (Pilot)
-- Im Supabase SQL Editor ausführen. RLS: Partner sehen nur eigene Daten;
-- Admins über public.is_admin().
-- ============================================================

-- Programm-Konfiguration (eine Zeile)
CREATE TABLE IF NOT EXISTS public.partner_program_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  example_commission_per_piece_cents INTEGER NOT NULL DEFAULT 30,
  confirmed_commission_per_piece_cents INTEGER,
  confirmed_commission_label TEXT NOT NULL DEFAULT 'Noch nicht verbindlich festgelegt',
  price_tiers_text TEXT NOT NULL DEFAULT '',
  shipping_note TEXT NOT NULL DEFAULT '',
  branding_cost_note TEXT NOT NULL DEFAULT '',
  terms_markdown TEXT NOT NULL DEFAULT '',
  payout_rules_markdown TEXT NOT NULL DEFAULT '',
  attribution_rules_markdown TEXT NOT NULL DEFAULT '',
  email_configured BOOLEAN NOT NULL DEFAULT false,
  pilot_note TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.partner_program_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  partner_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'paused', 'closed')),
  region TEXT,
  is_minor BOOLEAN NOT NULL DEFAULT false,
  guardian_consent_confirmed BOOLEAN NOT NULL DEFAULT false,
  marketing_email_opt_in BOOLEAN NOT NULL DEFAULT false,
  onboarding_step INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  level_id TEXT NOT NULL DEFAULT 'starter'
    CHECK (level_id IN ('starter', 'advanced', 'partner')),
  deletion_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT partners_email_len CHECK (char_length(email) BETWEEN 3 AND 320),
  CONSTRAINT partners_name_len CHECK (char_length(display_name) BETWEEN 1 AND 120)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_email_lower ON public.partners (lower(email));
CREATE INDEX IF NOT EXISTS idx_partners_auth_user ON public.partners (auth_user_id);

CREATE TABLE IF NOT EXISTS public.partner_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  kind TEXT NOT NULL
    CHECK (kind IN ('terms', 'privacy', 'marketing_email', 'guardian', 'data_processing_lead')),
  granted BOOLEAN NOT NULL DEFAULT false,
  text_version TEXT NOT NULL,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  business_email TEXT,
  business_phone TEXT,
  source TEXT NOT NULL DEFAULT '',
  estimated_qty INTEGER,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN (
      'draft', 'submitted', 'review', 'contacted', 'offer_created',
      'ordered', 'paid', 'rejected', 'cancelled'
    )),
  consent_basis TEXT NOT NULL,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT partner_leads_company_len CHECK (char_length(company_name) BETWEEN 2 AND 200)
);

CREATE INDEX IF NOT EXISTS idx_partner_leads_partner ON public.partner_leads (partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_leads_status ON public.partner_leads (status);

CREATE TABLE IF NOT EXISTS public.partner_lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.partner_leads(id) ON DELETE CASCADE,
  actor TEXT NOT NULL CHECK (actor IN ('partner', 'admin', 'system')),
  from_status TEXT,
  to_status TEXT,
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.partner_leads(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.partner_leads(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES public.partner_offers(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  external_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.partner_orders(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.partner_leads(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'reversed', 'paid_out')),
  note TEXT NOT NULL DEFAULT '',
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'processing', 'paid', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.partner_learning_modules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  points INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.partner_learning_levels (
  id TEXT PRIMARY KEY CHECK (id IN ('starter', 'advanced', 'partner')),
  title TEXT NOT NULL,
  min_points INTEGER NOT NULL DEFAULT 0,
  benefits TEXT NOT NULL DEFAULT '',
  higher_commission_enabled BOOLEAN NOT NULL DEFAULT false,
  higher_commission_note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.partner_learning_progress (
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL REFERENCES public.partner_learning_modules(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_id, module_id)
);

CREATE TABLE IF NOT EXISTS public.partner_materials (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  url TEXT,
  available BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_setup_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  preferred_slot TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  is_minor BOOLEAN NOT NULL DEFAULT false,
  guardian_consent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'confirmed', 'declined', 'done')),
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  template_key TEXT NOT NULL,
  to_email TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('transactional', 'marketing')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'skipped', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Module / Levels / Materials (idempotent)
INSERT INTO public.partner_learning_modules (id, title, description, points, sort_order, active) VALUES
  ('mod-product', 'Produktschulung', 'Wie der NFC-Anhänger funktioniert.', 20, 1, true),
  ('mod-demo', 'Demo ansehen', 'Beispiel-Demo durchspielen.', 10, 2, true),
  ('mod-safety', 'Sicher und fair verkaufen', 'Regeln für respektvolle Ansprache.', 20, 3, true),
  ('mod-scripts', 'Gesprächsleitfaden', 'Einen Leitfaden lesen.', 15, 4, true),
  ('mod-materials', 'Materialien herunterladen', 'Unterlagen ansehen.', 10, 5, true),
  ('mod-setup-call', 'Setup-Call angefragt', 'Terminwunsch stellen.', 15, 6, true),
  ('mod-first-lead', 'Erster qualifizierter Lead', 'Zulässig eingereichten Lead eintragen.', 25, 7, true),
  ('mod-feedback', 'Rückmeldung zu Materialien', 'Kurzes Feedback geben.', 10, 8, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.partner_learning_levels (id, title, min_points, benefits, higher_commission_enabled, higher_commission_note) VALUES
  ('starter', 'Starter', 0, 'Zugang zu Demo, Leitfäden und Lead-Erfassung.', false, ''),
  ('advanced', 'Fortgeschritten', 50, 'Mehr Lernmodule; Vorteile nur laut Admin-Konfiguration.', false, 'Kein automatischer Provisionsvorteil.'),
  ('partner', 'Partner', 100, 'Volle Materialbibliothek und Pilot-Feedbackkanal.', false, 'Höhere Provision nur wenn eingerichtet.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.partner_materials (id, title, description, category, url, available, sort_order) VALUES
  ('mat-product-sheet', 'Produktblatt (PDF)', 'Kurze Produktübersicht.', 'Produkt', NULL, false, 1),
  ('mat-pitch-deck', 'Kurze Firmenpräsentation', 'Folien für Vorstellung.', 'Produkt', NULL, false, 2),
  ('mat-demo-video', 'Demovideo', 'Antippen → Seite öffnet sich.', 'Demo', NULL, false, 3),
  ('mat-script-pizza', 'Gesprächsleitfaden Pizzerien', 'Höfliche Einstiege.', 'Leitfaden', NULL, false, 4),
  ('mat-script-auto', 'Gesprächsleitfaden Autohäuser', 'Gesprächseinstiege.', 'Leitfaden', NULL, false, 5),
  ('mat-script-messe', 'Gesprächsleitfaden Messeaussteller', 'Gesprächseinstiege.', 'Leitfaden', NULL, false, 6),
  ('mat-email-template', 'Vorlage personalisierte E-Mail', 'Digitale Erstansprache.', 'Vorlagen', NULL, false, 7),
  ('mat-faq-business', 'FAQ für Unternehmen', 'Häufige Fragen.', 'Vorlagen', NULL, false, 8),
  ('mat-pricing', 'Preis- und Mengenstaffeln', 'Freigegebene Staffeln.', 'Preise', NULL, false, 9),
  ('mat-order-template', 'Musterbestellung / Angebotsanfrage', 'Vorlage für Betriebe.', 'Vorlagen', NULL, false, 10),
  ('mat-photos', 'Bildmaterial und Produktfotos', 'Offizielle Produktfotos.', 'Bilder', '/keychain-base.png', true, 11)
ON CONFLICT (id) DO NOTHING;

-- Hilfsfunktion: aktueller Partner
CREATE OR REPLACE FUNCTION public.current_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.partners p
  WHERE p.auth_user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_partner_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_partner_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.register_partner_profile(
  p_display_name text,
  p_marketing_opt_in boolean,
  p_is_minor boolean,
  p_guardian_consent boolean
)
RETURNS public.partners
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_code text;
  v_row public.partners;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF v_email = '' THEN
    RAISE EXCEPTION 'email missing';
  END IF;
  v_code := 'NP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  INSERT INTO public.partners (
    auth_user_id, email, display_name, partner_code,
    marketing_email_opt_in, is_minor, guardian_consent_confirmed
  ) VALUES (
    auth.uid(), v_email, left(trim(p_display_name), 120), v_code,
    coalesce(p_marketing_opt_in, false),
    coalesce(p_is_minor, false),
    CASE WHEN coalesce(p_is_minor, false) THEN coalesce(p_guardian_consent, false) ELSE false END
  )
  ON CONFLICT (auth_user_id) DO UPDATE
    SET display_name = excluded.display_name,
        updated_at = now()
  RETURNING * INTO v_row;

  INSERT INTO public.partner_consents (partner_id, kind, granted, text_version, granted_at)
  VALUES
    (v_row.id, 'terms', true, 'partner-v1-2026-11', now()),
    (v_row.id, 'privacy', true, 'partner-v1-2026-11', now()),
    (v_row.id, 'marketing_email', coalesce(p_marketing_opt_in, false), 'partner-v1-2026-11',
      CASE WHEN coalesce(p_marketing_opt_in, false) THEN now() ELSE NULL END),
    (v_row.id, 'guardian',
      CASE WHEN coalesce(p_is_minor, false) THEN coalesce(p_guardian_consent, false) ELSE false END,
      'partner-v1-2026-11',
      CASE WHEN coalesce(p_is_minor, false) AND coalesce(p_guardian_consent, false) THEN now() ELSE NULL END);
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.register_partner_profile(text, boolean, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_partner_profile(text, boolean, boolean, boolean) TO authenticated;

-- RLS
ALTER TABLE public.partner_program_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_learning_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_setup_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_admin_actions ENABLE ROW LEVEL SECURITY;

-- Config: öffentlich lesbar (nur Beispielwerte), Schreibzugriff Admin
DROP POLICY IF EXISTS partner_config_select ON public.partner_program_config;
CREATE POLICY partner_config_select ON public.partner_program_config
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS partner_config_admin ON public.partner_program_config;
CREATE POLICY partner_config_admin ON public.partner_program_config
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS partners_select_own ON public.partners;
CREATE POLICY partners_select_own ON public.partners
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS partners_update_own ON public.partners;
CREATE POLICY partners_update_own ON public.partners
  FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid() OR public.is_admin())
  WITH CHECK (auth_user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS partners_insert_own ON public.partners;
CREATE POLICY partners_insert_own ON public.partners
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS partner_consents_own ON public.partner_consents;
CREATE POLICY partner_consents_own ON public.partner_consents
  FOR ALL TO authenticated
  USING (partner_id = public.current_partner_id() OR public.is_admin())
  WITH CHECK (partner_id = public.current_partner_id() OR public.is_admin());

DROP POLICY IF EXISTS partner_leads_own ON public.partner_leads;
CREATE POLICY partner_leads_own ON public.partner_leads
  FOR ALL TO authenticated
  USING (partner_id = public.current_partner_id() OR public.is_admin())
  WITH CHECK (partner_id = public.current_partner_id() OR public.is_admin());

DROP POLICY IF EXISTS partner_lead_act_own ON public.partner_lead_activities;
CREATE POLICY partner_lead_act_own ON public.partner_lead_activities
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.partner_leads l
      WHERE l.id = lead_id AND l.partner_id = public.current_partner_id()
    )
  );

DROP POLICY IF EXISTS partner_offers_own ON public.partner_offers;
CREATE POLICY partner_offers_own ON public.partner_offers
  FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id() OR public.is_admin());

DROP POLICY IF EXISTS partner_orders_own ON public.partner_orders;
CREATE POLICY partner_orders_own ON public.partner_orders
  FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id() OR public.is_admin());

DROP POLICY IF EXISTS partner_commissions_own ON public.partner_commissions;
CREATE POLICY partner_commissions_own ON public.partner_commissions
  FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id() OR public.is_admin());
DROP POLICY IF EXISTS partner_commissions_admin ON public.partner_commissions;
CREATE POLICY partner_commissions_admin ON public.partner_commissions
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS partner_payouts_own ON public.partner_payouts;
CREATE POLICY partner_payouts_own ON public.partner_payouts
  FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id() OR public.is_admin());
DROP POLICY IF EXISTS partner_payouts_admin ON public.partner_payouts;
CREATE POLICY partner_payouts_admin ON public.partner_payouts
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS partner_modules_read ON public.partner_learning_modules;
CREATE POLICY partner_modules_read ON public.partner_learning_modules
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS partner_modules_admin ON public.partner_learning_modules;
CREATE POLICY partner_modules_admin ON public.partner_learning_modules
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS partner_levels_read ON public.partner_learning_levels;
CREATE POLICY partner_levels_read ON public.partner_learning_levels
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS partner_levels_admin ON public.partner_learning_levels;
CREATE POLICY partner_levels_admin ON public.partner_learning_levels
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS partner_progress_own ON public.partner_learning_progress;
CREATE POLICY partner_progress_own ON public.partner_learning_progress
  FOR ALL TO authenticated
  USING (partner_id = public.current_partner_id() OR public.is_admin())
  WITH CHECK (partner_id = public.current_partner_id() OR public.is_admin());

DROP POLICY IF EXISTS partner_materials_read ON public.partner_materials;
CREATE POLICY partner_materials_read ON public.partner_materials
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS partner_materials_admin ON public.partner_materials;
CREATE POLICY partner_materials_admin ON public.partner_materials
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS partner_setup_insert ON public.partner_setup_calls;
CREATE POLICY partner_setup_insert ON public.partner_setup_calls
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS partner_setup_select ON public.partner_setup_calls;
CREATE POLICY partner_setup_select ON public.partner_setup_calls
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR partner_id = public.current_partner_id()
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
DROP POLICY IF EXISTS partner_setup_admin ON public.partner_setup_calls;
CREATE POLICY partner_setup_admin ON public.partner_setup_calls
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS partner_email_admin ON public.partner_email_logs;
CREATE POLICY partner_email_admin ON public.partner_email_logs
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS partner_email_own ON public.partner_email_logs;
CREATE POLICY partner_email_own ON public.partner_email_logs
  FOR SELECT TO authenticated
  USING (partner_id = public.current_partner_id() OR public.is_admin());

DROP POLICY IF EXISTS partner_admin_actions_admin ON public.partner_admin_actions;
CREATE POLICY partner_admin_actions_admin ON public.partner_admin_actions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
