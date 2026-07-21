/**
 * Anhänger-Fotos je Plattenfarbe.
 * Echte Produktfotos unter /public ablegen – Dateinamen unten.
 * Fehlt ein Foto, fällt der Code auf keychain-base.png + sanftes Tinting zurück.
 */

export type KeychainPhoto = {
  src: string
  /** true = Plattenfarbe steckt schon im Foto → kein Overlay */
  bakedIn: boolean
}

const DEFAULT_PHOTO = '/keychain-base.png'

/** Hex (klein) → Foto */
const PLATE_PHOTO_MAP: Record<string, KeychainPhoto> = {
  '#f8f5f0': { src: DEFAULT_PHOTO, bakedIn: true },
  '#ffffff': { src: DEFAULT_PHOTO, bakedIn: true },
  '#2a2a2a': { src: '/keychain-black.png', bakedIn: true },
  '#11235a': { src: '/keychain-navy.png', bakedIn: true },
  '#12a9e0': { src: '/keychain-petrol.png', bakedIn: true },
  '#d6c3a8': { src: '/keychain-sand.png', bakedIn: true },
  '#1f4d3a': { src: '/keychain-green.png', bakedIn: true },
  '#ff4d4d': { src: '/keychain-red.png', bakedIn: true },
}

function normHex(c: string | undefined | null): string {
  const t = (c || '#F8F5F0').trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(t)) return t
  if (/^#[0-9a-f]{3}$/.test(t)) {
    const h = t.slice(1)
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`
  }
  return '#f8f5f0'
}

/** Nächstes gemapptes Foto (exakt oder per RGB-Abstand). */
export function keychainPhotoForPlate(plateColor: string | undefined | null): KeychainPhoto {
  const hex = normHex(plateColor)
  if (PLATE_PHOTO_MAP[hex]) return PLATE_PHOTO_MAP[hex]!

  let best: KeychainPhoto = { src: DEFAULT_PHOTO, bakedIn: false }
  let bestDist = Infinity
  const [tr, tg, tb] = hexToRgb(hex)
  for (const [k, photo] of Object.entries(PLATE_PHOTO_MAP)) {
    const [r, g, b] = hexToRgb(k)
    const d = (r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2
    if (d < bestDist) {
      bestDist = d
      best = photo
    }
  }
  // Nur übernehmen wenn nah genug, sonst Default + Overlay
  if (bestDist <= 80 ** 2) return best
  return { src: DEFAULT_PHOTO, bakedIn: false }
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
