/**
 * Rechtliche Zwischenseite: leitet auf Shopify-Policy weiter (Env-URL).
 */
import React, { useEffect } from 'react'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import {
  getLegalPolicyUrl,
  hasCustomLegalPolicyUrl,
  legalKeyFromPath,
  type LegalPath,
} from '../lib/legalCompany'
import { LegalFooter } from '../components/LegalFooter'

type Props = { path: LegalPath }

const TITLES: Record<string, string> = {
  impressum: 'Impressum',
  datenschutz: 'Datenschutz',
  agb: 'AGB',
  widerruf: 'Widerruf',
}

function goHome() {
  window.history.pushState({}, '', '/')
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export const LegalPage: React.FC<Props> = ({ path }) => {
  const key = legalKeyFromPath(path) || 'impressum'
  const url = getLegalPolicyUrl(key)
  const configured = hasCustomLegalPolicyUrl(key)
  const title = TITLES[key] || 'Rechtliches'

  useEffect(() => {
    if (configured && /^https?:\/\//i.test(url)) {
      window.location.replace(url)
    }
  }, [configured, url])

  return (
    <div className="min-h-screen bg-cream text-navy flex flex-col">
      <header className="shrink-0 bg-white border-b border-zinc-200 px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={goHome}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-zinc-50"
          aria-label="Zurück"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-petrol">NUDAIM</p>
          <h1 className="text-sm font-extrabold">{title}</h1>
        </div>
      </header>
      <main className="flex-1 px-4 py-8 max-w-lg mx-auto w-full space-y-4">
        <p className="text-sm text-zinc-600 leading-snug">
          {configured
            ? 'Weiterleitung zum Shopify-Impressum / zur Policy…'
            : 'Hier kommt dein Shopify-Link hin. Trage die URL in Vercel ein – dann öffnet sich direkt die Policy im Shop.'}
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 min-h-[52px] w-full rounded-xl bg-navy text-white text-sm font-semibold"
        >
          {title} im Shop öffnen
          <ExternalLink size={16} />
        </a>
        {!configured && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 leading-snug space-y-1">
            <p className="font-semibold">Platzhalter – bitte ersetzen</p>
            <p>
              Vercel → Environment Variable z.B.{' '}
              <code className="font-mono text-[10px]">
                {key === 'impressum'
                  ? 'VITE_LEGAL_IMPRESSUM_URL'
                  : key === 'datenschutz'
                    ? 'VITE_LEGAL_DATENSCHUTZ_URL'
                    : key === 'agb'
                      ? 'VITE_LEGAL_AGB_URL'
                      : 'VITE_LEGAL_WIDERRUF_URL'}
              </code>
            </p>
            <p className="break-all font-mono text-[10px]">{url}</p>
            <p>Danach Redeploy. Anleitung: GO_LIVE_RECHT.md</p>
          </div>
        )}
        <LegalFooter />
      </main>
    </div>
  )
}

export default LegalPage
