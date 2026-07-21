/**
 * Client: Shopify Draft Order Checkout (eine oder mehrere Configs).
 * Liefert klare Gründe, wenn die Kasse nicht greift (Setup fehlt / Fehler).
 */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase'
import type { DraftOrderLineInput } from './shopifyDraftOrder'
import { validateDraftOrderInput } from './shopifyDraftOrder'

function getDraftOrderSecret(): string {
  try {
    return (
      (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_DRAFT_ORDER_SECRET ??
      ''
    ).trim()
  } catch {
    return ''
  }
}

function draftOrderHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    apikey: SUPABASE_ANON_KEY,
  }
  const secret = getDraftOrderSecret()
  if (secret) headers['x-draft-order-secret'] = secret
  return headers
}

export type DraftCheckoutOk = {
  ok: true
  invoiceUrl: string
  draftOrderId: string | number | null
  draftOrderName: string | null
  lineCount: number
  totalCents: number | null
}

export type DraftCheckoutFail = {
  ok: false
  /** not_configured = Secrets/Function fehlen (503) · setup = lokale Env · error = Shopify/Netz */
  reason: 'not_configured' | 'setup' | 'invalid' | 'rate_limited' | 'error'
  message: string
  status?: number
}

export type DraftCheckoutResult = DraftCheckoutOk | DraftCheckoutFail

/** @deprecated – Prefer createDraftCheckoutResult */
export type DraftCheckoutResultLegacy = {
  invoiceUrl: string
  draftOrderId: string | number | null
  draftOrderName: string | null
  lineCount: number
  totalCents: number | null
}

export async function createDraftCheckoutResult(
  input: DraftOrderLineInput | { lines: DraftOrderLineInput[] }
): Promise<DraftCheckoutResult> {
  const payload = 'lines' in input && Array.isArray(input.lines) ? input : { lines: [input] }
  const checked = validateDraftOrderInput(payload)
  if (!checked.ok) {
    return { ok: false, reason: 'invalid', message: checked.error }
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return {
      ok: false,
      reason: 'setup',
      message: 'Supabase ist in der App nicht konfiguriert (VITE_SUPABASE_URL / ANON_KEY).',
    }
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-draft-order`, {
      method: 'POST',
      headers: draftOrderHeaders(),
      body: JSON.stringify({ lines: checked.value.lines }),
    })

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        reason: 'setup',
        message:
          'Kasse abgelehnt (Secret/Origin). VITE_DRAFT_ORDER_SECRET und ALLOWED_MICROSITE_HOSTS prüfen.',
        status: res.status,
      }
    }
    if (res.status === 503) {
      return {
        ok: false,
        reason: 'not_configured',
        message:
          'Draft Orders noch nicht live: In Supabase Function create-draft-order deployen und Secrets SHOPIFY_SHOP_DOMAIN + SHOPIFY_ADMIN_ACCESS_TOKEN setzen.',
        status: 503,
      }
    }
    if (res.status === 404) {
      return {
        ok: false,
        reason: 'not_configured',
        message:
          'Function create-draft-order fehlt noch. Bitte deployen (siehe PHASE0_GO_LIVE.md).',
        status: 404,
      }
    }
    if (res.status === 429) {
      return {
        ok: false,
        reason: 'rate_limited',
        message: 'Zu viele Kassenvorgänge – bitte 1 Minute warten.',
        status: 429,
      }
    }
    if (!res.ok) {
      let detail = ''
      try {
        const j = (await res.json()) as { error?: string; detail?: string; hint?: string }
        detail = [j.error, j.detail, j.hint].filter(Boolean).join(' – ')
      } catch {
        detail = (await res.text().catch(() => '')).slice(0, 180)
      }
      return {
        ok: false,
        reason: 'error',
        message: detail || `Shopify/Kasse antwortete mit Status ${res.status}.`,
        status: res.status,
      }
    }

    const data = (await res.json()) as {
      invoiceUrl?: string
      draftOrderId?: string | number
      draftOrderName?: string
      lineCount?: number
      totalCents?: number
    }
    const invoiceUrl = data.invoiceUrl?.trim()
    if (!invoiceUrl || !/^https:\/\//i.test(invoiceUrl)) {
      return {
        ok: false,
        reason: 'error',
        message: 'Shopify lieferte keinen Checkout-Link (invoice_url).',
      }
    }
    return {
      ok: true,
      invoiceUrl,
      draftOrderId: data.draftOrderId ?? null,
      draftOrderName: data.draftOrderName ?? null,
      lineCount: data.lineCount ?? checked.value.lines.length,
      totalCents: typeof data.totalCents === 'number' ? data.totalCents : null,
    }
  } catch (e) {
    console.warn('Draft checkout error:', e)
    return {
      ok: false,
      reason: 'error',
      message: 'Keine Verbindung zur Kassen-Function. Internet oder Supabase prüfen.',
    }
  }
}

/** Convenience: null = Fallback auf Cart erlaubt */
export async function createDraftCheckout(
  input: DraftOrderLineInput | { lines: DraftOrderLineInput[] }
): Promise<DraftCheckoutResultLegacy | null> {
  const r = await createDraftCheckoutResult(input)
  if (!r.ok) {
    console.warn('Draft checkout:', r.reason, r.message)
    return null
  }
  return {
    invoiceUrl: r.invoiceUrl,
    draftOrderId: r.draftOrderId,
    draftOrderName: r.draftOrderName,
    lineCount: r.lineCount,
    totalCents: r.totalCents,
  }
}

/**
 * Leichter Health-Check ohne Bestellung (leere/invalid body → 400 zählt als „Function da“).
 */
export async function probeDraftOrderFunction(): Promise<{
  reachable: boolean
  configured: boolean
  detail: string
}> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { reachable: false, configured: false, detail: 'VITE_SUPABASE_* fehlt' }
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-draft-order`, {
      method: 'POST',
      headers: draftOrderHeaders(),
      body: JSON.stringify({}),
    })
    if (res.status === 401 || res.status === 403) {
      return {
        reachable: true,
        configured: false,
        detail: 'Function da, aber Secret/Origin falsch (401/403)',
      }
    }
    if (res.status === 404) {
      return { reachable: false, configured: false, detail: 'Function nicht deployed (404)' }
    }
    if (res.status === 503) {
      return {
        reachable: true,
        configured: false,
        detail: 'Function da, aber Shopify-Secrets fehlen',
      }
    }
    // 400 = validiert Request → Function + Secrets ok genug zum Antworten
    if (res.status === 400 || res.status === 200) {
      return { reachable: true, configured: true, detail: `ok (HTTP ${res.status})` }
    }
    return {
      reachable: true,
      configured: res.status !== 503,
      detail: `HTTP ${res.status}`,
    }
  } catch {
    return { reachable: false, configured: false, detail: 'Netzwerkfehler' }
  }
}
