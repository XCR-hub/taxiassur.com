// Configuration des variables d'environnement pour PRODUCTION (IONOS)
// Ce fichier est chargé par index.html et remplace les variables Vite en production
// IMPORTANT: Mettez à jour ce fichier avec vos vraies clés API avant l'upload

window.ENV = {
  // ========================================
  // SUPABASE - ✅ CONFIGURÉ
  // ========================================
  VITE_SUPABASE_URL: 'https://drohhxrkoequjphvabvq.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg',

  // ========================================
  // GOOGLE CUSTOM SEARCH - ⚠️ À METTRE À JOUR
  // Ancienne clé révoquée: AIzaSyBMdJggXK49R_h8x__U6lIxiWEE8Gbjesk
  // Créer nouvelle clé: https://console.cloud.google.com/apis/credentials
  // ========================================
  VITE_GOOGLE_CSE_API_KEY: 'AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o',
  VITE_GOOGLE_CSE_CX: '73ba86b5aae9b4add',

  // ========================================
  // GOOGLE ANALYTICS 4 - ⚠️ À CONFIGURER
  // Créer sur: https://analytics.google.com/
  // Format: G-XXXXXXXXXX
  // ========================================
  VITE_GTAG_ID: 'G-VDR9C5QDLD',
  VITE_GA_MEASUREMENT_ID=G-VDR9C5QDLD
  VITE_PAGESPEED_API_KEY=AIzaSyB1wcpdbB3AJW0Mxx6tihEVVjPsIIFY-9o

  // ========================================
  // GOOGLE TAG MANAGER - ⚠️ À CONFIGURER
  // Créer sur: https://tagmanager.google.com/
  // Format: GTM-XXXXXXX
  // ========================================
  VITE_GTM_ID: 'GTM-52JDP8VB',

  // ========================================
  // META PIXEL - ⚪ OPTIONNEL
  // Créer sur: https://business.facebook.com/
  // ========================================
  VITE_META_PIXEL_ID: 'VOTRE_META_PIXEL_ID_ICI',

  // ========================================
  // BACKOFFICE - ✅ CONFIGURÉ
  // ========================================
  VITE_ADMIN_PASSWORD: 'taxiassur2024',

  //------------------------------------------
  // SerpAPI (Analyseur Tendances) - Optionnel
  //==========================================
VITE_SERP_API_KEY='420c1db639f7961f89b578da9be23a76cd16795664103b95019a432026555202'

};

// ========================================
// INSTRUCTIONS DE CONFIGURATION
// ========================================
// 1. Remplacez les valeurs "VOTRE_XXX_ICI" par vos vraies clés
// 2. Uploadez ce fichier sur IONOS à la racine du site
// 3. Vérifiez qu'il est accessible à: https://www.taxiassur.com/env-config.js
// 4. Les clés serveur (OpenAI, SendGrid) vont dans Supabase Secrets

console.log('✅ Configuration chargée depuis env-config.js');
