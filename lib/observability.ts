/**
 * Observability: optionales Sentry + einfache Event-API.
 * Ohne VITE_SENTRY_DSN kein Netzwerk – nur console in Dev.
 */
type Severity = 'info' | 'warning' | 'error';

let sentryReady = false;

function sentryDsn(): string {
  try {
    return (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_SENTRY_DSN?.trim() || '';
  } catch {
    return '';
  }
}

/** Lazy Sentry-Init (Browser). Idempotent. */
export async function initObservability(): Promise<void> {
  if (sentryReady || typeof window === 'undefined') return;
  const dsn = sentryDsn();
  if (!dsn) return;
  try {
    // Dynamischer Import – Paket optional; ohne Install kein Crash
    const Sentry = await import('@sentry/react');
    Sentry.init({
      dsn,
      environment:
        (import.meta as ImportMeta & { env?: Record<string, string> }).env?.MODE || 'production',
      tracesSampleRate: 0.1,
    });
    sentryReady = true;
  } catch (e) {
    console.warn('Sentry init skipped:', e);
  }
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  const err = error instanceof Error ? error : new Error(String(error));
  if (sentryReady) {
    void import('@sentry/react')
      .then((Sentry) => {
        Sentry.withScope((scope) => {
          if (context) {
            Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
          }
          Sentry.captureException(err);
        });
      })
      .catch(() => {
        console.error(err, context);
      });
    return;
  }
  console.error(err, context);
}

export function trackEvent(name: string, props?: Record<string, unknown>, level: Severity = 'info'): void {
  if (level === 'error') {
    console.error(`[event] ${name}`, props);
  } else if (level === 'warning') {
    console.warn(`[event] ${name}`, props);
  } else if (typeof window !== 'undefined' && (import.meta as ImportMeta & { env?: Record<string, string> }).env?.DEV) {
    console.info(`[event] ${name}`, props);
  }
  if (sentryReady) {
    void import('@sentry/react')
      .then((Sentry) => {
        Sentry.addBreadcrumb({ category: 'nudaim', message: name, data: props, level });
      })
      .catch(() => undefined);
  }
}
