/**
 * Preisschichtung – Staffel gilt NUR pro Bestellzeile / Konfiguration.
 *
 * Sicherheit: 50× Design A + 1× Design B → B bleibt Einzelpreis.
 * Mengen werden nie über Designs hinweg addiert.
 * Cart-Fallback nutzt immer die Basis-Variante (kein günstiger Bulk-Variant × 1).
 */

import { PRODUCTS } from '../constants'
import { clampOrderQuantity } from './bulkOrder'
import {
  DEFAULT_BADGE_TIERS,
  DEFAULT_KEYCHAIN_TIERS,
  parseMoneyToCents,
  parseTiersEnvString,
  pickTierFromList,
  type PriceTierDef,
} from './priceTiers'

export type PriceTier = PriceTierDef

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
  return parseMoneyToCents(envString(key) ?? '', fallback)
}

export function formatEuroFromCents(cents: number): string {
  const n = Math.max(0, Math.round(cents)) / 100
  return `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

/** Kundenpreis inkl. MwSt. (PAngV-Hinweis). */
export function formatEuroInclVatFromCents(cents: number): string {
  return `${formatEuroFromCents(cents)} inkl. MwSt.`
}

/**
 * Staffeln: bevorzugt `VITE_PRICE_*_TIERS` (beliebig viele Stufen).
 * Fallback: feste Defaults (NFC-Preisliste) bzw. Legacy Q10/Q25 wenn gesetzt.
 */
export function priceTiersForProduct(productId: string): PriceTier[] {
  if (productId === 'badge') {
    const fromList = parseTiersEnvString(envString('VITE_PRICE_BADGE_TIERS'), [])
    if (fromList.length > 0) return fromList
    return [
      {
        minQty: 1,
        unitPriceCents: envCents('VITE_PRICE_BADGE_CENTS', DEFAULT_BADGE_TIERS[0]!.unitPriceCents),
        label: 'Einzelpreis',
      },
      {
        minQty: 10,
        unitPriceCents: envCents('VITE_PRICE_BADGE_Q10_CENTS', DEFAULT_BADGE_TIERS[1]!.unitPriceCents),
        label: 'Ab 10 Stück',
      },
      {
        minQty: 25,
        unitPriceCents: envCents('VITE_PRICE_BADGE_Q25_CENTS', DEFAULT_BADGE_TIERS[2]!.unitPriceCents),
        label: 'Ab 25 Stück',
      },
    ]
  }

  const fromList = parseTiersEnvString(envString('VITE_PRICE_KEYCHAIN_TIERS'), [])
  if (fromList.length > 0) return fromList

  // Legacy 3er-Staffel nur wenn Q10/Q25 explizit gesetzt (nicht bei nur CENTS – sonst NFC-Liste kaputt)
  const legacyQ10 = envString('VITE_PRICE_KEYCHAIN_Q10_CENTS')
  const legacyQ25 = envString('VITE_PRICE_KEYCHAIN_Q25_CENTS')
  if (legacyQ10 || legacyQ25) {
    return [
      {
        minQty: 1,
        unitPriceCents: envCents('VITE_PRICE_KEYCHAIN_CENTS', DEFAULT_KEYCHAIN_TIERS[0]!.unitPriceCents),
        label: 'Einzelpreis',
      },
      {
        minQty: 10,
        unitPriceCents: envCents('VITE_PRICE_KEYCHAIN_Q10_CENTS', 120),
        label: 'Ab 10 Stück',
      },
      {
        minQty: 25,
        unitPriceCents: envCents('VITE_PRICE_KEYCHAIN_Q25_CENTS', 100),
        label: 'Ab 25 Stück',
      },
    ]
  }

  return DEFAULT_KEYCHAIN_TIERS.map((t) => ({ ...t }))
}

/** Staffel nur aus der Stückzahl DIESER Zeile – nie aus Warenkorb-Summe. */
export function pickTierForLineQuantity(productId: string, lineQuantity: number): PriceTier {
  const qty = clampOrderQuantity(lineQuantity)
  return pickTierFromList(priceTiersForProduct(productId), qty)
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

  const unitLabel = `${formatEuroInclVatFromCents(unit)} / Stück`
  const totalLabel = formatEuroInclVatFromCents(total)
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
  if (p.quantity >= 20) {
    return `${p.tierLabel} nur für dieses Design (${p.quantity}×): ${p.unitLabel}. Gesamt ca. ${p.totalLabel}.`
  }
  return `Ca. ${p.unitLabel}. Mengenrabatt gilt nur für dieselbe Konfiguration, nicht für andere Designs.`
}
