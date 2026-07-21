import { describe, expect, it } from 'vitest'
import {
  KEYCHAIN_COLORWAYS,
  KEYCHAIN_PLATE_COLORS,
  colorwayByHex,
  keychainPhotoForPlate,
} from '../keychainPhotos'

describe('keychainPhotos', () => {
  it('wählt Farbfotos für Standard-Platten', () => {
    expect(keychainPhotoForPlate('#2A2A2A').src).toContain('black')
    expect(keychainPhotoForPlate('#11235A').src).toContain('navy')
    expect(keychainPhotoForPlate('#F8F5F0').src).toContain('base')
    expect(keychainPhotoForPlate('#F8F5F0').bakedIn).toBe(true)
  })

  it('kennt Studio-Colorways inkl. neuer Fotos', () => {
    expect(keychainPhotoForPlate('#7EB8E8').src).toContain('sky')
    expect(keychainPhotoForPlate('#6B4A2E').src).toContain('brown')
    expect(keychainPhotoForPlate('#E85D04').src).toContain('orange')
    expect(keychainPhotoForPlate('#A8D83A').src).toContain('lime')
    expect(keychainPhotoForPlate('#FF4D4D').src).toContain('red')
  })

  it('exportiert eine vollständige Colorway-Liste', () => {
    expect(KEYCHAIN_COLORWAYS.length).toBeGreaterThanOrEqual(10)
    expect(KEYCHAIN_PLATE_COLORS).toHaveLength(KEYCHAIN_COLORWAYS.length)
    expect(colorwayByHex('#2A2A2A')?.label).toBe('Schwarz')
    expect(colorwayByHex('#7EB8E8')?.label).toBe('Himmelblau')
  })
})
