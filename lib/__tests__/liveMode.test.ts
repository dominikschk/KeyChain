import { describe, expect, it } from 'vitest'
import { featuresFullEnabled, isLiveSimple } from '../liveMode'
import { PRODUCTS } from '../../constants'

describe('liveMode go-live defaults', () => {
  it('is live-simple by default (no VITE_FEATURES_FULL)', () => {
    expect(isLiveSimple()).toBe(true)
    expect(featuresFullEnabled()).toBe(false)
  })

  it('exposes only keychain product while live-simple', () => {
    expect(PRODUCTS.every((p) => p.id === 'keychain')).toBe(true)
    expect(PRODUCTS.length).toBeGreaterThanOrEqual(1)
  })
})
