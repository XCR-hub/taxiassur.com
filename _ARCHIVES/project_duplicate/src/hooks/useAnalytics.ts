import { useEffect } from 'react';

interface AnalyticsEvent {
  action: string;
  category?: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}

export const useAnalytics = () => {
  const provider = import.meta.env.VITE_ANALYTICS_PROVIDER || 'none';
  const gtagId = import.meta.env.VITE_GTAG_ID;

  useEffect(() => {
    // Initialize analytics if configured
    if (provider === 'ga4' && gtagId) {
      // GA4 is already loaded via script tag in index.html
      console.log('GA4 Analytics initialized');
    }
  }, [provider, gtagId]);

  const track = (event: string, parameters?: Record<string, any>) => {
    try {
      // Google Analytics 4
      if (provider === 'ga4' && typeof gtag !== 'undefined') {
        gtag('event', event, {
          event_category: parameters?.category || 'engagement',
          event_label: parameters?.label || '',
          value: parameters?.value || 1,
          ...parameters
        });
      }

      // Meta Pixel
      if (typeof fbq !== 'undefined') {
        const fbEvent = mapEventToFacebook(event);
        fbq('track', fbEvent, parameters);
      }

      // Matomo
      if (provider === 'matomo' && typeof _paq !== 'undefined') {
        _paq.push(['trackEvent', 
          parameters?.category || 'Engagement', 
          event, 
          parameters?.label || ''
        ]);
      }

      // Local storage for internal analytics
      const localEvents = JSON.parse(localStorage.getItem('taxiassur_events') || '[]');
      localEvents.push({
        event,
        parameters,
        timestamp: new Date().toISOString(),
        url: window.location.pathname
      });
      
      // Keep only last 100 events
      if (localEvents.length > 100) {
        localEvents.splice(0, localEvents.length - 100);
      }
      
      localStorage.setItem('taxiassur_events', JSON.stringify(localEvents));

    } catch (error) {
      console.warn('Analytics tracking error:', error);
    }
  };

  const mapEventToFacebook = (event: string): string => {
    const mapping: Record<string, string> = {
      'form_start': 'InitiateCheckout',
      'form_submit': 'Lead',
      'form_complete': 'Lead',
      'cta_click': 'Contact',
      'sticky_cta_click': 'Contact',
      'phone_click': 'Contact',
      'email_click': 'Contact',
      'antibot_block': 'CustomEvent'
    };
    return mapping[event] || 'CustomEvent';
  };

  const trackFormStart = () => {
    track('form_start', {
      category: 'form',
      label: 'devis_form'
    });
  };

  const trackFormSubmit = (formData: any) => {
    track('form_submit', {
      category: 'form',
      label: 'devis_form',
      city: formData.city,
      status: formData.status
    });
  };

  const trackFormComplete = () => {
    track('form_complete', {
      category: 'conversion',
      label: 'lead_generated',
      value: 50 // Estimated lead value
    });
  };

  const trackCTAClick = (location: string) => {
    track('cta_click', {
      category: 'engagement',
      label: location
    });
  };

  const trackStickyCTAClick = () => {
    track('sticky_cta_click', {
      category: 'engagement',
      label: 'sticky_button'
    });
  };

  const trackAntibotBlock = (reason: string) => {
    track('antibot_block', {
      category: 'security',
      label: reason
    });
  };

  const trackPhoneClick = (source: string) => {
    track('phone_click', {
      category: 'contact',
      label: source
    });
  };

  return {
    track,
    trackFormStart,
    trackFormSubmit,
    trackFormComplete,
    trackCTAClick,
    trackStickyCTAClick,
    trackAntibotBlock,
    trackPhoneClick
  };
};

// Global analytics functions for use outside React components
export const trackEvent = (event: string, parameters?: Record<string, any>) => {
  try {
    if (typeof gtag !== 'undefined') {
      gtag('event', event, parameters);
    }
  } catch (error) {
    console.warn('Global tracking error:', error);
  }
};

export const trackConversion = (value: number = 50) => {
  trackEvent('conversion', {
    event_category: 'ecommerce',
    value,
    currency: 'EUR'
  });
};