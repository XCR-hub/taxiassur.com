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
      logger.info('Sentry monitoring disabled in this build');
      this.sentryEnabled = false;
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
  }

  setUser(userId: string, email?: string, username?: string) {
    logger.info('User set', { userId, email, username });
  }

  clearUser() {
    logger.info('User cleared');
  }

  addBreadcrumb(message: string, category?: string, data?: Record<string, any>) {
    logger.info('Breadcrumb', { message, category, data });
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
