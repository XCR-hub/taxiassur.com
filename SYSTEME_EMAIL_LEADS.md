# 📧 Système de Synchronisation Emails → Leads

## 🎯 Vue d'ensemble

Système automatique qui récupère TOUS les emails (entrants et sortants) et les affecte automatiquement aux leads du CRM. Si un lead n'existe pas pour un email, il est créé automatiquement.

---

## 🔄 Fonctionnement

### Étape 1 : Récupération des emails (IMAP)
- ✅ **Boîte de réception** : 500 derniers emails
- ✅ **Dossier envoyés** : 200 derniers emails
- ✅ Emails entrants ET sortants synchronisés
- ✅ Détection des doublons automatique

### Étape 2 : Affectation aux leads
Pour chaque email :
1. **Identifier le contact**
   - Email entrant → L'expéditeur est le contact
   - Email sortant → Le destinataire est le contact

2. **Chercher le lead existant**
   - Recherche par email dans `crm_leads`

3. **Créer le lead si nécessaire**
   - Extraction automatique nom/prénom
   - Source : "email"
   - Statut : "nouveau"
   - Stage : "lead"

4. **Créer l'interaction CRM**
   - Type : "email"
   - Direction : inbound/outbound
   - Sujet et contenu complets
   - Timestamp précis

---

## 🚀 Edge Functions Déployées

### 1. `sync-ionos-imap`
**Fonction** : Récupération IMAP
- Récupère emails depuis IONOS
- INBOX + Sent
- Détection doublons
- Stockage dans `email_messages`

### 2. `sync-emails-to-leads`
**Fonction** : Affectation intelligente
- Affecte emails aux leads existants
- **Crée automatiquement les leads manquants**
- Génère interactions CRM
- Met à jour `last_interaction_at`

### 3. `sync-all-emails-complete`
**Fonction** : Orchestrateur
- Appelle `sync-ionos-imap`
- Puis appelle `sync-emails-to-leads`
- Retourne statistiques complètes

---

## ⚙️ Automatisation

### Cron Job Actif
```sql
Schedule: */15 * * * *  (Toutes les 15 minutes)
Function: sync-all-emails-complete
Timeout: 120 secondes
```

### Actions automatiques toutes les 15 minutes :
1. ✅ Synchronisation IMAP complète
2. ✅ Affectation emails → leads
3. ✅ Création automatique leads manquants
4. ✅ Génération interactions CRM

---

## 🎮 Utilisation Manuelle

### Dans l'interface CRM (Inbox Multicanal)
1. Aller sur `/backoffice/crm-killer/inbox`
2. Cliquer sur le bouton **"Synchroniser"** (🔄)
3. Attendre la confirmation

### Message de succès :
```
✅ Synchronisation complète réussie !

📧 X emails récupérés (Y nouveaux)
👤 Z nouveaux leads créés
🔗 A emails affectés aux leads
💬 B interactions enregistrées
```

---

## 📊 Base de Données

### Table `email_messages`
```sql
- id (uuid)
- message_id (text) - ID unique IMAP
- from_email (text)
- to_emails (text[])
- to_names (text[]) - NOUVEAU
- subject (text)
- body_text (text)
- direction ('inbound' | 'outbound')
- lead_id (uuid) - LIEN VERS LE LEAD
- auto_matched (boolean) - NOUVEAU
- received_at (timestamp)
```

### Index de performance ajoutés :
- ✅ `idx_email_messages_from_email`
- ✅ `idx_email_messages_lead_id_null`
- ✅ `idx_email_messages_unassigned`
- ✅ `idx_email_messages_direction`

---

## 🎯 Logique de Création de Leads

### Quand un email n'a pas de lead correspondant :

```javascript
Données extraites :
- Email : contact@example.com
- Nom complet : "Jean Dupont"
  → Prénom : "Jean"
  → Nom : "Dupont"

Lead créé avec :
- email: "contact@example.com"
- nom: "Dupont"
- prenom: "Jean"
- source: "email"
- statut: "nouveau"
- pipeline_stage: "lead"
- type_vehicule: "taxi"
- metadata: {
    created_from_email: true,
    first_contact_subject: "Demande de devis",
    first_contact_date: "2026-01-10T..."
  }
```

---

## 📈 Statistiques de Synchronisation

Chaque synchronisation retourne :
```json
{
  "success": true,
  "stats": {
    "emails_retrieved": 150,
    "emails_inserted": 12,
    "emails_skipped": 138,
    "leads_created": 3,
    "emails_linked": 12,
    "interactions_created": 12,
    "total_errors": 0
  }
}
```

---

## 🔧 Configuration Requise

### Variables d'environnement (automatiques)
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

### Configuration Email IONOS
1. Aller sur `/backoffice/email-settings`
2. Configurer :
   - Email : `team@taxiassur.com`
   - IMAP Host : `imap.ionos.fr`
   - IMAP Port : `993`
   - Username : `team@taxiassur.com`
   - **Mot de passe IMAP** (à configurer)

---

## ✅ Avantages du Système

### 🚀 Automatisation Complète
- Zéro intervention manuelle
- Synchronisation toutes les 15 minutes
- Création automatique des leads

### 🎯 Intelligence
- Détection automatique du contact (expéditeur/destinataire)
- Extraction nom/prénom intelligente
- Affectation contextuelle

### 📊 Traçabilité
- Historique complet des interactions
- Timestamps précis
- Métadonnées conservées

### ⚡ Performance
- Index optimisés
- Requêtes rapides
- Gestion 1000+ emails

---

## 🔍 Monitoring

### Logs disponibles dans :
1. **Supabase Edge Functions Logs**
   - Détails de chaque synchronisation
   - Erreurs IMAP
   - Statistiques d'affectation

2. **Interface CRM**
   - Compteurs en temps réel
   - Messages de statut
   - Indicateurs visuels

---

## 🎉 Résultat Final

**TOUS les emails sont maintenant :**
- ✅ Récupérés automatiquement (inbox + sent)
- ✅ Affectés au bon lead
- ✅ Si pas de lead → créé automatiquement
- ✅ Interactions CRM enregistrées
- ✅ Timeline complète disponible

**Votre CRM devient une source de vérité unique pour toutes les communications !** 🚀
