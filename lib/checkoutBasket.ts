/**
 * Checkout-Korb: mehrere personalisierte Designs, jeweils eigene Stückzahl/Staffel.
 */
import { clampOrderQuantity } from './bulkOrder'
import { resolveCheckoutPrice } from './shopifyPricing'

export type CheckoutBasketLine = {
  shortId: string
  productId: string
  productTitle: string
  quantity: number
  /** Anzeige; Server berechnet Staffel erneut pro Zeile */
  unitPriceCents: number
  totalCents: number
  tierLabel: string
  unitLabel: string
  totalLabel: string
  priceHint: string
  previewUrl?: string
  micrositeUrl?: string
  ccpUrl?: string
  destinationUrl?: string
  /** Nur Basis-Variant als Referenz-Property */
  variantId: string
}

const STORAGE_KEY = 'nudaim_checkout_basket_v1'
const MAX_LINES = 20

export function emptyBasket(): CheckoutBasketLine[] {
  return []
}

export function loadCheckoutBasket(): CheckoutBasketLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((row) => normalizeLine(row))
      .filter((x): x is CheckoutBasketLine => !!x)
      .slice(0, MAX_LINES)
  } catch {
    return []
  }
}

export function saveCheckoutBasket(lines: CheckoutBasketLine[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines.slice(0, MAX_LINES)))
  } catch {
    /* ignore */
  }
}

export function clearCheckoutBasket(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function normalizeLine(row: unknown): CheckoutBasketLine | null {
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  const shortId = String(r.shortId ?? '').trim()
  if (shortId.length < 8) return null
  const productId = String(r.productId ?? 'keychain')
  const quantity = clampOrderQuantity(r.quantity)
  const priced = resolveCheckoutPrice(productId, quantity)
  return {
    shortId,
    productId: priced.productId,
    productTitle: String(r.productTitle ?? priced.productName).slice(0, 120),
    quantity: priced.quantity,
    unitPriceCents: priced.unitPriceCents,
    totalCents: priced.totalCents,
    tierLabel: priced.tierLabel,
    unitLabel: priced.unitLabel,
    totalLabel: priced.totalLabel,
    priceHint: priced.cartPropertyValue,
    previewUrl: typeof r.previewUrl === 'string' ? r.previewUrl : undefined,
    micrositeUrl: typeof r.micrositeUrl === 'string' ? r.micrositeUrl : undefined,
    ccpUrl: typeof r.ccpUrl === 'string' ? r.ccpUrl : undefined,
    destinationUrl: typeof r.destinationUrl === 'string' ? r.destinationUrl : undefined,
    variantId: priced.variantId,
  }
}

export function upsertBasketLine(
  lines: CheckoutBasketLine[],
  next: CheckoutBasketLine
): CheckoutBasketLine[] {
  const priced = resolveCheckoutPrice(next.productId, next.quantity)
  const line: CheckoutBasketLine = {
    ...next,
    productId: priced.productId,
    quantity: priced.quantity,
    unitPriceCents: priced.unitPriceCents,
    totalCents: priced.totalCents,
    tierLabel: priced.tierLabel,
    unitLabel: priced.unitLabel,
    totalLabel: priced.totalLabel,
    priceHint: priced.cartPropertyValue,
    variantId: priced.variantId,
  }
  const without = lines.filter((l) => l.shortId !== line.shortId)
  return [...without, line].slice(0, MAX_LINES)
}

export function removeBasketLine(lines: CheckoutBasketLine[], shortId: string): CheckoutBasketLine[] {
  return lines.filter((l) => l.shortId !== shortId)
}

export function basketTotals(lines: CheckoutBasketLine[]): {
  lineCount: number
  pieceCount: number
  totalCents: number
  totalLabel: string
} {
  const pieceCount = lines.reduce((s, l) => s + l.quantity, 0)
  const totalCents = lines.reduce((s, l) => s + l.totalCents, 0)
  return {
    lineCount: lines.length,
    pieceCount,
    totalCents,
    totalLabel: formatBasketEuro(totalCents),
  }
}

function formatBasketEuro(cents: number): string {
  const n = Math.max(0, Math.round(cents)) / 100
  const euro = `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
  return `${euro} inkl. MwSt.`
}
