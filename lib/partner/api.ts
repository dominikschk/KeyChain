/**
 * Partner-API: nutzt Supabase wenn Tabellen/Auth verfügbar, sonst Demo-LocalStore.
 */
import { supabase } from '../supabase';
import {
  addLeadLocal,
  completeModuleLocal,
  createSetupCallLocal,
  getProgramConfigLocal,
  getSessionPartnerLocal,
  listAllLeadsLocal,
  listLeadsForPartnerLocal,
  listPartnersLocal,
  loginPartnerLocal,
  logoutPartnerLocal,
  partnerDashboardStatsLocal,
  readPartnerStore,
  registerPartnerLocal,
  setLeadStatusLocal,
  setProgramConfigLocal,
  updatePartnerLocal,
  writePartnerStore,
} from './localStore';
import type {
  DownloadMaterial,
  LearningModule,
  PartnerLead,
  PartnerProfile,
  PartnerProgramConfig,
  SetupCallRequest,
} from './types';

export type PartnerBackendMode = 'supabase' | 'demo';

let cachedMode: PartnerBackendMode | null = null;

/** Prüft einmalig, ob Partner-Tabellen erreichbar sind. */
export async function detectPartnerBackend(): Promise<PartnerBackendMode> {
  if (cachedMode) return cachedMode;
  if (!supabase) {
    cachedMode = 'demo';
    return cachedMode;
  }
  try {
    const { error } = await supabase.from('partner_program_config').select('id').limit(1);
    if (error) {
      cachedMode = 'demo';
      return cachedMode;
    }
    cachedMode = 'supabase';
    return cachedMode;
  } catch {
    cachedMode = 'demo';
    return cachedMode;
  }
}

export function getCachedPartnerBackend(): PartnerBackendMode {
  return cachedMode ?? 'demo';
}

export function resetPartnerBackendCache(): void {
  cachedMode = null;
}

export async function getProgramConfig(): Promise<PartnerProgramConfig> {
  const mode = await detectPartnerBackend();
  if (mode === 'demo' || !supabase) return getProgramConfigLocal();
  const { data, error } = await supabase.from('partner_program_config').select('*').limit(1).maybeSingle();
  if (error || !data) return getProgramConfigLocal();
  return mapConfigRow(data);
}

export async function saveProgramConfig(
  patch: Partial<PartnerProgramConfig>
): Promise<PartnerProgramConfig> {
  const mode = await detectPartnerBackend();
  if (mode === 'demo' || !supabase) return setProgramConfigLocal(patch);
  const current = await getProgramConfig();
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  const { error } = await supabase.from('partner_program_config').upsert({
    id: 1,
    example_commission_per_piece_cents: next.exampleCommissionPerPieceCents,
    confirmed_commission_per_piece_cents: next.confirmedCommissionPerPieceCents,
    confirmed_commission_label: next.confirmedCommissionLabel,
    price_tiers_text: next.priceTiersText,
    shipping_note: next.shippingNote,
    branding_cost_note: next.brandingCostNote,
    terms_markdown: next.termsMarkdown,
    payout_rules_markdown: next.payoutRulesMarkdown,
    attribution_rules_markdown: next.attributionRulesMarkdown,
    email_configured: next.emailConfigured,
    pilot_note: next.pilotNote,
    updated_at: next.updatedAt,
  });
  if (error) {
    return setProgramConfigLocal(patch);
  }
  return next;
}

function mapConfigRow(data: Record<string, unknown>): PartnerProgramConfig {
  return {
    exampleCommissionPerPieceCents: Number(data.example_commission_per_piece_cents ?? 30),
    confirmedCommissionPerPieceCents:
      data.confirmed_commission_per_piece_cents == null
        ? null
        : Number(data.confirmed_commission_per_piece_cents),
    confirmedCommissionLabel: String(data.confirmed_commission_label ?? ''),
    priceTiersText: String(data.price_tiers_text ?? ''),
    shippingNote: String(data.shipping_note ?? ''),
    brandingCostNote: String(data.branding_cost_note ?? ''),
    termsMarkdown: String(data.terms_markdown ?? ''),
    payoutRulesMarkdown: String(data.payout_rules_markdown ?? ''),
    attributionRulesMarkdown: String(data.attribution_rules_markdown ?? ''),
    emailConfigured: Boolean(data.email_configured),
    pilotNote: String(data.pilot_note ?? ''),
    updatedAt: String(data.updated_at ?? new Date().toISOString()),
  };
}

export async function registerPartner(input: {
  name: string;
  email: string;
  password: string;
  marketingOptIn: boolean;
  isMinor: boolean;
  guardianConsent: boolean;
}): Promise<{ partner: PartnerProfile | null; error: string | null; mode: PartnerBackendMode }> {
  const mode = await detectPartnerBackend();
  if (mode === 'demo' || !supabase) {
    const res = registerPartnerLocal(input);
    return { ...res, mode: 'demo' };
  }
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        full_name: input.name.trim(),
        role: 'partner',
      },
    },
  });
  if (authError) {
    return { partner: null, error: authError.message, mode };
  }
  const userId = authData.user?.id;
  if (!userId) {
    return {
      partner: null,
      error: 'Registrierung gestartet – bitte E-Mail bestätigen, falls aktiviert.',
      mode,
    };
  }
  const { data, error } = await supabase.rpc('register_partner_profile', {
    p_display_name: input.name.trim(),
    p_marketing_opt_in: input.marketingOptIn,
    p_is_minor: input.isMinor,
    p_guardian_consent: input.guardianConsent,
  });
  if (error) {
    // Fallback: Profilzeile manuell
    const code = `NP-${userId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    const { data: row, error: insErr } = await supabase
      .from('partners')
      .insert({
        auth_user_id: userId,
        email: input.email.trim().toLowerCase(),
        display_name: input.name.trim(),
        partner_code: code,
        marketing_email_opt_in: input.marketingOptIn,
        is_minor: input.isMinor,
        guardian_consent_confirmed: input.isMinor ? input.guardianConsent : false,
      })
      .select('*')
      .single();
    if (insErr || !row) {
      return { partner: null, error: insErr?.message ?? 'Profil konnte nicht angelegt werden.', mode };
    }
    return { partner: mapPartnerRow(row), error: null, mode };
  }
  return { partner: mapPartnerRow(data), error: null, mode };
}

export async function loginPartner(
  email: string,
  password: string
): Promise<{ partner: PartnerProfile | null; error: string | null; mode: PartnerBackendMode }> {
  const mode = await detectPartnerBackend();
  if (mode === 'demo' || !supabase) {
    const res = loginPartnerLocal(email, password);
    return { ...res, mode: 'demo' };
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) return { partner: null, error: error.message || 'Anmeldung fehlgeschlagen.', mode };
  const partner = await getCurrentPartner();
  if (!partner) {
    await supabase.auth.signOut();
    return { partner: null, error: 'Kein Partnerprofil für dieses Konto.', mode };
  }
  return { partner, error: null, mode };
}

export async function logoutPartner(): Promise<void> {
  const mode = await detectPartnerBackend();
  if (mode === 'demo' || !supabase) {
    logoutPartnerLocal();
    return;
  }
  await supabase.auth.signOut();
}

export async function getCurrentPartner(): Promise<PartnerProfile | null> {
  const mode = await detectPartnerBackend();
  if (mode === 'demo' || !supabase) return getSessionPartnerLocal();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('auth_user_id', sessionData.session.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return mapPartnerRow(data);
}

function mapPartnerRow(row: Record<string, unknown>): PartnerProfile {
  return {
    id: String(row.id),
    authUserId: row.auth_user_id ? String(row.auth_user_id) : null,
    email: String(row.email),
    displayName: String(row.display_name),
    partnerCode: String(row.partner_code),
    status: (row.status as PartnerProfile['status']) || 'active',
    region: row.region ? String(row.region) : null,
    isMinor: Boolean(row.is_minor),
    guardianConsentConfirmed: Boolean(row.guardian_consent_confirmed),
    marketingEmailOptIn: Boolean(row.marketing_email_opt_in),
    onboardingStep: Number(row.onboarding_step ?? 0),
    points: Number(row.points ?? 0),
    levelId: (row.level_id as PartnerProfile['levelId']) || 'starter',
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletionRequestedAt: row.deletion_requested_at
      ? String(row.deletion_requested_at)
      : null,
  };
}

export async function updatePartnerProfile(
  partnerId: string,
  patch: Partial<PartnerProfile>
): Promise<PartnerProfile | null> {
  const mode = await detectPartnerBackend();
  if (mode === 'demo' || !supabase) return updatePartnerLocal(partnerId, patch);
  const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.displayName != null) body.display_name = patch.displayName;
  if (patch.onboardingStep != null) body.onboarding_step = patch.onboardingStep;
  if (patch.marketingEmailOptIn != null) body.marketing_email_opt_in = patch.marketingEmailOptIn;
  if (patch.deletionRequestedAt != null) body.deletion_requested_at = patch.deletionRequestedAt;
  if (patch.isMinor != null) body.is_minor = patch.isMinor;
  if (patch.guardianConsentConfirmed != null) {
    body.guardian_consent_confirmed = patch.guardianConsentConfirmed;
  }
  const { data, error } = await supabase
    .from('partners')
    .update(body)
    .eq('id', partnerId)
    .select('*')
    .single();
  if (error || !data) return null;
  return mapPartnerRow(data);
}

export async function createLead(
  partnerId: string,
  input: {
    companyName: string;
    contactName?: string;
    businessEmail?: string;
    businessPhone?: string;
    source: string;
    estimatedQty?: number | null;
    note?: string;
    consentBasis: string;
    status?: PartnerLead['status'];
  }
): Promise<PartnerLead> {
  const mode = await detectPartnerBackend();
  const payload = {
    companyName: input.companyName,
    contactName: input.contactName ?? null,
    businessEmail: input.businessEmail ?? null,
    businessPhone: input.businessPhone ?? null,
    source: input.source,
    estimatedQty: input.estimatedQty ?? null,
    note: input.note?.trim() || '',
    consentBasis: input.consentBasis,
    status: input.status,
  };
  if (mode === 'demo' || !supabase) {
    return addLeadLocal(partnerId, payload);
  }
  const { data, error } = await supabase
    .from('partner_leads')
    .insert({
      partner_id: partnerId,
      company_name: payload.companyName.trim(),
      contact_name: payload.contactName?.trim() || null,
      business_email: payload.businessEmail?.trim() || null,
      business_phone: payload.businessPhone?.trim() || null,
      source: payload.source.trim(),
      estimated_qty: payload.estimatedQty ?? null,
      note: payload.note,
      consent_basis: payload.consentBasis.trim(),
      status: payload.status ?? 'submitted',
    })
    .select('*')
    .single();
  if (error || !data) {
    return addLeadLocal(partnerId, payload);
  }
  return mapLeadRow(data);
}

function mapLeadRow(row: Record<string, unknown>): PartnerLead {
  return {
    id: String(row.id),
    partnerId: String(row.partner_id),
    companyName: String(row.company_name),
    contactName: row.contact_name ? String(row.contact_name) : null,
    businessEmail: row.business_email ? String(row.business_email) : null,
    businessPhone: row.business_phone ? String(row.business_phone) : null,
    source: String(row.source ?? ''),
    estimatedQty: row.estimated_qty == null ? null : Number(row.estimated_qty),
    note: String(row.note ?? ''),
    status: row.status as PartnerLead['status'],
    consentBasis: String(row.consent_basis ?? ''),
    lastActivityAt: String(row.last_activity_at ?? row.updated_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listMyLeads(partnerId: string): Promise<PartnerLead[]> {
  const mode = await detectPartnerBackend();
  if (mode === 'demo' || !supabase) return listLeadsForPartnerLocal(partnerId);
  const { data, error } = await supabase
    .from('partner_leads')
    .select('*')
    .eq('partner_id', partnerId)
    .order('updated_at', { ascending: false });
  if (error || !data) return listLeadsForPartnerLocal(partnerId);
  return data.map(mapLeadRow);
}

export async function adminListPartners(): Promise<PartnerProfile[]> {
  const mode = await detectPartnerBackend();
  if (mode === 'demo' || !supabase) return listPartnersLocal();
  const { data, error } = await supabase.from('partners').select('*').order('created_at', {
    ascending: false,
  });
  if (error || !data) return listPartnersLocal();
  return data.map(mapPartnerRow);
}

export async function adminListLeads(): Promise<PartnerLead[]> {
  const mode = await detectPartnerBackend();
  if (mode === 'demo' || !supabase) return listAllLeadsLocal();
  const { data, error } = await supabase
    .from('partner_leads')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error || !data) return listAllLeadsLocal();
  return data.map(mapLeadRow);
}

export async function adminSetLeadStatus(
  leadId: string,
  status: PartnerLead['status']
): Promise<PartnerLead | null> {
  const mode = await detectPartnerBackend();
  if (mode === 'demo' || !supabase) return setLeadStatusLocal(leadId, status, 'admin');
  const { data, error } = await supabase
    .from('partner_leads')
    .update({ status, updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() })
    .eq('id', leadId)
    .select('*')
    .single();
  if (error || !data) return setLeadStatusLocal(leadId, status, 'admin');
  return mapLeadRow(data);
}

export async function getDashboardStats(partnerId: string) {
  const mode = await detectPartnerBackend();
  if (mode === 'demo' || !supabase) return partnerDashboardStatsLocal(partnerId);
  const leads = await listMyLeads(partnerId);
  const { data: commissions } = await supabase
    .from('partner_commissions')
    .select('*')
    .eq('partner_id', partnerId);
  const list = commissions ?? [];
  const confirmed = list
    .filter((c) => c.status === 'confirmed' || c.status === 'paid_out')
    .reduce((s, c) => s + Number(c.amount_cents || 0), 0);
  const pending = list
    .filter((c) => c.status === 'pending')
    .reduce((s, c) => s + Number(c.amount_cents || 0), 0);
  const partner = await getCurrentPartner();
  return {
    leadsTotal: leads.length,
    leadsByStatus: Object.fromEntries(
      [...new Set(leads.map((l) => l.status))].map((st) => [
        st,
        leads.filter((l) => l.status === st).length,
      ])
    ) as Record<string, number>,
    offersRequested: leads.filter((l) =>
      ['offer_created', 'ordered', 'paid'].includes(l.status)
    ).length,
    paidOrders: leads.filter((l) => l.status === 'paid').length,
    confirmedCommissionCents: confirmed,
    pendingCommissionCents: pending,
    points: partner?.points ?? 0,
    levelId: partner?.levelId ?? 'starter',
    demo: false as const,
  };
}

export async function listMaterials(): Promise<DownloadMaterial[]> {
  const mode = await detectPartnerBackend();
  if (mode === 'demo' || !supabase) return readPartnerStore().materials;
  const { data, error } = await supabase
    .from('partner_materials')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error || !data?.length) return readPartnerStore().materials;
  return data.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    description: String(row.description ?? ''),
    category: String(row.category ?? ''),
    url: row.url ? String(row.url) : null,
    available: Boolean(row.available),
    sortOrder: Number(row.sort_order ?? 0),
    updatedAt: String(row.updated_at),
  }));
}

export async function listModules(): Promise<LearningModule[]> {
  const mode = await detectPartnerBackend();
  if (mode === 'demo' || !supabase) return readPartnerStore().modules;
  const { data, error } = await supabase
    .from('partner_learning_modules')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (error || !data?.length) return readPartnerStore().modules;
  return data.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    description: String(row.description ?? ''),
    points: Number(row.points ?? 0),
    sortOrder: Number(row.sort_order ?? 0),
    active: Boolean(row.active),
  }));
}

export async function completeModule(partnerId: string, moduleId: string) {
  const mode = await detectPartnerBackend();
  if (mode === 'demo' || !supabase) return completeModuleLocal(partnerId, moduleId);
  const { error } = await supabase.from('partner_learning_progress').upsert({
    partner_id: partnerId,
    module_id: moduleId,
    completed_at: new Date().toISOString(),
  });
  if (error) return completeModuleLocal(partnerId, moduleId);
  return getCurrentPartner();
}

export async function createSetupCall(
  input: Omit<SetupCallRequest, 'id' | 'createdAt' | 'status' | 'adminNote'>
): Promise<SetupCallRequest> {
  const mode = await detectPartnerBackend();
  if (mode === 'demo' || !supabase) return createSetupCallLocal(input);
  const { data, error } = await supabase
    .from('partner_setup_calls')
    .insert({
      partner_id: input.partnerId,
      name: input.name,
      email: input.email,
      preferred_slot: input.preferredSlot,
      note: input.note,
      is_minor: input.isMinor,
      guardian_consent: input.guardianConsent,
      status: 'open',
    })
    .select('*')
    .single();
  if (error || !data) return createSetupCallLocal(input);
  return {
    id: String(data.id),
    partnerId: data.partner_id ? String(data.partner_id) : null,
    name: String(data.name),
    email: String(data.email),
    preferredSlot: String(data.preferred_slot),
    note: String(data.note ?? ''),
    isMinor: Boolean(data.is_minor),
    guardianConsent: Boolean(data.guardian_consent),
    status: data.status,
    createdAt: String(data.created_at),
    adminNote: String(data.admin_note ?? ''),
  };
}

export async function adminListSetupCalls(): Promise<SetupCallRequest[]> {
  const mode = await detectPartnerBackend();
  if (mode === 'demo' || !supabase) return readPartnerStore().setupCalls;
  const { data, error } = await supabase
    .from('partner_setup_calls')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return readPartnerStore().setupCalls;
  return data.map((row) => ({
    id: String(row.id),
    partnerId: row.partner_id ? String(row.partner_id) : null,
    name: String(row.name),
    email: String(row.email),
    preferredSlot: String(row.preferred_slot),
    note: String(row.note ?? ''),
    isMinor: Boolean(row.is_minor),
    guardianConsent: Boolean(row.guardian_consent),
    status: row.status,
    createdAt: String(row.created_at),
    adminNote: String(row.admin_note ?? ''),
  }));
}

export async function adminUpdateSetupCall(
  id: string,
  status: SetupCallRequest['status'],
  adminNote?: string
): Promise<void> {
  const mode = await detectPartnerBackend();
  if (mode === 'demo' || !supabase) {
    const store = readPartnerStore();
    const row = store.setupCalls.find((c) => c.id === id);
    if (row) {
      row.status = status;
      if (adminNote != null) row.adminNote = adminNote;
      writePartnerStore(store);
    }
    return;
  }
  await supabase
    .from('partner_setup_calls')
    .update({ status, admin_note: adminNote ?? '' })
    .eq('id', id);
}

export function getCompletedModuleIdsLocal(partnerId: string): string[] {
  return readPartnerStore()
    .progress.filter((p) => p.partnerId === partnerId)
    .map((p) => p.moduleId);
}

export async function getCompletedModuleIds(partnerId: string): Promise<string[]> {
  const mode = await detectPartnerBackend();
  if (mode === 'demo' || !supabase) return getCompletedModuleIdsLocal(partnerId);
  const { data, error } = await supabase
    .from('partner_learning_progress')
    .select('module_id')
    .eq('partner_id', partnerId);
  if (error || !data) return getCompletedModuleIdsLocal(partnerId);
  return data.map((r) => String(r.module_id));
}

export function getEmailLogsLocal() {
  return readPartnerStore().emailLogs;
}
