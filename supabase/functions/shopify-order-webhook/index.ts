// Supabase Edge Function: Shopify orders/create + orders/paid → Admin orders (status paid)
// Secrets: SHOPIFY_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Deploy: supabase functions deploy shopify-order-webhook --no-verify-jwt
// Shopify Admin → Settings → Notifications → Webhooks → orders/paid (+ optional orders/create)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SHOPIFY_WEBHOOK_SECRET = Deno.env.get('SHOPIFY_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SB_URL') ?? '';
const SERVICE_ROLE =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SB_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-topic, x-shopify-shop-domain',
};

type Prop = { name?: string | null; value?: string | null };
type LineItem = { properties?: Prop[] | null };
type Order = {
  id?: number | string | null;
  name?: string | null;
  order_number?: number | string | null;
  financial_status?: string | null;
  line_items?: LineItem[] | null;
};

const SHORT_ID_RE = /^[A-Z0-9]{12,32}$/;

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyShopifyHmac(rawBody: string, hmacHeader: string, secret: string): Promise<boolean> {
  if (!hmacHeader || !secret) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const digest = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return timingSafeEqualString(digest, hmacHeader.trim());
}

function extractShortId(properties: Prop[] | null | undefined): string | null {
  if (!properties?.length) return null;
  const map = new Map<string, string>();
  for (const p of properties) {
    const name = (p.name ?? '').trim();
    const value = (p.value ?? '').trim();
    if (name && value) map.set(name.toLowerCase(), value);
  }
  const configId = map.get('config-id') || map.get('config_id');
  if (configId && SHORT_ID_RE.test(configId)) return configId;
  for (const key of ['handy-seite', 'microsite-url', 'microsite_url']) {
    const url = map.get(key);
    if (!url) continue;
    try {
      const id = new URL(url).searchParams.get('id')?.trim() ?? '';
      if (SHORT_ID_RE.test(id)) return id;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function extractShortIds(order: Order): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of order.line_items ?? []) {
    const id = extractShortId(item.properties);
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function mapStatus(financialStatus: string | null | undefined, topic: string): string {
  const t = topic.toLowerCase();
  if (t.includes('cancelled') || t.includes('canceled')) return 'cancelled';
  if (t.includes('orders/paid')) return 'paid';
  const s = (financialStatus ?? '').toLowerCase();
  if (s === 'paid' || s === 'partially_paid') return 'paid';
  if (s === 'voided' || s === 'refunded') return 'cancelled';
  return 'pending';
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

  if (!SHOPIFY_WEBHOOK_SECRET || !SUPABASE_URL || !SERVICE_ROLE) {
    console.error('Missing SHOPIFY_WEBHOOK_SECRET / SUPABASE_URL / SERVICE_ROLE');
    return new Response(JSON.stringify({ error: 'misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rawBody = await req.text();
  const hmac = req.headers.get('x-shopify-hmac-sha256') ?? '';
  const ok = await verifyShopifyHmac(rawBody, hmac, SHOPIFY_WEBHOOK_SECRET);
  if (!ok) {
    return new Response(JSON.stringify({ error: 'invalid_hmac' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const topic = req.headers.get('x-shopify-topic') ?? '';
  let order: Order;
  try {
    order = JSON.parse(rawBody) as Order;
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const shopifyId = order.id != null ? String(order.id) : '';
  if (!shopifyId) {
    return new Response(JSON.stringify({ error: 'missing_order_id' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const shortIds = extractShortIds(order);
  if (shortIds.length === 0) {
    // Kein NUDAIM-Line-Item – bewusst 200, damit Shopify nicht retried
    return new Response(JSON.stringify({ ok: true, synced: 0, reason: 'no_config_id' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const status = mapStatus(order.financial_status, topic);
  const orderNumber =
    (order.name && String(order.name).trim()) ||
    (order.order_number != null ? `#${order.order_number}` : null);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const results: { short_id: string; order_id: string | null; error?: string }[] = [];
  for (const shortId of shortIds) {
    const { data, error } = await supabase.rpc('upsert_order_from_shopify', {
      p_shopify_order_id: shopifyId,
      p_order_number: orderNumber,
      p_short_id: shortId,
      p_status: status,
    });
    if (error) {
      console.error('upsert_order_from_shopify', shortId, error);
      results.push({ short_id: shortId, order_id: null, error: error.message });
    } else {
      results.push({ short_id: shortId, order_id: data as string });
    }
  }

  const failed = results.filter((r) => r.error);
  return new Response(
    JSON.stringify({
      ok: failed.length === 0,
      synced: results.length - failed.length,
      status,
      results,
    }),
    {
      status: failed.length && failed.length === results.length ? 500 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
