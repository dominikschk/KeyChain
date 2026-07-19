import { describe, expect, it } from 'vitest'
import {
  formatEuroFromCents,
  pricingHintForQuantity,
  resolveCheckoutPrice,
} from '../shopifyPricing'
import { buildShopifyCartUrl } from '../../constants'

describe('shopifyPricing', () => {
  it('formatiert Euro aus Cent', () => {
    expect(formatEuroFromCents(2490)).toBe('24,90 €')
    expect(formatEuroFromCents(100)).toBe('1,00 €')
  })

  it('wählt Einzelpreis und Summe für Menge 1', () => {
    const p = resolveCheckoutPrice('keychain', 1)
    expect(p.quantity).toBe(1)
    expect(p.unitPriceCents).toBe(2490)
    expect(p.totalCents).toBe(2490)
    expect(p.variantId).toMatch(/^\d+$/)
    expect(p.totalLabel).toContain('€')
  })

  it('staffelt ab 10 und 25 Stück günstiger', () => {
    const one = resolveCheckoutPrice('keychain', 1)
    const ten = resolveCheckoutPrice('keychain', 10)
    const twentyFive = resolveCheckoutPrice('keychain', 25)
    expect(ten.unitPriceCents).toBeLessThan(one.unitPriceCents)
    expect(twentyFive.unitPriceCents).toBeLessThan(ten.unitPriceCents)
    expect(ten.totalCents).toBe(ten.unitPriceCents * 10)
    expect(ten.tierLabel.toLowerCase()).toContain('10')
  })

  it('nutzt Badge-Preise getrennt', () => {
    const badge = resolveCheckoutPrice('badge', 1)
    const key = resolveCheckoutPrice('keychain', 1)
    expect(badge.unitPriceCents).not.toBe(key.unitPriceCents)
    expect(badge.productId).toBe('badge')
  })

  it('gibt kundenfreundlichen Hinweis zur per-line Staffel', () => {
    expect(pricingHintForQuantity('keychain', 1)).toMatch(/Konfiguration|Design/i)
    expect(pricingHintForQuantity('keychain', 12)).toMatch(/10|Design|dieses/i)
  })

  it('hängt Preis-Property an Cart-URL', () => {
    const priced = resolveCheckoutPrice('keychain', 3)
    const url = buildShopifyCartUrl(
      priced.variantId,
      'ABCDEFGHJKLMNPQR',
      'https://example.com/p.png',
      'https://konfigurator.nudaim3d.de',
      'a'.repeat(64),
      undefined,
      priced.quantity,
      priced.cartPropertyValue
    )
    expect(url).toContain('quantity=3')
    expect(url).toContain('properties%5BPreis%5D=')
    expect(decodeURIComponent(url)).toContain('Stück')
  })
})
