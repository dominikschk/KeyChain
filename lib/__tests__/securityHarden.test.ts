import { describe, expect, it } from 'vitest'

/**
 * Mirrors Edge brand-scrape hostname block logic (client-side regression aid).
 * Keep in sync with supabase/functions/brand-scrape/index.ts
 */
function isBlockedHostname(hostname: string): boolean {
  const BLOCKED_HOST =
    /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|\[::1\]|::1$|0\.0\.0\.0|metadata\.google|metadata\.goog|100\.100\.100\.200)/i
  const h = hostname.trim().toLowerCase().replace(/\.$/, '')
  if (!h) return true
  if (BLOCKED_HOST.test(h)) return true
  if (h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h)
  if (ipv4) {
    const parts = ipv4.slice(1).map(Number)
    if (parts.some((n) => n > 255)) return true
    const [a, b] = parts
    if (a === 0 || a === 10 || a === 127) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b === 64) return true
  }
  return false
}

describe('brand-scrape SSRF hostname block', () => {
  it('blocks private and metadata hosts', () => {
    expect(isBlockedHostname('127.0.0.1')).toBe(true)
    expect(isBlockedHostname('10.0.0.5')).toBe(true)
    expect(isBlockedHostname('192.168.1.1')).toBe(true)
    expect(isBlockedHostname('169.254.169.254')).toBe(true)
    expect(isBlockedHostname('metadata.google.internal')).toBe(true)
    expect(isBlockedHostname('localhost')).toBe(true)
  })

  it('allows public hosts', () => {
    expect(isBlockedHostname('example.com')).toBe(false)
    expect(isBlockedHostname('nudaim3d.de')).toBe(false)
  })
})
