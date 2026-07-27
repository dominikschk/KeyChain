import { describe, expect, it } from 'vitest'
import { removeBackground, toPrintBinary } from '../logoProcess'

class ImageDataPolyfill {
  data: Uint8ClampedArray
  width: number
  height: number
  constructor(data: Uint8ClampedArray, width: number, height?: number) {
    this.data = data
    this.width = width
    this.height = height ?? data.length / (4 * width)
  }
}

// Node/Vitest: Canvas ImageData polyfillen
;(globalThis as unknown as { ImageData: typeof ImageDataPolyfill }).ImageData = ImageDataPolyfill

function makeImage(w: number, h: number, fill: (x: number, y: number) => [number, number, number, number]): ImageData {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const [r, g, b, a] = fill(x, y)
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = a
    }
  }
  return new ImageData(data, w, h) as ImageData
}

describe('white logo preservation', () => {
  it('entfernt nicht weiße Logo-Pixel auf dunklem Hintergrund', () => {
    // Rand dunkelblau, Mitte weißes Quadrat
    const src = makeImage(40, 40, (x, y) => {
      const inLogo = x >= 12 && x <= 27 && y >= 12 && y <= 27
      return inLogo ? [255, 255, 255, 255] : [17, 35, 90, 255]
    })
    const { image } = removeBackground(src)
    let whiteOpaque = 0
    for (let i = 0; i < image.data.length; i += 4) {
      if (image.data[i + 3]! < 40) continue
      if (image.data[i]! > 240 && image.data[i + 1]! > 240 && image.data[i + 2]! > 240) whiteOpaque++
    }
    expect(whiteOpaque).toBeGreaterThan(100)
  })

  it('behält weiße Pixel in PNGs mit Alpha', () => {
    const src = makeImage(30, 30, (x, y) => {
      if (x < 2 || y < 2 || x > 27 || y > 27) return [0, 0, 0, 0]
      return [250, 250, 250, 255]
    })
    const { image } = removeBackground(src)
    let whiteOpaque = 0
    for (let i = 0; i < image.data.length; i += 4) {
      if (image.data[i + 3]! >= 40 && image.data[i]! > 240) whiteOpaque++
    }
    expect(whiteOpaque).toBeGreaterThan(200)
  })

  it('zählt opakes Weiß als Druck-Motiv', () => {
    const src = makeImage(20, 20, (x, y) => {
      if (x < 2 || y < 2 || x > 17 || y > 17) return [0, 0, 0, 0]
      return [255, 255, 255, 255]
    })
    const bin = toPrintBinary(src)
    let ink = 0
    for (let i = 0; i < bin.data.length; i += 4) {
      if (bin.data[i]! < 128) ink++
    }
    expect(ink).toBeGreaterThan(100)
  })

  it('entfernt geschlossene Weißlöcher zwischen dunklen Buchstaben', () => {
    // Weißer Rand + dunkler Rahmen (wie D/P), innen noch Weiß – Loch soll weg
    const src = makeImage(48, 32, (x, y) => {
      const border = x < 3 || y < 3 || x > 44 || y > 28
      if (border) return [255, 255, 255, 255]
      // dunkler Ring / Buchstabenkörper
      const leftBar = x >= 8 && x <= 14 && y >= 8 && y <= 23
      const rightBar = x >= 33 && x <= 39 && y >= 8 && y <= 23
      const top = y >= 8 && y <= 12 && x >= 8 && x <= 39
      const bottom = y >= 19 && y <= 23 && x >= 8 && x <= 39
      if (leftBar || rightBar || top || bottom) return [20, 20, 30, 255]
      // Innenraum zwischen „Buchstaben“
      if (x > 14 && x < 33 && y > 12 && y < 19) return [255, 255, 255, 255]
      return [255, 255, 255, 255]
    })
    const { image } = removeBackground(src)
    // Pixel in der Lochmitte muss transparent sein
    const mid = (16 * 48 + 24) * 4
    expect(image.data[mid + 3]!).toBeLessThan(40)
    // Dunkler Buchstabenstrich bleibt
    const bar = (16 * 48 + 11) * 4
    expect(image.data[bar + 3]!).toBeGreaterThan(200)
    expect(image.data[bar]!).toBeLessThan(40)
  })

  it('leert O-Innenraum (Counter) bei hellem Hintergrund', () => {
    const src = makeImage(40, 40, (x, y) => {
      const dx = x - 20
      const dy = y - 20
      const r2 = dx * dx + dy * dy
      if (r2 > 18 * 18) return [255, 255, 255, 255] // Studio-BG
      if (r2 >= 12 * 12) return [25, 25, 35, 255] // dunkler O-Ring
      return [255, 255, 255, 255] // Innenloch
    })
    const { image } = removeBackground(src)
    const center = (20 * 40 + 20) * 4
    expect(image.data[center + 3]!).toBeLessThan(40)
    const ring = (20 * 40 + 5) * 4 // Abstand 15 vom Zentrum → O-Ring
    expect(image.data[ring + 3]!).toBeGreaterThan(200)
    expect(image.data[ring]!).toBeLessThan(50)
  })

  it('entfernt Studio-Weiß auch wenn Motiv den Rand bunt macht', () => {
    // Wie ASK MENTORING: Ecken teils blau/bunt, Mehrheit Weiß, O mit weißem Counter
    const src = makeImage(48, 48, (x, y) => {
      if (x < 6 && y < 6) return [30, 60, 140, 255] // bunte Ecke
      if (x > 41 && y < 6) return [40, 80, 160, 255]
      const dx = x - 24
      const dy = y - 24
      const r2 = dx * dx + dy * dy
      if (r2 >= 10 * 10 && r2 <= 14 * 14) return [30, 30, 40, 255]
      if (r2 < 10 * 10) return [255, 255, 255, 255]
      return [252, 252, 252, 255]
    })
    const { image, removed } = removeBackground(src)
    expect(removed).toBe(true)
    const hole = (24 * 48 + 24) * 4
    expect(image.data[hole + 3]!).toBeLessThan(40)
    const ring = (24 * 48 + 12) * 4
    expect(image.data[ring + 3]!).toBeGreaterThan(200)
  })

  it('leert O-Innenraum trotz 1px AA-Lücke im Ring', () => {
    const src = makeImage(40, 40, (x, y) => {
      const dx = x - 20
      const dy = y - 20
      const r2 = dx * dx + dy * dy
      if (r2 > 18 * 18) return [250, 250, 250, 255]
      // absichtlich eine Lücke bei (20,6) — ohne Dilation würde Weiß durchsickern
      if (x === 20 && y === 6) return [250, 250, 250, 255]
      if (r2 >= 11 * 11 && r2 <= 16 * 16) return [25, 25, 35, 255]
      if (r2 < 11 * 11) return [248, 248, 248, 255]
      return [250, 250, 250, 255]
    })
    const { image } = removeBackground(src)
    const center = (20 * 40 + 20) * 4
    expect(image.data[center + 3]!).toBeLessThan(40)
    const ring = (20 * 40 + 5) * 4
    expect(image.data[ring + 3]!).toBeGreaterThan(200)
  })

  it('leert JPEG-artiges Counter-Weiß (L≈205) hinter blauem Kreis', () => {
    const src = makeImage(56, 56, (x, y) => {
      // bunte Waves am Rand
      if (y < 4 && x < 20) return [20, 90, 180, 255]
      if (y < 4 && x > 40) return [30, 100, 190, 255]
      const dx = x - 28
      const dy = y - 28
      const r2 = dx * dx + dy * dy
      if (r2 > 22 * 22) return [245, 245, 248, 255]
      if (r2 >= 16 * 16) return [25, 70, 160, 255] // blauer Kreis
      // dunkler Buchstabenring mit JPEG-Weiß innen
      if (r2 >= 8 * 8 && r2 <= 12 * 12) return [20, 20, 30, 255]
      if (r2 < 8 * 8) return [205, 206, 204, 255]
      return [25, 70, 160, 255]
    })
    const { image, removed } = removeBackground(src)
    expect(removed).toBe(true)
    const hole = (28 * 56 + 28) * 4
    expect(image.data[hole + 3]!).toBeLessThan(40)
    // r≈19 → blauer Kreis (nicht Buchstabenring)
    const blue = (28 * 56 + 9) * 4
    expect(image.data[blue + 3]!).toBeGreaterThan(200)
    expect(image.data[blue + 2]!).toBeGreaterThan(100)
  })

  it('leert dunkle Fremdfüllung im Loch heller Buchstaben (ASK-Fall)', () => {
    // Helles ASK + Wave die durch AA-Lücke ins Loch reicht + Navy-Blob im Counter
    const src = makeImage(64, 40, (x, y) => {
      const border = x < 2 || y < 2 || x > 61 || y > 37
      if (border) return [250, 250, 250, 255]
      // dunkle Wave vom Rand
      if (y >= 2 && y <= 4 && x >= 2 && x <= 40) return [20, 28, 45, 255]
      // helles Lavendel mit Innenloch; absichtlich 1px Lücke oben (x=27)
      const inLetter = x >= 12 && x <= 44 && y >= 10 && y <= 32
      const inHole = x >= 20 && x <= 34 && y >= 16 && y <= 26
      const gap = x === 27 && y === 10
      if (gap) return [20, 28, 45, 255] // Wave-Tunnel in die Lücke
      if (inLetter && !inHole) return [170, 168, 185, 255]
      if (inHole) return [18, 28, 48, 255] // dunkle Fehlfüllung
      // dunkle Schrift rechts, mit Wave verbunden
      if (x >= 48 && x <= 58 && y >= 14 && y <= 28) return [20, 28, 45, 255]
      if (x >= 48 && x <= 60 && y >= 2 && y <= 4) return [20, 28, 45, 255]
      return [250, 250, 250, 255]
    })
    const { image } = removeBackground(src)
    const hole = (21 * 64 + 27) * 4
    expect(image.data[hole + 3]!).toBeLessThan(40)
    const body = (12 * 64 + 14) * 4
    expect(image.data[body + 3]!).toBeGreaterThan(200)
    expect(image.data[body]!).toBeGreaterThan(140)
    const dark = (20 * 64 + 52) * 4
    expect(image.data[dark + 3]!).toBeGreaterThan(200)
    expect(image.data[dark]!).toBeLessThan(40)
  })
})
