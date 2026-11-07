/**
 * Modulare E-Mail-Schnittstelle für das Partnerprogramm.
 * Secrets nur über Env / Edge Function – nie im Frontend.
 */

export type PartnerEmailTemplateKey =
  | 'welcome'
  | 'demo_materials'
  | 'onboarding_day3'
  | 'lead_submitted'
  | 'lead_status'
  | 'offer_or_paid'
  | 'commission_overview'
  | 'setup_call_reply'
  | 'account_confirm'
  | 'password_reset';

export type PartnerEmailKind = 'transactional' | 'marketing';

export const PARTNER_EMAIL_TEMPLATES: Record<
  PartnerEmailTemplateKey,
  { title: string; kind: PartnerEmailKind; description: string }
> = {
  welcome: {
    title: 'Willkommen nach Registrierung',
    kind: 'transactional',
    description: 'Bestätigung der Registrierung und nächste Schritte.',
  },
  demo_materials: {
    title: 'Demo und Materiallinks',
    kind: 'transactional',
    description: 'Links zu Demo und verfügbaren Materialien.',
  },
  onboarding_day3: {
    title: 'Onboarding-Hinweis (Tag 3)',
    kind: 'marketing',
    description: 'Nur mit Marketing-Einwilligung und Abmeldelink.',
  },
  lead_submitted: {
    title: 'Lead eingereicht',
    kind: 'transactional',
    description: 'Bestätigung nach Lead-Einreichung.',
  },
  lead_status: {
    title: 'Lead-Statusupdate',
    kind: 'transactional',
    description: 'Wenn sich der Lead-Status ändert.',
  },
  offer_or_paid: {
    title: 'Angebot oder bezahlter Auftrag',
    kind: 'transactional',
    description: 'Benachrichtigung bei Angebot oder Zahlung.',
  },
  commission_overview: {
    title: 'Provisionsübersicht',
    kind: 'transactional',
    description: 'Zusammenfassung bestätigter / offener Provisionen.',
  },
  setup_call_reply: {
    title: 'Antwort Setup-Call',
    kind: 'transactional',
    description: 'Bestätigung oder Ablehnung einer Terminwunsch-Anfrage.',
  },
  account_confirm: {
    title: 'Kontobestätigung',
    kind: 'transactional',
    description: 'E-Mail-Verifizierung.',
  },
  password_reset: {
    title: 'Passwort wiederherstellen',
    kind: 'transactional',
    description: 'Reset-Link (über Auth-Provider).',
  },
};

function envFlag(name: string): boolean {
  try {
    const v = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.[name];
    return v === '1' || v === 'true';
  } catch {
    return false;
  }
}

/** Ob der Client einen konfigurierten Maildienst melden soll (ohne Secrets). */
export function isPartnerEmailServiceConfigured(): boolean {
  return envFlag('VITE_PARTNER_EMAIL_CONFIGURED');
}

export type QueuePartnerEmailInput = {
  templateKey: PartnerEmailTemplateKey;
  toEmail: string;
  partnerId?: string | null;
  marketingConsentGranted?: boolean;
  vars?: Record<string, string>;
};

/**
 * Versucht Edge Function `partner-email` – ohne Konfiguration: skipped.
 * Secrets (RESEND_API_KEY etc.) nur serverseitig.
 */
export async function queuePartnerEmail(
  input: QueuePartnerEmailInput
): Promise<{ status: 'queued' | 'sent' | 'skipped' | 'failed'; message: string }> {
  const meta = PARTNER_EMAIL_TEMPLATES[input.templateKey];
  if (meta.kind === 'marketing' && !input.marketingConsentGranted) {
    return {
      status: 'skipped',
      message: 'Marketing-E-Mail übersprungen (keine Einwilligung).',
    };
  }
  if (!isPartnerEmailServiceConfigured()) {
    return {
      status: 'skipped',
      message:
        'Kein Maildienst konfiguriert. Edge Function partner-email + RESEND_API_KEY setzen, danach VITE_PARTNER_EMAIL_CONFIGURED=1.',
    };
  }
  try {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('../supabase');
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { status: 'skipped', message: 'Supabase nicht konfiguriert.' };
    }
    const res = await fetch(`${SUPABASE_URL}/functions/v1/partner-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        template: input.templateKey,
        to: input.toEmail,
        partner_id: input.partnerId ?? null,
        vars: input.vars ?? {},
        marketing_consent: !!input.marketingConsentGranted,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { status: 'failed', message: text || `HTTP ${res.status}` };
    }
    return { status: 'sent', message: 'E-Mail übergeben.' };
  } catch (e) {
    return {
      status: 'failed',
      message: e instanceof Error ? e.message : 'Versand fehlgeschlagen',
    };
  }
}
