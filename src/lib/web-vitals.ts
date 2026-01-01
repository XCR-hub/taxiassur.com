import { trackPerformance } from './monitoring';

export interface WebVitalsMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

const thresholds = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
};

function getRating(name: WebVitalsMetric['name'], value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = thresholds[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

export function initWebVitals() {
  if (typeof window === 'undefined') return;

  const reportMetric = (metric: WebVitalsMetric) => {
    trackPerformance(metric.name, metric.value, metric.rating);

    if (metric.rating === 'poor') {
      console.warn(`Poor ${metric.name} detected:`, metric.value);
    }
  };

  if ('PerformanceObserver' in window) {
    observeLCP(reportMetric);
    observeFID(reportMetric);
    observeCLS(reportMetric);
    observeFCP(reportMetric);
    observeTTFB(reportMetric);
    observeINP(reportMetric);
  }
}

function observeLCP(callback: (metric: WebVitalsMetric) => void) {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry;

      const value = lastEntry.startTime;
      callback({
        name: 'LCP',
        value,
        rating: getRating('LCP', value),
        delta: value,
        id: `v3-${Date.now()}-${Math.random()}`,
      });
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (error) {
    console.error('Error observing LCP:', error);
  }
}

function observeFID(callback: (metric: WebVitalsMetric) => void) {
  try {
    const observer = new PerformanceObserver((list) => {
      const firstInput = list.getEntries()[0] as PerformanceEventTiming;
      const value = firstInput.processingStart - firstInput.startTime;

      callback({
        name: 'FID',
        value,
        rating: getRating('FID', value),
        delta: value,
        id: `v3-${Date.now()}-${Math.random()}`,
      });
    });

    observer.observe({ type: 'first-input', buffered: true });
  } catch (error) {
    console.error('Error observing FID:', error);
  }
}

function observeCLS(callback: (metric: WebVitalsMetric) => void) {
  try {
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }

      callback({
        name: 'CLS',
        value: clsValue,
        rating: getRating('CLS', clsValue),
        delta: clsValue,
        id: `v3-${Date.now()}-${Math.random()}`,
      });
    });

    observer.observe({ type: 'layout-shift', buffered: true });
  } catch (error) {
    console.error('Error observing CLS:', error);
  }
}

function observeFCP(callback: (metric: WebVitalsMetric) => void) {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find((entry) => entry.name === 'first-contentful-paint');

      if (fcpEntry) {
        const value = fcpEntry.startTime;
        callback({
          name: 'FCP',
          value,
          rating: getRating('FCP', value),
          delta: value,
          id: `v3-${Date.now()}-${Math.random()}`,
        });
      }
    });

    observer.observe({ type: 'paint', buffered: true });
  } catch (error) {
    console.error('Error observing FCP:', error);
  }
}

function observeTTFB(callback: (metric: WebVitalsMetric) => void) {
  try {
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (navigationEntry) {
      const value = navigationEntry.responseStart - navigationEntry.requestStart;
      callback({
        name: 'TTFB',
        value,
        rating: getRating('TTFB', value),
        delta: value,
        id: `v3-${Date.now()}-${Math.random()}`,
      });
    }
  } catch (error) {
    console.error('Error observing TTFB:', error);
  }
}

function observeINP(callback: (metric: WebVitalsMetric) => void) {
  try {
    let maxDuration = 0;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const eventEntry = entry as PerformanceEventTiming;
        if (eventEntry.duration > maxDuration) {
          maxDuration = eventEntry.duration;

          callback({
            name: 'INP',
            value: maxDuration,
            rating: getRating('INP', maxDuration),
            delta: maxDuration,
            id: `v3-${Date.now()}-${Math.random()}`,
          });
        }
      }
    });

    observer.observe({ type: 'event', buffered: true, durationThreshold: 16 });
  } catch (error) {
    console.error('Error observing INP:', error);
  }
}
