/**
 * Lokaler Demo-/Fallback-Store für das Partnerprogramm.
 * Alle Daten sind klar als Demo markiert, wenn kein Supabase-Backend aktiv ist.
 */
import { generatePartnerCode } from './partnerCode';
import {
  CONSENT_TEXT_VERSION,
  DEFAULT_LEARNING_LEVELS,
  DEFAULT_LEARNING_MODULES,
  DEFAULT_MATERIALS,
  DEFAULT_PROGRAM_CONFIG,
  resolveLevel,
} from './defaults';
import type {
  DownloadMaterial,
  EmailLog,
  LeadActivity,
  LearningLevel,
  LearningModule,
  LearningProgress,
  PartnerCommission,
  PartnerConsent,
  PartnerLead,
  PartnerOrder,
  PartnerProfile,
  PartnerProgramConfig,
  SetupCallRequest,
} from './types';

const STORE_KEY = 'nudaim_partner_demo_v1';

export type PartnerLocalStore = {
  demo: true;
  config: PartnerProgramConfig;
  partners: PartnerProfile[];
  consents: PartnerConsent[];
  leads: PartnerLead[];
  activities: LeadActivity[];
  orders: PartnerOrder[];
  commissions: PartnerCommission[];
  materials: DownloadMaterial[];
  modules: LearningModule[];
  levels: LearningLevel[];
  progress: LearningProgress[];
  setupCalls: SetupCallRequest[];
  emailLogs: EmailLog[];
  /** session: partnerId -> plain email for demo login */
  sessions: { partnerId: string; email: string } | null;
  passwords: Record<string, string>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

function emptyStore(): PartnerLocalStore {
  return {
    demo: true,
    config: { ...DEFAULT_PROGRAM_CONFIG, updatedAt: nowIso() },
    partners: [],
    consents: [],
    leads: [],
    activities: [],
    orders: [],
    commissions: [],
    materials: DEFAULT_MATERIALS.map((m) => ({ ...m })),
    modules: DEFAULT_LEARNING_MODULES.map((m) => ({ ...m })),
    levels: DEFAULT_LEARNING_LEVELS.map((l) => ({ ...l })),
    progress: [],
    setupCalls: [],
    emailLogs: [],
    sessions: null,
    passwords: {},
  };
}

function canStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

let memory: PartnerLocalStore | null = null;

export function readPartnerStore(): PartnerLocalStore {
  if (memory) return memory;
  if (!canStorage()) {
    memory = emptyStore();
    return memory;
  }
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      memory = emptyStore();
      return memory;
    }
    const parsed = JSON.parse(raw) as PartnerLocalStore;
    if (!parsed?.demo) {
      memory = emptyStore();
      return memory;
    }
    memory = {
      ...emptyStore(),
      ...parsed,
      demo: true,
      config: { ...DEFAULT_PROGRAM_CONFIG, ...parsed.config },
      materials: parsed.materials?.length ? parsed.materials : emptyStore().materials,
      modules: parsed.modules?.length ? parsed.modules : emptyStore().modules,
      levels: parsed.levels?.length ? parsed.levels : emptyStore().levels,
    };
    return memory;
  } catch {
    memory = emptyStore();
    return memory;
  }
}

export function writePartnerStore(store: PartnerLocalStore): void {
  memory = { ...store, demo: true };
  if (!canStorage()) return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(memory));
  } catch {
    /* ignore quota */
  }
}

export function resetPartnerDemoStore(): void {
  memory = emptyStore();
  if (canStorage()) localStorage.removeItem(STORE_KEY);
}

export function registerPartnerLocal(input: {
  name: string;
  email: string;
  password: string;
  marketingOptIn: boolean;
  isMinor: boolean;
  guardianConsent: boolean;
}): { partner: PartnerProfile; error: string | null } {
  const store = readPartnerStore();
  const email = input.email.trim().toLowerCase();
  if (store.partners.some((p) => p.email === email)) {
    return { partner: store.partners[0]!, error: 'Für diese E-Mail gibt es schon ein Konto.' };
  }
  const id = uid('ptr');
  const t = nowIso();
  const partner: PartnerProfile = {
    id,
    authUserId: null,
    email,
    displayName: input.name.trim(),
    partnerCode: generatePartnerCode(),
    status: 'active',
    region: null,
    isMinor: input.isMinor,
    guardianConsentConfirmed: input.isMinor ? input.guardianConsent : false,
    marketingEmailOptIn: input.marketingOptIn,
    onboardingStep: 0,
    points: 0,
    levelId: 'starter',
    createdAt: t,
    updatedAt: t,
    deletionRequestedAt: null,
  };
  store.partners.push(partner);
  store.passwords[email] = input.password;
  const consentKinds = [
    { kind: 'terms' as const, granted: true },
    { kind: 'privacy' as const, granted: true },
    { kind: 'marketing_email' as const, granted: input.marketingOptIn },
    {
      kind: 'guardian' as const,
      granted: input.isMinor ? input.guardianConsent : false,
    },
  ];
  for (const c of consentKinds) {
    store.consents.push({
      id: uid('cns'),
      partnerId: id,
      kind: c.kind,
      granted: c.granted,
      textVersion: CONSENT_TEXT_VERSION,
      grantedAt: c.granted ? t : null,
      revokedAt: null,
    });
  }
  store.sessions = { partnerId: id, email };
  store.emailLogs.push({
    id: uid('eml'),
    partnerId: id,
    templateKey: 'welcome',
    toEmail: email,
    kind: 'transactional',
    status: store.config.emailConfigured ? 'queued' : 'skipped',
    error: store.config.emailConfigured ? null : 'Kein Maildienst konfiguriert (Demo).',
    createdAt: t,
  });
  writePartnerStore(store);
  return { partner, error: null };
}

export function loginPartnerLocal(
  email: string,
  password: string
): { partner: PartnerProfile | null; error: string | null } {
  const store = readPartnerStore();
  const key = email.trim().toLowerCase();
  const partner = store.partners.find((p) => p.email === key) ?? null;
  if (!partner) return { partner: null, error: 'Anmeldung fehlgeschlagen.' };
  if (store.passwords[key] !== password) {
    return { partner: null, error: 'Anmeldung fehlgeschlagen.' };
  }
  store.sessions = { partnerId: partner.id, email: key };
  writePartnerStore(store);
  return { partner, error: null };
}

export function logoutPartnerLocal(): void {
  const store = readPartnerStore();
  store.sessions = null;
  writePartnerStore(store);
}

export function getSessionPartnerLocal(): PartnerProfile | null {
  const store = readPartnerStore();
  if (!store.sessions) return null;
  return store.partners.find((p) => p.id === store.sessions!.partnerId) ?? null;
}

export function updatePartnerLocal(
  partnerId: string,
  patch: Partial<PartnerProfile>
): PartnerProfile | null {
  const store = readPartnerStore();
  const idx = store.partners.findIndex((p) => p.id === partnerId);
  if (idx < 0) return null;
  const next = {
    ...store.partners[idx]!,
    ...patch,
    updatedAt: nowIso(),
  };
  const level = resolveLevel(next.points, store.levels);
  next.levelId = level.id;
  store.partners[idx] = next;
  writePartnerStore(store);
  return next;
}

export function addLeadLocal(
  partnerId: string,
  input: Omit<
    PartnerLead,
    'id' | 'partnerId' | 'createdAt' | 'updatedAt' | 'lastActivityAt' | 'status'
  > & { status?: PartnerLead['status'] }
): PartnerLead {
  const store = readPartnerStore();
  const t = nowIso();
  const lead: PartnerLead = {
    id: uid('lead'),
    partnerId,
    companyName: input.companyName.trim(),
    contactName: input.contactName?.trim() || null,
    businessEmail: input.businessEmail?.trim() || null,
    businessPhone: input.businessPhone?.trim() || null,
    source: input.source.trim(),
    estimatedQty: input.estimatedQty ?? null,
    note: input.note?.trim() || '',
    status: input.status ?? 'submitted',
    consentBasis: input.consentBasis.trim(),
    lastActivityAt: t,
    createdAt: t,
    updatedAt: t,
  };
  store.leads.unshift(lead);
  store.activities.push({
    id: uid('act'),
    leadId: lead.id,
    actor: 'partner',
    fromStatus: null,
    toStatus: lead.status,
    message: 'Lead eingereicht',
    createdAt: t,
  });
  writePartnerStore(store);
  return lead;
}

export function setLeadStatusLocal(
  leadId: string,
  status: PartnerLead['status'],
  actor: LeadActivity['actor'] = 'admin'
): PartnerLead | null {
  const store = readPartnerStore();
  const lead = store.leads.find((l) => l.id === leadId);
  if (!lead) return null;
  const from = lead.status;
  lead.status = status;
  lead.updatedAt = nowIso();
  lead.lastActivityAt = lead.updatedAt;
  store.activities.push({
    id: uid('act'),
    leadId,
    actor,
    fromStatus: from,
    toStatus: status,
    message: `Status: ${from} → ${status}`,
    createdAt: lead.updatedAt,
  });
  writePartnerStore(store);
  return lead;
}

export function completeModuleLocal(partnerId: string, moduleId: string): PartnerProfile | null {
  const store = readPartnerStore();
  if (store.progress.some((p) => p.partnerId === partnerId && p.moduleId === moduleId)) {
    return store.partners.find((p) => p.id === partnerId) ?? null;
  }
  const mod = store.modules.find((m) => m.id === moduleId);
  if (!mod || !mod.active) return null;
  store.progress.push({ partnerId, moduleId, completedAt: nowIso() });
  const partner = store.partners.find((p) => p.id === partnerId);
  if (!partner) return null;
  partner.points += mod.points;
  partner.levelId = resolveLevel(partner.points, store.levels).id;
  partner.updatedAt = nowIso();
  writePartnerStore(store);
  return partner;
}

export function createSetupCallLocal(
  input: Omit<SetupCallRequest, 'id' | 'createdAt' | 'status' | 'adminNote'>
): SetupCallRequest {
  const store = readPartnerStore();
  const row: SetupCallRequest = {
    ...input,
    id: uid('call'),
    status: 'open',
    adminNote: '',
    createdAt: nowIso(),
  };
  store.setupCalls.unshift(row);
  writePartnerStore(store);
  return row;
}

export function getProgramConfigLocal(): PartnerProgramConfig {
  return readPartnerStore().config;
}

export function setProgramConfigLocal(patch: Partial<PartnerProgramConfig>): PartnerProgramConfig {
  const store = readPartnerStore();
  store.config = { ...store.config, ...patch, updatedAt: nowIso() };
  writePartnerStore(store);
  return store.config;
}

export function listPartnersLocal(): PartnerProfile[] {
  return readPartnerStore().partners;
}

export function listLeadsForPartnerLocal(partnerId: string): PartnerLead[] {
  return readPartnerStore().leads.filter((l) => l.partnerId === partnerId);
}

export function listAllLeadsLocal(): PartnerLead[] {
  return readPartnerStore().leads;
}

export function partnerDashboardStatsLocal(partnerId: string) {
  const store = readPartnerStore();
  const leads = store.leads.filter((l) => l.partnerId === partnerId);
  const orders = store.orders.filter((o) => o.partnerId === partnerId && !o.cancelledAt);
  const commissions = store.commissions.filter((c) => c.partnerId === partnerId);
  const confirmed = commissions
    .filter((c) => c.status === 'confirmed' || c.status === 'paid_out')
    .reduce((s, c) => s + c.amountCents, 0);
  const pending = commissions
    .filter((c) => c.status === 'pending')
    .reduce((s, c) => s + c.amountCents, 0);
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
    paidOrders: orders.filter((o) => o.paidAt).length + leads.filter((l) => l.status === 'paid').length,
    confirmedCommissionCents: confirmed,
    pendingCommissionCents: pending,
    points: store.partners.find((p) => p.id === partnerId)?.points ?? 0,
    levelId: store.partners.find((p) => p.id === partnerId)?.levelId ?? 'starter',
    demo: true as const,
  };
}
