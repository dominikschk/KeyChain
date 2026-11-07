// Supabase Edge Function: Partner-Programm E-Mails (transaktional / Marketing)
// Secrets: RESEND_API_KEY, optional FROM_EMAIL, PARTNER_EMAIL_SECRET
// Marketing nur mit marketing_consent=true; Abmeldelink in Vorlage.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'NUDAIM <onboarding@resend.dev>';
const PARTNER_EMAIL_SECRET = Deno.env.get('PARTNER_EMAIL_SECRET') ?? '';
const UNSUBSCRIBE_BASE = Deno.env.get('PARTNER_UNSUBSCRIBE_URL') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-partner-email-secret',
};

const MARKETING_TEMPLATES = new Set(['onboarding_day3']);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(value: string): boolean {
  const at = value.indexOf('@');
  return at > 0 && at < value.length - 1 && !/\s/.test(value) && value.length <= 320;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({
        status: 'skipped',
        message: 'RESEND_API_KEY fehlt – E-Mail nicht gesendet.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (PARTNER_EMAIL_SECRET) {
    const provided = req.headers.get('x-partner-email-secret') ?? '';
    if (provided !== PARTNER_EMAIL_SECRET) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  let body: {
    template?: string;
    to?: string;
    partner_id?: string | null;
    vars?: Record<string, string>;
    marketing_consent?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const to = (body.to ?? '').trim().toLowerCase();
  const template = (body.template ?? '').trim();
  if (!isValidEmail(to) || !template) {
    return new Response(JSON.stringify({ error: 'invalid_input' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (MARKETING_TEMPLATES.has(template) && !body.marketing_consent) {
    return new Response(
      JSON.stringify({ status: 'skipped', message: 'Keine Marketing-Einwilligung.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const name = escapeHtml(body.vars?.name ?? 'Partner');
  const unsub =
    UNSUBSCRIBE_BASE &&
    `<p style="font-size:12px;color:#71717a"><a href="${escapeHtml(UNSUBSCRIBE_BASE)}">Abmelden</a></p>`;

  const subjects: Record<string, string> = {
    welcome: 'Willkommen im NUDAIM Partnerprogramm',
    demo_materials: 'Demo und Materialien',
    onboarding_day3: 'Weiter im Onboarding',
    lead_submitted: 'Lead eingegangen',
    lead_status: 'Lead-Status aktualisiert',
    offer_or_paid: 'Update zu Angebot oder Auftrag',
    commission_overview: 'Provisionsübersicht',
    setup_call_reply: 'Antwort zu deinem Setup-Call',
    account_confirm: 'Konto bestätigen',
    password_reset: 'Passwort zurücksetzen',
  };

  const subject = subjects[template] ?? 'NUDAIM Partner';
  const html = `
    <div style="font-family:system-ui,sans-serif;color:#11235A">
      <p>Hallo ${name},</p>
      <p>Nachricht aus dem Partnerprogramm (Vorlage: ${escapeHtml(template)}).</p>
      <p>Details findest du in deinem Partnerbereich.</p>
      ${MARKETING_TEMPLATES.has(template) ? unsub || '' : ''}
      <p style="font-size:12px;color:#71717a">NUDAIM · Transaktionale und Marketing-Mails sind getrennt.</p>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(JSON.stringify({ status: 'failed', message: text }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ status: 'sent' }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
