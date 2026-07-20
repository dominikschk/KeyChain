/**
 * Cookie-/Einwilligungs-Status (TTDSG-nah: optionale Tools erst nach Opt-in).
 * Essenzielle Speicherung (Gast-Session, Entwurf, Warenkorb) braucht keine Extra-Einwilligung.
 */
const STORAGE_KEY = 'nudaim_consent_v1'

export type ConsentState = {
  /** Banner schon beantwortet */
  decided: boolean
  /** Optionale Analyse/Fehler (Sentry) */
  analytics: boolean
  updatedAt: number
}

const DEFAULT: ConsentState = { decided: false, analytics: false, updatedAt: 0 }

/** Fallback wenn localStorage fehlt (Tests / SSR). */
let memory: ConsentState | null = null

function canUseStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

export function readConsent(): ConsentState {
  if (!canUseStorage()) {
    return memory ? { ...memory } : { ...DEFAULT }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return memory ? { ...memory } : { ...DEFAULT }
    const parsed = JSON.parse(raw) as Partial<ConsentState>
    return {
      decided: !!parsed.decided,
      analytics: !!parsed.analytics,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    }
  } catch {
    return memory ? { ...memory } : { ...DEFAULT }
  }
}

export function writeConsent(
  next: Omit<ConsentState, 'updatedAt' | 'decided'> & { decided?: boolean }
): ConsentState {
  const state: ConsentState = {
    decided: next.decided !== false,
    analytics: !!next.analytics,
    updatedAt: Date.now(),
  }
  memory = state
  if (canUseStorage()) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nudaim-consent', { detail: state }))
  }
  return state
}

export function acceptEssentialOnly(): ConsentState {
  return writeConsent({ analytics: false })
}

export function acceptAll(): ConsentState {
  return writeConsent({ analytics: true })
}

/** Nur für Tests */
export function resetConsentMemory(): void {
  memory = null
  if (canUseStorage()) {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }
}
