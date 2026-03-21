import { useState, useEffect, createContext, useContext } from 'react';

export type Locale = 'fr' | 'en' | 'es' | 'de';

type TranslationKeys = Record<string, string | Record<string, string>>;

interface Translations {
  [key: string]: TranslationKeys;
}

const translations: Translations = {
  fr: {
    common: {
      welcome: 'Bienvenue',
      getQuote: 'Obtenir un devis',
      contact: 'Contact',
      about: 'À propos',
      services: 'Services',
      faq: 'FAQ',
      blog: 'Blog',
      login: 'Connexion',
      logout: 'Déconnexion',
      submit: 'Envoyer',
      cancel: 'Annuler',
      save: 'Enregistrer',
      delete: 'Supprimer',
      edit: 'Modifier',
      close: 'Fermer',
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
    },
    home: {
      hero: {
        title: 'Assurance taxi professionnelle',
        subtitle: 'Protection complète pour votre activité',
        cta: 'Devis gratuit en 2 minutes',
      },
    },
  },
  en: {
    common: {
      welcome: 'Welcome',
      getQuote: 'Get a Quote',
      contact: 'Contact',
      about: 'About',
      services: 'Services',
      faq: 'FAQ',
      blog: 'Blog',
      login: 'Login',
      logout: 'Logout',
      submit: 'Submit',
      cancel: 'Cancel',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
    },
    home: {
      hero: {
        title: 'Professional Taxi Insurance',
        subtitle: 'Complete protection for your business',
        cta: 'Free quote in 2 minutes',
      },
    },
  },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

function getNestedTranslation(obj: Record<string, unknown>, path: string): string {
  return path.split('.').reduce((current, key) => current?.[key], obj) || path;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem('locale');
    if (stored && ['fr', 'en', 'es', 'de'].includes(stored)) {
      return stored as Locale;
    }
    const browserLang = navigator.language.split('-')[0];
    return ['fr', 'en', 'es', 'de'].includes(browserLang) ? (browserLang as Locale) : 'fr';
  });

  useEffect(() => {
    localStorage.setItem('locale', locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
  };

  const t = (key: string, params?: Record<string, string>): string => {
    let translation = getNestedTranslation(translations[locale], key);

    if (typeof translation !== 'string') {
      translation = key;
    }

    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        translation = translation.replace(`{{${paramKey}}}`, paramValue);
      });
    }

    return translation;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function useTranslation() {
  return useI18n();
}
