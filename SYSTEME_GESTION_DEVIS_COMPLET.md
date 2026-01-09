# 📋 Système de Gestion des Devis - Documentation Complète

## 🎯 Vue d'ensemble

Le système de gestion des devis permet d'**uploader, personnaliser et envoyer des devis** aux leads via **Email, SMS ou WhatsApp** avec des templates automatiquement adaptés au statut du lead.

---

## ✨ Fonctionnalités principales

### 1. Upload de devis (PDF/Word)
- Interface drag & drop intuitive
- Formats acceptés : **PDF, Word (.doc, .docx)**
- Taille maximale : **10 MB**
- Stockage sécurisé dans Supabase Storage
- Historique des versions uploadées

### 2. Templates intelligents par statut
Le système propose automatiquement les templates adaptés au statut actuel du lead :

#### 📧 Email Templates
- **Nouveau Lead / Contact tenté** : Premier contact chaleureux
- **Contact Confirmé** : Suite à l'échange téléphonique
- **Sans Réponse / Relance** : Relance avec urgence

#### 📱 SMS Templates
- **Premier Devis** : Message court et efficace
- **Relance** : Rappel avec urgence

#### 💬 WhatsApp Templates
- **Premier Devis** : Message convivial avec emojis
- **Relance** : Message personnalisé

### 3. Personnalisation automatique
Les variables sont remplacées automatiquement :
- `{{first_name}}` : Prénom du lead
- `{{last_name}}` : Nom du lead
- `{{full_name}}` : Nom complet
- `{{email}}` : Email
- `{{phone}}` : Téléphone
- `{{city}}` : Ville
- `{{company_name}}` : Nom de l'entreprise

### 4. Historique complet des envois
- Tracking de tous les envois (email/SMS/WhatsApp)
- Statuts en temps réel :
  - ✅ **Sent** : Envoyé
  - ✅ **Delivered** : Livré
  - 👁️ **Opened** : Ouvert
  - 📥 **Downloaded** : Téléchargé
  - 💬 **Replied** : Réponse reçue
  - ❌ **Failed** : Échec

### 5. Automatisation intelligente
- Mise à jour automatique du statut du lead à **QUOTE_SENT** après envoi
- Historique métadata pour suivi avancé
- Compteurs d'utilisation des templates
- Statistiques de performance

---

## 🗄️ Structure de la base de données

### Tables créées

#### 1. `crm_quote_history`
Historique complet des envois de devis :
```sql
- id (uuid)
- lead_id (uuid) → crm_leads
- document_id (uuid) → crm_lead_documents
- template_id (uuid) → crm_quote_templates
- sent_via (email|sms|whatsapp)
- sent_to (destinataire)
- subject (pour email)
- body (contenu)
- lead_status_at_send (statut au moment de l'envoi)
- sent_at, opened_at, clicked_at, downloaded_at, replied_at
- status (sent|delivered|opened|clicked|downloaded|replied|failed)
```

#### 2. `crm_quote_templates`
Templates de devis adaptés par statut :
```sql
- id (uuid)
- name (nom du template)
- description
- applicable_status (array) → statuts pour lesquels ce template est applicable
- channel (email|sms|whatsapp|all)
- subject_template (pour email)
- body_template (contenu avec variables)
- variables (jsonb) → liste des variables disponibles
- tone (professional|friendly|urgent|formal)
- priority (ordre d'affichage)
- is_active (boolean)
- usage_count (nombre d'utilisations)
- success_rate (taux de succès)
```

#### 3. `crm_lead_documents` (modifié)
Ajout du type `devis` aux documents existants :
```sql
document_type IN (
  'carte_grise',
  'permis_conduire',
  'licence_taxi',
  'carte_identite',
  'rib',
  'devis', ← NOUVEAU
  'contrat_signe',
  'autorisation_stationnement',
  'autre'
)
```

---

## 🎨 Interface utilisateur (QuoteManager)

### Onglet 1 : Upload Devis
1. Zone de drag & drop
2. Sélection de fichier (PDF/Word)
3. Affichage du devis actuel (si existant)
4. Bouton d'upload avec loader

### Onglet 2 : Envoyer
1. **Choix du canal** : Email / SMS / WhatsApp
2. **Sélection du template** : Adapté automatiquement au statut
3. **Personnalisation** :
   - Sujet (pour email)
   - Corps du message (éditable)
4. **Bouton d'envoi** avec confirmation

### Onglet 3 : Historique
- Liste chronologique de tous les envois
- Statuts visuels avec icônes
- Informations détaillées (destinataire, date, canal)
- Bouton de rafraîchissement

---

## 🔄 Workflow complet

### Étape 1 : Upload du devis
```
Lead en statut "READY_FOR_QUOTE"
↓
Upload du fichier PDF/Word
↓
Stockage dans Supabase Storage (bucket: crm-documents)
↓
Enregistrement dans crm_lead_documents
```

### Étape 2 : Sélection du template
```
Statut actuel du lead détecté
↓
Filtrage des templates applicables
↓
Proposition des templates pertinents
↓
Sélection par l'utilisateur
```

### Étape 3 : Personnalisation
```
Template chargé
↓
Variables remplacées automatiquement
↓
Possibilité de modifier le contenu
↓
Validation avant envoi
```

### Étape 4 : Envoi
```
Envoi via edge function correspondante :
- send-crm-email (avec pièce jointe)
- send-sms
- send-whatsapp
↓
Enregistrement dans crm_quote_history
↓
Mise à jour automatique du statut lead → QUOTE_SENT
↓
Tracking des événements (ouverture, clic, etc.)
```

---

## 📊 Templates par défaut inclus

### Email (3 templates)
1. **Premier Contact - Nouveau Lead**
   - Statuts : NEW_LEAD, CONTACT_ATTEMPTED
   - Tone : Friendly
   - Contenu : Accueil chaleureux + présentation des garanties

2. **Devis Suite Contact - Confirmé**
   - Statuts : CONTACT_CONFIRMED, DOCUMENTS_REQUIRED
   - Tone : Professional
   - Contenu : Suite à l'échange + liste des documents nécessaires

3. **Relance Devis - Sans Réponse**
   - Statuts : NO_RESPONSE, RELANCE_ACTIVE
   - Tone : Urgent
   - Contenu : Rappel + date d'expiration + avantages

### SMS (2 templates)
1. **SMS - Premier Devis**
   - Message court (160 caractères max)
   - Notification + invitation à consulter l'email

2. **SMS - Relance Devis**
   - Message d'urgence
   - Expiration proche + CTA téléphone

### WhatsApp (2 templates)
1. **WhatsApp - Premier Devis**
   - Message convivial avec emojis
   - Présentation des garanties
   - CTA répondre ou appeler

2. **WhatsApp - Relance Devis**
   - Rappel personnalisé
   - Urgence + disponibilité

---

## 🔒 Sécurité

- ✅ **RLS activé** sur toutes les tables
- ✅ Accès **admin uniquement** (authenticated)
- ✅ Validation des types de fichiers (PDF/Word uniquement)
- ✅ Limite de taille (10 MB)
- ✅ Storage bucket privé avec policies strictes
- ✅ Triggers automatiques pour cohérence des données

---

## 📈 Statistiques et suivi

### Métriques trackées
- Nombre d'envois par canal
- Taux d'ouverture (email)
- Taux de clic/téléchargement
- Taux de réponse
- Temps moyen avant réponse
- Performance par template

### Utilisation des données
- Optimisation des templates (A/B testing futur)
- Identification des meilleurs moments d'envoi
- Analyse du taux de conversion par statut
- Amélioration continue du processus commercial

---

## 🚀 Utilisation dans le CRM

### Accès
1. Aller dans **CRM → Leads**
2. Cliquer sur un lead
3. Section **"Gestion des Devis"** dans la page de détail

### Best Practices
1. **Toujours uploader** le devis avant d'envoyer
2. **Vérifier le statut** du lead pour le template adapté
3. **Personnaliser** le message selon le contexte
4. **Suivre l'historique** pour les relances appropriées
5. **Utiliser le canal préféré** du client (détecté via interactions)

---

## 🔧 Configuration avancée

### Ajouter un nouveau template

```sql
INSERT INTO crm_quote_templates (
  name,
  description,
  applicable_status,
  channel,
  subject_template,
  body_template,
  variables,
  tone,
  priority
) VALUES (
  'Nom du Template',
  'Description',
  ARRAY['STATUS_1', 'STATUS_2'],
  'email', -- ou 'sms', 'whatsapp', 'all'
  'Sujet avec {{variable}}',
  'Corps du message avec {{first_name}}',
  '["first_name", "last_name", "city"]'::jsonb,
  'professional', -- ou 'friendly', 'urgent', 'formal'
  1 -- priorité d'affichage
);
```

### Modifier un template existant

Via le backoffice (à venir) ou directement en SQL :
```sql
UPDATE crm_quote_templates
SET
  body_template = 'Nouveau contenu',
  updated_at = now()
WHERE name = 'Nom du Template';
```

---

## 🎓 Formation rapide

### Pour les commerciaux
1. **Upload** : Glisser-déposer le PDF
2. **Choisir** : Email, SMS ou WhatsApp
3. **Personnaliser** : Modifier le message si besoin
4. **Envoyer** : Un clic !
5. **Suivre** : Consulter l'historique

### Tips
- 💡 Privilégier **l'email pour le premier envoi** (devis en pièce jointe)
- 💡 Utiliser **SMS pour les relances urgentes**
- 💡 **WhatsApp** pour une approche plus personnelle
- 💡 Toujours **vérifier l'historique** avant de relancer

---

## ✅ Checklist de déploiement

- [x] Migration appliquée
- [x] Tables créées avec RLS
- [x] Templates par défaut insérés
- [x] Composant QuoteManager créé
- [x] Intégration dans CRMLeadDetail
- [x] Build réussi
- [x] Edge functions configurées

---

## 📞 Support

Pour toute question ou amélioration :
- Consulter la documentation technique
- Vérifier les logs Supabase
- Tester en local avant production

---

**Système opérationnel et prêt à l'emploi ! 🎉**
