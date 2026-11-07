/**
 * Vertriebsprogramm / Partner – Typen und Statuswerte.
 */

export type LeadStatus =
  | 'draft'
  | 'submitted'
  | 'review'
  | 'contacted'
  | 'offer_created'
  | 'ordered'
  | 'paid'
  | 'rejected'
  | 'cancelled';

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  draft: 'Entwurf',
  submitted: 'Eingereicht',
  review: 'Prüfung',
  contacted: 'Kontakt aufgenommen',
  offer_created: 'Angebot erstellt',
  ordered: 'Auftrag erteilt',
  paid: 'Bezahlt',
  rejected: 'Abgelehnt',
  cancelled: 'Storniert',
};

export const LEAD_STATUSES: LeadStatus[] = [
  'draft',
  'submitted',
  'review',
  'contacted',
  'offer_created',
  'ordered',
  'paid',
  'rejected',
  'cancelled',
];

export type PartnerStatus = 'pending' | 'active' | 'paused' | 'closed';
export type PayoutStatus = 'requested' | 'processing' | 'paid' | 'rejected';
export type SetupCallStatus = 'open' | 'confirmed' | 'declined' | 'done';
export type CommissionStatus = 'pending' | 'confirmed' | 'reversed' | 'paid_out';
export type LearningLevelId = 'starter' | 'advanced' | 'partner';

export type ConsentKind =
  | 'terms'
  | 'privacy'
  | 'marketing_email'
  | 'guardian'
  | 'data_processing_lead';

export interface PartnerProfile {
  id: string;
  authUserId: string | null;
  email: string;
  displayName: string;
  partnerCode: string;
  status: PartnerStatus;
  region: string | null;
  isMinor: boolean;
  guardianConsentConfirmed: boolean;
  marketingEmailOptIn: boolean;
  onboardingStep: number;
  points: number;
  levelId: LearningLevelId;
  createdAt: string;
  updatedAt: string;
  deletionRequestedAt: string | null;
}

export interface PartnerConsent {
  id: string;
  partnerId: string;
  kind: ConsentKind;
  granted: boolean;
  textVersion: string;
  grantedAt: string | null;
  revokedAt: string | null;
}

export interface PartnerLead {
  id: string;
  partnerId: string;
  companyName: string;
  contactName: string | null;
  businessEmail: string | null;
  businessPhone: string | null;
  source: string;
  estimatedQty: number | null;
  note: string;
  status: LeadStatus;
  consentBasis: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  actor: 'partner' | 'admin' | 'system';
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus | null;
  message: string;
  createdAt: string;
}

export interface PartnerOffer {
  id: string;
  leadId: string;
  partnerId: string;
  quantity: number;
  unitPriceCents: number | null;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
}

export interface PartnerOrder {
  id: string;
  partnerId: string;
  leadId: string | null;
  offerId: string | null;
  quantity: number;
  paidAt: string | null;
  cancelledAt: string | null;
  externalRef: string | null;
  createdAt: string;
}

export interface PartnerCommission {
  id: string;
  partnerId: string;
  orderId: string | null;
  leadId: string | null;
  amountCents: number;
  status: CommissionStatus;
  note: string;
  confirmedAt: string | null;
  createdAt: string;
}

export interface PartnerPayout {
  id: string;
  partnerId: string;
  amountCents: number;
  status: PayoutStatus;
  requestedAt: string;
  processedAt: string | null;
  note: string;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  points: number;
  sortOrder: number;
  active: boolean;
}

export interface LearningProgress {
  partnerId: string;
  moduleId: string;
  completedAt: string;
}

export interface LearningLevel {
  id: LearningLevelId;
  title: string;
  minPoints: number;
  benefits: string;
  /** Nur anzeigen, wenn Admin freigegeben hat. */
  higherCommissionEnabled: boolean;
  higherCommissionNote: string;
}

export interface DownloadMaterial {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string | null;
  available: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface SetupCallRequest {
  id: string;
  partnerId: string | null;
  name: string;
  email: string;
  preferredSlot: string;
  note: string;
  isMinor: boolean;
  guardianConsent: boolean;
  status: SetupCallStatus;
  createdAt: string;
  adminNote: string;
}

export interface EmailLog {
  id: string;
  partnerId: string | null;
  templateKey: string;
  toEmail: string;
  kind: 'transactional' | 'marketing';
  status: 'queued' | 'sent' | 'skipped' | 'failed';
  error: string | null;
  createdAt: string;
}

export interface AdminActionLog {
  id: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  detail: string;
  createdAt: string;
}

/** Editierbare Programm-Konfiguration (Admin). */
export interface PartnerProgramConfig {
  /** Beispielprovision je Stück in Cent – öffentlich als Beispielwert. */
  exampleCommissionPerPieceCents: number;
  /** Bestätigter Satz; null = noch nicht festgelegt. */
  confirmedCommissionPerPieceCents: number | null;
  confirmedCommissionLabel: string;
  priceTiersText: string;
  shippingNote: string;
  brandingCostNote: string;
  termsMarkdown: string;
  payoutRulesMarkdown: string;
  attributionRulesMarkdown: string;
  emailConfigured: boolean;
  pilotNote: string;
  updatedAt: string;
}

export interface CommissionCalculatorInput {
  workdaysPerMonth: number;
  companiesPerDay: number;
  offerRate: number;
  closeRate: number;
  avgQuantity: number;
  commissionPerPieceEuro: number;
}

export interface CommissionCalculatorResult {
  contacts: number;
  offers: number;
  paidOrders: number;
  pieces: number;
  exampleCommissionEuro: number;
}

export type PartnerAppSection =
  | 'home'
  | 'produkt'
  | 'ablauf'
  | 'provision'
  | 'faq'
  | 'sicher'
  | 'registrierung'
  | 'anmelden'
  | 'onboarding'
  | 'dashboard'
  | 'leads'
  | 'bestellungen'
  | 'punkte'
  | 'material'
  | 'setup-call'
  | 'einstellungen'
  | 'datenschutz'
  | 'bedingungen'
  | 'bestaetigung';
