/**
 * Fußzeile mit Impressum / Datenschutz / AGB / Widerruf.
 */
import React from 'react'
import { LEGAL_PATHS } from '../lib/legalCompany'

type Props = {
  className?: string
  /** kompakt für Modals */
  compact?: boolean
}

function go(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const links: { path: string; label: string }[] = [
  { path: LEGAL_PATHS.impressum, label: 'Impressum' },
  { path: LEGAL_PATHS.datenschutz, label: 'Datenschutz' },
  { path: LEGAL_PATHS.agb, label: 'AGB' },
  { path: LEGAL_PATHS.widerruf, label: 'Widerruf' },
]

export const LegalFooter: React.FC<Props> = ({ className = '', compact }) => {
  return (
    <nav
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 ${className}`}
      aria-label="Rechtliches"
    >
      {links.map((l) => (
        <button
          key={l.path}
          type="button"
          onClick={() => go(l.path)}
          className={`text-zinc-500 hover:text-navy underline-offset-2 hover:underline ${
            compact ? 'text-[10px]' : 'text-[11px] sm:text-xs'
          }`}
        >
          {l.label}
        </button>
      ))}
    </nav>
  )
}
