import { describe, expect, it } from 'vitest'
import { checkRateLimit, resetRateLimitBuckets } from '../rateLimit'
import { buildPricingSnapshot, parsePricingSnapshot } from '../pricingSnapshot'
import { assessLogoHealth } from '../logoHealth'

describe('rateLimit', () => {
  it('blocks after limit in window', () => {
    resetRateLimitBuckets()
    const key = 'test-ip'
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key, { limit: 3, windowMs: 60_000 }).allowed).toBe(true)
    }
    expect(checkRateLimit(key, { limit: 3, windowMs: 60_000 }).allowed).toBe(false)
  })
})

describe('pricingSnapshot', () => {
  it('roundtrips', () => {
    const snap = buildPricingSnapshot({
      productId: 'keychain',
      quantity: 10,
      unitPriceCents: 2190,
      totalCents: 21900,
      tierLabel: 'Ab 10 Stück',
      pricedAt: '2026-07-19T12:00:00.000Z',
    })
    expect(parsePricingSnapshot(snap)?.quantity).toBe(10)
    expect(parsePricingSnapshot(snap)?.unitPriceCents).toBe(2190)
  })

  it('rejects garbage', () => {
    expect(parsePricingSnapshot(null)).toBeNull()
    expect(parsePricingSnapshot({ productId: 'x', quantity: 0, unitPriceCents: 10 })).toBeNull()
  })
})

describe('logoHealth thin strokes', () => {
  it('flags very thin strokes', () => {
    const svg = '<svg><path fill="#111" stroke="#000" stroke-width="0.1"/></svg>'
    const h = assessLogoHealth(svg)
    expect(h.willSimplifyForPrint).toBe(true)
    expect(h.level).toBe('info')
  })
})
