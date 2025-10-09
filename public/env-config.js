// Configuration des variables d'environnement
window.ENV_CONFIG = {
  // Supabase
  VITE_SUPABASE_URL: 'https://viuuznfqkauatkjcegcj.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpdXV6bmZxa2F1YXRramNlZ2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3MDQ4MDAsImV4cCI6MjA3NTI4MDgwMH0.D0wo88ypG2OiZL3wCiUGgMyA3OaqzIjKU2Nbo-oxOjA',

  // Google Services
  VITE_GTAG_ID: 'G-VDR9C5QDLD',
  VITE_GA_MEASUREMENT_ID: 'G-VDR9C5QDLD',
  VITE_PAGESPEED_API_KEY: 'AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o',
  VITE_GTM_ID: 'GTM-52JDP8VB',
  VITE_RECAPTCHA_SITE_KEY: '6LcJVqUqAAAAAOv9dqK9lsDcMZiJmNTCvQyLxIyI',
  VITE_CSE_ID: 'c6a2d99e5b7b84bbf',
  VITE_GOOGLE_CSE_API_KEY: 'AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o',
  VITE_GOOGLE_CSE_CX: '73ba86b5aae9b4add',

  // Email
  VITE_SMTP_HOST: 'smtp.ionos.fr',
  VITE_SMTP_PORT: '587',
  VITE_SMTP_USER: 'team@taxiassur.com',
  VITE_CONTACT_EMAIL: 'team@taxiassur.com',
  VITE_SMTP_FROM: 'team@taxiassur.com',

  // Make.com Webhook
  VITE_MAKE_API_TOKEN: '507a717b-3a95-483e-8fa0-215cff5c48f2',
  VITE_MAKE_SECRET: 'taxiassur_webhook_secret_2024',

  // OpenAI
  VITE_OPENAI_API_KEY: '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',

  // IndexNow
  VITE_INDEXNOW_KEY: 'q38enouostqixbz513fb359ujcosvn4k',

  // SerpAPI
  VITE_SERP_API_KEY: '420c1db639f7961f89b578da9be23a76cd16795664103b95019a432026555202',

  // Site
  VITE_SITE_URL: 'https://taxiassur.com',
  VITE_BRAND_NAME: 'TaxiAssur',

  // Meta
  VITE_META_PIXEL_ID: 'VOTRE_META_PIXEL_ID_ICI',

  // Admin
  VITE_ADMIN_PASSWORD: 'taxiassur2024'
};

console.log('✅ Configuration chargée depuis env-config.js');
