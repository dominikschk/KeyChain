/**
 * Fußzeile: Impressum / Datenschutz / AGB / Widerruf → Shopify-Policy-Links.
 */
import React from 'react'
import { LEGAL_PATHS, openLegalLink, type LegalLinkKey } from '../lib/legalCompany'

type Props = {
  className?: string
  compact?: boolean
}

const links: { key: LegalLinkKey; label: string }[] = [
  { key: 'impressum', label: 'Impressum' },
  { key: 'datenschutz', label: 'Datenschutz' },
  { key: 'agb', label: 'AGB' },
  { key: 'widerruf', label: 'Widerruf' },
]

export const LegalFooter: React.FC<Props> = ({ className = '', compact }) => {
  return (
    <nav
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 ${className}`}
      aria-label="Rechtliches"
    >
      {links.map((l) => (
        <button
          key={l.key}
          type="button"
          onClick={() => openLegalLink(l.key)}
          className={`text-zinc-500 hover:text-navy underline-offset-2 hover:underline ${
            compact ? 'text-[10px]' : 'text-[11px] sm:text-xs'
          }`}
        >
          {l.label}
        </button>
      ))}
      {/* Fallback für crawler / no-js: lokale Pfade bleiben erreichbar */}
      <span className="sr-only">
        {Object.values(LEGAL_PATHS).join(' ')}
      </span>
    </nav>
  )
}
