/**
 * Placement geometry for the product photo at /public/keychain-base.png.
 *
 * The photo shows metal rings on the left and a square plate on the right.
 * Logos and text may only sit on the flat plate face — never on rings,
 * the eyelet tab, or the background.
 *
 * All values are fractions of the full image (0–1).
 */

export type NormalizedRect = {
  x: number
  y: number
  w: number
  h: number
}

/** Full plate body including eyelet (for material tint). Excludes rings/background. */
export const KEYCHAIN_PLATE_BOUNDS: NormalizedRect = {
  x: 0.32,
  y: 0.15,
  w: 0.6,
  h: 0.7,
}

/**
 * Safe content zone on the flat plate face — inset from edges and clear of the
 * top-left eyelet. Logos and text are clipped to this rect only.
 */
export const KEYCHAIN_CONTENT_ZONE: NormalizedRect = {
  x: 0.42,
  y: 0.22,
  w: 0.46,
  h: 0.56,
}

export function rectCenter(rect: NormalizedRect): { x: number; y: number } {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }
}

/** CSS percentage helpers for absolute-positioned overlays. */
export function rectToCssPercent(rect: NormalizedRect) {
  return {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.w * 100}%`,
    height: `${rect.h * 100}%`,
  }
}

/**
 * Convert canvas-space point to content-zone local coords (0–1 inside zone).
 * Useful for future drag-to-place UI.
 */
export function clampToContentZone(
  nx: number,
  ny: number,
  zone: NormalizedRect = KEYCHAIN_CONTENT_ZONE
): { x: number; y: number } {
  return {
    x: Math.min(zone.x + zone.w, Math.max(zone.x, nx)),
    y: Math.min(zone.y + zone.h, Math.max(zone.y, ny)),
  }
}

/** Absolute pixel rect for a normalized zone inside a drawn image box. */
export function zoneToPixels(
  zone: NormalizedRect,
  dx: number,
  dy: number,
  drawW: number,
  drawH: number
): { x: number; y: number; w: number; h: number } {
  return {
    x: dx + zone.x * drawW,
    y: dy + zone.y * drawH,
    w: zone.w * drawW,
    h: zone.h * drawH,
  }
}

/** Draw a rounded-rect clip matching the content zone inside a drawn image box. */
export function clipContentZone(
  ctx: CanvasRenderingContext2D,
  dx: number,
  dy: number,
  drawW: number,
  drawH: number,
  zone: NormalizedRect = KEYCHAIN_CONTENT_ZONE,
  cornerRadiusFrac = 0.08
): void {
  const { x, y, w, h } = zoneToPixels(zone, dx, dy, drawW, drawH)
  const r = Math.min(w, h) * cornerRadiusFrac
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  ctx.clip()
}
