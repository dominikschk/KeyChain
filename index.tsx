
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { readConsent } from './lib/consent';
import { initObservability } from './lib/observability';
import { getStoredLocale, setStoredLocale } from './lib/i18n';

/** Sentry erst nach Einwilligung (Cookie-Hinweis). */
if (readConsent().analytics) {
  void initObservability();
}
setStoredLocale(getStoredLocale());

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
