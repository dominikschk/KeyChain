import { describe, expect, it } from 'vitest'
import {
  DEFAULT_KEYCHAIN_TIERS,
  parseTiersEnvString,
  pickTierFromList,
} from '../priceTiers'
import {
  formatEuroFromCents,
  formatEuroInclVatFromCents,
  priceTiersForProduct,
  pricingHintForQuantity,
  resolveCheckoutPrice,
} from '../shopifyPricing'
import { buildShopifyCartUrl } from '../../constants'

describe('priceTiers parser', () => {
  it('parst Preisliste-String', () => {
    const tiers = parseTiersEnvString(
      '20:1.50,50:1.45,100:1.40,250:1.30,400:1.20,600:1.10,800:1.00,1000:0.95',
      DEFAULT_KEYCHAIN_TIERS
    )
    expect(tiers[0]!.minQty).toBe(1)
    expect(tiers[0]!.unitPriceCents).toBe(150)
    expect(pickTierFromList(tiers, 20).unitPriceCents).toBe(150)
    expect(pickTierFromList(tiers, 50).unitPriceCents).toBe(145)
    expect(pickTierFromList(tiers, 1000).unitPriceCents).toBe(95)
    expect(pickTierFromList(tiers, 1500).unitPriceCents).toBe(95)
  })
})

describe('shopifyPricing', () => {
  it('formatiert Euro aus Cent', () => {
    expect(formatEuroFromCents(2490)).toBe('24,90 €')
    expect(formatEuroFromCents(100)).toBe('1,00 €')
  })

  it('formatiert inkl. MwSt. für Kundenpreise', () => {
    expect(formatEuroInclVatFromCents(150)).toBe('1,50 € inkl. MwSt.')
  })

  it('wählt NFC-Listenpreis für Menge 1', () => {
    const p = resolveCheckoutPrice('keychain', 1)
    expect(p.quantity).toBe(1)
    expect(p.unitPriceCents).toBe(150)
    expect(p.totalCents).toBe(150)
    expect(p.variantId).toMatch(/^\d+$/)
    expect(p.totalLabel).toContain('€')
    expect(p.totalLabel).toMatch(/inkl\. MwSt/i)
  })

  it('staffelt nach NFC-Preisliste (20 / 50 / 1000)', () => {
    const one = resolveCheckoutPrice('keychain', 1)
    const twenty = resolveCheckoutPrice('keychain', 20)
    const fifty = resolveCheckoutPrice('keychain', 50)
    const thousand = resolveCheckoutPrice('keychain', 1000)
    expect(twenty.unitPriceCents).toBe(150)
    expect(fifty.unitPriceCents).toBe(145)
    expect(thousand.unitPriceCents).toBe(95)
    expect(fifty.unitPriceCents).toBeLessThan(twenty.unitPriceCents)
    expect(thousand.unitPriceCents).toBeLessThan(fifty.unitPriceCents)
    expect(fifty.totalCents).toBe(fifty.unitPriceCents * 50)
    expect(one.unitPriceCents).toBe(150)
  })

  it('Badge-Staffeln bleiben getrennt von Keychain (auch ohne Live-Katalog)', () => {
    const badge = priceTiersForProduct('badge')[0]!
    const key = priceTiersForProduct('keychain')[0]!
    expect(badge.unitPriceCents).not.toBe(key.unitPriceCents)
  })

  it('gibt kundenfreundlichen Hinweis zur per-line Staffel', () => {
    expect(pricingHintForQuantity('keychain', 1)).toMatch(/Konfiguration|Design/i)
    expect(pricingHintForQuantity('keychain', 50)).toMatch(/50|Design|dieses/i)
  })

  it('hängt Preis-Property nur an, wenn explizit übergeben', () => {
    const priced = resolveCheckoutPrice('keychain', 3)
    const withHint = buildShopifyCartUrl(
      priced.variantId,
      'ABCDEFGHJKLMNPQR',
      'https://example.com/p.png',
      'https://konfigurator.nudaim3d.de',
      'a'.repeat(64),
      undefined,
      priced.quantity,
      priced.cartPropertyValue
    )
    expect(withHint).toContain('quantity=3')
    expect(withHint).toContain('properties%5BPreis%5D=')
    expect(decodeURIComponent(withHint)).toContain('Stück')

    const liveCart = buildShopifyCartUrl(
      priced.variantId,
      'ABCDEFGHJKLMNPQR',
      'https://example.com/p.png',
      'https://konfigurator.nudaim3d.de',
      'a'.repeat(64),
      undefined,
      priced.quantity,
      undefined
    )
    expect(liveCart).toContain('quantity=3')
    expect(liveCart).not.toContain('properties%5BPreis%5D=')
  })
})
