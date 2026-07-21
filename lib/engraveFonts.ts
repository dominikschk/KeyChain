/**
 * Schriftarten für Präge-/Drucktext auf dem physischen Anhänger.
 */
export type EngraveFontId = 'bold' | 'modern' | 'classic' | 'elegant' | 'soft' | 'display'

export const ENGRAVE_FONTS: Record<
  EngraveFontId,
  { label: string; family: string; cssClass: string; canvasFont: string }
> = {
  bold: {
    label: 'Kräftig',
    family: 'League Spartan',
    cssClass: 'font-engrave-bold',
    canvasFont: '"League Spartan", Arial, sans-serif',
  },
  modern: {
    label: 'Modern',
    family: 'Outfit',
    cssClass: 'font-engrave-modern',
    canvasFont: 'Outfit, Arial, sans-serif',
  },
  classic: {
    label: 'Klassisch',
    family: 'Lora',
    cssClass: 'font-engrave-classic',
    canvasFont: 'Lora, Georgia, serif',
  },
  elegant: {
    label: 'Elegant',
    family: 'Cormorant Garamond',
    cssClass: 'font-engrave-elegant',
    canvasFont: '"Cormorant Garamond", Georgia, serif',
  },
  soft: {
    label: 'Freundlich',
    family: 'Nunito',
    cssClass: 'font-engrave-soft',
    canvasFont: 'Nunito, Arial, sans-serif',
  },
  display: {
    label: 'Display',
    family: 'Playfair Display',
    cssClass: 'font-engrave-display',
    canvasFont: '"Playfair Display", Georgia, serif',
  },
}

export function engraveFontCss(id: EngraveFontId | undefined): string {
  return ENGRAVE_FONTS[id || 'bold']?.cssClass ?? ENGRAVE_FONTS.bold.cssClass
}

export function engraveFontCanvas(id: EngraveFontId | undefined): string {
  return ENGRAVE_FONTS[id || 'bold']?.canvasFont ?? ENGRAVE_FONTS.bold.canvasFont
}

export function isEngraveFontId(v: unknown): v is EngraveFontId {
  return typeof v === 'string' && v in ENGRAVE_FONTS
}

/** Logo-Position: freier Bereich auf der Platte (Slider + Drag). */
export const LOGO_POS_MIN = -25
export const LOGO_POS_MAX = 25

export function clampLogoPos(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(LOGO_POS_MAX, Math.max(LOGO_POS_MIN, Math.round(n * 2) / 2))
}
