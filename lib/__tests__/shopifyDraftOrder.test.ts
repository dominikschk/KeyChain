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

  it('akzeptiert auch I/O/0/1 in Config-IDs (Server-kompatibel)', () => {
    const ok = validateDraftOrderInput({
      shortId: 'AB01IOXY23456789',
      productId: 'keychain',
      productTitle: 'Schlüsselanhänger',
      quantity: 1,
      unitPriceCents: 150,
    })
    expect(ok.ok).toBe(true)
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
      expect(ok.value.lines).toHaveLength(1)
      expect(ok.value.lines[0]!.quantity).toBe(3)
    }
  })

  it('nimmt mehrere Lines mit je eigener Config', () => {
    const ok = validateDraftOrderInput({
      lines: [
        {
          shortId: 'ABCDEFGHJKLMNPQR',
          productId: 'keychain',
          productTitle: 'A',
          quantity: 50,
          unitPriceCents: 1890,
        },
        {
          shortId: 'QRSTUVWX23456789',
          productId: 'keychain',
          productTitle: 'B',
          quantity: 1,
          unitPriceCents: 2490,
        },
      ],
    })
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.value.lines).toHaveLength(2)
  })

  it('lehnt doppelte Config-IDs ab', () => {
    const r = validateDraftOrderInput({
      lines: [
        {
          shortId: 'ABCDEFGHJKLMNPQR',
          productId: 'keychain',
          quantity: 2,
          unitPriceCents: 2490,
        },
        {
          shortId: 'ABCDEFGHJKLMNPQR',
          productId: 'keychain',
          quantity: 1,
          unitPriceCents: 2490,
        },
      ],
    })
    expect(r.ok).toBe(false)
  })

  it('baut REST-Body mit Properties und Custom-Preis', () => {
    const input = {
      shortId: 'ABCDEFGHJKLMNPQR',
      productId: 'keychain',
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

    const body = buildShopifyDraftOrderRestBody(
      [
        input,
        {
          shortId: 'QRSTUVWX23456789',
          productId: 'keychain',
          productTitle: 'Zweites Design',
          quantity: 1,
          unitPriceCents: 2490,
        },
      ],
      [1890, 2490]
    )
    const items = body.draft_order.line_items as Array<Record<string, unknown>>
    expect(items).toHaveLength(2)
    expect(items[0]!.price).toBe('18.90')
    expect(items[1]!.price).toBe('24.90')
    expect(items[1]!.quantity).toBe(1)
  })
})
