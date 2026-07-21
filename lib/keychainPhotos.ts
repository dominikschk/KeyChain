/**
 * Anhänger-Colorways: echte Produktfotos unter /public.
 * Fehlt ein Foto, fällt der Code auf keychain-base.png + sanftes Tinting zurück.
 *
 * Update-Kurzbeschreibung (PR/Release):
 * „Live-Vorschau mit echten Platten-Fotos je Farbe (inkl. Schwarz, Sky, Navy,
 * Braun, Orange, Rot, Lime) – Farbe steckt im Foto, kein künstliches Overlay.“
 */

export type KeychainPhoto = {
  src: string
  /** true = Plattenfarbe steckt schon im Foto → kein Overlay */
  bakedIn: boolean
}

export type KeychainColorway = {
  id: string
  /** Kundenname */
  label: string
  /** Hex für Config / Shopify-Properties */
  hex: string
  photo: string
  bakedIn: boolean
  /** Kurz für Druckerei / Filament */
  filamentHint?: string
}

const DEFAULT_PHOTO = '/keychain-base.png'

/**
 * Offizielle Colorways (Studiofotos 2026-07).
 * Hex = Auswahl im Konfigurator; Foto = Live-Vorschau.
 */
export const KEYCHAIN_COLORWAYS: readonly KeychainColorway[] = [
  {
    id: 'cream',
    label: 'Sandhell',
    hex: '#F8F5F0',
    photo: DEFAULT_PHOTO,
    bakedIn: true,
    filamentHint: 'PLA matt hell / Natur',
  },
  {
    id: 'white',
    label: 'Weiß',
    hex: '#FFFFFF',
    photo: DEFAULT_PHOTO,
    bakedIn: true,
    filamentHint: 'PLA matt weiß',
  },
  {
    id: 'black',
    label: 'Schwarz',
    hex: '#2A2A2A',
    photo: '/keychain-black.png',
    bakedIn: true,
    filamentHint: 'PLA matt schwarz',
  },
  {
    id: 'sky',
    label: 'Himmelblau',
    hex: '#7EB8E8',
    photo: '/keychain-sky.png',
    bakedIn: true,
    filamentHint: 'PLA matt hellblau',
  },
  {
    id: 'navy',
    label: 'Navy',
    hex: '#11235A',
    photo: '/keychain-navy.png',
    bakedIn: true,
    filamentHint: 'PLA matt navy',
  },
  {
    id: 'petrol',
    label: 'Petrol',
    hex: '#12A9E0',
    photo: '/keychain-petrol.png',
    bakedIn: true,
    filamentHint: 'PLA matt petrol',
  },
  {
    id: 'sand',
    label: 'Sand',
    hex: '#D6C3A8',
    photo: '/keychain-sand.png',
    bakedIn: true,
    filamentHint: 'PLA matt sand',
  },
  {
    id: 'brown',
    label: 'Braun',
    hex: '#6B4A2E',
    photo: '/keychain-brown.png',
    bakedIn: true,
    filamentHint: 'PLA matt braun',
  },
  {
    id: 'forest',
    label: 'Tannengrün',
    hex: '#1F4D3A',
    photo: '/keychain-green.png',
    bakedIn: true,
    filamentHint: 'PLA matt dunkelgrün',
  },
  {
    id: 'lime',
    label: 'Limette',
    hex: '#A8D83A',
    photo: '/keychain-lime.png',
    bakedIn: true,
    filamentHint: 'PLA matt limette',
  },
  {
    id: 'orange',
    label: 'Orange',
    hex: '#E85D04',
    photo: '/keychain-orange.png',
    bakedIn: true,
    filamentHint: 'PLA matt orange',
  },
  {
    id: 'red',
    label: 'Rot',
    hex: '#FF4D4D',
    photo: '/keychain-red.png',
    bakedIn: true,
    filamentHint: 'PLA matt rot',
  },
] as const

/** Hex-Liste für die Farbwahl im Konfigurator (Reihenfolge = UI). */
export const KEYCHAIN_PLATE_COLORS: readonly string[] = KEYCHAIN_COLORWAYS.map((c) => c.hex)

/** Hex (klein) → Foto */
const PLATE_PHOTO_MAP: Record<string, KeychainPhoto> = Object.fromEntries(
  KEYCHAIN_COLORWAYS.map((c) => [
    c.hex.toLowerCase(),
    { src: c.photo, bakedIn: c.bakedIn } satisfies KeychainPhoto,
  ])
)

export function colorwayByHex(plateColor: string | undefined | null): KeychainColorway | null {
  const hex = normHex(plateColor)
  return KEYCHAIN_COLORWAYS.find((c) => c.hex.toLowerCase() === hex) ?? null
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
