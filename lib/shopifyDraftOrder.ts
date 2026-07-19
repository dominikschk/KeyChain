/**
 * Shared helpers for Shopify Draft Order checkout (custom unit price).
 * Staffel immer pro Zeile / Config-ID – nie über Warenkorb-Summe.
 */

export type DraftOrderProperty = { name: string; value: string }

export type DraftOrderLineInput = {
  shortId: string
  productId: string
  productTitle: string
  quantity: number
  /** Client-Hinweis; Server überschreibt mit Staffel(line.quantity) */
  unitPriceCents: number
  previewUrl?: string
  micrositeUrl?: string
  ccpUrl?: string
  destinationUrl?: string
  variantId?: string
  priceHint?: string
}

export type DraftOrderCreateInput = DraftOrderLineInput & {
  /** Mehrere Designs; wenn gesetzt, hat Vorrang vor Einzel-Feldern */
  lines?: DraftOrderLineInput[]
}

export type DraftOrderLineBuild = {
  title: string
  price: string
  quantity: number
  properties: DraftOrderProperty[]
}

const SHORT_ID_RE = /^[A-HJ-NP-Z2-9]{8,24}$/i
const MAX_UNIT_CENTS = 99_999
const MAX_TOTAL_CENTS = 500_000
const MAX_LINES = 20

export function centsToShopifyPrice(cents: number): string {
  const n = Math.max(0, Math.round(cents)) / 100
  return n.toFixed(2)
}

export function clampDraftQuantity(n: unknown): number {
  const x = typeof n === 'number' ? n : parseInt(String(n), 10)
  if (!Number.isFinite(x)) return 1
  return Math.min(99, Math.max(1, Math.round(x)))
}

function optHttps(v: unknown, max = 2048): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  if (!t || t.length > max) return undefined
  if (!/^https:\/\//i.test(t)) return undefined
  return t
}

export function validateDraftOrderLine(raw: unknown):
  | { ok: true; value: DraftOrderLineInput }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Ungültige Zeile.' }
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
    return { ok: false, error: 'Gesamtbetrag einer Zeile zu hoch.' }
  }

  const productTitle =
    String(b.productTitle ?? 'NFC Schlüsselanhänger').trim().slice(0, 120) ||
    'NFC Schlüsselanhänger'

  return {
    ok: true,
    value: {
      shortId,
      productId,
      productTitle,
      quantity,
      unitPriceCents,
      previewUrl: optHttps(b.previewUrl),
      micrositeUrl: optHttps(b.micrositeUrl),
      ccpUrl: optHttps(b.ccpUrl),
      destinationUrl: optHttps(b.destinationUrl),
      variantId:
        typeof b.variantId === 'string' && /^\d+$/.test(b.variantId.trim())
          ? b.variantId.trim()
          : undefined,
      priceHint:
        typeof b.priceHint === 'string' ? b.priceHint.trim().slice(0, 255) : undefined,
    },
  }
}

export function validateDraftOrderInput(raw: unknown):
  | { ok: true; value: { lines: DraftOrderLineInput[] } }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Ungültige Anfrage.' }
  const b = raw as Record<string, unknown>

  const lineRawList: unknown[] = Array.isArray(b.lines)
    ? b.lines
    : [b]

  if (lineRawList.length === 0) return { ok: false, error: 'Keine Positionen.' }
  if (lineRawList.length > MAX_LINES) {
    return { ok: false, error: `Maximal ${MAX_LINES} Designs pro Bestellung.` }
  }

  const lines: DraftOrderLineInput[] = []
  const seen = new Set<string>()
  let basketTotal = 0

  for (const row of lineRawList) {
    const checked = validateDraftOrderLine(row)
    if (!checked.ok) return checked
    if (seen.has(checked.value.shortId)) {
      return { ok: false, error: 'Doppelte Config-ID im Warenkorb.' }
    }
    seen.add(checked.value.shortId)
    basketTotal += checked.value.unitPriceCents * checked.value.quantity
    if (basketTotal > MAX_TOTAL_CENTS) {
      return { ok: false, error: 'Gesamtbetrag zu hoch – bitte weniger Designs/Stück.' }
    }
    lines.push(checked.value)
  }

  return { ok: true, value: { lines } }
}

export function buildDraftOrderLineItem(
  input: DraftOrderLineInput,
  /** Server-seitiger Stückpreis (Staffel nur aus input.quantity) */
  unitPriceCents: number
): DraftOrderLineBuild {
  const properties: DraftOrderProperty[] = [
    { name: 'Config-ID', value: input.shortId },
    { name: 'Produkt', value: input.productId },
    {
      name: 'Staffel-Basis',
      value: `nur diese Config · ${input.quantity}×`,
    },
  ]
  const priceHint =
    input.priceHint ||
    `${centsToShopifyPrice(unitPriceCents)} € / Stück · ${input.quantity}×`
  properties.push({ name: 'Preis', value: priceHint })
  if (input.previewUrl) properties.push({ name: 'Preview', value: input.previewUrl })
  if (input.micrositeUrl) properties.push({ name: 'Handy-Seite', value: input.micrositeUrl })
  if (input.destinationUrl) properties.push({ name: 'Ziel-URL', value: input.destinationUrl })
  if (input.ccpUrl) {
    properties.push({ name: '_CCP-URL', value: input.ccpUrl })
    properties.push({ name: 'Bearbeiten-Link', value: input.ccpUrl })
  }
  if (input.variantId) properties.push({ name: 'Variant-ID', value: input.variantId })

  return {
    title: `${input.productTitle} – personalisiert`,
    price: centsToShopifyPrice(unitPriceCents),
    quantity: input.quantity,
    properties,
  }
}

/** @deprecated use buildDraftOrderLineItem – kept for older tests */
export function buildDraftOrderLine(input: DraftOrderLineInput) {
  const item = buildDraftOrderLineItem(input, input.unitPriceCents)
  return {
    ...item,
    note: `NUDAIM · ${input.shortId} · ${input.quantity}×`,
    tags: 'nudaim,konfigurator,draft-price,per-line',
  }
}

export function buildShopifyDraftOrderRestBody(
  lines: DraftOrderLineInput[],
  /** unit prices already resolved per line (server) */
  unitPricesCents: number[]
): { draft_order: Record<string, unknown> } {
  const items = lines.map((line, i) => {
    const unit = unitPricesCents[i] ?? line.unitPriceCents
    const built = buildDraftOrderLineItem(line, unit)
    return {
      title: built.title,
      price: built.price,
      quantity: built.quantity,
      properties: built.properties,
      requires_shipping: true,
      taxable: true,
    }
  })
  const noteParts = lines.map(
    (l, i) => `${l.shortId}:${l.quantity}×@${centsToShopifyPrice(unitPricesCents[i] ?? l.unitPriceCents)}`
  )
  return {
    draft_order: {
      line_items: items,
      note: `NUDAIM Konfigurator · per-line pricing · ${noteParts.join(' · ')}`,
      tags: 'nudaim,konfigurator,draft-price,per-line',
    },
  }
}
