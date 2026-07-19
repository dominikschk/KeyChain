/**
 * Client: Shopify Draft Order Checkout über Supabase Edge Function.
 * Ohne Deploy / Secrets → null (Caller fällt auf Cart-Permalink zurück).
 */
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase'
import type { DraftOrderCreateInput } from './shopifyDraftOrder'
import { validateDraftOrderInput } from './shopifyDraftOrder'

export type DraftCheckoutResult = {
  invoiceUrl: string
  draftOrderId: string | number | null
  draftOrderName: string | null
}

export async function createDraftCheckout(
  input: DraftOrderCreateInput
): Promise<DraftCheckoutResult | null> {
  const checked = validateDraftOrderInput(input)
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
      body: JSON.stringify(checked.value),
    })

    if (res.status === 503) {
      // Secrets noch nicht gesetzt – erwarteter Fallback
      return null
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.warn('Draft checkout failed:', res.status, errText.slice(0, 200))
      return null
    }

    const data = (await res.json()) as {
      invoiceUrl?: string
      draftOrderId?: string | number
      draftOrderName?: string
    }
    const invoiceUrl = data.invoiceUrl?.trim()
    if (!invoiceUrl || !/^https:\/\//i.test(invoiceUrl)) return null
    return {
      invoiceUrl,
      draftOrderId: data.draftOrderId ?? null,
      draftOrderName: data.draftOrderName ?? null,
    }
  } catch (e) {
    console.warn('Draft checkout error:', e)
    return null
  }
}
