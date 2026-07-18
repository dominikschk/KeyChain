// Supabase Edge Function: E-Mail nach Bestellung mit Microsite-Link und optional CCP-Edit-Link
// Aufruf: POST { "to", "microsite_url", "short_id", optional "ccp_url" }
// Secrets: RESEND_API_KEY, EMAIL_WEBHOOK_SECRET, optional FROM_EMAIL, ALLOWED_MICROSITE_HOSTS

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const EMAIL_WEBHOOK_SECRET = Deno.env.get('EMAIL_WEBHOOK_SECRET');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'NUDAIM <onboarding@resend.dev>';
const ALLOWED_MICROSITE_HOSTS = (Deno.env.get('ALLOWED_MICROSITE_HOSTS') ?? '')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

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
  return at > 0 && at < value.length - 1 && !/\s/.test(value) && value.length <= 320;
}

function timingSafeEqualString(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  const len = Math.max(bufA.length, bufB.length);
  let diff = bufA.length === bufB.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    const x = i < bufA.length ? bufA[i]! : 0;
    const y = i < bufB.length ? bufB[i]! : 0;
    diff |= x ^ y;
  }
  return diff === 0;
}

function isAllowedAppUrl(value: string): boolean {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    if (u.username || u.password) return false;
    if (ALLOWED_MICROSITE_HOSTS.length === 0) {
      return u.protocol === 'https:';
    }
    return ALLOWED_MICROSITE_HOSTS.includes(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** CCP-Edit-URL muss /ccp-Pfad und Token-Param t haben (nicht die öffentliche Microsite). */
function isAllowedCcpUrl(value: string): boolean {
  if (!isAllowedAppUrl(value)) return false;
  try {
    const u = new URL(value);
    if (!u.pathname.includes('/ccp')) return false;
    const token = u.searchParams.get('t')?.trim() ?? '';
    if (token.length < 32 || !/^[a-f0-9]+$/i.test(token)) return false;
    return true;
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
  if (headerSecret && timingSafeEqualString(headerSecret, EMAIL_WEBHOOK_SECRET)) return true;
  const bearer = extractBearer(req.headers.get('authorization'));
  if (bearer && timingSafeEqualString(bearer, EMAIL_WEBHOOK_SECRET)) return true;
  return false;
}

function htmlMail(micrositeUrl: string, shortId: string, ccpUrl?: string): string {
  const safeUrl = escapeHtml(micrositeUrl);
  const safeId = escapeHtml(shortId);
  const ccpBlock = ccpUrl
    ? `
  <p style="margin-bottom: 12px; margin-top: 28px;"><strong>Seite später ändern?</strong></p>
  <p style="margin-bottom: 12px; color: #444;">Mit diesem privaten Link kannst du Texte, Links und Logo jederzeit anpassen:</p>
  <p style="margin-bottom: 16px;">
    <a href="${escapeHtml(ccpUrl)}" style="display: inline-block; background: #0D9488; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">Seite bearbeiten</a>
  </p>
  <p style="font-size: 0.875rem; color: #666;">Diesen Link bitte nicht öffentlich teilen.</p>`
    : '';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem; margin-bottom: 16px;">Deine Handy-Seite ist bereit</h1>
  <p style="margin-bottom: 16px;">Danke für deine Bestellung. So sehen deine Kunden die Seite, wenn sie den Anhänger ans Handy halten:</p>
  <p style="margin-bottom: 20px;">
    <a href="${safeUrl}" style="display: inline-block; background: #11235A; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">Handy-Seite öffnen</a>
  </p>
  <p style="font-size: 0.875rem; color: #666; word-break: break-all; margin-bottom: 8px;">${safeUrl}</p>
  <p style="font-size: 0.875rem; color: #888; margin-bottom: 8px;">Bestell-Code: <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">${safeId}</code></p>
  ${ccpBlock}
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 0.75rem; color: #999;">Diese E-Mail gehört zu deiner Bestellung. Der Bearbeiten-Link ist nur für dich.</p>
</body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST with body: { to, microsite_url, short_id, ccp_url? }' }),
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

  let body: { to?: string; microsite_url?: string; short_id?: string; ccp_url?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON. Body must be: { to, microsite_url, short_id, ccp_url? }' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const to = body.to?.trim() ?? '';
  const micrositeUrl = body.microsite_url?.trim() ?? '';
  const shortId = (body.short_id?.trim() ?? '').slice(0, 64);
  const ccpUrlRaw = body.ccp_url?.trim() ?? '';

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

  if (!isAllowedAppUrl(micrositeUrl)) {
    return new Response(
      JSON.stringify({
        error: ALLOWED_MICROSITE_HOSTS.length
          ? `microsite_url host must be one of: ${ALLOWED_MICROSITE_HOSTS.join(', ')}`
          : 'microsite_url must be a valid https URL',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let ccpUrl: string | undefined;
  if (ccpUrlRaw) {
    if (!isAllowedCcpUrl(ccpUrlRaw)) {
      return new Response(
        JSON.stringify({
          error:
            'ccp_url must be https (or allowed host), path /ccp, and include write token param t (min 32 hex chars)',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    ccpUrl = ccpUrlRaw;
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
      subject: 'Deine Handy-Seite ist bereit',
      html: htmlMail(micrositeUrl, shortId, ccpUrl),
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
