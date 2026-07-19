// Supabase Edge Function: Shopify Draft Order mit berechnetem Stückpreis
// POST JSON → { invoiceUrl, draftOrderId, draftOrderName }
// Secrets: SHOPIFY_SHOP_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN
// Optional: PRICE_*_CENTS (Server überschreibt Client-Preis mit Staffel)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHOP_DOMAIN = (Deno.env.get('SHOPIFY_SHOP_DOMAIN') ?? '')
  .trim()
  .replace(/^https?:\/\//i, '')
  .replace(/\/$/, '');
const ADMIN_TOKEN = (Deno.env.get('SHOPIFY_ADMIN_ACCESS_TOKEN') ?? '').trim();
const API_VERSION = Deno.env.get('SHOPIFY_API_VERSION')?.trim() || '2024-10';

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

function serverUnitPrice(productId: string, qty: number): number {
  const tiers = [...tiersForProduct(productId)].sort((a, b) => a.minQty - b.minQty);
  let chosen = tiers[0]!;
  for (const t of tiers) {
    if (qty >= t.minQty) chosen = t;
  }
  return chosen.unitPriceCents;
}

const SHORT_ID_RE = /^[A-HJ-NP-Z2-9]{8,24}$/i;
const MAX_UNIT_CENTS = 99_999;
const MAX_TOTAL_CENTS = 500_000;

function clampQty(n: unknown): number {
  const x = typeof n === 'number' ? n : parseInt(String(n), 10);
  if (!Number.isFinite(x)) return 1;
  return Math.min(99, Math.max(1, Math.round(x)));
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!SHOP_DOMAIN || !ADMIN_TOKEN) {
    return jsonResponse(
      {
        error: 'Draft Orders nicht konfiguriert',
        hint: 'Secrets SHOPIFY_SHOP_DOMAIN + SHOPIFY_ADMIN_ACCESS_TOKEN setzen',
      },
      503
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'JSON erwartet' }, 400);
  }

  const shortId = String(body.shortId ?? '').trim();
  if (!SHORT_ID_RE.test(shortId)) {
    return jsonResponse({ error: 'Config-ID ungültig' }, 400);
  }

  const productId = String(body.productId ?? 'keychain').trim() || 'keychain';
  if (!['keychain', 'badge'].includes(productId)) {
    return jsonResponse({ error: 'Unbekanntes Produkt' }, 400);
  }

  const quantity = clampQty(body.quantity);
  const unitPriceCents = Math.min(MAX_UNIT_CENTS, serverUnitPrice(productId, quantity));
  if (unitPriceCents * quantity > MAX_TOTAL_CENTS) {
    return jsonResponse({ error: 'Gesamtbetrag zu hoch' }, 400);
  }

  const productTitle =
    String(body.productTitle ?? (productId === 'badge' ? 'Messe-Badge' : 'Schlüsselanhänger'))
      .trim()
      .slice(0, 120) || 'NFC Schlüsselanhänger';

  const previewUrl = optHttps(body.previewUrl);
  const micrositeUrl = optHttps(body.micrositeUrl);
  const ccpUrl = optHttps(body.ccpUrl);
  const destinationUrl = optHttps(body.destinationUrl);
  const variantId =
    typeof body.variantId === 'string' && /^\d+$/.test(body.variantId.trim())
      ? body.variantId.trim()
      : undefined;

  const priceStr = centsToPrice(unitPriceCents);
  const priceHint =
    quantity > 1
      ? `${priceStr} € / Stück · ${quantity}× = ${centsToPrice(unitPriceCents * quantity)} €`
      : `${priceStr} € / Stück`;

  const properties: { name: string; value: string }[] = [
    { name: 'Config-ID', value: shortId },
    { name: 'Preis', value: priceHint },
    { name: 'Produkt', value: productId },
  ];
  if (previewUrl) properties.push({ name: 'Preview', value: previewUrl });
  if (micrositeUrl) properties.push({ name: 'Handy-Seite', value: micrositeUrl });
  if (destinationUrl) properties.push({ name: 'Ziel-URL', value: destinationUrl });
  if (ccpUrl) {
    properties.push({ name: '_CCP-URL', value: ccpUrl });
    properties.push({ name: 'Bearbeiten-Link', value: ccpUrl });
  }
  if (variantId) properties.push({ name: 'Variant-ID', value: variantId });

  const payload = {
    draft_order: {
      line_items: [
        {
          title: `${productTitle} – personalisiert`,
          price: priceStr,
          quantity,
          properties,
          requires_shipping: true,
          taxable: true,
        },
      ],
      note: `NUDAIM Konfigurator · Config ${shortId} · ${quantity}× · ${priceHint}`,
      tags: 'nudaim,konfigurator,draft-price',
    },
  };

  const shopHost = SHOP_DOMAIN.includes('.') ? SHOP_DOMAIN : `${SHOP_DOMAIN}.myshopify.com`;
  const url = `https://${shopHost}/admin/api/${API_VERSION}/draft_orders.json`;

  try {
    const shopRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Shopify-Access-Token': ADMIN_TOKEN,
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
      unitPriceCents,
      quantity,
      totalCents: unitPriceCents * quantity,
    });
  } catch (e) {
    console.error('Draft order fetch failed', e);
    return jsonResponse({ error: 'Verbindung zu Shopify fehlgeschlagen' }, 502);
  }
});
