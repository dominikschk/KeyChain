// Supabase Edge Function: Shopify Draft Order mit Preis PRO ZEILE / Config
// POST { lines: [...] } oder Legacy-Einzelobjekt
// Secrets: SHOPIFY_SHOP_DOMAIN, SHOPIFY_ADMIN_ACCESS_TOKEN
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

/** Staffel ausschließlich aus der Stückzahl dieser einen Zeile. */
function serverUnitPriceForLine(productId: string, lineQty: number): number {
  const tiers = [...tiersForProduct(productId)].sort((a, b) => a.minQty - b.minQty);
  let chosen = tiers[0]!;
  for (const t of tiers) {
    if (lineQty >= t.minQty) chosen = t;
  }
  return chosen.unitPriceCents;
}

const SHORT_ID_RE = /^[A-HJ-NP-Z2-9]{8,24}$/i;
const MAX_UNIT_CENTS = 99_999;
const MAX_TOTAL_CENTS = 500_000;
const MAX_LINES = 20;

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
    const shortId = String(b.shortId ?? '').trim();
    if (!SHORT_ID_RE.test(shortId)) return { ok: false, error: 'Config-ID ungültig' };
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

  const parsed = parseLines(body);
  if (!parsed.ok) return jsonResponse({ error: parsed.error }, 400);

  // Pro Zeile eigene Staffel – Summe der Mengen wird bewusst NICHT verwendet
  const basketQtySum = parsed.lines.reduce((s, l) => s + l.quantity, 0);
  const lineItems: Record<string, unknown>[] = [];
  let totalCents = 0;
  const pricedMeta: { shortId: string; quantity: number; unitPriceCents: number }[] = [];

  for (const line of parsed.lines) {
    const unitPriceCents = Math.min(
      MAX_UNIT_CENTS,
      serverUnitPriceForLine(line.productId, line.quantity)
    );
    // Defense: Einzelstück darf nie den Preis der Warenkorb-Summe bekommen
    if (line.quantity === 1 && basketQtySum > 1) {
      const pooled = serverUnitPriceForLine(line.productId, basketQtySum);
      const solo = serverUnitPriceForLine(line.productId, 1);
      if (unitPriceCents !== solo) {
        return jsonResponse({ error: 'Preisregel verletzt (per-line)' }, 500);
      }
      if (solo !== pooled && unitPriceCents === pooled) {
        return jsonResponse({ error: 'Preisregel verletzt (pooled tier)' }, 500);
      }
    }

    const lineTotal = unitPriceCents * line.quantity;
    totalCents += lineTotal;
    if (totalCents > MAX_TOTAL_CENTS) {
      return jsonResponse({ error: 'Gesamtbetrag zu hoch' }, 400);
    }

    const priceStr = centsToPrice(unitPriceCents);
    const priceHint =
      line.quantity > 1
        ? `${priceStr} € / Stück · ${line.quantity}× = ${centsToPrice(lineTotal)} € (nur diese Config)`
        : `${priceStr} € / Stück (Einzelpreis · nur diese Config)`;

    const properties: { name: string; value: string }[] = [
      { name: 'Config-ID', value: line.shortId },
      { name: 'Preis', value: priceHint },
      { name: 'Produkt', value: line.productId },
      { name: 'Staffel-Basis', value: `nur diese Config · ${line.quantity}×` },
    ];
    if (line.previewUrl) properties.push({ name: 'Preview', value: line.previewUrl });
    if (line.micrositeUrl) properties.push({ name: 'Handy-Seite', value: line.micrositeUrl });
    if (line.destinationUrl) properties.push({ name: 'Ziel-URL', value: line.destinationUrl });
    if (line.ccpUrl) {
      properties.push({ name: '_CCP-URL', value: line.ccpUrl });
      properties.push({ name: 'Bearbeiten-Link', value: line.ccpUrl });
    }
    if (line.variantId) properties.push({ name: 'Variant-ID', value: line.variantId });

    lineItems.push({
      title: `${line.productTitle} – personalisiert`,
      price: priceStr,
      quantity: line.quantity,
      properties,
      requires_shipping: true,
      taxable: true,
    });
    pricedMeta.push({
      shortId: line.shortId,
      quantity: line.quantity,
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
      lineCount: pricedMeta.length,
      totalCents,
      lines: pricedMeta,
    });
  } catch (e) {
    console.error('Draft order fetch failed', e);
    return jsonResponse({ error: 'Verbindung zu Shopify fehlgeschlagen' }, 502);
  }
});
