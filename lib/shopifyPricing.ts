/**
 * Preisschichtung – Staffel gilt NUR pro Bestellzeile / Konfiguration.
 *
 * Sicherheit: 50× Design A + 1× Design B → B bleibt Einzelpreis.
 * Mengen werden nie über Designs hinweg addiert.
 * Cart-Fallback nutzt immer die Basis-Variante (kein günstiger Bulk-Variant × 1).
 */

import { PRODUCTS } from '../constants'
import { clampOrderQuantity } from './bulkOrder'

export type PriceTier = {
  minQty: number
  unitPriceCents: number
  label: string
}

export type ResolvedCheckoutPrice = {
  productId: string
  productName: string
  quantity: number
  unitPriceCents: number
  totalCents: number
  /** Immer Basis-Variante – nie Staffel-Variant (Anti-Gaming). */
  variantId: string
  tierLabel: string
  unitLabel: string
  totalLabel: string
  cartPropertyValue: string
}

export type BasketPriceLineInput = {
  productId: string
  quantity: unknown
}

function envString(key: string): string | undefined {
  try {
    const v = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.[key]?.trim()
    return v || undefined
  } catch {
    return undefined
  }
}

function envCents(key: string, fallback: number): number {
  const raw = envString(key)
  if (!raw) return fallback
  if (/^\d+$/.test(raw) && raw.length >= 3) {
    const n = parseInt(raw, 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }
  const euros = parseFloat(raw.replace(',', '.'))
  if (!Number.isFinite(euros) || euros <= 0) return fallback
  return Math.round(euros * 100)
}

export function formatEuroFromCents(cents: number): string {
  const n = Math.max(0, Math.round(cents)) / 100
  return `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

export function priceTiersForProduct(productId: string): PriceTier[] {
  if (productId === 'badge') {
    return [
      {
        minQty: 1,
        unitPriceCents: envCents('VITE_PRICE_BADGE_CENTS', 3990),
        label: 'Einzelpreis',
      },
      {
        minQty: 10,
        unitPriceCents: envCents('VITE_PRICE_BADGE_Q10_CENTS', 3490),
        label: 'Ab 10 Stück',
      },
      {
        minQty: 25,
        unitPriceCents: envCents('VITE_PRICE_BADGE_Q25_CENTS', 2990),
        label: 'Ab 25 Stück',
      },
    ]
  }

  return [
    {
      minQty: 1,
      unitPriceCents: envCents('VITE_PRICE_KEYCHAIN_CENTS', 2490),
      label: 'Einzelpreis',
    },
    {
      minQty: 10,
      unitPriceCents: envCents('VITE_PRICE_KEYCHAIN_Q10_CENTS', 2190),
      label: 'Ab 10 Stück',
    },
    {
      minQty: 25,
      unitPriceCents: envCents('VITE_PRICE_KEYCHAIN_Q25_CENTS', 1890),
      label: 'Ab 25 Stück',
    },
  ]
}

/** Staffel nur aus der Stückzahl DIESER Zeile – nie aus Warenkorb-Summe. */
export function pickTierForLineQuantity(productId: string, lineQuantity: number): PriceTier {
  const qty = clampOrderQuantity(lineQuantity)
  const tiers = [...priceTiersForProduct(productId)].sort((a, b) => a.minQty - b.minQty)
  let chosen = tiers[0]!
  for (const t of tiers) {
    if (qty >= t.minQty) chosen = t
  }
  return chosen
}

export function unitPriceCentsForLine(productId: string, lineQuantity: unknown): number {
  return pickTierForLineQuantity(productId, clampOrderQuantity(lineQuantity)).unitPriceCents
}

function baseVariantId(productId: string): string {
  const product = PRODUCTS.find((p) => p.id === productId) ?? PRODUCTS[0]
  return product?.variantId ?? '56564338262361'
}

/**
 * Preis für genau eine Konfiguration / Zeile.
 * `quantity` = Stückzahl dieses Designs, nicht die Summe anderer Designs.
 */
export function resolveCheckoutPrice(
  productId: string,
  quantity: unknown
): ResolvedCheckoutPrice {
  const qty = clampOrderQuantity(quantity)
  const product = PRODUCTS.find((p) => p.id === productId) ?? PRODUCTS[0]
  const pid = product?.id ?? 'keychain'
  const tier = pickTierForLineQuantity(pid, qty)
  const unit = tier.unitPriceCents
  const total = unit * qty
  // Wichtig: nie Staffel-Variant-ID – sonst qty=1 + günstige Variant = Preis-Lücke
  const variantId = baseVariantId(pid)

  const unitLabel = `${formatEuroFromCents(unit)} / Stück`
  const totalLabel = formatEuroFromCents(total)
  const cartPropertyValue =
    qty > 1
      ? `${unitLabel} · ${qty}× = ${totalLabel} (${tier.label})`
      : `${unitLabel} (${tier.label})`

  return {
    productId: pid,
    productName: product?.name ?? 'Schlüsselanhänger',
    quantity: qty,
    unitPriceCents: unit,
    totalCents: total,
    variantId,
    tierLabel: tier.label,
    unitLabel,
    totalLabel,
    cartPropertyValue,
  }
}

/**
 * Mehrere Designs: jede Zeile eigene Staffel.
 * Summe der Mengen darf die Staffel anderer Zeilen nicht beeinflussen.
 */
export function resolveBasketLinePrices(lines: BasketPriceLineInput[]): ResolvedCheckoutPrice[] {
  return lines.map((line) => resolveCheckoutPrice(line.productId, line.quantity))
}

/** Sicherheits-Check: Einzelstück darf nicht die Mengen-Staffel einer anderen Zeile erben. */
export function assertPerLinePricing(lines: BasketPriceLineInput[]): {
  ok: boolean
  priced: ResolvedCheckoutPrice[]
  reason?: string
} {
  const priced = resolveBasketLinePrices(lines)
  const totalQty = priced.reduce((s, p) => s + p.quantity, 0)
  for (let i = 0; i < priced.length; i++) {
    const line = priced[i]!
    const alone = resolveCheckoutPrice(line.productId, line.quantity)
    if (line.unitPriceCents !== alone.unitPriceCents) {
      return {
        ok: false,
        priced,
        reason: `Zeile ${i}: Stückpreis weicht von Solo-Staffel ab`,
      }
    }
    // Wenn diese Zeile qty=1 hat, darf sie nicht den Preis der Warenkorb-Summe bekommen
    if (line.quantity === 1 && totalQty > 1) {
      const ifPooled = resolveCheckoutPrice(line.productId, totalQty)
      if (line.unitPriceCents === ifPooled.unitPriceCents && alone.unitPriceCents !== ifPooled.unitPriceCents) {
        return {
          ok: false,
          priced,
          reason: `Zeile ${i}: würde fälschlich Mengen-Staffel aus Warenkorb-Summe erben`,
        }
      }
      if (line.unitPriceCents !== alone.unitPriceCents) {
        return { ok: false, priced, reason: `Zeile ${i}: Einzelstück nicht am Einzelpreis` }
      }
    }
  }
  return { ok: true, priced }
}

export function pricingHintForQuantity(productId: string, quantity: unknown): string {
  const p = resolveCheckoutPrice(productId, quantity)
  if (p.quantity >= 10) {
    return `${p.tierLabel} nur für dieses Design (${p.quantity}×): ${p.unitLabel}. Gesamt ca. ${p.totalLabel}.`
  }
  return `Ca. ${p.unitLabel}. Mengenrabatt gilt nur für dieselbe Konfiguration, nicht für andere Designs.`
}
