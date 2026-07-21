import { describe, expect, it } from 'vitest'
import { hexForColorInput, normalizeHexColor } from '../hexColor'

describe('hexColor', () => {
  it('normalisiert Hex-Eingaben', () => {
    expect(normalizeHexColor('#12A9E0')).toBe('#12A9E0')
    expect(normalizeHexColor('12a9e0')).toBe('#12A9E0')
    expect(normalizeHexColor('#abc')).toBe('#AABBCC')
    expect(normalizeHexColor('nope')).toBeNull()
  })

  it('liefert Fallback für color input', () => {
    expect(hexForColorInput(undefined, '#11235A')).toBe('#11235A')
    expect(hexForColorInput('12A9E0', '#11235A')).toBe('#12A9E0')
  })
})
