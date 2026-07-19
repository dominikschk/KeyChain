import { describe, expect, it } from 'vitest'
import { validateDraftOrderInput } from '../shopifyDraftOrder'

describe('draft checkout validation (client path)', () => {
  it('accepts multi-line basket payload', () => {
    const r = validateDraftOrderInput({
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
    expect(r.ok).toBe(true)
  })

  it('rejects empty body for probe-style calls', () => {
    const r = validateDraftOrderInput({})
    expect(r.ok).toBe(false)
  })
})
