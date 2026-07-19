/**
 * Shopify-Order-Sync: Property-Parsing und Status-Mapping (ohne Netzwerk).
 * Genutzt von Edge Function + Unit-Tests.
 */

export type ShopifyLineProperty = { name?: string | null; value?: string | null };

export type ShopifyLineItem = {
  properties?: ShopifyLineProperty[] | null;
};

export type ShopifyOrderPayload = {
  id?: number | string | null;
  name?: string | null;
  order_number?: number | string | null;
  financial_status?: string | null;
  line_items?: ShopifyLineItem[] | null;
};

const SHORT_ID_RE = /^[A-Z0-9]{12,32}$/;

/** Extrahiert Short-ID aus Line-Item-Properties (Config-ID) oder Microsite-URL. */
export function extractShortIdFromProperties(
  properties: ShopifyLineProperty[] | null | undefined
): string | null {
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

/** Alle Short-IDs aus einer Shopify-Order (eine pro Line-Item mit Config). */
export function extractShortIdsFromOrder(order: ShopifyOrderPayload): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of order.line_items ?? []) {
    const id = extractShortIdFromProperties(item.properties);
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

export function mapShopifyFinancialStatus(
  financialStatus: string | null | undefined,
  topic?: string | null
): 'pending' | 'paid' | 'cancelled' {
  const t = (topic ?? '').toLowerCase();
  if (t.includes('cancelled') || t.includes('canceled')) return 'cancelled';
  if (t.includes('orders/paid')) return 'paid';
  const s = (financialStatus ?? '').toLowerCase();
  if (s === 'paid' || s === 'partially_paid') return 'paid';
  if (s === 'voided' || s === 'refunded') return 'cancelled';
  return 'pending';
}

export function shopifyOrderNumber(order: ShopifyOrderPayload): string | null {
  if (order.name && String(order.name).trim()) return String(order.name).trim();
  if (order.order_number != null && String(order.order_number).trim()) {
    return `#${order.order_number}`;
  }
  return null;
}

export function shopifyOrderId(order: ShopifyOrderPayload): string | null {
  if (order.id == null) return null;
  return String(order.id);
}

/** Timing-sicherer Vergleich für Base64/HMAC-Strings. */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // trotzdem gleiche Schleifenlänge gegen Timing-Leak der Länge allein
    let _diff = 1;
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const x = i < a.length ? a.charCodeAt(i) : 0;
      const y = i < b.length ? b.charCodeAt(i) : 0;
      _diff |= x ^ y;
    }
    return _diff === 0 && false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Shopify HMAC (base64) über Rohbody prüfen – Web Crypto. */
export async function verifyShopifyHmacSha256(
  rawBody: string,
  hmacHeader: string,
  secret: string
): Promise<boolean> {
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
