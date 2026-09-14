// Supabase Edge Function: nach QC-Freigabe Druckdateien an Webhook und/oder Druckerei-Mail senden
// POST { "order_id": "uuid", optional "force": true }
// Auth: Admin-JWT (Bearer) ODER x-webhook-secret = PRINT_DISPATCH_SECRET
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
// Optional: PRINT_DISPATCH_WEBHOOK_URL, PRINT_DISPATCH_SECRET, PRINT_SHOP_EMAIL,
//           RESEND_API_KEY, FROM_EMAIL

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') ?? '').trim();
const SERVICE_ROLE = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
const ANON_KEY = (Deno.env.get('SUPABASE_ANON_KEY') ?? '').trim();
const WEBHOOK_URL = (Deno.env.get('PRINT_DISPATCH_WEBHOOK_URL') ?? '').trim();
const DISPATCH_SECRET = (Deno.env.get('PRINT_DISPATCH_SECRET') ?? '').trim();
const PRINT_SHOP_EMAIL = (Deno.env.get('PRINT_SHOP_EMAIL') ?? '').trim();
const RESEND_API_KEY = (Deno.env.get('RESEND_API_KEY') ?? '').trim();
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'NUDAIM <onboarding@resend.dev>';

type DispatchStatus = 'idle' | 'dispatched' | 'failed' | 'skipped';

type Job = {
  event: 'print.dispatch';
  target: 'bambu_lab';
  order_id: string;
  short_id: string;
  order_number: string | null;
  shopify_order_id: string | null;
  stl_url: string | null;
  print_png_url: string | null;
  plate_color: string | null;
  preview_image: string | null;
  needs_slice: true;
  file_hints: {
    preferred_name: string;
    stl_filename: string;
    print_png_filename: string | null;
  };
  dispatched_at: string;
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

function extractBearer(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

function httpsOrNull(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  const t = url.trim();
  return t.startsWith('https://') ? t : null;
}

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

function channelsConfigured(): boolean {
  return !!(WEBHOOK_URL || (PRINT_SHOP_EMAIL && RESEND_API_KEY));
}

async function assertAdmin(req: Request): Promise<{ ok: true } | { ok: false; error: string }> {
  if (DISPATCH_SECRET) {
    const headerSecret = req.headers.get('x-webhook-secret')?.trim();
    if (headerSecret && timingSafeEqualString(headerSecret, DISPATCH_SECRET)) {
      return { ok: true };
    }
  }

  const bearer = extractBearer(req.headers.get('authorization'));
  if (!bearer || !SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE) {
    return { ok: false, error: 'Nicht autorisiert' };
  }

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${bearer}`, apikey: ANON_KEY },
  });
  if (!userRes.ok) return { ok: false, error: 'Session ungültig' };
  const user = (await userRes.json()) as { email?: string };
  const email = (user.email || '').trim().toLowerCase();
  if (!email) return { ok: false, error: 'Kein Admin' };

  const adminRes = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_users?email=eq.${encodeURIComponent(email)}&select=email`,
    {
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
    }
  );
  if (!adminRes.ok) return { ok: false, error: 'Admin-Prüfung fehlgeschlagen' };
  const rows = (await adminRes.json()) as unknown[];
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, error: 'Kein Admin' };
  return { ok: true };
}

async function loadOrder(orderId: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=*&limit=1`,
    {
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
    }
  );
  if (!res.ok) return null;
  const rows = (await res.json()) as Record<string, unknown>[];
  return rows[0] ?? null;
}

async function loadConfig(shortId: string, configId: string | null): Promise<Record<string, unknown> | null> {
  let url = `${SUPABASE_URL}/rest/v1/nfc_configs?select=id,short_id,stl_url,preview_image,plate_data&limit=1`;
  if (configId) {
    url += `&id=eq.${encodeURIComponent(configId)}`;
  } else {
    url += `&short_id=eq.${encodeURIComponent(shortId)}`;
  }
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
    },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Record<string, unknown>[];
  return rows[0] ?? null;
}

async function patchOrder(
  orderId: string,
  patch: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    console.error('patchOrder failed', await res.text());
    return null;
  }
  const rows = (await res.json()) as Record<string, unknown>[];
  return rows[0] ?? null;
}

async function sendWebhook(job: Job): Promise<{ ok: boolean; detail: string }> {
  if (!WEBHOOK_URL) return { ok: true, detail: 'webhook:off' };
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (DISPATCH_SECRET) headers['x-webhook-secret'] = DISPATCH_SECRET;
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(job),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, detail: `webhook:${res.status}:${text.slice(0, 120)}` };
    }
    return { ok: true, detail: 'webhook:ok' };
  } catch (e) {
    return { ok: false, detail: `webhook:${e instanceof Error ? e.message : 'error'}` };
  }
}

async function sendShopEmail(job: Job): Promise<{ ok: boolean; detail: string }> {
  if (!PRINT_SHOP_EMAIL) return { ok: true, detail: 'email:off' };
  if (!RESEND_API_KEY) return { ok: false, detail: 'email:missing_resend' };
  if (!isValidEmail(PRINT_SHOP_EMAIL)) return { ok: false, detail: 'email:invalid' };

  const html = [
    `<p><strong>NUDAIM – Druckauftrag</strong></p>`,
    `<p>Short-ID: <code>${escapeHtml(job.short_id)}</code></p>`,
    job.order_number ? `<p>Bestellung: ${escapeHtml(job.order_number)}</p>` : '',
    job.plate_color ? `<p>Plattenfarbe: ${escapeHtml(job.plate_color)}</p>` : '',
    job.stl_url
      ? `<p><a href="${escapeHtml(job.stl_url)}">STL herunterladen</a></p>`
      : '<p>Kein STL vorhanden.</p>',
    job.print_png_url
      ? `<p><a href="${escapeHtml(job.print_png_url)}">Print-PNG herunterladen</a></p>`
      : '<p>Kein Print-PNG vorhanden.</p>',
  ]
    .filter(Boolean)
    .join('\n');

  const text = [
    'NUDAIM – Druckauftrag',
    `Short-ID: ${job.short_id}`,
    job.stl_url ? `STL: ${job.stl_url}` : 'Kein STL',
    job.print_png_url ? `PNG: ${job.print_png_url}` : 'Kein PNG',
  ].join('\n');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [PRINT_SHOP_EMAIL],
        subject: `Druckauftrag ${job.short_id}`,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, detail: `email:${res.status}:${body.slice(0, 120)}` };
    }
    return { ok: true, detail: 'email:ok' };
  } catch (e) {
    return { ok: false, detail: `email:${e instanceof Error ? e.message : 'error'}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'POST only' });
  }
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json(500, { error: 'Server nicht konfiguriert' });
  }

  const auth = await assertAdmin(req);
  if (!auth.ok) return json(401, { error: auth.error });

  let body: { order_id?: string; force?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json(400, { error: 'JSON erwartet' });
  }
  const orderId = (body.order_id || '').trim();
  if (!orderId || orderId.length > 64) {
    return json(400, { error: 'order_id fehlt' });
  }

  const order = await loadOrder(orderId);
  if (!order) return json(404, { error: 'Order nicht gefunden' });

  const qc = String(order.print_qc_status || 'pending').toLowerCase();
  if (qc !== 'approved' && !body.force) {
    return json(409, {
      error: 'QC noch nicht freigegeben',
      status: 'skipped' satisfies DispatchStatus,
    });
  }

  const prev = String(order.print_dispatch_status || 'idle').toLowerCase();
  if (prev === 'dispatched' && !body.force) {
    return json(200, {
      ok: true,
      status: 'dispatched' satisfies DispatchStatus,
      message: 'Bereits gesendet',
      order,
    });
  }

  if (!channelsConfigured()) {
    const updated = await patchOrder(orderId, {
      print_dispatch_status: 'skipped',
      print_dispatch_at: new Date().toISOString(),
      print_dispatch_note: 'Kein PRINT_DISPATCH_WEBHOOK_URL / PRINT_SHOP_EMAIL konfiguriert',
      updated_at: new Date().toISOString(),
    });
    return json(200, {
      ok: true,
      status: 'skipped' satisfies DispatchStatus,
      message: 'Auto-Druck nicht konfiguriert – Dateien bleiben im Admin',
      order: updated ?? order,
    });
  }

  const cfg = await loadConfig(
    String(order.short_id || ''),
    typeof order.config_id === 'string' ? order.config_id : null
  );
  const plate = (cfg?.plate_data ?? null) as Record<string, unknown> | null;
  const shortSafe = String(order.short_id || 'job').replace(/[^a-zA-Z0-9_-]+/g, '').slice(0, 32) || 'job';
  const job: Job = {
    event: 'print.dispatch',
    target: 'bambu_lab',
    order_id: String(order.id),
    short_id: String(order.short_id || ''),
    order_number: typeof order.order_number === 'string' ? order.order_number : null,
    shopify_order_id: typeof order.shopify_order_id === 'string' ? order.shopify_order_id : null,
    stl_url: httpsOrNull(cfg?.stl_url),
    print_png_url: httpsOrNull(plate?.print_png_url),
    plate_color:
      typeof plate?.plateColor === 'string'
        ? plate.plateColor
        : typeof plate?.plate_color === 'string'
          ? plate.plate_color
          : null,
    preview_image: httpsOrNull(cfg?.preview_image),
    needs_slice: true,
    file_hints: {
      preferred_name: `nudaim-${shortSafe}`,
      stl_filename: `nudaim-${shortSafe}.stl`,
      print_png_filename: httpsOrNull(plate?.print_png_url) ? `nudaim-${shortSafe}-print.png` : null,
    },
    dispatched_at: new Date().toISOString(),
  };

  if (!job.stl_url && !job.print_png_url) {
    const updated = await patchOrder(orderId, {
      print_dispatch_status: 'skipped',
      print_dispatch_at: job.dispatched_at,
      print_dispatch_note: 'Keine STL-/Print-PNG-URL',
      updated_at: job.dispatched_at,
    });
    return json(200, {
      ok: false,
      status: 'skipped' satisfies DispatchStatus,
      message: 'Keine druckbaren Dateien',
      order: updated ?? order,
    });
  }

  const webhook = await sendWebhook(job);
  const email = await sendShopEmail(job);
  const ok = webhook.ok && email.ok;
  const note = [webhook.detail, email.detail].join('; ');
  const status: DispatchStatus = ok ? 'dispatched' : 'failed';

  const updated = await patchOrder(orderId, {
    print_dispatch_status: status,
    print_dispatch_at: job.dispatched_at,
    print_dispatch_note: note.slice(0, 500),
    updated_at: job.dispatched_at,
  });

  return json(ok ? 200 : 502, {
    ok,
    status,
    message: ok ? 'An Druckerei gesendet' : 'Versand fehlgeschlagen',
    detail: note,
    order: updated ?? order,
  });
});
