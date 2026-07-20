/**
 * Firmendaten für Impressum / Fußzeile.
 * Werte aus Vercel Env (VITE_LEGAL_*) – sonst sichtbare Platzhalter.
 */
export type LegalCompany = {
  name: string
  street: string
  zipCity: string
  country: string
  email: string
  phone: string
  representative: string
  register: string
  vatId: string
  shopUrl: string
  hosting: string
  /** true wenn noch Platzhalter – Dominik muss Env setzen */
  incomplete: boolean
}

function env(key: string): string {
  try {
    return (import.meta as ImportMeta & { env?: Record<string, string> }).env?.[key]?.trim() || ''
  } catch {
    return ''
  }
}

const PLACEHOLDER = {
  name: '[Firmenname / Vorname Nachname]',
  street: '[Straße Hausnummer]',
  zipCity: '[PLZ Ort]',
  country: 'Deutschland',
  email: '[kontakt@beispiel.de]',
  phone: '[Telefon optional]',
  representative: '[Vertretungsberechtigte Person]',
  register: '[Registergericht / HRB – falls GmbH o. Ä.]',
  vatId: '[USt-IdNr. – falls vorhanden]',
  shopUrl: 'https://nudaim3d.de',
  hosting: 'Vercel Inc. (Hosting) · Supabase (Datenbank/Storage) · Shopify (Shop/Kasse)',
}

export function getLegalCompany(): LegalCompany {
  const name = env('VITE_LEGAL_COMPANY_NAME') || PLACEHOLDER.name
  const street = env('VITE_LEGAL_STREET') || PLACEHOLDER.street
  const zipCity = env('VITE_LEGAL_ZIP_CITY') || PLACEHOLDER.zipCity
  const email = env('VITE_LEGAL_EMAIL') || PLACEHOLDER.email
  const incomplete =
    name.startsWith('[') ||
    street.startsWith('[') ||
    zipCity.startsWith('[') ||
    email.startsWith('[')

  return {
    name,
    street,
    zipCity,
    country: env('VITE_LEGAL_COUNTRY') || PLACEHOLDER.country,
    email,
    phone: env('VITE_LEGAL_PHONE') || PLACEHOLDER.phone,
    representative: env('VITE_LEGAL_REPRESENTATIVE') || PLACEHOLDER.representative,
    register: env('VITE_LEGAL_REGISTER') || PLACEHOLDER.register,
    vatId: env('VITE_LEGAL_VAT_ID') || PLACEHOLDER.vatId,
    shopUrl: env('VITE_LEGAL_SHOP_URL') || PLACEHOLDER.shopUrl,
    hosting: env('VITE_LEGAL_HOSTING') || PLACEHOLDER.hosting,
    incomplete,
  }
}

export const LEGAL_PATHS = {
  impressum: '/impressum',
  datenschutz: '/datenschutz',
  agb: '/agb',
  widerruf: '/widerruf',
} as const

export type LegalPath = (typeof LEGAL_PATHS)[keyof typeof LEGAL_PATHS]

export function isLegalPath(path: string): path is LegalPath {
  return (Object.values(LEGAL_PATHS) as string[]).includes(path)
}
