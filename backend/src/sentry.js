/**
 * Sentry (optional) — set SENTRY_DSN on Render to enable
 * https://sentry.io → Create project → Node.js → copy DSN
 */
import * as Sentry from '@sentry/node';

let enabled = false;

export function initSentry() {
  const dsn = (process.env.SENTRY_DSN || '').trim();
  if (!dsn) {
    console.log('[sentry] off (no SENTRY_DSN)');
    return false;
  }
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    release: process.env.RENDER_GIT_COMMIT || process.env.SENTRY_RELEASE || undefined,
  });
  enabled = true;
  console.log('[sentry] on');
  return true;
}

export function setupSentryExpress(app) {
  if (!enabled) return;
  // Express 4/5 error handler after routes
  Sentry.setupExpressErrorHandler(app);
}

export function captureException(err, hint) {
  if (!enabled) return;
  Sentry.captureException(err, hint);
}

export function captureMessage(msg, level = 'info') {
  if (!enabled) return;
  Sentry.captureMessage(msg, level);
}

export { Sentry, enabled as sentryEnabled };
