/**
 * Einstieg: Router für Konfigurator, CCP (Kunden-Panel), Admin.
 * Pfade: /, /configurator → Konfigurator | /ccp → CCP | /admin → Admin
 */
import React, { useState, useEffect } from 'react';
import ConfiguratorPage from './pages/ConfiguratorPage';
import CcpPage from './pages/CcpPage';
import AdminPage from './pages/AdminPage';

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
    return <CcpPage />;
  }
  if (path === '/admin') {
    return <AdminPage />;
  }

  return <ConfiguratorPage />;
};

export default App;
