import { describe, expect, it } from 'vitest'
import { keychainPhotoForPlate } from '../keychainPhotos'

describe('keychainPhotos', () => {
  it('wählt Farbfotos für Standard-Platten', () => {
    expect(keychainPhotoForPlate('#2A2A2A').src).toContain('black')
    expect(keychainPhotoForPlate('#11235A').src).toContain('navy')
    expect(keychainPhotoForPlate('#F8F5F0').src).toContain('base')
    expect(keychainPhotoForPlate('#F8F5F0').bakedIn).toBe(true)
  })
})
