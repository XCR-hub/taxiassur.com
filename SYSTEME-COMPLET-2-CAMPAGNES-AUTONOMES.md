# 🤖 SYSTÈME COMPLET - 2 CAMPAGNES 100% AUTONOMES

## 📋 Vision Globale

**Objectif:** Machine qui tourne seule 24/7 pendant que vous faites des devis/contrats

**2 Campagnes parallèles:**
1. 🔗 **Campagne Backlinks** → Scraping sites → Proposition échange → Suivi → Notification
2. 🚖 **Campagne Taxis** → Google Places API → Prospection → Devis → Notification

**Résultat:** Vous recevez seulement emails `team@taxiassur.com` pour OK/KO validés

---

## 🔗 CAMPAGNE 1: BACKLINKS AUTONOME

### Workflow Automatique Complet

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAMPAGNE BACKLINKS                           │
└─────────────────────────────────────────────────────────────────┘

ÉTAPE 1: SCRAPING AUTOMATIQUE
├─ Cron: Tous les jours 3h du matin
├─ Edge Function: scrape-backlink-prospects
├─ Actions:
│  ├─ Cherche sites pertinents (Google Search API)
│  ├─ Analyse qualité site (Domain Authority, Traffic)
│  ├─ Extrait emails (scraping + Hunter.io API)
│  └─ Enregistre dans: backlink_prospects
└─ Résultat: 50 nouveaux prospects/jour

ÉTAPE 2: QUALIFICATION IA
├─ Cron: Tous les jours 4h du matin
├─ Edge Function: ai-qualify-backlinks
├─ Actions:
│  ├─ IA analyse chaque prospect (GPT-4)
│  ├─ Score qualité 0-100 (DA, niche, trafic)
│  ├─ Génère pitch personnalisé
│  └─ Priorité: high/medium/low
└─ Résultat: Prospects qualifiés prêts

ÉTAPE 3: ENVOI EMAIL INITIAL
├─ Cron: Tous les jours 10h-18h (par vagues)
├─ Edge Function: send-backlink-outreach
├─ Actions:
│  ├─ Sélectionne 20 prospects prioritaires
│  ├─ Template email IA personnalisé
│  ├─ Envoie via SendGrid avec tracking
│  ├─ Marque: status = 'email_sent'
│  └─ Programme relance J+3
└─ Résultat: 20 emails/jour envoyés

ÉTAPE 4: TRACKING OUVERTURES
├─ Webhook: SendGrid → /webhook-email-tracking
├─ Events trackés:
│  ├─ Email ouvert → status = 'opened'
│  ├─ Lien cliqué → status = 'interested'
│  ├─ Réponse reçue → status = 'replied'
│  └─ Bounce → status = 'bounced'
└─ Mise à jour temps réel

ÉTAPE 5: RELANCE AUTOMATIQUE J+3
├─ Cron: Tous les jours 11h
├─ Edge Function: auto-followup-backlinks
├─ Conditions:
│  ├─ Email envoyé il y a 3 jours
│  ├─ Pas d'ouverture OU ouvert mais pas répondu
│  └─ Max 2 relances
├─ Actions:
│  ├─ Template relance IA (différent du 1er)
│  ├─ Ton plus amical/urgent selon contexte
│  └─ Programme relance J+7 si besoin
└─ Résultat: Taux réponse +40%

ÉTAPE 6: ANALYSE RÉPONSES IA
├─ Webhook: /webhook-email-reply
├─ Edge Function: ai-analyze-reply
├─ IA détecte:
│  ├─ ✅ POSITIF ("oui", "intéressé", "ok")
│  ├─ ❌ NÉGATIF ("non merci", "pas intéressé")
│  ├─ ❓ NEUTRE ("plus d'infos", "conditions?")
│  └─ 🤔 FLOU (besoin clarification)
└─ Actions automatiques selon réponse

ÉTAPE 7A: RÉPONSE POSITIVE ✅
├─ Actions immédiates:
│  ├─ Envoie email confirmation automatique
│  ├─ Demande URL exacte pour backlink
│  ├─ Propose article invité ou lien
│  └─ Status = 'negotiating'
├─ Puis:
│  ├─ Attend confirmation finale
│  └─ Si OK → ÉTAPE 8 (notification équipe)
└─ IA continue conversation jusqu'à validation

ÉTAPE 7B: RÉPONSE NEUTRE ❓
├─ Actions:
│  ├─ IA génère réponse personnalisée
│  ├─ Répond aux questions posées
│  ├─ Relance avec plus détails
│  └─ Status = 'in_discussion'
└─ Continue jusqu'à OUI ou NON clair

ÉTAPE 7C: RÉPONSE NÉGATIVE ❌
├─ Actions:
│  ├─ Email courtoisie automatique
│  ├─ Demande feedback (pourquoi non)
│  ├─ Status = 'rejected'
│  └─ Enregistre raison pour apprentissage IA
└─ NOTIFICATION team@taxiassur.com

ÉTAPE 8: NOTIFICATION ÉQUIPE (OK)
├─ Trigger: Status = 'accepted'
├─ Edge Function: notify-team-backlink
├─ Email → team@taxiassur.com:
│  ├─ Sujet: "✅ NOUVEAU BACKLINK - [site.com]"
│  ├─ Template HTML avec:
│  │  ├─ Nom du site + metrics (DA, traffic)
│  │  ├─ Historique complet conversation
│  │  ├─ Conditions négociées
│  │  ├─ URL où placer backlink
│  │  └─ Actions à faire maintenant
│  └─ Bouton: "Valider placement backlink"
└─ Vous intervenez pour placement final

ÉTAPE 9: APPRENTISSAGE IA
├─ Cron: Tous les lundis 8h
├─ Edge Function: ai-learn-backlinks
├─ IA analyse:
│  ├─ Taux ouverture par template
│  ├─ Taux réponse positive par pitch
│  ├─ Sites qui acceptent le plus
│  ├─ Phrases qui convertissent
│  └─ Raisons de refus fréquentes
├─ Actions:
│  ├─ Génère nouveaux templates optimisés
│  ├─ Ajuste scoring qualité sites
│  ├─ Améliore pitchs automatiquement
│  └─ Stocke dans: ai_learning_backlinks
└─ Amélioration continue automatique
```

---

## 🚖 CAMPAGNE 2: TAXIS AUTONOME

### Workflow Automatique Complet

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAMPAGNE TAXIS                               │
└─────────────────────────────────────────────────────────────────┘

ÉTAPE 1: SCRAPING GOOGLE PLACES API
├─ Cron: Tous les jours 2h du matin
├─ Edge Function: scrape-taxi-companies-google
├─ Actions:
│  ├─ Recherche "taxi" par ville (API Google Places)
│  ├─ Extraction données:
│  │  ├─ Nom entreprise
│  │  ├─ Adresse complète
│  │  ├─ Téléphone (si dispo)
│  │  ├─ Email (si dispo)
│  │  ├─ Site web (si dispo)
│  │  ├─ Note Google (rating)
│  │  └─ Nombre avis
│  ├─ Enrichissement:
│  │  ├─ Si pas email → Hunter.io API
│  │  ├─ Si pas tel → RocketReach API
│  │  └─ Vérification email (ZeroBounce)
│  └─ Enregistre dans: taxi_prospects
└─ Résultat: 100 nouveaux taxis/jour

ÉTAPE 2: QUALIFICATION IA
├─ Cron: Tous les jours 3h du matin
├─ Edge Function: ai-qualify-taxis
├─ IA analyse:
│  ├─ Taille flotte (estimée via avis/photos)
│  ├─ Qualité service (note Google)
│  ├─ Présence en ligne (site web?)
│  ├─ Localisation (grande ville = priorité)
│  └─ Potentiel CA (score 0-100)
├─ Actions:
│  ├─ Score lead: A (80-100), B (60-79), C (40-59), D (<40)
│  ├─ Génère pitch personnalisé par ville
│  ├─ Priorité: Leads A en premier
│  └─ Définit stratégie contact (Email, SMS, Email+SMS)
└─ Résultat: Taxis qualifiés prêts

ÉTAPE 3A: ENVOI EMAIL (Leads A+B)
├─ Cron: Tous les jours 9h-19h (heures bureau)
├─ Edge Function: send-taxi-email
├─ Actions:
│  ├─ Sélectionne 30 leads A/B prioritaires
│  ├─ Template IA ultra-personnalisé:
│  │  ├─ Mentionne nom taxi + ville
│  │  ├─ Parle de spécificités locales
│  │  ├─ Propose devis gratuit immédiat
│  │  ├─ Avantages concrets chiffrés
│  │  └─ CTA: "Recevoir mon devis en 2 min"
│  ├─ Envoie via SendGrid avec tracking
│  ├─ Status = 'email_sent'
│  └─ Programme relance J+2
└─ Résultat: 30 emails/jour

ÉTAPE 3B: ENVOI SMS (Leads A uniquement, si configuré)
├─ Cron: Tous les jours 10h-18h (non bloquant)
├─ Edge Function: send-taxi-sms
├─ Conditions:
│  ├─ Lead score A (80-100)
│  ├─ Téléphone mobile valide
│  ├─ Pas déjà contacté par SMS
│  └─ Config SMS activée
├─ Template SMS court:
│  "Bonjour [Nom],
│   TaxiAssur - Assurance taxi -30% vs concurrence.
│   Devis gratuit en 2min: [lien court]
│   Répondez STOP pour ne plus recevoir"
├─ Envoie via Twilio/SMS API
├─ Status = 'sms_sent'
└─ Résultat: 10 SMS/jour (ciblés)

ÉTAPE 4: TRACKING ENGAGEMENTS
├─ Webhooks multiples:
│  ├─ SendGrid → Email ouvert/cliqué
│  ├─ Site web → Lien devis cliqué
│  ├─ SMS → Lien ouvert
│  └─ Formulaire → Devis demandé
├─ Events trackés temps réel:
│  ├─ Email ouvert → status = 'opened'
│  ├─ Lien cliqué → status = 'interested'
│  ├─ Formulaire rempli → status = 'lead_hot'
│  ├─ Pièces uploadées → status = 'documents_received'
│  └─ Devis validé → status = 'ready_for_quote'
└─ Dashboard live score engagement

ÉTAPE 5: RELANCE AUTOMATIQUE J+2
├─ Cron: Tous les jours 14h
├─ Edge Function: auto-followup-taxis
├─ Conditions relance:
│  ├─ Email envoyé il y a 2 jours
│  ├─ Pas ouvert OU ouvert mais pas cliqué
│  ├─ Max 3 relances par lead
│  └─ Pause 7 jours après 3ème relance
├─ Templates relances progressifs:
│  ├─ Relance 1 (J+2): Rappel bénéfices
│  ├─ Relance 2 (J+5): Témoignage client
│  ├─ Relance 3 (J+9): Offre urgente limitée
│  └─ IA adapte ton selon engagement précédent
└─ Résultat: Taux conversion +60%

ÉTAPE 6: DÉTECTION INTENTIONS IA
├─ Webhook: /webhook-lead-action
├─ Edge Function: ai-detect-intention
├─ IA analyse comportement:
│  ├─ 🔥 CHAUD: Formulaire rempli ou "besoin devis"
│  ├─ 🟡 TIÈDE: Lien cliqué 2x mais pas formulaire
│  ├─ 🔵 FROID: Email ouvert mais pas d'action
│  └─ ❄️ GELÉ: Aucune ouverture après 3 relances
├─ Scoring dynamique mis à jour
└─ Routage automatique selon température

ÉTAPE 7A: LEAD CHAUD 🔥
├─ Trigger: Formulaire rempli OU email positif
├─ Actions IMMÉDIATES:
│  ├─ Email confirmation automatique:
│  │  "Merci! Votre demande en cours de traitement"
│  ├─ Email demande pièces (si manquantes):
│  │  ├─ Liste docs nécessaires
│  │  ├─ Lien upload sécurisé
│  │  └─ Deadline 48h pour meilleur tarif
│  ├─ Status = 'awaiting_documents'
│  └─ SMS confirmation si tel valide
├─ Puis:
│  ├─ Monitoring upload pièces
│  └─ Si pièces OK → ÉTAPE 8 (notification équipe)
└─ Relance J+1 si pas de pièces

ÉTAPE 7B: LEAD TIÈDE 🟡
├─ Actions:
│  ├─ Email nurturing automatique:
│  │  ├─ Témoignages clients
│  │  ├─ Comparatif prix détaillé
│  │  ├─ FAQ réponses
│  │  └─ Offre spéciale temps limité
│  ├─ Séquence 5 emails sur 2 semaines
│  ├─ IA adapte contenu selon clics précédents
│  └─ Status = 'nurturing'
└─ Conversion progressive vers chaud

ÉTAPE 7C: LEAD FROID 🔵
├─ Actions:
│  ├─ Ajout newsletter hebdo automatique
│  ├─ Contenu éducatif (pas commercial):
│  │  ├─ "5 erreurs à éviter assurance taxi"
│  │  ├─ "Comment baisser prime 30%"
│  │  └─ Actualités secteur transport
│  ├─ Réactivation campagne dans 1 mois
│  └─ Status = 'cold_nurturing'
└─ Objectif: Réactivation long terme

ÉTAPE 7D: LEAD GELÉ ❄️
├─ Actions:
│  ├─ Pause contacts 3 mois
│  ├─ Tentative réactivation Q4:
│  │  "Offre spéciale fin année"
│  ├─ Status = 'paused'
│  └─ Si toujours rien → 'inactive'
└─ Économie ressources sur leads morts

ÉTAPE 8A: PIÈCES REÇUES → NOTIFICATION ÉQUIPE
├─ Trigger: Documents uploadés complets
├─ Edge Function: notify-team-documents
├─ Email → team@taxiassur.com:
│  ├─ Sujet: "📄 NOUVEAU LEAD PRÊT - [Nom Taxi]"
│  ├─ Template HTML avec:
│  │  ├─ Infos taxi (nom, ville, flotte)
│  │  ├─ Score lead (A/B/C/D)
│  │  ├─ Historique contacts (emails/SMS)
│  │  ├─ Pièces reçues (liste + liens download)
│  │  ├─ Attentes client (mentions spéciales)
│  │  └─ Dernier échange si questions
│  └─ Bouton: "Créer devis maintenant"
├─ Actions automatiques:
│  ├─ Email taxi: "Devis en préparation, réponse 24h"
│  ├─ Status = 'quote_pending'
│  └─ Relance équipe si pas traité J+1
└─ VOUS FAITES LE DEVIS

ÉTAPE 8B: ACCORD VERBAL → NOTIFICATION ÉQUIPE
├─ Trigger: Email/SMS "oui intéressé" détecté par IA
├─ Edge Function: notify-team-agreement
├─ Email → team@taxiassur.com:
│  ├─ Sujet: "✅ ACCORD VERBAL - [Nom Taxi]"
│  ├─ Template HTML avec:
│  │  ├─ Message exact du client
│  │  ├─ Historique conversation complète
│  │  ├─ Coordonnées complètes
│  │  ├─ Urgence (si mentionnée)
│  │  └─ Pièces déjà reçues (si oui)
│  └─ Bouton: "Envoyer demande pièces"
├─ Actions:
│  ├─ Email taxi: "Super! Envoyez vos pièces ici"
│  ├─ Status = 'verbal_agreement'
│  └─ Suivi upload pièces
└─ Transition vers ÉTAPE 8A si pièces OK

ÉTAPE 8C: REFUS → NOTIFICATION ÉQUIPE
├─ Trigger: "Non merci" détecté par IA
├─ Edge Function: notify-team-rejection
├─ Email → team@taxiassur.com:
│  ├─ Sujet: "❌ REFUS - [Nom Taxi]"
│  ├─ Template simple:
│  │  ├─ Nom taxi + ville
│  │  ├─ Raison refus (si donnée)
│  │  ├─ Historique échanges
│  │  └─ Statistiques campagne mois
│  └─ Pas d'action requise
├─ Actions:
│  ├─ Email courtoisie taxi
│  ├─ Status = 'rejected'
│  ├─ Enregistrement raison pour IA
│  └─ Réactivation possible dans 6 mois
└─ Apprentissage IA sur motifs refus

ÉTAPE 9: SUIVI POST-DEVIS
├─ Trigger: Devis envoyé par vous
├─ Edge Function: post-quote-followup
├─ Séquence automatique:
│  ├─ J+0: Email "Devis envoyé, questions?"
│  ├─ J+2: "Avez-vous pu consulter le devis?"
│  ├─ J+5: Appel téléphone (si pas réponse)
│  ├─ J+7: "Offre expire dans 7 jours"
│  ├─ J+14: Email final "Dernière chance"
│  └─ Si pas de réponse → 'quote_expired'
├─ Si signature:
│  ├─ Email félicitations
│  ├─ Status = 'client'
│  └─ Ajout CRM clients
└─ Objectif: Maximiser taux conversion devis

ÉTAPE 10: APPRENTISSAGE IA
├─ Cron: Tous les lundis 9h
├─ Edge Function: ai-learn-taxis
├─ IA analyse:
│  ├─ Taux ouverture par ville
│  ├─ Templates qui convertissent le mieux
│  ├─ Moments optimaux envoi (heures)
│  ├─ Objets emails plus performants
│  ├─ Raisons refus fréquentes
│  ├─ Profils taxis qui signent le plus
│  └─ Corrélations score lead / conversion
├─ Actions automatiques:
│  ├─ Génère nouveaux templates optimisés
│  ├─ Ajuste scoring qualité prospects
│  ├─ Améliore pitchs selon villes
│  ├─ Optimise heures envoi par région
│  └─ Stocke dans: ai_learning_taxis
└─ Amélioration continue +5% conversion/mois
```

---

## 🗄️ ARCHITECTURE BASE DE DONNÉES

### Tables Campagne Backlinks

```sql
-- Prospects backlinks scrapés
CREATE TABLE backlink_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text UNIQUE NOT NULL,
  url text NOT NULL,
  email text,
  contact_name text,
  domain_authority int,
  monthly_traffic int,
  niche text,
  quality_score int, -- 0-100 par IA
  priority text, -- 'high', 'medium', 'low'
  status text DEFAULT 'new', -- 'new', 'email_sent', 'opened', 'replied', 'negotiating', 'accepted', 'rejected', 'paused'
  ai_pitch text, -- Pitch généré par IA
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  last_contact_at timestamptz,
  next_followup_at timestamptz
);

-- Historique emails campagne backlinks
CREATE TABLE backlink_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES backlink_prospects(id),
  email_type text NOT NULL, -- 'initial', 'followup_1', 'followup_2', 'reply', 'acceptance'
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text,
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  reply_content text,
  reply_sentiment text, -- 'positive', 'negative', 'neutral', 'unclear' (IA)
  sendgrid_message_id text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Conversations backlinks (thread complet)
CREATE TABLE backlink_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES backlink_prospects(id),
  thread_id text, -- Email thread ID
  messages jsonb DEFAULT '[]'::jsonb, -- Historique complet
  current_status text, -- 'pending', 'accepted', 'rejected'
  accepted_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Apprentissage IA backlinks
CREATE TABLE ai_learning_backlinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_type text NOT NULL, -- 'template', 'timing', 'target', 'pitch'
  context jsonb NOT NULL,
  hypothesis text,
  test_results jsonb,
  success_rate numeric(5,2),
  applied boolean DEFAULT false,
  applied_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);
```

### Tables Campagne Taxis

```sql
-- Prospects taxis scrapés Google Places
CREATE TABLE taxi_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  google_place_id text UNIQUE,
  address text,
  city text NOT NULL,
  postal_code text,
  phone text,
  mobile text,
  email text,
  website text,
  google_rating numeric(2,1),
  google_reviews_count int,
  estimated_fleet_size int, -- Estimé par IA
  quality_score int, -- 0-100 par IA
  lead_grade text, -- 'A', 'B', 'C', 'D'
  status text DEFAULT 'new', -- 'new', 'email_sent', 'sms_sent', 'opened', 'interested', 'lead_hot', 'documents_received', 'quote_pending', 'quote_sent', 'client', 'rejected', 'paused'
  contact_strategy text, -- 'email', 'sms', 'email_sms'
  ai_pitch text,
  temperature text DEFAULT 'cold', -- 'hot', 'warm', 'cold', 'frozen'
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  last_contact_at timestamptz,
  next_followup_at timestamptz
);

-- Historique emails campagne taxis
CREATE TABLE taxi_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES taxi_prospects(id),
  email_type text NOT NULL, -- 'initial', 'followup_1', 'followup_2', 'documents_request', 'confirmation', 'nurturing'
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text,
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  form_filled_at timestamptz,
  replied_at timestamptz,
  reply_content text,
  reply_sentiment text, -- 'interested', 'not_interested', 'need_info', 'unclear' (IA)
  sendgrid_message_id text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Historique SMS campagne taxis
CREATE TABLE taxi_sms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES taxi_prospects(id),
  sms_type text NOT NULL, -- 'initial', 'followup', 'reminder'
  message text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  clicked_at timestamptz,
  replied_at timestamptz,
  reply_content text,
  twilio_message_id text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Documents uploadés par taxis
CREATE TABLE taxi_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES taxi_prospects(id),
  document_type text NOT NULL, -- 'kbis', 'permis', 'carte_grise', 'attestation', 'autre'
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size int,
  uploaded_at timestamptz DEFAULT now(),
  verified boolean DEFAULT false,
  verified_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Leads prêts pour devis (notifiés équipe)
CREATE TABLE taxi_leads_ready (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES taxi_prospects(id),
  lead_type text NOT NULL, -- 'documents_complete', 'verbal_agreement', 'hot_interest'
  notification_sent_at timestamptz DEFAULT now(),
  notification_email text DEFAULT 'team@taxiassur.com',
  documents_count int,
  conversation_summary text, -- Résumé IA
  urgency_level text, -- 'high', 'medium', 'low'
  processed boolean DEFAULT false,
  processed_at timestamptz,
  processed_by text,
  quote_sent_at timestamptz,
  quote_accepted_at timestamptz,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Apprentissage IA taxis
CREATE TABLE ai_learning_taxis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_type text NOT NULL, -- 'template', 'timing', 'city', 'profile', 'objection'
  context jsonb NOT NULL,
  hypothesis text,
  test_results jsonb,
  success_rate numeric(5,2),
  conversion_rate numeric(5,2),
  applied boolean DEFAULT false,
  applied_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);
```

### Tables Communes

```sql
-- Templates emails/SMS (versionnés IA)
CREATE TABLE campaign_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_type text NOT NULL, -- 'backlinks', 'taxis'
  template_type text NOT NULL, -- 'email_initial', 'email_followup', 'sms_initial', etc.
  version int DEFAULT 1,
  name text NOT NULL,
  subject text, -- Si email
  body_html text,
  body_text text,
  variables jsonb DEFAULT '[]'::jsonb, -- [name], [city], etc.
  performance_score numeric(5,2), -- Taux succès
  is_active boolean DEFAULT true,
  created_by text DEFAULT 'AI', -- 'AI' ou 'human'
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Notifications envoyées à l'équipe
CREATE TABLE team_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_type text NOT NULL, -- 'backlinks', 'taxis'
  notification_type text NOT NULL, -- 'new_backlink', 'documents_ready', 'agreement', 'rejection'
  subject text NOT NULL,
  body_html text NOT NULL,
  sent_to text DEFAULT 'team@taxiassur.com',
  sent_at timestamptz DEFAULT now(),
  related_prospect_id uuid,
  read boolean DEFAULT false,
  read_at timestamptz,
  action_taken boolean DEFAULT false,
  action_taken_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Logs activité système
CREATE TABLE system_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_type text NOT NULL,
  activity_type text NOT NULL, -- 'scrape', 'email_sent', 'ai_qualify', 'notification', etc.
  prospect_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  status text, -- 'success', 'error', 'warning'
  error_message text,
  execution_time_ms int,
  created_at timestamptz DEFAULT now()
);
```

---

## 🚀 EDGE FUNCTIONS À CRÉER

### Campagne Backlinks (10 fonctions)

| Fonction | Déclencheur | Action |
|----------|-------------|--------|
| `scrape-backlink-prospects` | Cron 3h | Scrape sites + emails |
| `ai-qualify-backlinks` | Cron 4h | Scoring IA prospects |
| `send-backlink-outreach` | Cron 10h-18h | Envoi emails initiaux |
| `webhook-email-tracking` | Webhook SendGrid | Track ouvertures/clics |
| `auto-followup-backlinks` | Cron 11h | Relances J+3, J+7 |
| `webhook-email-reply` | Webhook Email | Réception réponses |
| `ai-analyze-reply` | Auto | Analyse sentiment IA |
| `ai-respond-backlink` | Auto | Réponse auto si neutre |
| `notify-team-backlink` | Status=accepted | Email team@ |
| `ai-learn-backlinks` | Cron Lundi 8h | Apprentissage IA |

### Campagne Taxis (12 fonctions)

| Fonction | Déclencheur | Action |
|----------|-------------|--------|
| `scrape-taxi-companies-google` | Cron 2h | Google Places API |
| `ai-qualify-taxis` | Cron 3h | Scoring IA taxis |
| `send-taxi-email` | Cron 9h-19h | Envoi emails |
| `send-taxi-sms` | Cron 10h-18h | Envoi SMS (opt) |
| `webhook-lead-action` | Webhook site | Track engagement |
| `ai-detect-intention` | Auto | Détection intentions |
| `auto-followup-taxis` | Cron 14h | Relances J+2 |
| `send-documents-request` | Status=interested | Demande pièces |
| `process-document-upload` | Upload | Traitement docs |
| `notify-team-documents` | Docs complets | Email team@ |
| `notify-team-agreement` | Accord verbal | Email team@ |
| `ai-learn-taxis` | Cron Lundi 9h | Apprentissage IA |

---

## 📧 TEMPLATES EMAILS TEAM@TAXIASSUR.COM

### Template 1: Nouveau Backlink Accepté

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #FFA500 0%, #FF8C00 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .site-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .metrics { display: flex; gap: 20px; margin: 20px 0; }
    .metric { flex: 1; text-align: center; padding: 15px; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .metric-value { font-size: 32px; font-weight: bold; color: #FFA500; }
    .metric-label { font-size: 14px; color: #666; margin-top: 5px; }
    .conversation { background: #f0f4f8; padding: 20px; border-radius: 8px; margin: 20px 0; max-height: 400px; overflow-y: auto; }
    .message { margin: 10px 0; padding: 10px; border-radius: 6px; }
    .message.sent { background: #e3f2fd; border-left: 4px solid #2196F3; }
    .message.received { background: #e8f5e9; border-left: 4px solid #4CAF50; }
    .message-meta { font-size: 12px; color: #666; margin-bottom: 5px; }
    .cta-button { display: inline-block; background: #FFA500; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; text-align: center; }
    .cta-button:hover { background: #FF8C00; }
    .actions { background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #FFA500; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ NOUVEAU BACKLINK ACCEPTÉ</h1>
      <p style="font-size: 18px; margin: 10px 0 0 0;">Un nouveau site a accepté l'échange de backlink</p>
    </div>

    <div class="content">
      <div class="site-info">
        <h2 style="margin-top: 0; color: #FFA500;">📊 Informations du Site</h2>
        <p><strong>Site:</strong> <a href="{{domain_url}}">{{domain_name}}</a></p>
        <p><strong>Contact:</strong> {{contact_name}} ({{contact_email}})</p>
        <p><strong>Niche:</strong> {{niche}}</p>
      </div>

      <div class="metrics">
        <div class="metric">
          <div class="metric-value">{{domain_authority}}</div>
          <div class="metric-label">Domain Authority</div>
        </div>
        <div class="metric">
          <div class="metric-value">{{monthly_traffic}}</div>
          <div class="metric-label">Trafic/mois</div>
        </div>
        <div class="metric">
          <div class="metric-value">{{quality_score}}/100</div>
          <div class="metric-label">Score Qualité IA</div>
        </div>
      </div>

      <h3 style="color: #FFA500;">💬 Historique de la Conversation</h3>
      <div class="conversation">
        {{#each messages}}
        <div class="message {{message_type}}">
          <div class="message-meta">{{date}} - {{from}}</div>
          <div>{{content}}</div>
        </div>
        {{/each}}
      </div>

      <h3 style="color: #FFA500;">📝 Conditions Négociées</h3>
      <div class="site-info">
        <p><strong>Type échange:</strong> {{exchange_type}}</p>
        <p><strong>URL où placer notre lien:</strong> <a href="{{their_url}}">{{their_url}}</a></p>
        <p><strong>Notre page à lier:</strong> {{our_page}}</p>
        <p><strong>Anchor text suggéré:</strong> "{{anchor_text}}"</p>
        {{#if special_requests}}
        <p><strong>Demandes spéciales:</strong> {{special_requests}}</p>
        {{/if}}
      </div>

      <div class="actions">
        <h3 style="margin-top: 0; color: #856404;">⚡ Actions à Faire Maintenant</h3>
        <ol style="margin: 10px 0;">
          <li>Créer article invité ou contenu à envoyer</li>
          <li>Inclure backlink vers TaxiAssur comme convenu</li>
          <li>Envoyer contenu à {{contact_email}}</li>
          <li>Attendre publication (généralement 3-7 jours)</li>
          <li>Vérifier placement backlink une fois publié</li>
          <li>Placer leur backlink sur notre site en retour</li>
        </ol>
      </div>

      <div style="text-align: center;">
        <a href="{{backoffice_url}}" class="cta-button">📝 Gérer ce Backlink dans le Backoffice</a>
      </div>
    </div>

    <div class="footer">
      <p>Vous recevez cet email car un prospect a accepté un échange de backlink.</p>
      <p>Backoffice TaxiAssur - Campagne Backlinks Automatisée</p>
    </div>
  </div>
</body>
</html>
```

### Template 2: Documents Taxi Reçus

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Styles similaires au template 1 */
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 700px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .taxi-info { background: #f1f8f4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50; }
    .score-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 18px; }
    .score-a { background: #4CAF50; color: white; }
    .score-b { background: #2196F3; color: white; }
    .score-c { background: #FF9800; color: white; }
    .score-d { background: #f44336; color: white; }
    .documents-list { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .document-item { display: flex; align-items: center; padding: 10px; margin: 5px 0; background: white; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .document-icon { font-size: 24px; margin-right: 10px; }
    .document-info { flex: 1; }
    .document-name { font-weight: bold; color: #333; }
    .document-size { font-size: 12px; color: #666; }
    .download-button { background: #4CAF50; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-size: 12px; }
    .download-button:hover { background: #45a049; }
    .history { background: #f0f4f8; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .history-item { padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
    .history-item:last-child { border-bottom: none; }
    .cta-button { display: inline-block; background: #4CAF50; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; text-align: center; font-size: 16px; }
    .cta-button:hover { background: #45a049; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 NOUVEAU LEAD PRÊT POUR DEVIS</h1>
      <p style="font-size: 18px; margin: 10px 0 0 0;">Un taxi a uploadé tous les documents nécessaires</p>
    </div>

    <div class="content">
      <div class="taxi-info">
        <h2 style="margin-top: 0; color: #4CAF50;">🚖 Informations du Taxi</h2>
        <p><strong>Entreprise:</strong> {{company_name}}</p>
        <p><strong>Contact:</strong> {{contact_name}}</p>
        <p><strong>Email:</strong> <a href="mailto:{{email}}">{{email}}</a></p>
        <p><strong>Téléphone:</strong> <a href="tel:{{phone}}">{{phone}}</a></p>
        <p><strong>Ville:</strong> {{city}} ({{postal_code}})</p>
        <p><strong>Adresse:</strong> {{address}}</p>
        {{#if website}}
        <p><strong>Site web:</strong> <a href="{{website}}">{{website}}</a></p>
        {{/if}}
        <p><strong>Note Google:</strong> ⭐ {{google_rating}}/5 ({{google_reviews_count}} avis)</p>
        <p><strong>Taille flotte estimée:</strong> {{estimated_fleet_size}} véhicule(s)</p>
        <p><strong>Score Lead:</strong> <span class="score-badge score-{{lead_grade_lower}}">Grade {{lead_grade}}</span></p>
      </div>

      <h3 style="color: #4CAF50;">📎 Documents Reçus ({{documents_count}})</h3>
      <div class="documents-list">
        {{#each documents}}
        <div class="document-item">
          <div class="document-icon">{{icon}}</div>
          <div class="document-info">
            <div class="document-name">{{name}}</div>
            <div class="document-size">{{size}} - Uploadé le {{upload_date}}</div>
          </div>
          <a href="{{download_url}}" class="download-button" target="_blank">📥 Télécharger</a>
        </div>
        {{/each}}
      </div>

      {{#if customer_message}}
      <h3 style="color: #4CAF50;">💬 Message du Client</h3>
      <div class="taxi-info">
        <p style="font-style: italic;">"{{customer_message}}"</p>
      </div>
      {{/if}}

      <h3 style="color: #4CAF50;">📊 Historique des Contacts</h3>
      <div class="history">
        {{#each contact_history}}
        <div class="history-item">
          <strong>{{date}}</strong> - {{type}}
          <br>
          <span style="color: #666;">{{details}}</span>
          {{#if opened}}
          <span style="color: #4CAF50;">✓ Ouvert</span>
          {{/if}}
          {{#if clicked}}
          <span style="color: #2196F3;">✓ Cliqué</span>
          {{/if}}
        </div>
        {{/each}}
      </div>

      {{#if special_notes}}
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #FFA500; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #856404;">⚠️ Notes Importantes</h3>
        <p>{{special_notes}}</p>
      </div>
      {{/if}}

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{create_quote_url}}" class="cta-button">📝 CRÉER LE DEVIS MAINTENANT</a>
      </div>

      <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; text-align: center;">
        <p style="margin: 0; color: #2e7d32; font-weight: bold;">⏰ Ce lead est prêt ! Répondez dans les 24h pour maximiser vos chances de conversion.</p>
      </div>
    </div>

    <div class="footer">
      <p>Vous recevez cet email car un prospect taxi a complété son dossier.</p>
      <p>Backoffice TaxiAssur - Campagne Taxis Automatisée</p>
      <p><a href="{{backoffice_url}}">Accéder au Backoffice</a></p>
    </div>
  </div>
</body>
</html>
```

### Template 3: Accord Verbal Taxi

```html
<!-- Template similaire mais avec "✅ ACCORD VERBAL" et focus sur la conversation -->
<!-- Bouton CTA: "Demander les documents maintenant" -->
```

### Template 4: Refus (Backlinks ou Taxis)

```html
<!-- Template simple notification refus + statistiques campagne -->
<!-- Pas d'action requise, juste information -->
```

---

## 🎯 MÉTRIQUES & DASHBOARD

### KPIs Campagne Backlinks (Dashboard Temps Réel)

```javascript
// Métriques à afficher
{
  prospects_total: 1250,
  prospects_new_today: 47,
  emails_sent_today: 20,
  emails_sent_total: 456,
  open_rate: 32.5%, // Moyenne
  reply_rate: 8.7%,
  positive_reply_rate: 3.2%,
  backlinks_accepted: 15,
  backlinks_pending: 8,
  backlinks_rejected: 42,
  ai_improvements_count: 12,
  best_template_id: "template_v3_personal",
  best_template_open_rate: 45.2%,
  next_scrape_in: "2h 15min",
  next_outreach_in: "6h 30min"
}
```

### KPIs Campagne Taxis (Dashboard Temps Réel)

```javascript
{
  prospects_total: 3480,
  prospects_new_today: 94,
  emails_sent_today: 30,
  sms_sent_today: 10,
  open_rate_email: 28.3%,
  click_rate_email: 12.5%,
  open_rate_sms: 67.8%,
  leads_hot_count: 23,
  documents_received_today: 5,
  quotes_pending: 12,
  conversion_rate: 4.8%, // Leads → Clients
  ai_improvements_count: 18,
  best_city: "Paris (6.2% conversion)",
  best_time_send: "10h-11h (35% open rate)",
  next_scrape_in: "1h 45min",
  next_outreach_in: "3h 20min"
}
```

---

## 🚀 ACTIONS IMMÉDIATES

### Semaine 1: Migrations SQL (2h)

**Créer toutes les tables:**
```sql
-- Fichier: 20251022280000_create_campaigns_system.sql
-- Contient: Toutes les tables backlinks + taxis + communes
```

**Exécuter:**
1. Supabase Dashboard → SQL Editor
2. Run migration
3. Vérifier 20+ tables créées

### Semaine 2: Edge Functions Campagne Backlinks (16h)

**Priorité HAUTE:**
1. `scrape-backlink-prospects` (3h)
2. `ai-qualify-backlinks` (2h)
3. `send-backlink-outreach` (2h)
4. `webhook-email-tracking` (1h)
5. `auto-followup-backlinks` (2h)
6. `ai-analyze-reply` (3h)
7. `notify-team-backlink` (2h)
8. `ai-learn-backlinks` (1h)

### Semaine 3: Edge Functions Campagne Taxis (20h)

**Priorité HAUTE:**
1. `scrape-taxi-companies-google` (4h)
2. `ai-qualify-taxis` (3h)
3. `send-taxi-email` (2h)
4. `send-taxi-sms` (2h)
5. `webhook-lead-action` (2h)
6. `ai-detect-intention` (3h)
7. `auto-followup-taxis` (2h)
8. `notify-team-documents` (1h)
9. `ai-learn-taxis` (1h)

### Semaine 4: Tests & Validation (8h)

**Tests bout en bout:**
1. Test campagne backlinks: Scrape → Email → Suivi → Notification
2. Test campagne taxis: Scrape → Email+SMS → Documents → Notification
3. Test IA apprentissage
4. Test notifications team@
5. Monitoring erreurs
6. Ajustements finaux

---

## 💰 ROI ESTIMÉ

### Investissement Total

| Phase | Temps | Description |
|-------|-------|-------------|
| SQL Migrations | 2h | Tables + indexes |
| Edge Functions Backlinks | 16h | 10 fonctions |
| Edge Functions Taxis | 20h | 12 fonctions |
| Templates Emails | 4h | HTML + variables |
| Tests & Debug | 8h | Validation |
| **TOTAL** | **50h** | **Développement complet** |

### Gains Mensuels Estimés

**Campagne Backlinks:**
- 50 prospects/jour × 30 jours = 1500 prospects/mois
- Taux acceptation 3% = 45 backlinks/mois
- Valeur backlink qualité = 150€
- **Gain SEO: 6750€/mois**
- Temps gagné vs manuel: 40h/mois = 1200€

**Campagne Taxis:**
- 100 prospects/jour × 30 jours = 3000 prospects/mois
- Taux conversion 5% = 150 devis/mois
- Taux signature 30% = 45 contrats/mois
- Commission moyenne = 300€/contrat
- **CA: 13500€/mois**
- Temps gagné vs manuel: 60h/mois = 1800€

**TOTAL GAINS MENSUELS:**
- CA direct: 20250€/mois
- Temps gagné: 3000€/mois
- **TOTAL: 23250€/mois**

**ROI:**
- Investissement: 50h × 100€/h = 5000€
- Retour mois 1: 23250€
- **ROI: 465% dès le 1er mois**
- **Breakeven: 6 jours**

---

## 🎉 CONCLUSION

**Système complet 100% autonome:**
✅ 2 campagnes parallèles
✅ Scraping automatique quotidien
✅ Qualification IA intelligente
✅ Emails/SMS personnalisés IA
✅ Tracking temps réel
✅ Relances automatiques
✅ Analyse réponses IA
✅ Notifications team@ seulement
✅ Apprentissage continu IA
✅ Amélioration auto-performance

**Vous intervenez seulement pour:**
- Créer devis taxis (quand docs prêts)
- Placer backlinks (quand accepté)
- Signer contrats finaux

**La machine fait tout le reste 24/7 !**

**Prochaine étape:**
👉 Créer migration SQL complète des 20+ tables
👉 Puis développer les edge functions une par une
