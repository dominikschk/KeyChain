/**
 * Cookie-/Einwilligungs-Status.
 * - analytics: Sentry
 * - ai: KI-Assistent (OpenAI) – erst nach expliziter Zustimmung
 */
const STORAGE_KEY = 'nudaim_consent_v1'

export type ConsentState = {
  decided: boolean
  analytics: boolean
  /** KI-Chat / OpenAI-Verarbeitung */
  ai: boolean
  updatedAt: number
}

const DEFAULT: ConsentState = { decided: false, analytics: false, ai: false, updatedAt: 0 }

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
      ai: !!parsed.ai,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    }
  } catch {
    return memory ? { ...memory } : { ...DEFAULT }
  }
}

export function writeConsent(
  next: Partial<Pick<ConsentState, 'analytics' | 'ai' | 'decided'>>
): ConsentState {
  const prev = readConsent()
  const state: ConsentState = {
    decided: next.decided !== undefined ? !!next.decided : true,
    analytics: next.analytics !== undefined ? !!next.analytics : prev.analytics,
    ai: next.ai !== undefined ? !!next.ai : prev.ai,
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
  return writeConsent({ decided: true, analytics: false, ai: false })
}

export function acceptAll(): ConsentState {
  return writeConsent({ decided: true, analytics: true, ai: true })
}

export function acceptAiProcessing(): ConsentState {
  return writeConsent({ decided: true, ai: true })
}

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
