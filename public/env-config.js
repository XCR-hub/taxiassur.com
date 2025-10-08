// Configuration des variables d'environnement
window.ENV_CONFIG = {
  // Supabase
  VITE_SUPABASE_URL: 'https://bqtdiwqrjvptwzdvyaqp.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdGRpd3FyanZwdHd6ZHZ5YXFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg0Mzg0MDUsImV4cCI6MjA0NDAxNDQwNX0.HvYcFTxCWV0hg4cePHxUFnzlz8T9x0lK_z5dYXdUKQQ',
  
  // Google Services
  VITE_GTAG_ID: 'G-VDR9C5QDLD',
  VITE_GA_MEASUREMENT_ID: 'G-VDR9C5QDLD',
  VITE_PAGESPEED_API_KEY: 'AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o',
  VITE_GTM_ID: 'GTM-52JDP8VB',
  VITE_RECAPTCHA_SITE_KEY: '6LcJVqUqAAAAAOv9dqK9lsDcMZiJmNTCvQyLxIyI',
  VITE_CSE_ID: 'c6a2d99e5b7b84bbf',
  
  // Email
  VITE_SMTP_HOST: 'smtp.ionos.fr',
  VITE_SMTP_PORT: '587',
  VITE_SMTP_USER: 'team@taxiassur.com',
  VITE_CONTACT_EMAIL: 'team@taxiassur.com',
  VITE_SMTP_FROM: 'team@taxiassur.com',

  // Make.com Webhook
  VITE_MAKE_API_TOKEN: '507a717b-3a95-483e-8fa0-215cff5c48f2',
  VITE_MAKE_SECRET: 'taxiassur_webhook_secret_2024',

  // OpenAI (utilisé côté serveur uniquement)
  VITE_OPENAI_API_KEY: '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'
};

console.log('✅ Configuration chargée depuis env-config.js');
