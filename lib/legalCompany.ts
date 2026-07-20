/**
 * Rechtliche Links: bevorzugt Shopify-Policies (Env), sonst lokale Routen.
 */
export type LegalLinkKey = 'impressum' | 'datenschutz' | 'agb' | 'widerruf'

export const LEGAL_PATHS = {
  impressum: '/impressum',
  datenschutz: '/datenschutz',
  agb: '/agb',
  widerruf: '/widerruf',
} as const

export type LegalPath = (typeof LEGAL_PATHS)[keyof typeof LEGAL_PATHS]

function env(key: string): string {
  try {
    return (import.meta as ImportMeta & { env?: Record<string, string> }).env?.[key]?.trim() || ''
  } catch {
    return ''
  }
}

/** Shopify-Policy-URLs – in Vercel setzen, dann verlinken Footer/Seiten dorthin. */
const POLICY_ENV: Record<LegalLinkKey, string> = {
  impressum: 'VITE_LEGAL_IMPRESSUM_URL',
  datenschutz: 'VITE_LEGAL_DATENSCHUTZ_URL',
  agb: 'VITE_LEGAL_AGB_URL',
  widerruf: 'VITE_LEGAL_WIDERRUF_URL',
}

const POLICY_PLACEHOLDER: Record<LegalLinkKey, string> = {
  impressum: 'https://nudaim3d.de/policies/legal-notice',
  datenschutz: 'https://nudaim3d.de/policies/privacy-policy',
  agb: 'https://nudaim3d.de/policies/terms-of-service',
  widerruf: 'https://nudaim3d.de/policies/refund-policy',
}

export function getLegalPolicyUrl(key: LegalLinkKey): string {
  return env(POLICY_ENV[key]) || POLICY_PLACEHOLDER[key]
}

export function hasCustomLegalPolicyUrl(key: LegalLinkKey): boolean {
  return !!env(POLICY_ENV[key])
}

export function isLegalPath(path: string): path is LegalPath {
  return (Object.values(LEGAL_PATHS) as string[]).includes(path)
}

export function legalKeyFromPath(path: string): LegalLinkKey | null {
  const entry = (Object.entries(LEGAL_PATHS) as [LegalLinkKey, string][]).find(([, p]) => p === path)
  return entry ? entry[0] : null
}

export type LegalCompany = {
  name: string
  email: string
  shopUrl: string
  incomplete: boolean
}

export function getLegalCompany(): LegalCompany {
  const name = env('VITE_LEGAL_COMPANY_NAME') || '[Firmenname]'
  const email = env('VITE_LEGAL_EMAIL') || '[kontakt@beispiel.de]'
  return {
    name,
    email,
    shopUrl: env('VITE_LEGAL_SHOP_URL') || 'https://nudaim3d.de',
    incomplete: name.startsWith('[') || email.startsWith('['),
  }
}

/** Öffnet Shopify-Policy (neuer Tab) oder navigiert lokal. */
export function openLegalLink(key: LegalLinkKey): void {
  const url = getLegalPolicyUrl(key)
  if (/^https?:\/\//i.test(url)) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  window.history.pushState({}, '', LEGAL_PATHS[key])
  window.dispatchEvent(new PopStateEvent('popstate'))
}
