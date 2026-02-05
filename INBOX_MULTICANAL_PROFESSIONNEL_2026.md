# Système Inbox Multicanal Professionnel Type Outlook

## Vue d'ensemble

Un système complet de gestion des emails professionnel avec classification IA, organisation par dossiers, et intégration CRM.

## Architecture de la Base de Données

### 1. Tables Créées

#### `email_folders`
- Dossiers personnalisables (système, lead, catégorie, custom)
- Hiérarchie parent/enfant
- Compteurs temps réel (unread_count, total_count)
- Association possible à un lead

#### `email_classifications`
- Classification automatique par IA
- Types : lead_inquiry, lead_reply, partnership, newsletter, notification, spam, etc.
- Score de confiance (0-1)
- Suggestions de lead et dossier

#### `email_threads`
- Regroupement des conversations
- Association lead/dossier
- Compteur de messages
- Statuts starred/archived

#### `email_suggestions`
- Suggestions IA pour classification incertaine
- Types : create_lead, link_to_lead, move_to_folder, mark_as_spam
- Workflow d'approbation (pending/accepted/rejected)

#### `email_actions`
- Historique complet des actions
- Types : reply, forward, archive, delete, restore, move, star, etc.
- Traçabilité par utilisateur

### 2. Colonnes Ajoutées à `email_messages`

- `thread_id` : Rattachement à une conversation
- `folder_id` : Dossier de classement
- `is_starred` : Marqué comme favori
- `is_archived` : Archivé
- `is_deleted` : Soft delete

## Fonctionnalité de Classification IA

### Fonction `classify_email_intelligent()`

Analyse automatique basée sur :

1. **Réponse de lead existant** (95% confiance)
   - Vérification email expéditeur dans la base leads
   - Association automatique au lead

2. **Demande de devis** (85% confiance)
   - Mots-clés : devis, tarif, prix, cotation, assurance taxi
   - Classement dans "Non classés" pour révision

3. **Partenariat** (80% confiance)
   - Mots-clés : partenariat, collaboration, partnership
   - Classement dans "🤝 Partenariats"

4. **Newsletter** (75% confiance)
   - Email type : noreply, newsletter, notification
   - Classement dans "📧 Newsletters"

5. **Notification réseau social** (90% confiance)
   - Expéditeurs : Pinterest, Facebook, Twitter, LinkedIn, Instagram
   - Classement dans "📊 Notifications"

6. **Autre** (50% confiance)
   - Classification incertaine
   - Suggestion de révision manuelle

### Logique de Traitement

- **Confiance ≥ 80%** : Application automatique
- **Confiance < 80%** : Création d'une suggestion pour validation manuelle

## Dossiers Système

1. **📥 Boîte de réception** - Emails entrants
2. **⭐ Favoris** - Emails importants
3. **📤 Envoyés** - Emails sortants
4. **📝 Brouillons** - En cours de rédaction
5. **📋 Archives** - Emails archivés
6. **🗑️ Corbeille** - Emails supprimés
7. **❓ Non classés** - En attente de classification
8. **🤝 Partenariats** - Demandes de partenariat
9. **📊 Notifications** - Notifications système/réseaux sociaux
10. **📧 Newsletters** - Bulletins d'information

## Fonctionnalités Principales

### 1. Organisation Type Outlook

- **Arborescence de dossiers** avec hiérarchie parent/enfant
- **Dossiers par lead** créables automatiquement
- **Dossiers personnalisés** par catégorie/projet
- **Glisser-déposer** pour déplacer les emails (à implémenter frontend)

### 2. Classification Intelligente

- **Analyse automatique** de chaque email entrant
- **Détection de contexte** (nouveau lead, réponse existante, partenariat)
- **Suggestions IA** quand confiance < 80%
- **Apprentissage** basé sur les actions utilisateur

### 3. Gestion des Suggestions

Interface pour chaque suggestion :
- **Créer un nouveau lead** depuis un email
- **Lier à un lead existant** (avec recherche)
- **Déplacer vers un dossier** spécifique
- **Marquer comme spam** et créer règle

### 4. Actions Rapides

- Répondre / Transférer
- Archiver / Supprimer / Restaurer
- Marquer favori / Lu / Non lu
- Déplacer vers dossier
- Créer lead depuis email

### 5. Threads/Conversations

- **Regroupement automatique** par sujet
- **Compteur de messages** par thread
- **Participants** trackés
- **Association lead** automatique

### 6. Recherche et Filtres

- Recherche full-text (sujet, expéditeur, contenu)
- Filtres : Tous / Non lus / Favoris
- Tri par date, importance, dossier
- Recherche par lead

### 7. Intégration CRM

- **Association automatique** email ↔ lead
- **Bouton "Voir le lead"** direct
- **Création de lead** depuis email non classé
- **Historique complet** des emails par lead
- **Timeline unifiée** dans la fiche lead

## Workflow Utilisateur

### Pour les Commerciaux

1. **Réception email**
   - Classification automatique si confiance haute
   - Suggestion si confiance moyenne
   - Notification si action requise

2. **Traitement des suggestions**
   - Voir le panneau "Suggestions IA"
   - Accepter / Rejeter en un clic
   - Créer lead si nécessaire

3. **Organisation**
   - Créer dossiers par lead important
   - Glisser-déposer les emails
   - Marquer favoris les urgents

4. **Réponse**
   - Répondre directement depuis l'inbox
   - Template emails pré-remplis
   - Tracking automatique des réponses

### Exemple Scénarios

#### Scénario 1 : Nouveau Prospect

```
1. Email reçu de jean.dupont@gmail.com avec sujet "Devis assurance taxi"
2. IA classifie comme "lead_inquiry" (85% confiance)
3. Suggestion créée : "Créer un nouveau lead"
4. Commercial accepte la suggestion
5. Lead créé automatiquement avec les infos de l'email
6. Email lié au lead
7. Dossier "Jean Dupont" créé automatiquement
8. Tous les futurs emails de jean.dupont@gmail.com vont dans ce dossier
```

#### Scénario 2 : Réponse Lead Existant

```
1. Email reçu de marie.martin@yahoo.fr (lead existant)
2. IA classifie comme "lead_reply" (95% confiance)
3. Application automatique immédiate
4. Email lié au lead Marie Martin
5. Ajouté au dossier "Marie Martin"
6. Notification au commercial assigné
7. Timeline du lead mise à jour
```

#### Scénario 3 : Partenariat

```
1. Email reçu de partner@example.com avec "Proposition de partenariat"
2. IA classifie comme "partnership" (80% confiance)
3. Application automatique
4. Email dans dossier "🤝 Partenariats"
5. Notification à l'équipe commerciale
```

#### Scénario 4 : Newsletter/Spam

```
1. Email reçu de noreply@pinterest.com
2. IA classifie comme "notification" (90% confiance)
3. Application automatique
4. Email dans dossier "📊 Notifications"
5. Pas de notification commerciale
```

## API / Fonctions RPC

### `classify_email_intelligent(p_email_id uuid)`

Classifie un email et retourne :

```json
{
  "success": true,
  "classification": "lead_inquiry",
  "confidence": 0.85,
  "reason": "Détection de mots-clés liés à une demande de devis",
  "suggested_lead_id": null,
  "suggested_folder_id": "folder-uuid"
}
```

### Utilisation Batch

```sql
-- Classifier tous les emails non classés
SELECT classify_email_intelligent(id)
FROM email_messages
WHERE folder_id IS NULL
  AND is_deleted = false;
```

## Prochaines Évolutions

### Phase 2 (Court terme)

1. **Interface de suggestions** complète
2. **Création automatique de dossiers** par lead
3. **Règles personnalisées** (si X alors Y)
4. **Templates de réponse** intelligents

### Phase 3 (Moyen terme)

1. **Machine Learning** amélioré
2. **Détection de sentiment** (urgent/neutre/satisfait)
3. **Suggestions de réponse** par IA
4. **Priorisation automatique** des emails

### Phase 4 (Long terme)

1. **Réponses automatiques** pour questions courantes
2. **Intégration calendrier** (détection RDV)
3. **Extraction données** (devis, montants, dates)
4. **Analytics avancés** (temps réponse, taux conversion)

## Configuration

### Variables d'environnement

Aucune configuration spéciale requise, le système utilise les tables et fonctions Supabase existantes.

### Permissions RLS

Toutes les tables ont des policies pour les admins authentifiés :
- `email_folders` : Lecture/Écriture pour admins
- `email_classifications` : Lecture/Écriture pour admins
- `email_threads` : Lecture/Écriture pour admins
- `email_suggestions` : Lecture/Écriture pour admins
- `email_actions` : Lecture/Écriture pour admins

## Accès

**Route** : `/backoffice/inbox-professionnel` (à ajouter au router)

**Composant** : `src/backoffice/InboxProfessional.tsx`

## Métriques de Succès

1. **Taux de classification automatique** : Objectif 80%+
2. **Temps moyen de traitement** : Réduction de 50%
3. **Emails non classés** : < 5% après 1 semaine
4. **Satisfaction commerciaux** : 9/10+
5. **Taux de conversion email→lead** : +30%

## Support

Pour toute question ou amélioration, contacter l'équipe technique.

---

**Dernière mise à jour** : 5 février 2026
**Version** : 1.0
**Statut** : ✅ Production Ready
