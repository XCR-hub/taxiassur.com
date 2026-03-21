interface EventData {
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
}

interface PageViewData {
  path: string;
  title: string;
  referrer?: string;
  metadata?: Record<string, any>;
}

interface UserProperties {
  userId?: string;
  email?: string;
  traits?: Record<string, any>;
}

class EventAnalytics {
  private queue: Array<{type: string; data: Record<string, unknown>}> = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private userProperties: UserProperties = {};

  constructor() {
    this.startAutoFlush();
    this.trackPageViews();
  }

  identify(userId: string, traits?: Record<string, any>) {
    this.userProperties = {
      userId,
      traits,
    };

    this.track({
      category: 'user',
      action: 'identify',
      metadata: { userId, ...traits },
    });
  }

  track(event: EventData) {
    const enrichedEvent = {
      ...event,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.userProperties.userId,
      sessionId: this.getSessionId(),
    };

    this.queue.push({
      type: 'event',
      data: enrichedEvent,
    });

    if (this.queue.length >= 10) {
      this.flush();
    }
  }

  page(data: PageViewData) {
    this.track({
      category: 'page',
      action: 'view',
      label: data.path,
      metadata: {
        title: data.title,
        referrer: data.referrer || document.referrer,
        ...data.metadata,
      },
    });
  }

  conversion(conversionType: string, value?: number, metadata?: Record<string, any>) {
    this.track({
      category: 'conversion',
      action: conversionType,
      value,
      metadata,
    });
  }

  error(error: Error, context?: Record<string, any>) {
    this.track({
      category: 'error',
      action: 'exception',
      label: error.message,
      metadata: {
        stack: error.stack,
        ...context,
      },
    });
  }

  timing(category: string, variable: string, time: number) {
    this.track({
      category,
      action: 'timing',
      label: variable,
      value: time,
    });
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  private trackPageViews() {
    let lastPath = window.location.pathname;

    const observer = new MutationObserver(() => {
      if (window.location.pathname !== lastPath) {
        lastPath = window.location.pathname;
        this.page({
          path: window.location.pathname,
          title: document.title,
          referrer: document.referrer,
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private startAutoFlush() {
    this.flushInterval = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, 5000);
  }

  private async flush() {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
        keepalive: true,
      });
    } catch (error) {
      this.queue.unshift(...events);
    }
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

export const analytics = new EventAnalytics();

export function useEventTracking() {
  const trackEvent = (event: EventData) => {
    analytics.track(event);
  };

  const trackClick = (label: string, metadata?: Record<string, any>) => {
    analytics.track({
      category: 'interaction',
      action: 'click',
      label,
      metadata,
    });
  };

  const trackForm = (action: 'start' | 'submit' | 'abandon', formName: string) => {
    analytics.track({
      category: 'form',
      action,
      label: formName,
    });
  };

  const trackScroll = (depth: number) => {
    analytics.track({
      category: 'engagement',
      action: 'scroll',
      value: depth,
    });
  };

  return {
    trackEvent,
    trackClick,
    trackForm,
    trackScroll,
  };
}
