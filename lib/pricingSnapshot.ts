/**
 * Preis-Snapshot, der mit der Config gespeichert wird (Audit + Draft-Bindung).
 */
export type ConfigPricingSnapshot = {
  productId: string
  quantity: number
  unitPriceCents: number
  totalCents: number
  tierLabel: string
  currency: 'EUR'
  pricedAt: string
  /** Schema-Version für spätere Migrationen */
  v: 1
}

export function buildPricingSnapshot(input: {
  productId: string
  quantity: number
  unitPriceCents: number
  totalCents: number
  tierLabel: string
  pricedAt?: string
}): ConfigPricingSnapshot {
  return {
    productId: input.productId,
    quantity: input.quantity,
    unitPriceCents: input.unitPriceCents,
    totalCents: input.totalCents,
    tierLabel: input.tierLabel,
    currency: 'EUR',
    pricedAt: input.pricedAt ?? new Date().toISOString(),
    v: 1,
  }
}

export function parsePricingSnapshot(raw: unknown): ConfigPricingSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const quantity = Math.round(Number(o.quantity))
  const unitPriceCents = Math.round(Number(o.unitPriceCents))
  const totalCents = Math.round(Number(o.totalCents))
  const productId = String(o.productId ?? '').trim()
  if (!productId || !Number.isFinite(quantity) || quantity < 1) return null
  if (!Number.isFinite(unitPriceCents) || unitPriceCents < 50) return null
  return {
    productId,
    quantity,
    unitPriceCents,
    totalCents: Number.isFinite(totalCents) ? totalCents : unitPriceCents * quantity,
    tierLabel: String(o.tierLabel ?? ''),
    currency: 'EUR',
    pricedAt: String(o.pricedAt ?? ''),
    v: 1,
  }
}
