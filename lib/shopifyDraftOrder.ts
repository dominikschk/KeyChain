/**
 * Shared helpers for Shopify Draft Order checkout (custom unit price).
 * Pure logic – usable from Vitest and mirrored in the Edge Function.
 */

export type DraftOrderProperty = { name: string; value: string }

export type DraftOrderCreateInput = {
  shortId: string
  productId: string
  productTitle: string
  quantity: number
  /** Unit price in cents (server may recompute) */
  unitPriceCents: number
  previewUrl?: string
  micrositeUrl?: string
  ccpUrl?: string
  destinationUrl?: string
  /** Optional catalog variant for fulfillment reference (property only) */
  variantId?: string
  priceHint?: string
}

export type DraftOrderLineBuild = {
  title: string
  price: string
  quantity: number
  properties: DraftOrderProperty[]
  note: string
  tags: string
}

const SHORT_ID_RE = /^[A-HJ-NP-Z2-9]{8,24}$/i
const MAX_UNIT_CENTS = 99_999 // 999,99 €
const MAX_TOTAL_CENTS = 500_000 // 5.000 €

export function centsToShopifyPrice(cents: number): string {
  const n = Math.max(0, Math.round(cents)) / 100
  return n.toFixed(2)
}

export function clampDraftQuantity(n: unknown): number {
  const x = typeof n === 'number' ? n : parseInt(String(n), 10)
  if (!Number.isFinite(x)) return 1
  return Math.min(99, Math.max(1, Math.round(x)))
}

export function validateDraftOrderInput(raw: unknown):
  | { ok: true; value: DraftOrderCreateInput }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Ungültige Anfrage.' }
  const b = raw as Record<string, unknown>
  const shortId = String(b.shortId ?? '').trim()
  if (!SHORT_ID_RE.test(shortId)) return { ok: false, error: 'Config-ID fehlt oder ist ungültig.' }

  const productId = String(b.productId ?? 'keychain').trim() || 'keychain'
  if (!['keychain', 'badge'].includes(productId)) {
    return { ok: false, error: 'Unbekanntes Produkt.' }
  }

  const quantity = clampDraftQuantity(b.quantity)
  let unitPriceCents = Math.round(Number(b.unitPriceCents))
  if (!Number.isFinite(unitPriceCents) || unitPriceCents < 50) {
    return { ok: false, error: 'Preis ungültig.' }
  }
  unitPriceCents = Math.min(MAX_UNIT_CENTS, unitPriceCents)
  if (unitPriceCents * quantity > MAX_TOTAL_CENTS) {
    return { ok: false, error: 'Gesamtbetrag zu hoch – bitte kleinere Menge wählen.' }
  }

  const productTitle = String(b.productTitle ?? 'NFC Schlüsselanhänger').trim().slice(0, 120) ||
    'NFC Schlüsselanhänger'

  const optUrl = (v: unknown, max = 2048): string | undefined => {
    if (typeof v !== 'string') return undefined
    const t = v.trim()
    if (!t || t.length > max) return undefined
    if (!/^https:\/\//i.test(t)) return undefined
    return t
  }

  return {
    ok: true,
    value: {
      shortId,
      productId,
      productTitle,
      quantity,
      unitPriceCents,
      previewUrl: optUrl(b.previewUrl),
      micrositeUrl: optUrl(b.micrositeUrl),
      ccpUrl: optUrl(b.ccpUrl),
      destinationUrl: optUrl(b.destinationUrl),
      variantId:
        typeof b.variantId === 'string' && /^\d+$/.test(b.variantId.trim())
          ? b.variantId.trim()
          : undefined,
      priceHint:
        typeof b.priceHint === 'string' ? b.priceHint.trim().slice(0, 255) : undefined,
    },
  }
}

/** Build REST draft_order body fields from validated input. */
export function buildDraftOrderLine(input: DraftOrderCreateInput): DraftOrderLineBuild {
  const properties: DraftOrderProperty[] = [
    { name: 'Config-ID', value: input.shortId },
  ]
  if (input.previewUrl) properties.push({ name: 'Preview', value: input.previewUrl })
  if (input.priceHint) properties.push({ name: 'Preis', value: input.priceHint })
  if (input.micrositeUrl) properties.push({ name: 'Handy-Seite', value: input.micrositeUrl })
  if (input.destinationUrl) properties.push({ name: 'Ziel-URL', value: input.destinationUrl })
  if (input.ccpUrl) {
    properties.push({ name: '_CCP-URL', value: input.ccpUrl })
    properties.push({ name: 'Bearbeiten-Link', value: input.ccpUrl })
  }
  if (input.variantId) properties.push({ name: 'Variant-ID', value: input.variantId })
  properties.push({ name: 'Produkt', value: input.productId })

  return {
    title: `${input.productTitle} – personalisiert`,
    price: centsToShopifyPrice(input.unitPriceCents),
    quantity: input.quantity,
    properties,
    note: `NUDAIM Konfigurator · Config ${input.shortId} · ${input.quantity}×`,
    tags: 'nudaim,konfigurator,draft-price',
  }
}

export function buildShopifyDraftOrderRestBody(input: DraftOrderCreateInput): {
  draft_order: Record<string, unknown>
} {
  const line = buildDraftOrderLine(input)
  return {
    draft_order: {
      line_items: [
        {
          title: line.title,
          price: line.price,
          quantity: line.quantity,
          properties: line.properties,
          requires_shipping: true,
          taxable: true,
        },
      ],
      note: line.note,
      tags: line.tags,
    },
  }
}
