/**
 * Preisschichtung für den Anhänger-Checkout.
 *
 * Wichtig: Shopify berechnet den Endpreis immer über die Variant-ID.
 * Hier wählen wir die passende Variante (Staffel) und zeigen den
 * erwarteten Preis – die Beträge müssen im Shop gleich eingestellt sein.
 *
 * Beliebige Euro-Beträge per Cart-Link gehen ohne Draft Order nicht.
 */

import { PRODUCTS } from '../constants'
import { clampOrderQuantity } from './bulkOrder'

export type PriceTier = {
  /** Ab dieser Stückzahl gilt die Staffel */
  minQty: number
  /** Bruttopreis pro Stück in Cent */
  unitPriceCents: number
  /** Optionale Shopify-Variant-ID für diese Staffel */
  variantId?: string
  label: string
}

export type ResolvedCheckoutPrice = {
  productId: string
  productName: string
  quantity: number
  unitPriceCents: number
  totalCents: number
  variantId: string
  tierLabel: string
  /** Kurzer Text für UI, z. B. „24,90 € / Stück“ */
  unitLabel: string
  /** z. B. „74,70 €“ */
  totalLabel: string
  /** Property für Shopify-Warenkorb (nur Hinweis, kein Abbuchungsbetrag) */
  cartPropertyValue: string
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
  // Erlaubt "24.90", "24,90" oder reine Cent "2490"
  if (/^\d+$/.test(raw) && raw.length >= 3) {
    const n = parseInt(raw, 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }
  const euros = parseFloat(raw.replace(',', '.'))
  if (!Number.isFinite(euros) || euros <= 0) return fallback
  return Math.round(euros * 100)
}

function envVariantId(key: string): string | undefined {
  const v = envString(key)
  return v && /^\d+$/.test(v) ? v : undefined
}

export function formatEuroFromCents(cents: number): string {
  const n = Math.max(0, Math.round(cents)) / 100
  return `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

/**
 * Default-Staffeln (über Env überschreibbar).
 * Variant-Overrides nur setzen, wenn im Shop eigene Staffel-Varianten existieren.
 */
export function priceTiersForProduct(productId: string): PriceTier[] {
  if (productId === 'badge') {
    return [
      {
        minQty: 1,
        unitPriceCents: envCents('VITE_PRICE_BADGE_CENTS', 3990),
        variantId: envVariantId('VITE_SHOPIFY_VARIANT_BADGE'),
        label: 'Einzelpreis',
      },
      {
        minQty: 10,
        unitPriceCents: envCents('VITE_PRICE_BADGE_Q10_CENTS', 3490),
        variantId: envVariantId('VITE_SHOPIFY_VARIANT_BADGE_Q10'),
        label: 'Ab 10 Stück',
      },
      {
        minQty: 25,
        unitPriceCents: envCents('VITE_PRICE_BADGE_Q25_CENTS', 2990),
        variantId: envVariantId('VITE_SHOPIFY_VARIANT_BADGE_Q25'),
        label: 'Ab 25 Stück',
      },
    ]
  }

  // keychain (default)
  return [
    {
      minQty: 1,
      unitPriceCents: envCents('VITE_PRICE_KEYCHAIN_CENTS', 2490),
      variantId: envVariantId('VITE_SHOPIFY_VARIANT_KEYCHAIN'),
      label: 'Einzelpreis',
    },
    {
      minQty: 10,
      unitPriceCents: envCents('VITE_PRICE_KEYCHAIN_Q10_CENTS', 2190),
      variantId: envVariantId('VITE_SHOPIFY_VARIANT_KEYCHAIN_Q10'),
      label: 'Ab 10 Stück',
    },
    {
      minQty: 25,
      unitPriceCents: envCents('VITE_PRICE_KEYCHAIN_Q25_CENTS', 1890),
      variantId: envVariantId('VITE_SHOPIFY_VARIANT_KEYCHAIN_Q25'),
      label: 'Ab 25 Stück',
    },
  ]
}

function pickTier(productId: string, qty: number): PriceTier {
  const tiers = [...priceTiersForProduct(productId)].sort((a, b) => a.minQty - b.minQty)
  let chosen = tiers[0]!
  for (const t of tiers) {
    if (qty >= t.minQty) chosen = t
  }
  return chosen
}

function baseVariantId(productId: string): string {
  const product = PRODUCTS.find((p) => p.id === productId) ?? PRODUCTS[0]
  return product?.variantId ?? '56564338262361'
}

/**
 * Löst Stückpreis, Gesamtsumme und Shopify-Variant für den Checkout auf.
 * Ohne Staffel-Variant-ID fällt auf die Basis-Variante zurück
 * (dann müssen Mengenrabatte im Shopify-Admin liegen).
 */
export function resolveCheckoutPrice(
  productId: string,
  quantity: unknown
): ResolvedCheckoutPrice {
  const qty = clampOrderQuantity(quantity)
  const product = PRODUCTS.find((p) => p.id === productId) ?? PRODUCTS[0]
  const pid = product?.id ?? 'keychain'
  const tier = pickTier(pid, qty)
  const variantId = tier.variantId || baseVariantId(pid)
  const unit = tier.unitPriceCents
  const total = unit * qty

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

/** Kurzer UI-Hinweis unter der Stückzahl. */
export function pricingHintForQuantity(productId: string, quantity: unknown): string {
  const p = resolveCheckoutPrice(productId, quantity)
  if (p.quantity >= 10) {
    return `${p.tierLabel}: ${p.unitLabel}. Gesamt ca. ${p.totalLabel} – Endpreis im Warenkorb.`
  }
  return `Ca. ${p.unitLabel}. Endpreis siehst du im Warenkorb.`
}
