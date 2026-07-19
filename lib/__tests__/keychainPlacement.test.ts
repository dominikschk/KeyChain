import { describe, expect, it } from 'vitest'
import {
  KEYCHAIN_CONTENT_ZONE,
  KEYCHAIN_PLATE_BOUNDS,
  clampToContentZone,
  rectCenter,
  rectToCssPercent,
  zoneToPixels,
} from '../keychainPlacement'

describe('keychainPlacement', () => {
  it('keeps content zone inside plate bounds', () => {
    const plate = KEYCHAIN_PLATE_BOUNDS
    const zone = KEYCHAIN_CONTENT_ZONE
    expect(zone.x).toBeGreaterThanOrEqual(plate.x)
    expect(zone.y).toBeGreaterThanOrEqual(plate.y)
    expect(zone.x + zone.w).toBeLessThanOrEqual(plate.x + plate.w + 1e-9)
    expect(zone.y + zone.h).toBeLessThanOrEqual(plate.y + plate.h + 1e-9)
  })

  it('centers content on the plate face (right of rings)', () => {
    const c = rectCenter(KEYCHAIN_CONTENT_ZONE)
    expect(c.x).toBeGreaterThan(0.55)
    expect(c.x).toBeLessThan(0.75)
    expect(c.y).toBeGreaterThan(0.4)
    expect(c.y).toBeLessThan(0.6)
  })

  it('clamps points into the content zone', () => {
    const z = KEYCHAIN_CONTENT_ZONE
    expect(clampToContentZone(0, 0)).toEqual({ x: z.x, y: z.y })
    expect(clampToContentZone(1, 1)).toEqual({ x: z.x + z.w, y: z.y + z.h })
    expect(clampToContentZone(z.x + z.w / 2, z.y + z.h / 2)).toEqual({
      x: z.x + z.w / 2,
      y: z.y + z.h / 2,
    })
  })

  it('maps normalized rects to CSS percents and pixels', () => {
    const css = rectToCssPercent({ x: 0.1, y: 0.2, w: 0.3, h: 0.4 })
    expect(css).toEqual({ left: '10%', top: '20%', width: '30%', height: '40%' })
    expect(zoneToPixels({ x: 0.5, y: 0.25, w: 0.2, h: 0.1 }, 10, 20, 100, 200)).toEqual({
      x: 60,
      y: 70,
      w: 20,
      h: 20,
    })
  })
})
