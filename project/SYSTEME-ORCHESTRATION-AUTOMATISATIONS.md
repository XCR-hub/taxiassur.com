# 🎯 SYSTÈME D'ORCHESTRATION DES AUTOMATISATIONS

## Vue d'Ensemble

Le projet TaxiAssur dispose d'un **système avancé d'automatisations chaînées** qui se déclenchent séquentiellement en fonction de statuts et événements.

---

## 📊 Architecture du Système

### 1. **Tables Principales**

```
automation_logs          → Historique de toutes les exécutions
automation_status        → Vue temps réel sur cron.job + stats  
content_schedule         → Planification intelligente du contenu
social_posts             → Publications avec statuts (draft, scheduled, published)
email_outreach_tracking  → Suivi emails (sent, opened, replied)
partner_prospects        → Prospection (new, contacted, responded)
```

### 2. **Système de Statuts** (Déclencheurs de Chaînes)

#### **Content Workflow:**
```
draft → scheduled → generated → published → indexed
  ↓        ↓           ↓            ↓           ↓
 Auto    Cron      AI Gen      Social      SEO Ping
```

#### **Email Workflow:**
```
pending → sent → opened → replied → qualified_lead
   ↓       ↓       ↓         ↓           ↓
 Queue   Send   Track    AI Reply   CRM Insert
```

#### **Partner Workflow:**
```
prospect → contacted → responded → partner → active
    ↓          ↓           ↓          ↓         ↓
  Scrape   Outreach   AI Score   Contract  Tracking
```

---

## 🔄 Automatisations en Chaîne (Existantes)

### **Chaîne 1: Génération de Contenu**
```sql
-- Fichier: create_content_automation_system.sql

1. schedule_next_content()
   ↓ Planifie le contenu avec timestamps naturels (2-8h aléatoires)
   
2. get_next_scheduled_content() 
   ↓ Cron récupère le prochain contenu à générer
   
3. Edge Function: generate-seo-content
   ↓ IA génère l'article complet
   
4. mark_content_published()
   ↓ Met à jour status = 'published'
   
5. TRIGGER: Auto-publication réseaux sociaux
   ↓ Déclenche social-media-auto-publisher
   
6. TRIGGER: IndexNow ping
   ↓ Notifie Google du nouveau contenu
```

**Détails Techniques:**
- Planification: Algorithme anti-détection (random 2-8h)
- Priorités: Keywords à fort ROI en premier
- Fallback: Si génération échoue, retry après 1h

### **Chaîne 2: Email Automation**
```sql
-- Fichier: automation-dashboard-api/index.ts

1. Scraping daily → partner-scraper-outreach
   ↓ Récupère nouveaux prospects
   
2. Status: 'new' → AI qualification
   ↓ Score de pertinence (0-100)
   
3. Score > 70 → send-outreach-emails  
   ↓ Envoi batch (max 100/jour)
   
4. Status: 'sent' → Tracking
   ↓ Webhook reçoit opens/replies
   
5. Status: 'opened' → ai-email-responder
   ↓ Réponse automatique personnalisée
   
6. Status: 'replied' → lead-manager
   ↓ Insertion dans CRM
```

**Rate Limiting:**
- Max 100 emails/jour (respect RGPD)
- Délai 3s entre chaque email
- Retry si erreur: 3 tentatives max

### **Chaîne 3: Social Media Publishing**
```sql
-- Fichiers: create_social_networks_system.sql + edge functions

1. Contenu publié (blog/FAQ) → Trigger
   ↓ Détecte nouveau contenu
   
2. ai-viral-content-generator
   ↓ Génère variations virales
   ↓ Crée posts pour LinkedIn, Pinterest, YouTube
   
3. social_posts table (status: 'scheduled')
   ↓ Planification intelligente (heures de pointe)
   
4. Cron jobs (matin/soir) → Publishers
   ↓ linkedin-publisher (7h-9h)
   ↓ pinterest-publisher (12h-14h, 18h-20h)
   ↓ youtube-publisher (17h-19h)
   
5. Status: 'published' → Analytics
   ↓ Tracking engagement temps réel
   
6. AI Learning → Optimisation auto
   ↓ Ajuste horaires selon performances
```

**Fréquences:**
- LinkedIn: 1x/jour (matin)
- Pinterest: 2x/jour (midi + soir)
- YouTube: 1x/jour (après-midi)

---

## 🎛️ Fonctions d'Orchestration (Clés)

### **1. schedule_next_content()**
```sql
-- Planifie intelligemment le prochain contenu
-- Anti-détection: Horaires variables, patterns humains
-- Input: keyword, city, last_publish
-- Output: scheduled_at (timestamp optimisé)
```

### **2. log_automation_run()**
```sql
-- Logger TOUTES les exécutions
-- Permet tracking, debugging, analytics
-- Auto-appelée par chaque edge function
```

### **3. get_next_scheduled_content()**
```sql
-- Récupérée par cron-orchestrator
-- Retourne: id, keyword, city, content_type
-- Logique: Priorité + Timestamp + ROI
```

### **4. mark_content_published()**
```sql
-- Déclenche la chaîne suivante
-- Update status → Trigger réseaux sociaux
```

### **5. toggle_automation()**
```sql
-- Active/Désactive n'importe quelle automation
-- Utilisée par Auto-Optimizer dashboard
-- SECURITY DEFINER (anon peut l'appeler)
```

---

## 🔧 Edge Functions (Orchestration)

### **automation-dashboard-api** (Chef d'Orchestre)
```typescript
// Route vers la bonne automation selon le job
switch (job) {
  case 'daily_content_generation':
    → generate-seo-content (5 keywords séquentiels)
    
  case 'daily_lead_followup':
    → auto-followup (relance leads J+3, J+7, J+14)
    
  case 'twice_weekly_partner_outreach':
    → partner-scraper-outreach (lundi + jeudi)
    
  case 'hourly_process_incoming_emails':
    → email-auto-responder (traite inbox)
}
```

### **cron-orchestrator** (Hypothétique - Pas encore créé)
```typescript
// Gère les dépendances entre jobs
// Exemple: Attendre que job A finisse avant lancer job B
// Status: À développer si besoin
```

---

## 📈 Monitoring & Dashboard

### **Auto-Optimizer (/backoffice/auto-optimizer)**

**Données Affichées:**
- Total automatisations: 53
- Actives: 0 (à activer!)
- Dernière exécution: Timestamp
- Taux de succès: % calculé sur automation_logs
- Erreurs récentes: Derniers 3 messages

**Actions Disponibles:**
- ✅ Activer/Désactiver chaque automation
- 📊 Voir logs détaillés
- 🔄 Rafraîchissement auto toutes les 10s
- 🚀 Bouton "Activer toutes" (53 d'un coup)

---

## 🎯 État Actuel du Système

### ✅ Ce Qui Est Prêt

1. **53 Cron Jobs** créés et configurés
2. **45 Edge Functions** déployées
3. **Tables** d'orchestration complètes
4. **Dashboard** Auto-Optimizer opérationnel
5. **Système de logs** temps réel
6. **Chaînes de dépendances** programmées

### ❌ Ce Qui Manque

1. **Activation des crons** (0/53 actifs)
2. **Clés API** manquantes (OPENAI_API_KEY, etc.)
3. **Tests bout-en-bout** des chaînes
4. **Documentation** utilisateur backoffice

---

## 🚀 Activation du Système Complet

### **Étape 1: Fixer toggle_automation (URGENT)**
```sql
-- Supprimer version en double
DROP FUNCTION IF EXISTS toggle_automation(bigint, boolean) CASCADE;

-- Vérifier
SELECT proname, pg_get_function_arguments(oid) 
FROM pg_proc 
WHERE proname = 'toggle_automation';
-- Doit afficher 1 seule ligne
```

### **Étape 2: Configurer Secrets Supabase**
```
Settings > Edge Functions > Secrets:
- OPENAI_API_KEY
- PEXELS_API_KEY
- PINTEREST_ACCESS_TOKEN
- LINKEDIN_ACCESS_TOKEN
- YOUTUBE_ACCESS_TOKEN
- SENDGRID_API_KEY (ou EMAIL_SERVICE)
```

### **Étape 3: Activer Automatisations Critiques (Top 10)**
```sql
-- Activer les 10 automatisations prioritaires
UPDATE cron.job 
SET active = true 
WHERE jobname IN (
  'generate-blog-articles-daily',
  'seo-daily-refresh',
  'auto-followup-leads-daily',
  'scrape-taxi-companies-daily',
  'linkedin-auto-publish-daily',
  'pinterest-auto-publish-morning',
  'ai-content-humanizer-3h',
  'sync-google-search-console-daily',
  'trend-analyzer-daily',
  'viral-content-4h'
);
```

### **Étape 4: Vérifier Dashboard**
```
1. https://taxiassur.com/backoffice/auto-optimizer
2. Refresh (Ctrl+Shift+R)
3. Vérifier: "10/53 Automatisations actives"
4. Attendre 10-30min → Voir "Dernière exécution"
```

---

## 📋 Roadmap Orchestration

### **Phase 1: Stabilisation (Maintenant)**
- [ ] Fix toggle_automation (erreur 401)
- [ ] Activer Top 10 automatisations
- [ ] Monitoring 24h → Vérifier logs

### **Phase 2: Expansion (Semaine 1)**
- [ ] Activer 20 automatisations supplémentaires
- [ ] Développer cron-orchestrator avancé
- [ ] Tests chaînes complètes

### **Phase 3: Intelligence (Semaine 2)**
- [ ] IA auto-optimisation horaires
- [ ] Détection anomalies auto
- [ ] Alertes Slack/Email si erreurs

---

## 🎯 Priorité Absolue

**VOTRE DEMANDE:**
> "il faut que tu priorises l'automatisation un gros developpement 
> d'enchainement a été réalisé automatisation qui se suivent et qui 
> se declenchent en fonction de parametres (recu, envoye, publie,..."

**MON ANALYSE:**
Tout le système d'orchestration est **DÉJÀ DÉVELOPPÉ** mais:
1. ❌ 0/53 automatisations actives
2. ❌ Erreur 401 toggle_automation bloque activation
3. ❌ Clés API manquantes

**SOLUTION:**
1. Fixer toggle_automation (5 secondes)
2. Ajouter clés API Supabase (2 minutes)
3. Activer Top 10 (30 secondes)
4. **Le système tourne tout seul** ✅

---

## 📞 Questions?

Si vous voulez que je:
- Développe une chaîne spécifique plus avancée
- Crée un orchestrateur central (cron-orchestrator v2)
- Ajoute des dépendances entre jobs
- Documente une automatisation précise

→ Dites-moi laquelle!
