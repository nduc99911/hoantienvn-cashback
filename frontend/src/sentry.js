/**
 * Sentry browser (optional)
 * Set VITE_SENTRY_DSN on Vercel to enable.
 */
import * as Sentry from '@sentry/react';

let enabled = false;

export function initSentry() {
  const dsn = (import.meta.env.VITE_SENTRY_DSN || '').trim();
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || 'production',
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES || 0.1),
    // Don't send PII by default
    sendDefaultPii: false,
  });
  enabled = true;
  return true;
}

export function captureException(err) {
  if (enabled) Sentry.captureException(err);
}

export { Sentry, enabled as sentryEnabled };
