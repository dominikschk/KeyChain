import { describe, expect, it } from 'vitest'
import {
  assertPerLinePricing,
  resolveBasketLinePrices,
  resolveCheckoutPrice,
  unitPriceCentsForLine,
} from '../shopifyPricing'

describe('per-line pricing security', () => {
  it('50× Design A bekommt Mengenstaffel, 1× Design B bleibt Einzelpreis', () => {
    const bulk = resolveCheckoutPrice('keychain', 50)
    const single = resolveCheckoutPrice('keychain', 1)
    expect(bulk.unitPriceCents).toBeLessThan(single.unitPriceCents)

    const check = assertPerLinePricing([
      { productId: 'keychain', quantity: 50 },
      { productId: 'keychain', quantity: 1 },
    ])
    expect(check.ok).toBe(true)
    expect(check.priced[0]!.unitPriceCents).toBe(bulk.unitPriceCents)
    expect(check.priced[1]!.unitPriceCents).toBe(single.unitPriceCents)
    expect(check.priced[1]!.unitPriceCents).not.toBe(bulk.unitPriceCents)
  })

  it('Warenkorb-Summe darf Staffel nicht über Designs vererben', () => {
    const lines = resolveBasketLinePrices([
      { productId: 'keychain', quantity: 99 },
      { productId: 'keychain', quantity: 1 },
    ])
    const ifPooled = unitPriceCentsForLine('keychain', 100)
    expect(lines[1]!.unitPriceCents).toBe(unitPriceCentsForLine('keychain', 1))
    expect(lines[1]!.unitPriceCents).not.toBe(ifPooled)
    expect(lines[0]!.unitPriceCents).toBe(unitPriceCentsForLine('keychain', 99))
  })

  it('Cart nutzt immer Basis-Variant (kein Bulk-Variant-Gaming)', () => {
    const one = resolveCheckoutPrice('keychain', 1)
    const many = resolveCheckoutPrice('keychain', 50)
    expect(one.variantId).toBe(many.variantId)
  })
})
