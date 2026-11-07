/**
 * Partner- / Vertriebsprogramm – öffentliche Seiten + Partner-App.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PartnerShell } from '../components/partner/PartnerShell';
import { CookieConsent } from '../components/CookieConsent';
import {
  detectPartnerBackend,
  getCurrentPartner,
  getProgramConfig,
  logoutPartner,
} from '../lib/partner/api';
import { DEFAULT_PROGRAM_CONFIG } from '../lib/partner/defaults';
import { isPartnerEmailServiceConfigured } from '../lib/partner/email';
import { partnerSectionFromPath, navigatePartner } from '../lib/partner/routing';
import type { PartnerAppSection, PartnerProfile, PartnerProgramConfig } from '../lib/partner/types';
import {
  PartnerFaq,
  PartnerHome,
  PartnerProcess,
  PartnerProduct,
  PartnerProvision,
  PartnerSafety,
  PartnerTerms,
} from './partner/PublicSections';
import {
  PartnerAuth,
  PartnerConfirm,
  PartnerDashboard,
  PartnerLeads,
  PartnerMaterials,
  PartnerOnboarding,
  PartnerOrders,
  PartnerPoints,
  PartnerPrivacyPage,
  PartnerSettings,
  PartnerSetupCall,
} from './partner/AppSections';

function getPath(): string {
  return window.location.pathname.replace(/\/$/, '') || '/';
}

const AUTH_REQUIRED: PartnerAppSection[] = [
  'onboarding',
  'dashboard',
  'leads',
  'bestellungen',
  'punkte',
  'material',
  'einstellungen',
];

export const PartnerPage: React.FC = () => {
  const [section, setSection] = useState<PartnerAppSection>(() =>
    partnerSectionFromPath(getPath())
  );
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [config, setConfig] = useState<PartnerProgramConfig>(DEFAULT_PROGRAM_CONFIG);
  const [backendLabel, setBackendLabel] = useState('Wird geladen…');
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const mode = await detectPartnerBackend();
    const cfg = await getProgramConfig();
    cfg.emailConfigured = cfg.emailConfigured || isPartnerEmailServiceConfigured();
    setConfig(cfg);
    const p = await getCurrentPartner();
    setPartner(p);
    setBackendLabel(
      mode === 'supabase'
        ? 'Supabase (Live-Daten)'
        : 'Demo (lokal) – Migration partner_program.sql ausführen für Live'
    );
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    const onPop = () => setSection(partnerSectionFromPath(getPath()));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [refresh]);

  useEffect(() => {
    if (!ready) return;
    if (AUTH_REQUIRED.includes(section) && !partner) {
      navigatePartner('anmelden', true);
    }
  }, [section, partner, ready]);

  const handleLogout = async () => {
    await logoutPartner();
    setPartner(null);
    navigatePartner('home');
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <Loader2 className="animate-spin text-petrol" size={28} aria-label="Laden" />
      </div>
    );
  }

  const body = (() => {
    switch (section) {
      case 'home':
        return <PartnerHome config={config} />;
      case 'produkt':
        return <PartnerProduct />;
      case 'ablauf':
        return <PartnerProcess />;
      case 'provision':
        return <PartnerProvision config={config} />;
      case 'faq':
        return <PartnerFaq />;
      case 'sicher':
        return <PartnerSafety />;
      case 'bedingungen':
        return <PartnerTerms config={config} />;
      case 'registrierung':
        return <PartnerAuth mode="register" onAuthed={setPartner} />;
      case 'anmelden':
        return <PartnerAuth mode="login" onAuthed={setPartner} />;
      case 'onboarding':
        return partner ? (
          <PartnerOnboarding partner={partner} onPartnerUpdate={setPartner} />
        ) : null;
      case 'dashboard':
        return partner ? (
          <PartnerDashboard partner={partner} demo={backendLabel.startsWith('Demo')} />
        ) : null;
      case 'leads':
        return partner ? (
          <PartnerLeads partner={partner} onPartnerUpdate={setPartner} />
        ) : null;
      case 'bestellungen':
        return partner ? <PartnerOrders partner={partner} /> : null;
      case 'punkte':
        return partner ? (
          <PartnerPoints partner={partner} onPartnerUpdate={setPartner} />
        ) : null;
      case 'material':
        return partner ? <PartnerMaterials partner={partner} /> : null;
      case 'setup-call':
        return <PartnerSetupCall partner={partner} />;
      case 'einstellungen':
        return partner ? (
          <PartnerSettings partner={partner} onPartnerUpdate={setPartner} />
        ) : null;
      case 'datenschutz':
        return <PartnerPrivacyPage partner={partner} config={config} />;
      case 'bestaetigung':
        return <PartnerConfirm />;
      default:
        return <PartnerHome config={config} />;
    }
  })();

  return (
    <>
      <PartnerShell
        section={section}
        partner={partner}
        backendLabel={backendLabel}
        onLogout={handleLogout}
      >
        {body}
      </PartnerShell>
      <CookieConsent />
    </>
  );
};

export default PartnerPage;
