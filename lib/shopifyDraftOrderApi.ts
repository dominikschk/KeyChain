/**
 * Client: Shopify Draft Order Checkout (eine oder mehrere Configs).
 * Staffel immer pro Zeile – Server rechnet neu.
 */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase'
import type { DraftOrderLineInput } from './shopifyDraftOrder'
import { validateDraftOrderInput } from './shopifyDraftOrder'

export type DraftCheckoutResult = {
  invoiceUrl: string
  draftOrderId: string | number | null
  draftOrderName: string | null
  lineCount: number
  totalCents: number | null
}

export async function createDraftCheckout(
  input: DraftOrderLineInput | { lines: DraftOrderLineInput[] }
): Promise<DraftCheckoutResult | null> {
  const payload = 'lines' in input && Array.isArray(input.lines) ? input : { lines: [input] }
  const checked = validateDraftOrderInput(payload)
  if (!checked.ok) {
    console.warn('Draft checkout invalid:', checked.error)
    return null
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-draft-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ lines: checked.value.lines }),
    })

    if (res.status === 503) return null
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.warn('Draft checkout failed:', res.status, errText.slice(0, 200))
      return null
    }

    const data = (await res.json()) as {
      invoiceUrl?: string
      draftOrderId?: string | number
      draftOrderName?: string
      lineCount?: number
      totalCents?: number
    }
    const invoiceUrl = data.invoiceUrl?.trim()
    if (!invoiceUrl || !/^https:\/\//i.test(invoiceUrl)) return null
    return {
      invoiceUrl,
      draftOrderId: data.draftOrderId ?? null,
      draftOrderName: data.draftOrderName ?? null,
      lineCount: data.lineCount ?? checked.value.lines.length,
      totalCents: typeof data.totalCents === 'number' ? data.totalCents : null,
    }
  } catch (e) {
    console.warn('Draft checkout error:', e)
    return null
  }
}
