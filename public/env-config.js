// Configuration des variables d'environnement pour TaxiAssur
window.ENV_CONFIG = {
  VITE_SUPABASE_URL: 'https://qiavtxpaznxpttkdaevy.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXZ0eHBhem54cHR0a2RhZXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5Njg1ODUsImV4cCI6MjA4NjU0NDU4NX0.FvEbDxwQy8tsTgeGr4skoJh2KXWJldlSm1RIhoDPY5g',
  VITE_SUPABASE_SERVICE_ROLE_KEY: '',
  VITE_GTAG_ID: 'G-VDR9C5QDLD',
  VITE_GA_MEASUREMENT_ID: 'G-VDR9C5QDLD',
  VITE_PAGESPEED_API_KEY: 'AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o',
  VITE_GTM_ID: 'GTM-52JDP8VB',
  VITE_RECAPTCHA_SITE_KEY: '6LcJVqUqAAAAAOv9dqK9lsDcMZiJmNTCvQyLxIyI',
  VITE_CSE_ID: 'c6a2d99e5b7b84bbf',
  VITE_GOOGLE_CSE_API_KEY: 'AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o',
  VITE_GOOGLE_CSE_CX: '73ba86b5aae9b4add',
  VITE_SMTP_HOST: 'smtp.ionos.fr',
  VITE_SMTP_PORT: '465',
  VITE_SMTP_USER: 'team@taxiassur.com',
  VITE_SMTP_PASSWORD: 'TAXIassur!,',
  VITE_IMAP_HOST: 'imap.ionos.fr',
  VITE_IMAP_PORT: '993',
  VITE_CONTACT_EMAIL: 'team@taxiassur.com',
  VITE_SMTP_FROM: 'team@taxiassur.com',
  VITE_MAKE_API_TOKEN: '507a717b-3a95-483e-8fa0-215cff5c48f2',
  VITE_MAKE_SECRET: 'taxiassur_webhook_secret_2024',
  VITE_OPENAI_API_KEY: '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',
  VITE_SERP_API_KEY: '420c1db639f7961f89b578da9be23a76cd16795664103b95019a432026555202',
  VITE_SITE_URL: 'https://taxiassur.com',
  VITE_BRAND_NAME: 'TaxiAssur',
  VITE_META_PIXEL_ID: 'VOTRE_META_PIXEL_ID_ICI',
  VITE_ADMIN_PASSWORD: 'taxiassur2024',
  VITE_NOINDEX: 'false',

  // Monitoring & Error Tracking
  VITE_SENTRY_DSN: '',

  // Email Service (Resend - meilleure délivrabilité)
  VITE_RESEND_API_KEY: '',

  // CAPTCHA (hCaptcha recommandé, ou reCAPTCHA v3)
  VITE_HCAPTCHA_SITE_KEY: '',
  VITE_HCAPTCHA_SECRET_KEY: ''
};

console.log('✅ Configuration chargée depuis env-config.js');
