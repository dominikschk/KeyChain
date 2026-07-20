/**
 * Tests für Consent + Legal-Pfad-Helfer.
 */
import { describe, expect, it, beforeEach } from 'vitest'
import {
  acceptAll,
  acceptEssentialOnly,
  readConsent,
  resetConsentMemory,
  writeConsent,
} from '../consent'
import { isLegalPath, LEGAL_PATHS } from '../legalCompany'

describe('consent', () => {
  beforeEach(() => {
    resetConsentMemory()
  })

  it('startet ohne Entscheidung', () => {
    expect(readConsent().decided).toBe(false)
    expect(readConsent().analytics).toBe(false)
  })

  it('speichert nur notwendige', () => {
    const s = acceptEssentialOnly()
    expect(s.decided).toBe(true)
    expect(s.analytics).toBe(false)
    expect(readConsent().analytics).toBe(false)
  })

  it('speichert alle inkl. Analyse', () => {
    acceptAll()
    expect(readConsent().analytics).toBe(true)
  })

  it('writeConsent setzt Timestamp', () => {
    const s = writeConsent({ analytics: false })
    expect(s.updatedAt).toBeGreaterThan(0)
  })
})

describe('legal paths', () => {
  it('kennt Impressum/Datenschutz/AGB/Widerruf', () => {
    expect(isLegalPath(LEGAL_PATHS.impressum)).toBe(true)
    expect(isLegalPath(LEGAL_PATHS.datenschutz)).toBe(true)
    expect(isLegalPath('/foo')).toBe(false)
  })
})
