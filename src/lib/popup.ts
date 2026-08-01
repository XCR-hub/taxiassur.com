import React from 'react';
import { logger } from '@/lib/logger';
import { hasAnalyticsConsent } from '@/lib/privacy-consent';

// Gestion des popups et modales
import { z } from 'zod';

export const PopupConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean().default(false),
  type: z.enum(['exit-intent', 'time-based', 'scroll-based']).default('exit-intent'),
  trigger: z.object({
    delay: z.number().default(5000), // ms pour time-based
    scrollPercent: z.number().default(70), // % pour scroll-based
    exitSensitivity: z.number().default(50) // px pour exit-intent
  }),
  content: z.object({
    title: z.string(),
    subtitle: z.string(),
    description: z.string(),
    ctaText: z.string(),
    ctaAction: z.enum(['form', 'phone', 'email', 'url']).default('form'),
    ctaValue: z.string().optional(),
    urgencyText: z.string().optional(),
    benefits: z.array(z.string()).default([])
  }),
  design: z.object({
    theme: z.enum(['default', 'urgent', 'premium', 'minimal']).default('default'),
    colors: z.object({
      primary: z.string().default('#ef4444'),
      secondary: z.string().default('#dc2626'),
      text: z.string().default('#ffffff'),
      background: z.string().default('#ffffff')
    }),
    animation: z.enum(['bounce', 'fade', 'slide', 'zoom']).default('bounce'),
    size: z.enum(['sm', 'md', 'lg']).default('md')
  }),
  targeting: z.object({
    pages: z.array(z.string()).default(['/']), // Pages où afficher
    devices: z.array(z.enum(['mobile', 'tablet', 'desktop'])).default(['mobile', 'tablet', 'desktop']),
    newVisitors: z.boolean().default(true),
    returningVisitors: z.boolean().default(false),
    excludeConverted: z.boolean().default(true)
  }),
  analytics: z.object({
    trackViews: z.boolean().default(true),
    trackClicks: z.boolean().default(true),
    trackConversions: z.boolean().default(true),
    goalValue: z.number().default(50) // Valeur estimée d'une conversion
  }),
  schedule: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    daysOfWeek: z.array(z.number()).default([0,1,2,3,4,5,6]), // 0=dimanche
    hoursRange: z.object({
      start: z.number().default(0),
      end: z.number().default(23)
    })
  }),
  frequency: z.object({
    maxPerSession: z.number().default(1),
    maxPerDay: z.number().default(1),
    cooldownHours: z.number().default(24)
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  status: z.enum(['draft', 'active', 'paused', 'archived']).default('draft')
});

export type PopupConfig = z.infer<typeof PopupConfigSchema>;

// Gestion des popups actives
export class PopupManager {
  private static configs: PopupConfig[] = [];
  private static shownPopups = new Set<string>();

  static async loadConfigs(): Promise<PopupConfig[]> {
    try {
      const response = await fetch('/content/popups.json');
      if (!response.ok) return [];

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return [];
      }

      const data = await response.json();
      this.configs = Array.isArray(data) ? data.map(item => PopupConfigSchema.parse(item)) : [];
      return this.configs;
    } catch (error) {
      logger.warn('Failed to load popup configs:', error);
      return [];
    }
  }

  static async saveConfig(config: PopupConfig): Promise<boolean> {
    try {
      const response = await fetch('/webhooks/make.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MAKE-SECRET': ''
        },
        body: JSON.stringify({
          type: 'popup',
          action: 'upsert',
          payload: config
        })
      });

      return response.ok;
    } catch (error) {
      logger.error('Failed to save popup config:', error);
      return false;
    }
  }

  static getActivePopups(currentPage: string): PopupConfig[] {
    return this.configs.filter(config => {
      if (config.status !== 'active') return false;
      if (!config.targeting.pages.includes(currentPage) && !config.targeting.pages.includes('*')) return false;
      
      // Check schedule
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay();
      
      if (!config.schedule.daysOfWeek.includes(currentDay)) return false;
      if (currentHour < config.schedule.hoursRange.start || currentHour > config.schedule.hoursRange.end) return false;
      
      // Check if already shown
      if (this.shownPopups.has(config.id)) return false;
      
      // Check frequency limits
      const lastShown = localStorage.getItem(`popup_last_shown_${config.id}`);
      if (lastShown) {
        const hoursSince = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60);
        if (hoursSince < config.frequency.cooldownHours) return false;
      }
      
      return true;
    });
  }

  static markAsShown(popupId: string) {
    this.shownPopups.add(popupId);
    localStorage.setItem(`popup_last_shown_${popupId}`, Date.now().toString());
  }

  static shouldShowForUser(config: PopupConfig): boolean {
    const isReturning = localStorage.getItem('taxiassur_visited') === 'true';
    const hasConverted = localStorage.getItem('taxiassur_converted') === 'true';
    
    if (!config.targeting.newVisitors && !isReturning) return false;
    if (!config.targeting.returningVisitors && isReturning) return false;
    if (config.targeting.excludeConverted && hasConverted) return false;
    
    return true;
  }

  static trackEvent(popupId: string, event: 'view' | 'click' | 'close' | 'convert') {
    const config = this.configs.find(c => c.id === popupId);
    if (!config || !config.analytics.trackViews) return;

    // Track in analytics
    if (hasAnalyticsConsent() && typeof gtag !== 'undefined') {
      gtag('event', `popup_${event}`, {
        event_category: 'popup',
        event_label: popupId,
        value: event === 'convert' ? config.analytics.goalValue : 1
      });
    }

    if (!hasAnalyticsConsent()) return;

    // Store local analytics
    const analytics = JSON.parse(localStorage.getItem('popup_analytics') || '{}');
    if (!analytics[popupId]) analytics[popupId] = {};
    if (!analytics[popupId][event]) analytics[popupId][event] = 0;
    analytics[popupId][event]++;
    localStorage.setItem('popup_analytics', JSON.stringify(analytics));
  }
}

// Hook pour utiliser les popups dans les composants
export function usePopupManager(currentPage: string = '/') {
  const [activePopups, setActivePopups] = React.useState<PopupConfig[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadPopups = async () => {
      await PopupManager.loadConfigs();
      const active = PopupManager.getActivePopups(currentPage);
      setActivePopups(active);
      setLoading(false);
    };

    loadPopups();
  }, [currentPage]);

  const showPopup = (popupId: string) => {
    PopupManager.markAsShown(popupId);
    PopupManager.trackEvent(popupId, 'view');
  };

  const hidePopup = (popupId: string) => {
    setActivePopups(prev => prev.filter(p => p.id !== popupId));
    PopupManager.trackEvent(popupId, 'close');
  };

  const convertPopup = (popupId: string) => {
    PopupManager.trackEvent(popupId, 'convert');
    localStorage.setItem('taxiassur_converted', 'true');
    hidePopup(popupId);
  };

  return {
    activePopups,
    loading,
    showPopup,
    hidePopup,
    convertPopup
  };
}