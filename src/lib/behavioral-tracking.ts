import { logger } from '@/lib/logger';
import { isBehavioralPersonalizationAllowed } from '@/lib/client-consent';

/**
 * Behavioral Tracking System
 * Track user engagement signals pour améliorer SEO
 * (Temps sur page, scroll depth, interactions, CTR)
 */

interface PageMetrics {
  url: string;
  timeOnPage: number;
  scrollDepth: number;
  interactions: number;
  ctaClicks: number;
  exitIntent: boolean;
  timestamp: number;
}

class BehavioralTracker {
  private startTime: number = 0;
  private maxScrollDepth: number = 0;
  private interactions: number = 0;
  private ctaClicks: number = 0;
  private exitIntent: boolean = false;
  private hasSubmitted: boolean = false;
  private enabled: boolean = false;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
    this.startTime = Date.now();
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;
    if (!this.enabled || !isBehavioralPersonalizationAllowed()) return;

    this.trackScrollDepth();
    this.trackInteractions();
    this.trackCTAClicks();
    this.trackExitIntent();
    this.submitOnUnload();
  }

  private trackScrollDepth() {
    const updateScrollDepth = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;

      const scrollPercentage = Math.round(
        ((scrollTop + windowHeight) / documentHeight) * 100
      );

      this.maxScrollDepth = Math.max(this.maxScrollDepth, scrollPercentage);
    };

    window.addEventListener('scroll', updateScrollDepth, { passive: true });
    updateScrollDepth();
  }

  private trackInteractions() {
    const events = ['click', 'keydown', 'mousemove', 'touchstart'];

    const handleInteraction = () => {
      this.interactions++;
    };

    events.forEach(event => {
      window.addEventListener(event, handleInteraction, {
        passive: true,
        once: false
      });
    });
  }

  private trackCTAClicks() {
    window.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      if (
        target.matches('.btn-primary') ||
        target.matches('.btn-cta') ||
        target.matches('[data-cta]') ||
        target.closest('a[href^="tel:"]') ||
        target.closest('a[href^="mailto:"]')
      ) {
        this.ctaClicks++;
      }
    }, { passive: true });
  }

  private trackExitIntent() {
    document.addEventListener('mouseleave', (e) => {
      if (e.clientY < 10) {
        this.exitIntent = true;
      }
    });
  }

  private submitOnUnload() {
    window.addEventListener('beforeunload', () => {
      this.submit();
    });

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.submit();
      }
    });
  }

  private submit() {
    if (this.hasSubmitted) return;
    if (!this.enabled || !isBehavioralPersonalizationAllowed()) return;

    const timeOnPage = Math.floor((Date.now() - this.startTime) / 1000);

    if (timeOnPage < 3) return;

    const metrics: PageMetrics = {
      url: window.location.pathname,
      timeOnPage,
      scrollDepth: this.maxScrollDepth,
      interactions: this.interactions,
      ctaClicks: this.ctaClicks,
      exitIntent: this.exitIntent,
      timestamp: Date.now()
    };

    this.sendToAnalytics(metrics);
    this.saveToLocalStorage(metrics);

    this.hasSubmitted = true;
  }

  private sendToAnalytics(metrics: PageMetrics) {
    if (!isBehavioralPersonalizationAllowed()) return;

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_engagement', {
        time_on_page: metrics.timeOnPage,
        scroll_depth: metrics.scrollDepth,
        interactions: metrics.interactions,
        cta_clicks: metrics.ctaClicks,
        exit_intent: metrics.exitIntent
      });
    }

    if (typeof window.dataLayer !== 'undefined') {
      window.dataLayer.push({
        event: 'behavioral_metrics',
        ...metrics
      });
    }

    this.sendToSupabase(metrics);
  }

  private async sendToSupabase(metrics: PageMetrics) {
    if (!isBehavioralPersonalizationAllowed()) return;

    try {
      const response = await fetch('/api/analytics/behavior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics),
        keepalive: true
      });

      if (!response.ok) {
        logger.warn('[Behavioral Tracking] Failed to send to Supabase');
      }
    } catch (error) {
      logger.error('[Behavioral Tracking] Error:', error);
    }
  }

  private saveToLocalStorage(metrics: PageMetrics) {
    if (!isBehavioralPersonalizationAllowed()) return;

    try {
      const key = 'behavioral_metrics';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(metrics);

      if (existing.length > 50) existing.shift();

      localStorage.setItem(key, JSON.stringify(existing));
    } catch (error) {
      logger.error('[Behavioral Tracking] LocalStorage error:', error);
    }
  }

  public getMetrics(): Partial<PageMetrics> {
    if (!this.enabled || !isBehavioralPersonalizationAllowed()) {
      return {
        timeOnPage: 0,
        scrollDepth: 0,
        interactions: 0,
        ctaClicks: 0,
        exitIntent: false
      };
    }

    return {
      timeOnPage: Math.floor((Date.now() - this.startTime) / 1000),
      scrollDepth: this.maxScrollDepth,
      interactions: this.interactions,
      ctaClicks: this.ctaClicks,
      exitIntent: this.exitIntent
    };
  }
}

let trackerInstance: BehavioralTracker | null = null;

export function initBehavioralTracking(): BehavioralTracker {
  if (trackerInstance) return trackerInstance;
  trackerInstance = new BehavioralTracker(isBehavioralPersonalizationAllowed());
  return trackerInstance;
}

export function getBehavioralMetrics(): Partial<PageMetrics> | null {
  return trackerInstance?.getMetrics() || null;
}

export function getAverageMetrics(): {
  avgTimeOnPage: number;
  avgScrollDepth: number;
  avgInteractions: number;
  totalPages: number;
} {
  try {
    if (!isBehavioralPersonalizationAllowed()) {
      return { avgTimeOnPage: 0, avgScrollDepth: 0, avgInteractions: 0, totalPages: 0 };
    }

    const metrics: PageMetrics[] = JSON.parse(
      localStorage.getItem('behavioral_metrics') || '[]'
    );

    if (metrics.length === 0) {
      return { avgTimeOnPage: 0, avgScrollDepth: 0, avgInteractions: 0, totalPages: 0 };
    }

    const sum = metrics.reduce(
      (acc, m) => ({
        timeOnPage: acc.timeOnPage + m.timeOnPage,
        scrollDepth: acc.scrollDepth + m.scrollDepth,
        interactions: acc.interactions + m.interactions
      }),
      { timeOnPage: 0, scrollDepth: 0, interactions: 0 }
    );

    return {
      avgTimeOnPage: Math.round(sum.timeOnPage / metrics.length),
      avgScrollDepth: Math.round(sum.scrollDepth / metrics.length),
      avgInteractions: Math.round(sum.interactions / metrics.length),
      totalPages: metrics.length
    };
  } catch {
    return { avgTimeOnPage: 0, avgScrollDepth: 0, avgInteractions: 0, totalPages: 0 };
  }
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}
