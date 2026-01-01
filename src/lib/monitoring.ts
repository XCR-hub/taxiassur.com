import { logger } from './logger';

export interface ErrorReport {
  error: Error;
  context?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  tags?: Record<string, string>;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
  metadata?: Record<string, any>;
}

class MonitoringService {
  private sentryEnabled = false;
  private environment = import.meta.env.MODE || 'development';

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined') return;

    const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

    if (sentryDsn && this.environment === 'production') {
      this.initializeSentry(sentryDsn);
    }

    this.setupGlobalErrorHandlers();
    this.setupPerformanceObserver();
  }

  private async initializeSentry(dsn: string) {
    try {
      const Sentry = await import(/* @vite-ignore */ '@sentry/react').catch(() => null);

      if (!Sentry) {
        logger.info('Sentry package not installed, monitoring disabled');
        return;
      }

      Sentry.init({
        dsn,
        environment: this.environment,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],
        tracesSampleRate: this.environment === 'production' ? 0.1 : 1.0,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        beforeSend(event, hint) {
          if (event.exception) {
            const error = hint.originalException;
            if (error instanceof Error) {
              if (error.message.includes('ResizeObserver')) {
                return null;
              }
            }
          }
          return event;
        },
      });

      this.sentryEnabled = true;
      logger.info('Sentry monitoring initialized');
    } catch (error) {
      logger.info('Sentry not available, continuing without monitoring');
    }
  }

  private setupGlobalErrorHandlers() {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.captureError({
        error: event.error || new Error(event.message),
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        severity: 'high',
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        context: { type: 'unhandledrejection' },
        severity: 'high',
      });
    });
  }

  private setupPerformanceObserver() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.trackPerformance({
              name: 'page_load',
              value: entry.duration,
              metadata: { type: entry.entryType },
            });
          } else if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            if (resourceEntry.duration > 1000) {
              this.trackPerformance({
                name: 'slow_resource',
                value: resourceEntry.duration,
                metadata: {
                  name: resourceEntry.name,
                  type: resourceEntry.initiatorType,
                },
              });
            }
          }
        }
      });

      observer.observe({ entryTypes: ['navigation', 'resource', 'paint'] });
    } catch (error) {
      logger.error('Failed to setup performance observer', error);
    }
  }

  captureError(report: ErrorReport) {
    const { error, context, severity = 'medium', userId, tags } = report;

    logger.error(`[${severity.toUpperCase()}] Error captured`, {
      error: error.message,
      stack: error.stack,
      context,
      userId,
      tags,
    });

    if (this.sentryEnabled && typeof window !== 'undefined') {
      import(/* @vite-ignore */ '@sentry/react').then((Sentry) => {
        Sentry.captureException(error, {
          level: this.mapSeverityToSentryLevel(severity),
          contexts: { custom: context },
          user: userId ? { id: userId } : undefined,
          tags,
        });
      }).catch(() => {});
    }

    if (this.environment === 'production' && severity === 'critical') {
      this.sendAlertToBackend(report);
    }
  }

  trackPerformance(metric: PerformanceMetric) {
    logger.info(`Performance metric: ${metric.name}`, {
      value: metric.value,
      rating: metric.rating,
      metadata: metric.metadata,
    });

    if (this.sentryEnabled && typeof window !== 'undefined') {
      import(/* @vite-ignore */ '@sentry/react').then((Sentry) => {
        Sentry.metrics.distribution(metric.name, metric.value, {
          tags: metric.metadata as Record<string, string>,
        });
      }).catch(() => {});
    }
  }

  setUser(userId: string, email?: string, username?: string) {
    if (this.sentryEnabled && typeof window !== 'undefined') {
      import(/* @vite-ignore */ '@sentry/react').then((Sentry) => {
        Sentry.setUser({ id: userId, email, username });
      }).catch(() => {});
    }
  }

  clearUser() {
    if (this.sentryEnabled && typeof window !== 'undefined') {
      import(/* @vite-ignore */ '@sentry/react').then((Sentry) => {
        Sentry.setUser(null);
      }).catch(() => {});
    }
  }

  addBreadcrumb(message: string, category?: string, data?: Record<string, any>) {
    if (this.sentryEnabled && typeof window !== 'undefined') {
      import(/* @vite-ignore */ '@sentry/react').then((Sentry) => {
        Sentry.addBreadcrumb({
          message,
          category,
          data,
          level: 'info',
        });
      }).catch(() => {});
    }
  }

  private mapSeverityToSentryLevel(severity: string): 'fatal' | 'error' | 'warning' | 'info' | 'debug' {
    switch (severity) {
      case 'critical':
        return 'fatal';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'error';
    }
  }

  private async sendAlertToBackend(report: ErrorReport) {
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'critical_error',
          error: report.error.message,
          stack: report.error.stack,
          context: report.context,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        logger.error('Failed to send critical alert to backend');
      }
    } catch (error) {
      logger.error('Error sending alert', error);
    }
  }
}

export const monitoring = new MonitoringService();

export function captureError(error: Error, context?: Record<string, any>, severity?: ErrorReport['severity']) {
  monitoring.captureError({ error, context, severity });
}

export function trackPerformance(name: string, value: number, rating?: PerformanceMetric['rating']) {
  monitoring.trackPerformance({ name, value, rating });
}
