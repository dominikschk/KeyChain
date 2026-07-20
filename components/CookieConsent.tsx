/**
 * Cookie-Hinweis: essenziell vs. optionale Fehleranalyse (Sentry).
 */
import React, { useEffect, useState } from 'react'
import { acceptAll, acceptEssentialOnly, readConsent, type ConsentState } from '../lib/consent'
import { LEGAL_PATHS } from '../lib/legalCompany'
import { initObservability } from '../lib/observability'

function navigate(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export const CookieConsent: React.FC = () => {
  const [consent, setConsent] = useState<ConsentState>(() => readConsent())

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ConsentState>).detail
      if (detail) setConsent(detail)
    }
    window.addEventListener('nudaim-consent', onChange)
    return () => window.removeEventListener('nudaim-consent', onChange)
  }, [])

  useEffect(() => {
    if (consent.decided && consent.analytics) {
      void initObservability()
    }
  }, [consent.decided, consent.analytics])

  if (consent.decided) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[4000] p-3 sm:p-4 pb-safe pointer-events-none"
      role="dialog"
      aria-label="Datenschutz-Hinweis"
    >
      <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-xl px-4 py-3 sm:px-5 sm:py-4">
        <p className="text-sm font-semibold text-navy">Cookies & Datenschutz</p>
        <p className="text-xs text-zinc-600 mt-1 leading-snug">
          Wir speichern nur Nötiges für Entwurf und Bestellung. Optionale Fehleranalyse (Sentry) nur mit deiner
          Zustimmung.{' '}
          <button
            type="button"
            className="underline font-semibold text-petrol"
            onClick={() => navigate(LEGAL_PATHS.datenschutz)}
          >
            Datenschutz
          </button>
        </p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => setConsent(acceptEssentialOnly())}
            className="flex-1 min-h-[44px] rounded-xl border border-zinc-200 text-xs font-semibold text-navy"
          >
            Nur notwendige
          </button>
          <button
            type="button"
            onClick={() => setConsent(acceptAll())}
            className="flex-1 min-h-[44px] rounded-xl bg-navy text-white text-xs font-semibold"
          >
            Alle akzeptieren
          </button>
        </div>
      </div>
    </div>
  )
}
