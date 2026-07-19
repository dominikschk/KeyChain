/**
 * Go-Live-Modus: nur der bewährte Shopify-Warenkorb-Pfad.
 *
 * Standard = einfach (Kunden können bestellen ohne Draft-Secrets).
 * Volle Features später: VITE_FEATURES_FULL=1 in Vercel setzen.
 */

export function featuresFullEnabled(): boolean {
  try {
    const v = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_FEATURES_FULL
    return v === '1' || v === 'true'
  } catch {
    return false
  }
}

/** true = Live-Shop ohne Draft/Multi-Korb/Badge/Setup-Hinweise */
export function isLiveSimple(): boolean {
  return !featuresFullEnabled()
}
