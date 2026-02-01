// Supabase Edge Function: E-Mail nach Bestellung mit Microsite-Link und Short-ID
// Aufruf: POST mit Body { "to": "kunde@example.com", "microsite_url": "https://...", "short_id": "ABC123" }
// Secrets in Supabase: RESEND_API_KEY, optional FROM_EMAIL (z. B. "NUDAIM <onboarding@resend.dev>")

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'NUDAIM <onboarding@resend.dev>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function htmlMail(micrositeUrl: string, shortId: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 1.25rem; margin-bottom: 16px;">Deine digitale Microsite</h1>
  <p style="margin-bottom: 16px;">Vielen Dank für deine Bestellung. Hier ist dein persönlicher Zugang:</p>
  <p style="margin-bottom: 8px;"><strong>Short-ID:</strong> <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">${shortId}</code></p>
  <p style="margin-bottom: 20px;">Öffne deine Microsite (z. B. zum Teilen oder Bearbeiten im Kunden-Panel) über diesen Link:</p>
  <p style="margin-bottom: 24px;">
    <a href="${micrositeUrl}" style="display: inline-block; background: #11235A; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">Microsite öffnen</a>
  </p>
  <p style="font-size: 0.875rem; color: #666;">${micrositeUrl}</p>
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

  const to = body.to?.trim();
  const micrositeUrl = body.microsite_url?.trim();
  const shortId = body.short_id?.trim() ?? '';

  if (!to || !micrositeUrl) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: to, microsite_url' }),
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
