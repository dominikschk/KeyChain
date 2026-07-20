/**
 * Einstieg: Router für Konfigurator, CCP, Admin, Rechtstexte.
 * Pfade: /, /configurator | /ccp | /admin | /impressum | /datenschutz | /agb | /widerruf
 */
import React, { useState, useEffect } from 'react';
import ConfiguratorPage from './pages/ConfiguratorPage';
import CcpPage from './pages/CcpPage';
import AdminPage from './pages/AdminPage';
import LegalPage from './pages/LegalPage';
import { CookieConsent } from './components/CookieConsent';
import { isLegalPath } from './lib/legalCompany';

function getPath(): string {
  const p = window.location.pathname.replace(/\/$/, '') || '/';
  return p;
}

const App: React.FC = () => {
  const [path, setPath] = useState(getPath);

  useEffect(() => {
    const onPopState = () => setPath(getPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (path === '/ccp') {
    return (
      <>
        <CcpPage />
        <CookieConsent />
      </>
    );
  }
  if (path === '/admin') {
    return <AdminPage />;
  }
  if (isLegalPath(path)) {
    return (
      <>
        <LegalPage path={path} />
        <CookieConsent />
      </>
    );
  }

  return (
    <>
      <ConfiguratorPage />
      <CookieConsent />
    </>
  );
};

export default App;
