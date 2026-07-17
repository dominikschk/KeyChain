// Supabase Edge Function: E-Mail nach Bestellung mit Microsite-Link und Short-ID
// Aufruf: POST mit Body { "to": "kunde@example.com", "microsite_url": "https://...", "short_id": "ABC123" }
// Secrets: RESEND_API_KEY, EMAIL_WEBHOOK_SECRET, optional FROM_EMAIL

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const EMAIL_WEBHOOK_SECRET = Deno.env.get('EMAIL_WEBHOOK_SECRET');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'NUDAIM <onboarding@resend.dev>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

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
  return at > 0 && at < value.length - 1 && !/\s/.test(value);
}

function isValidHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function extractBearer(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

function isAuthorized(req: Request): boolean {
  if (!EMAIL_WEBHOOK_SECRET) return false;
  const headerSecret = req.headers.get('x-webhook-secret')?.trim();
  if (headerSecret && headerSecret === EMAIL_WEBHOOK_SECRET) return true;
  const bearer = extractBearer(req.headers.get('authorization'));
  if (bearer && bearer === EMAIL_WEBHOOK_SECRET) return true;
  return false;
}

function htmlMail(micrositeUrl: string, shortId: string): string {
  const safeUrl = escapeHtml(micrositeUrl);
  const safeId = escapeHtml(shortId);
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem; margin-bottom: 16px;">Deine digitale Microsite</h1>
  <p style="margin-bottom: 16px;">Vielen Dank für deine Bestellung. Hier ist dein persönlicher Zugang:</p>
  <p style="margin-bottom: 8px;"><strong>Short-ID:</strong> <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">${safeId}</code></p>
  <p style="margin-bottom: 20px;">Öffne deine Microsite (z. B. zum Teilen oder Bearbeiten im Kunden-Panel) über diesen Link:</p>
  <p style="margin-bottom: 24px;">
    <a href="${safeUrl}" style="display: inline-block; background: #11235A; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">Microsite öffnen</a>
  </p>
  <p style="font-size: 0.875rem; color: #666;">${safeUrl}</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 0.75rem; color: #999;">Diese E-Mail wurde nach deiner Bestellung versendet.</p>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST with body: { to, microsite_url, short_id }' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!EMAIL_WEBHOOK_SECRET) {
    return new Response(
      JSON.stringify({ error: 'EMAIL_WEBHOOK_SECRET is not set in Edge Function secrets.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!isAuthorized(req)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized. Send Authorization: Bearer <EMAIL_WEBHOOK_SECRET> or X-Webhook-Secret.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'RESEND_API_KEY is not set in Edge Function secrets.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let body: { to?: string; microsite_url?: string; short_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON. Body must be: { to, microsite_url, short_id }' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const to = body.to?.trim() ?? '';
  const micrositeUrl = body.microsite_url?.trim() ?? '';
  const shortId = (body.short_id?.trim() ?? '').slice(0, 64);

  if (!to || !micrositeUrl) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: to, microsite_url' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!isValidEmail(to)) {
    return new Response(
      JSON.stringify({ error: 'Invalid email address in field: to' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!isValidHttpsUrl(micrositeUrl)) {
    return new Response(
      JSON.stringify({ error: 'microsite_url must be a valid http(s) URL' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Deine Microsite – Short-ID: ' + (shortId || '—'),
      html: htmlMail(micrositeUrl, shortId),
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: 'Resend API error', details: data }),
      { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify({ ok: true, id: data.id }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
};

Deno.serve(handler);
