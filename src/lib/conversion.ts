// Advanced conversion optimization utilities
import { SecureLead } from './security';
import { hasAnalyticsConsent, hasBehavioralPersonalizationConsent, hasMarketingConsent } from './privacy-consent';

// A/B testing framework
export class ABTestManager {
  private static tests: Map<string, { variants: string[]; weights: number[] }> = new Map();
  
  static defineTest(testName: string, variants: string[], weights?: number[]) {
    this.tests.set(testName, {
      variants,
      weights: weights || variants.map(() => 1 / variants.length)
    });
  }

  static getVariant(testName: string, userId?: string): string {
    const test = this.tests.get(testName);
    if (!test) return '';

    // Use consistent variant for same user
    const seed = userId ? this.hashString(userId) : Math.random();
    const random = this.seededRandom(seed);
    
    let cumulative = 0;
    for (let i = 0; i < test.variants.length; i++) {
      cumulative += test.weights[i];
      if (random <= cumulative) {
        return test.variants[i];
      }
    }
    
    return test.variants[0];
  }

  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  private static seededRandom(seed: number): number {
    return seed;
  }
}

// Exit intent detection
export class ExitIntentDetector {
  private static callbacks: Array<() => void> = [];
  private static triggered = false;
  private static enabled = true;

  static onExitIntent(callback: () => void) {
    this.callbacks.push(callback);
    this.setupListeners();
  }

  static disable() {
    this.enabled = false;
  }

  private static setupListeners() {
    if (typeof window === 'undefined') return;

    // Mouse leave detection
    document.addEventListener('mouseleave', (e) => {
      if (!this.enabled || this.triggered) return;
      if (e.clientY <= 0) {
        this.trigger();
      }
    });

    // Mobile scroll up detection
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
      if (!this.enabled || this.triggered) return;
      
      const currentScrollY = window.scrollY;
      if (currentScrollY < lastScrollY && currentScrollY < 100) {
        this.trigger();
      }
      lastScrollY = currentScrollY;
    });

    // Tab visibility change
    document.addEventListener('visibilitychange', () => {
      if (!this.enabled || this.triggered) return;
      if (document.hidden) {
        setTimeout(() => {
          if (document.hidden) this.trigger();
        }, 2000);
      }
    });
  }

  private static trigger() {
    this.triggered = true;
    this.callbacks.forEach(callback => callback());
  }
}

// Form optimization
export class FormOptimizer {
  private static fieldAnalytics: Record<string, { focus: number; blur: number; errors: number }> = {};

  static trackFieldInteraction(fieldName: string, event: 'focus' | 'blur' | 'error') {
    if (!this.fieldAnalytics[fieldName]) {
      this.fieldAnalytics[fieldName] = { focus: 0, blur: 0, errors: 0 };
    }
    this.fieldAnalytics[fieldName][event]++;
  }

  static getFieldAnalytics(): Record<string, any> {
    return { ...this.fieldAnalytics };
  }

  static getOptimalFieldOrder(): string[] {
    // Based on conversion data, optimal order for taxi insurance forms
    return ['name', 'phone', 'email', 'city', 'status', 'immatriculation'];
  }

  static generateDynamicPlaceholders(fieldName: string, userCity?: string): string {
    const placeholders: Record<string, string[]> = {
      name: ['Jean Dupont', 'Marie Martin', 'Ahmed Benali', 'Sophie Dubois'],
      phone: ['06 12 34 56 78', '07 98 76 54 32', '06 11 22 33 44'],
      email: ['jean.dupont@email.com', 'marie.martin@gmail.com', 'contact@exemple.fr'],
      city: userCity ? [userCity] : ['Paris', 'Lyon', 'Marseille', 'Toulouse'],
      immatriculation: ['AB-123-CD', 'EF-456-GH', 'IJ-789-KL']
    };

    const options = placeholders[fieldName] || [''];
    return options[Math.floor(Math.random() * options.length)];
  }
}

// Conversion tracking
export class ConversionTracker {
  private static events: Array<{ event: string; timestamp: number; data?: Record<string, unknown> }> = [];

  static track(event: string, data?: Record<string, unknown>) {
    this.events.push({
      event,
      timestamp: Date.now(),
      data
    });

    // Send to analytics
    if (hasAnalyticsConsent() && typeof gtag !== 'undefined') {
      gtag('event', event, {
        event_category: 'conversion',
        event_label: data?.label || '',
        value: data?.value || 1
      });
    }

    if (hasMarketingConsent() && typeof fbq !== 'undefined') {
      fbq('track', this.mapEventToFacebook(event), data);
    }
  }

  private static mapEventToFacebook(event: string): string {
    const mapping: Record<string, string> = {
      'form_start': 'InitiateCheckout',
      'form_complete': 'Lead',
      'phone_click': 'Contact',
      'email_click': 'Contact'
    };
    return mapping[event] || 'CustomEvent';
  }

  static getFunnelData(): Array<{ step: string; count: number; rate: number }> {
    const steps = ['page_view', 'form_start', 'form_complete'];
    const funnel = steps.map(step => ({
      step,
      count: this.events.filter(e => e.event === step).length,
      rate: 0
    }));

    // Calculate conversion rates
    for (let i = 1; i < funnel.length; i++) {
      const previous = funnel[i - 1].count;
      funnel[i].rate = previous > 0 ? (funnel[i].count / previous) * 100 : 0;
    }

    return funnel;
  }
}

// Smart form prefilling
export class SmartPrefill {
  static getLocationData(): Promise<{ city?: string; region?: string; country?: string }> {
    return new Promise((resolve) => {
      if (!hasBehavioralPersonalizationConsent()) {
        resolve({});
        return;
      }
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=fr`
              );
              const data = await response.json();
              resolve({
                city: data.city || data.locality,
                region: data.principalSubdivision,
                country: data.countryName
              });
            } catch {
              resolve({});
            }
          },
          () => resolve({}),
          { timeout: 5000 }
        );
      } else {
        resolve({});
      }
    });
  }

  static detectUserIntent(): { 
    isReturningVisitor: boolean; 
    previousFormData?: Partial<SecureLead>;
    interestedService?: string;
  } {
    const isReturning = localStorage.getItem('taxiassur_visited') === 'true';
    const previousData = localStorage.getItem('taxiassur_form_data');
    const referrer = document.referrer;
    
    let interestedService = 'assurance-taxi';
    if (referrer.includes('rc-professionnelle')) interestedService = 'rc-professionnelle';
    if (referrer.includes('flotte')) interestedService = 'flotte-vehicules';

    return {
      isReturningVisitor: isReturning,
      previousFormData: previousData ? JSON.parse(previousData) : undefined,
      interestedService
    };
  }
}

// Micro-interactions for better UX
export class MicroInteractions {
  static addFormFieldAnimations() {
    const style = document.createElement('style');
    style.textContent = `
      .form-field-enhanced {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
      }
      
      .form-field-enhanced:focus-within {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(251, 191, 36, 0.15);
      }
      
      .form-field-enhanced::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        width: 0;
        height: 2px;
        background: linear-gradient(90deg, #f59e0b, #eab308);
        transition: all 0.3s ease;
        transform: translateX(-50%);
      }
      
      .form-field-enhanced:focus-within::after {
        width: 100%;
      }
      
      .success-checkmark {
        animation: checkmark 0.6s ease-in-out;
      }
      
      @keyframes checkmark {
        0% { transform: scale(0) rotate(45deg); }
        50% { transform: scale(1.2) rotate(45deg); }
        100% { transform: scale(1) rotate(45deg); }
      }
    `;
    document.head.appendChild(style);
  }

  static addScrollAnimations() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in-up');
        }
      });
    }, observerOptions);

    // Observe all cards and sections
    document.querySelectorAll('.card-premium, .section-animate').forEach(el => {
      observer.observe(el);
    });
  }
}