/**
 * Layout + Navigation für den Partnerbereich.
 */
import React, { useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { LegalFooter } from '../LegalFooter';
import { navigateApp, navigatePartner, partnerPath } from '../../lib/partner/routing';
import type { PartnerAppSection, PartnerProfile } from '../../lib/partner/types';
import { AgeNotice } from './shared';

const PUBLIC_NAV: { section: PartnerAppSection; label: string }[] = [
  { section: 'home', label: 'Start' },
  { section: 'produkt', label: 'Produkt' },
  { section: 'ablauf', label: 'Ablauf' },
  { section: 'provision', label: 'Provision' },
  { section: 'sicher', label: 'Sicher & fair' },
  { section: 'faq', label: 'FAQ' },
];

const APP_NAV: { section: PartnerAppSection; label: string }[] = [
  { section: 'dashboard', label: 'Übersicht' },
  { section: 'leads', label: 'Leads' },
  { section: 'bestellungen', label: 'Bestellungen' },
  { section: 'punkte', label: 'Punkte' },
  { section: 'material', label: 'Material' },
  { section: 'setup-call', label: 'Setup-Call' },
  { section: 'onboarding', label: 'Onboarding' },
  { section: 'einstellungen', label: 'Einstellungen' },
];

type Props = {
  section: PartnerAppSection;
  partner: PartnerProfile | null;
  backendLabel: string;
  onLogout?: () => void;
  children: React.ReactNode;
};

export function PartnerShell({ section, partner, backendLabel, onLogout, children }: Props) {
  const [open, setOpen] = useState(false);
  const nav = partner ? APP_NAV : PUBLIC_NAV;

  return (
    <div className="min-h-screen bg-cream text-navy flex flex-col">
      <a
        href="#partner-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2 focus:rounded-lg"
      >
        Zum Inhalt springen
      </a>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigatePartner('home')}
            className="flex items-center gap-2 min-h-[44px] shrink-0"
            aria-label="Partner Start"
          >
            <span className="w-9 h-9 rounded-xl bg-navy text-white flex items-center justify-center font-headline font-extrabold">
              N
            </span>
            <span className="text-left">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-petrol">
                NUDAIM
              </span>
              <span className="block font-headline font-extrabold text-sm uppercase tracking-tight leading-none">
                Partner
              </span>
            </span>
          </button>

          <nav className="hidden lg:flex flex-1 items-center justify-center gap-1" aria-label="Partner">
            {nav.map((item) => (
              <a
                key={item.section}
                href={partnerPath(item.section)}
                onClick={(e) => {
                  e.preventDefault();
                  navigatePartner(item.section);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold min-h-[40px] inline-flex items-center ${
                  section === item.section
                    ? 'bg-petrol/10 text-petrol'
                    : 'text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {!partner ? (
              <>
                <button
                  type="button"
                  onClick={() => navigatePartner('anmelden')}
                  className="hidden sm:inline-flex min-h-[40px] px-3 rounded-xl text-xs font-semibold text-navy hover:bg-zinc-50"
                >
                  Anmelden
                </button>
                <button
                  type="button"
                  onClick={() => navigatePartner('registrierung')}
                  className="inline-flex min-h-[40px] px-3 rounded-xl bg-navy text-white text-xs font-semibold"
                >
                  Als Partner starten
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onLogout}
                className="hidden sm:inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-zinc-200 text-xs font-semibold"
              >
                <LogOut size={14} aria-hidden /> Abmelden
              </button>
            )}
            <button
              type="button"
              className="lg:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-zinc-200"
              aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden border-t border-zinc-100 bg-white px-4 py-3 space-y-1">
            {nav.map((item) => (
              <a
                key={item.section}
                href={partnerPath(item.section)}
                onClick={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  navigatePartner(item.section);
                }}
                className={`block px-3 py-3 rounded-xl text-sm font-semibold ${
                  section === item.section ? 'bg-petrol/10 text-petrol' : 'text-navy'
                }`}
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigateApp('/');
              }}
              className="block w-full text-left px-3 py-3 rounded-xl text-sm font-semibold text-zinc-500"
            >
              Zum Konfigurator
            </button>
            {partner && onLogout && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="block w-full text-left px-3 py-3 rounded-xl text-sm font-semibold text-red-700"
              >
                Abmelden
              </button>
            )}
          </div>
        )}
      </header>

      <div className="max-w-5xl mx-auto w-full px-4 pt-4">
        <AgeNotice />
        <p className="mt-2 text-[11px] text-zinc-500">
          Datenmodus: <span className="font-semibold text-navy">{backendLabel}</span>
        </p>
      </div>

      <main id="partner-main" className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 space-y-8">
        {children}
      </main>

      <footer className="border-t border-zinc-200 bg-white mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-3 text-center">
          <p className="text-xs text-zinc-500">
            Pilotprogramm · Kein garantierter Verdienst ·{' '}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => navigatePartner('bedingungen')}
            >
              Partnerbedingungen
            </button>
            {' · '}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => navigatePartner('datenschutz')}
            >
              Datenschutz & Kontolöschung
            </button>
          </p>
          <LegalFooter compact />
          <button
            type="button"
            onClick={() => navigateApp('/')}
            className="text-[11px] text-zinc-400 hover:text-navy"
          >
            Zurück zu NUDAIM Studio
          </button>
        </div>
      </footer>
    </div>
  );
}
