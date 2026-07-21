/** Normalisiert Eingaben wie `#12A9E0`, `12a9e0` oder `12A9E0` zu `#RRGGBB`. */
export function normalizeHexColor(input: string): string | null {
  let s = input.trim()
  if (!s) return null
  if (!s.startsWith('#')) s = `#${s}`
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    const h = s.slice(1)
    return `#${h[0]!}${h[0]!}${h[1]!}${h[1]!}${h[2]!}${h[2]!}`.toUpperCase()
  }
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.toUpperCase()
  return null
}

export function hexForColorInput(value: string | undefined, fallback: string): string {
  return normalizeHexColor(value || fallback) ?? normalizeHexColor(fallback) ?? '#000000'
}
