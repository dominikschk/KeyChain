import { describe, expect, it } from 'vitest'
import {
  buildDraftOrderLine,
  buildShopifyDraftOrderRestBody,
  centsToShopifyPrice,
  clampDraftQuantity,
  validateDraftOrderInput,
} from '../shopifyDraftOrder'

describe('shopifyDraftOrder', () => {
  it('formatiert Cent als Shopify-Preis', () => {
    expect(centsToShopifyPrice(2490)).toBe('24.90')
    expect(centsToShopifyPrice(100)).toBe('1.00')
  })

  it('clamped quantity 1–99', () => {
    expect(clampDraftQuantity(0)).toBe(1)
    expect(clampDraftQuantity(150)).toBe(99)
    expect(clampDraftQuantity('12')).toBe(12)
  })

  it('validiert kurze Config-IDs und Preise', () => {
    const bad = validateDraftOrderInput({ shortId: 'x', unitPriceCents: 2490, quantity: 1 })
    expect(bad.ok).toBe(false)

    const ok = validateDraftOrderInput({
      shortId: 'ABCDEFGHJKLMNPQR',
      productId: 'keychain',
      productTitle: 'Schlüsselanhänger',
      quantity: 3,
      unitPriceCents: 2490,
      previewUrl: 'https://example.com/p.png',
      micrositeUrl: 'https://example.com/?id=ABCDEFGHJKLMNPQR',
    })
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.value.quantity).toBe(3)
      expect(ok.value.unitPriceCents).toBe(2490)
    }
  })

  it('lehnt zu hohe Gesamtsummen ab', () => {
    const r = validateDraftOrderInput({
      shortId: 'ABCDEFGHJKLMNPQR',
      productId: 'keychain',
      quantity: 99,
      unitPriceCents: 9000,
    })
    expect(r.ok).toBe(false)
  })

  it('baut REST-Body mit Properties und Custom-Preis', () => {
    const input = {
      shortId: 'ABCDEFGHJKLMNPQR',
      productId: 'keychain' as const,
      productTitle: 'Schlüsselanhänger',
      quantity: 10,
      unitPriceCents: 2190,
      previewUrl: 'https://cdn.example/p.png',
      ccpUrl: 'https://app.example/ccp?id=x&t=y',
      variantId: '56564338262361',
      priceHint: '21,90 € / Stück',
    }
    const line = buildDraftOrderLine(input)
    expect(line.price).toBe('21.90')
    expect(line.quantity).toBe(10)
    expect(line.properties.some((p) => p.name === 'Config-ID')).toBe(true)
    expect(line.properties.some((p) => p.name === 'Bearbeiten-Link')).toBe(true)

    const body = buildShopifyDraftOrderRestBody(input)
    const item = (body.draft_order.line_items as Array<Record<string, unknown>>)[0]!
    expect(item.price).toBe('21.90')
    expect(item.title).toContain('personalisiert')
  })
})
