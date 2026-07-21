import { describe, expect, it } from 'vitest'
import {
  clampLogoPos,
  engraveFontCss,
  isEngraveFontId,
  LOGO_POS_MAX,
  LOGO_POS_MIN,
} from '../engraveFonts'

describe('engraveFonts', () => {
  it('clamped logo position', () => {
    expect(clampLogoPos(0)).toBe(0)
    expect(clampLogoPos(100)).toBe(LOGO_POS_MAX)
    expect(clampLogoPos(-100)).toBe(LOGO_POS_MIN)
    expect(clampLogoPos(1.25)).toBe(1.5)
  })

  it('kennt Anhänger-Schriften', () => {
    expect(isEngraveFontId('classic')).toBe(true)
    expect(isEngraveFontId('nope')).toBe(false)
    expect(engraveFontCss('elegant')).toContain('elegant')
  })
})
