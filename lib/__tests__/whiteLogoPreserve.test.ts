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
      const ring = x === 8 || x === 39 || y === 8 || y === 23 || (x >= 8 && x <= 39 && (y === 8 || y === 23))
      const leftBar = x >= 8 && x <= 14 && y >= 8 && y <= 23
      const rightBar = x >= 33 && x <= 39 && y >= 8 && y <= 23
      const top = y >= 8 && y <= 12 && x >= 8 && x <= 39
      const bottom = y >= 19 && y <= 23 && x >= 8 && x <= 39
      if (leftBar || rightBar || top || bottom || ring) return [20, 20, 30, 255]
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
})
