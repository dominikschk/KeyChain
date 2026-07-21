// Supabase Edge Function: Shopify Draft Order mit Preis PRO ZEILE / Config
// POST { lines: [...] } oder Legacy-Einzelobjekt
// Secrets (neu ab 2026): SHOPIFY_SHOP_DOMAIN + SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET
// Optional Legacy: SHOPIFY_ADMIN_ACCESS_TOKEN (statisches shpat_…)
// Sicherheit: Staffel nur aus quantity DIESER Zeile – nie Warenkorb-Summe

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOP_DOMAIN = (Deno.env.get('SHOPIFY_SHOP_DOMAIN') ?? '')
  .trim()
  .replace(/^https?:\/\//i, '')
  .replace(/\/$/, '');
const ADMIN_TOKEN = (Deno.env.get('SHOPIFY_ADMIN_ACCESS_TOKEN') ?? '').trim();
const CLIENT_ID = (Deno.env.get('SHOPIFY_CLIENT_ID') ?? '').trim();
const CLIENT_SECRET = (Deno.env.get('SHOPIFY_CLIENT_SECRET') ?? '').trim();
const API_VERSION = Deno.env.get('SHOPIFY_API_VERSION')?.trim() || '2024-10';
const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') ?? '').trim();
const SERVICE_ROLE = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
const RATE_LIMIT = Math.max(5, parseInt(Deno.env.get('DRAFT_ORDER_RATE_LIMIT') ?? '15', 10) || 15);

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();

/** Cache für Client-Credentials-Token (ca. 24h gültig). */
let cachedToken: { value: string; expiresAt: number } | null = null;

function shopHost(): string {
  return SHOP_DOMAIN.includes('.') ? SHOP_DOMAIN : `${SHOP_DOMAIN}.myshopify.com`;
}

function authConfigured(): boolean {
  if (!SHOP_DOMAIN) return false;
  if (ADMIN_TOKEN) return true;
  return !!(CLIENT_ID && CLIENT_SECRET);
}

/**
 * Admin-Token: Legacy shpat_ ODER Client-Credentials (Client-ID + shpss_ Secret).
 * https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/client-credentials-grant
 */
async function resolveAdminAccessToken(): Promise<
  { ok: true; token: string } | { ok: false; error: string; hint?: string }
> {
  if (ADMIN_TOKEN) return { ok: true, token: ADMIN_TOKEN };

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return {
      ok: false,
      error: 'Draft Orders nicht konfiguriert',
      hint: 'Secrets SHOPIFY_SHOP_DOMAIN + SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (oder Legacy SHOPIFY_ADMIN_ACCESS_TOKEN)',
    };
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return { ok: true, token: cachedToken.value };
  }

  try {
    const res = await fetch(`https://${shopHost()}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }).toString(),
    });
    const text = await res.text();
    let data: { access_token?: string; expires_in?: number; error?: string } = {};
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      /* ignore */
    }
    if (!res.ok || !data.access_token) {
      console.error('Shopify client_credentials failed', res.status, text.slice(0, 400));
      return {
        ok: false,
        error: 'Shopify-Token konnte nicht geholt werden',
        hint:
          data.error ||
          'App im Shop installieren? Scopes write_draft_orders gesetzt? Client-ID/Secret korrekt?',
      };
    }
    const ttlSec = typeof data.expires_in === 'number' ? data.expires_in : 86399;
    cachedToken = {
      value: data.access_token,
      expiresAt: now + Math.max(60, ttlSec - 120) * 1000,
    };
    return { ok: true, token: data.access_token };
  } catch (e) {
    console.error('Token fetch error', e);
    return { ok: false, error: 'Token-Abruf fehlgeschlagen (Netzwerk)' };
  }
}

function clientKey(req: Request): string {
  const xf = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || '';
  const ip = xf.split(',')[0]?.trim() || 'unknown';
  return `draft:${ip}`;
}

function allowRequest(key: string, limit: number, windowMs = 60_000): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  if (rateBuckets.size > 4000) {
    for (const [k, b] of rateBuckets) {
      if (b.resetAt <= now) rateBuckets.delete(k);
    }
  }
  const b = rateBuckets.get(key);
  if (!b || b.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: Math.ceil(windowMs / 1000) };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count += 1;
  return { ok: true, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
}

/** Bind quantity to saved pricing snapshot when present (anti-tamper). */
async function snapshotQuantityForShortId(shortId: string): Promise<number | null> {
  if (!SUPABASE_URL || !SERVICE_ROLE) return null;
  try {
    const url = `${SUPABASE_URL}/rest/v1/nfc_configs?short_id=eq.${encodeURIComponent(shortId)}&select=plate_data`;
    const res = await fetch(url, {
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ plate_data?: { pricing?: { quantity?: number } } }>;
    const q = rows[0]?.plate_data?.pricing?.quantity;
    if (typeof q === 'number' && q >= 1 && q <= 15_000) return Math.round(q);
    return null;
  } catch {
    return null;
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function envCents(key: string, fallback: number): number {
  const raw = (Deno.env.get(key) ?? '').trim();
  if (!raw) return fallback;
  if (/^\d+$/.test(raw) && raw.length >= 3) {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }
  const euros = parseFloat(raw.replace(',', '.'));
  if (!Number.isFinite(euros) || euros <= 0) return fallback;
  return Math.round(euros * 100);
}

type Tier = { minQty: number; unitPriceCents: number };

function tiersForProduct(productId: string): Tier[] {
  if (productId === 'badge') {
    return [
      { minQty: 1, unitPriceCents: envCents('PRICE_BADGE_CENTS', envCents('VITE_PRICE_BADGE_CENTS', 3990)) },
      { minQty: 10, unitPriceCents: envCents('PRICE_BADGE_Q10_CENTS', envCents('VITE_PRICE_BADGE_Q10_CENTS', 3490)) },
      { minQty: 25, unitPriceCents: envCents('PRICE_BADGE_Q25_CENTS', envCents('VITE_PRICE_BADGE_Q25_CENTS', 2990)) },
    ];
  }
  return [
    { minQty: 1, unitPriceCents: envCents('PRICE_KEYCHAIN_CENTS', envCents('VITE_PRICE_KEYCHAIN_CENTS', 2490)) },
    { minQty: 10, unitPriceCents: envCents('PRICE_KEYCHAIN_Q10_CENTS', envCents('VITE_PRICE_KEYCHAIN_Q10_CENTS', 2190)) },
    { minQty: 25, unitPriceCents: envCents('PRICE_KEYCHAIN_Q25_CENTS', envCents('VITE_PRICE_KEYCHAIN_Q25_CENTS', 1890)) },
  ];
}

/** Staffel ausschließlich aus der Stückzahl dieser einen Zeile. */
function serverUnitPriceForLine(productId: string, lineQty: number): number {
  const tiers = [...tiersForProduct(productId)].sort((a, b) => a.minQty - b.minQty);
  let chosen = tiers[0]!;
  for (const t of tiers) {
    if (lineQty >= t.minQty) chosen = t;
  }
  return chosen.unitPriceCents;
}

const SHORT_ID_RE = /^[A-Z0-9]{8,32}$/i;
const MAX_UNIT_CENTS = 99_999;
/** Obergrenze Gesamtbetrag (€500.000) – erlaubt Firmenmengen bis 15.000 Stück. */
const MAX_TOTAL_CENTS = 50_000_000;
const MAX_ORDER_QUANTITY = 15_000;
const MAX_LINES = 20;

function clampQty(n: unknown): number {
  const x = typeof n === 'number' ? n : parseInt(String(n), 10);
  if (!Number.isFinite(x)) return 1;
  return Math.min(MAX_ORDER_QUANTITY, Math.max(1, Math.round(x)));
}

function centsToPrice(cents: number): string {
  return (Math.max(0, Math.round(cents)) / 100).toFixed(2);
}

function optHttps(v: unknown, max = 2048): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (!t || t.length > max || !/^https:\/\//i.test(t)) return undefined;
  return t;
}

type LineIn = {
  shortId: string;
  productId: string;
  productTitle: string;
  quantity: number;
  previewUrl?: string;
  micrositeUrl?: string;
  ccpUrl?: string;
  destinationUrl?: string;
  variantId?: string;
};

function parseLines(body: Record<string, unknown>): { ok: true; lines: LineIn[] } | { ok: false; error: string } {
  const rawList: unknown[] = Array.isArray(body.lines) ? body.lines : [body];
  if (rawList.length === 0) return { ok: false, error: 'Keine Positionen' };
  if (rawList.length > MAX_LINES) return { ok: false, error: `Maximal ${MAX_LINES} Designs` };

  const lines: LineIn[] = [];
  const seen = new Set<string>();

  for (const row of rawList) {
    if (!row || typeof row !== 'object') return { ok: false, error: 'Ungültige Zeile' };
    const b = row as Record<string, unknown>;
    const shortId = String(b.shortId ?? b.short_id ?? '')
      .trim()
      .toUpperCase();
    if (!SHORT_ID_RE.test(shortId)) {
      return {
        ok: false,
        error: shortId
          ? `Config-ID ungültig („${shortId.slice(0, 24)}“)`
          : 'Config-ID fehlt',
      };
    }
    if (seen.has(shortId)) return { ok: false, error: 'Doppelte Config-ID' };
    seen.add(shortId);

    const productId = String(b.productId ?? 'keychain').trim() || 'keychain';
    if (!['keychain', 'badge'].includes(productId)) {
      return { ok: false, error: 'Unbekanntes Produkt' };
    }

    const quantity = clampQty(b.quantity);
    const productTitle =
      String(b.productTitle ?? (productId === 'badge' ? 'Messe-Badge' : 'Schlüsselanhänger'))
        .trim()
        .slice(0, 120) || 'NFC Schlüsselanhänger';

    const variantId =
      typeof b.variantId === 'string' && /^\d+$/.test(b.variantId.trim())
        ? b.variantId.trim()
        : undefined;

    lines.push({
      shortId,
      productId,
      productTitle,
      quantity,
      previewUrl: optHttps(b.previewUrl),
      micrositeUrl: optHttps(b.micrositeUrl),
      ccpUrl: optHttps(b.ccpUrl),
      destinationUrl: optHttps(b.destinationUrl),
      variantId,
    });
  }

  return { ok: true, lines };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const rl = allowRequest(clientKey(req), RATE_LIMIT);
  if (!rl.ok) {
    return jsonResponse(
      { error: 'Zu viele Anfragen – bitte kurz warten.', retryAfterSec: rl.retryAfterSec },
      429
    );
  }

  if (!authConfigured()) {
    return jsonResponse(
      {
        error: 'Draft Orders nicht konfiguriert',
        hint: 'Secrets: SHOPIFY_SHOP_DOMAIN + SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (Dev Dashboard). Legacy: SHOPIFY_ADMIN_ACCESS_TOKEN.',
      },
      503
    );
  }

  const tokenRes = await resolveAdminAccessToken();
  if (!tokenRes.ok) {
    return jsonResponse(
      { error: tokenRes.error, hint: tokenRes.hint },
      tokenRes.error.includes('konfiguriert') ? 503 : 502
    );
  }
  const accessToken = tokenRes.token;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'JSON erwartet' }, 400);
  }

  const parsed = parseLines(body);
  if (!parsed.ok) return jsonResponse({ error: parsed.error }, 400);

  // Mengen an gespeicherte Snapshots binden, dann erst Staffeln berechnen
  const boundLines: LineIn[] = [];
  for (const line of parsed.lines) {
    const snapQty = await snapshotQuantityForShortId(line.shortId);
    boundLines.push({ ...line, quantity: snapQty ?? line.quantity });
  }

  // Summe nur für Defense-Check – nie als Staffel-Eingabe
  const basketQtySum = boundLines.reduce((s, l) => s + l.quantity, 0);
  const lineItems: Record<string, unknown>[] = [];
  let totalCents = 0;
  const pricedMeta: { shortId: string; quantity: number; unitPriceCents: number }[] = [];

  for (const boundLine of boundLines) {
    const unitPriceCents = Math.min(
      MAX_UNIT_CENTS,
      serverUnitPriceForLine(boundLine.productId, boundLine.quantity)
    );
    // Defense: Einzelstück darf nie den Preis der Warenkorb-Summe bekommen
    if (boundLine.quantity === 1 && basketQtySum > 1) {
      const pooled = serverUnitPriceForLine(boundLine.productId, basketQtySum);
      const solo = serverUnitPriceForLine(boundLine.productId, 1);
      if (unitPriceCents !== solo) {
        return jsonResponse({ error: 'Preisregel verletzt (per-line)' }, 500);
      }
      if (solo !== pooled && unitPriceCents === pooled) {
        return jsonResponse({ error: 'Preisregel verletzt (pooled tier)' }, 500);
      }
    }

    const lineTotal = unitPriceCents * boundLine.quantity;
    totalCents += lineTotal;
    if (totalCents > MAX_TOTAL_CENTS) {
      return jsonResponse({ error: 'Gesamtbetrag zu hoch' }, 400);
    }

    const priceStr = centsToPrice(unitPriceCents);
    const priceHint =
      boundLine.quantity > 1
        ? `${priceStr} € / Stück · ${boundLine.quantity}× = ${centsToPrice(lineTotal)} € (nur diese Config)`
        : `${priceStr} € / Stück (Einzelpreis · nur diese Config)`;

    const properties: { name: string; value: string }[] = [
      { name: 'Config-ID', value: boundLine.shortId },
      { name: 'Preis', value: priceHint },
      { name: 'Produkt', value: boundLine.productId },
      { name: 'Staffel-Basis', value: `nur diese Config · ${boundLine.quantity}×` },
    ];
    if (boundLine.previewUrl) properties.push({ name: 'Preview', value: boundLine.previewUrl });
    if (boundLine.micrositeUrl) properties.push({ name: 'Handy-Seite', value: boundLine.micrositeUrl });
    if (boundLine.destinationUrl) properties.push({ name: 'Ziel-URL', value: boundLine.destinationUrl });
    if (boundLine.ccpUrl) {
      properties.push({ name: '_CCP-URL', value: boundLine.ccpUrl });
      properties.push({ name: 'Bearbeiten-Link', value: boundLine.ccpUrl });
    }
    if (boundLine.variantId) properties.push({ name: 'Variant-ID', value: boundLine.variantId });

    lineItems.push({
      title: `${boundLine.productTitle} – personalisiert`,
      price: priceStr,
      quantity: boundLine.quantity,
      properties,
      requires_shipping: true,
      taxable: true,
    });
    pricedMeta.push({
      shortId: boundLine.shortId,
      quantity: boundLine.quantity,
      unitPriceCents,
    });
  }

  const payload = {
    draft_order: {
      line_items: lineItems,
      note: `NUDAIM · per-line · ${pricedMeta
        .map((m) => `${m.shortId}:${m.quantity}×@${centsToPrice(m.unitPriceCents)}`)
        .join(' · ')}`,
      tags: 'nudaim,konfigurator,draft-price,per-line',
    },
  };

  const url = `https://${shopHost()}/admin/api/${API_VERSION}/draft_orders.json`;

  try {
    const shopRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify(payload),
    });

    const text = await shopRes.text();
    let data: {
      draft_order?: { id?: number; name?: string; invoice_url?: string };
      errors?: unknown;
    } = {};
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      /* ignore */
    }

    if (!shopRes.ok) {
      console.error('Shopify draft order error', shopRes.status, text.slice(0, 500));
      return jsonResponse(
        {
          error: 'Shopify Draft Order fehlgeschlagen',
          status: shopRes.status,
          detail: typeof data.errors === 'string' ? data.errors : text.slice(0, 300),
        },
        502
      );
    }

    const invoiceUrl = data.draft_order?.invoice_url?.trim();
    if (!invoiceUrl) {
      return jsonResponse({ error: 'Keine invoice_url von Shopify' }, 502);
    }

    return jsonResponse({
      invoiceUrl,
      draftOrderId: data.draft_order?.id ?? null,
      draftOrderName: data.draft_order?.name ?? null,
      lineCount: pricedMeta.length,
      totalCents,
      lines: pricedMeta,
    });
  } catch (e) {
    console.error('Draft order fetch failed', e);
    return jsonResponse({ error: 'Verbindung zu Shopify fehlgeschlagen' }, 502);
  }
});
