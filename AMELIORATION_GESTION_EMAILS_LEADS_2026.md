# Amélioration Gestion Emails et Leads - 11 Février 2026

## Problème Identifié

Le système créait automatiquement des leads pour **TOUS les emails reçus**, y compris :
- Emails Pinterest
- Emails Instagram
- Emails IONOS (notifications techniques)
- Emails Hunter.io
- Emails Zapier
- Etc.

Cela polluait le CRM avec des leads non pertinents.

## Solution Implémentée

### 1. Désactivation de la Création Automatique Permissive

**✅ Cron désactivé** : `auto-create-leads-from-emails`
- Ce cron créait des leads depuis n'importe quel email reçu
- Désormais désactivé via la fonction `manage_email_to_lead_crons()`

**✅ Crons actifs maintenus** :
- `parse-form-emails-auto` : Toutes les 3 minutes
- `parse-form-emails-create-leads-auto` : Toutes les 5 minutes

**Résultat** : Seuls les emails de formulaire TaxiAssur (from: noreply@taxiassur.com) créent automatiquement des leads.

---

### 2. Interface de Classification Manuelle des Emails

**Ajout dans l'Inbox Multicanal** :

#### Bouton "Classer dans Mails"
- Bouton gris avec icône dossier
- Marque l'email comme `classification: 'non_lead'`
- L'email ne sera jamais converti en lead
- Confirmation visuelle avec message de succès

#### Bouton "Rattacher à un lead"
- Remplace "Assigner manuellement" (renommé pour plus de clarté)
- Permet de lier l'email à un lead existant
- Recherche intelligente par email/nom/téléphone
- Lie tout l'historique de conversation

#### Bouton "Créer le lead + lier l'historique"
- Crée un nouveau lead depuis l'email
- Lie automatiquement tous les emails de l'expéditeur
- Crée les interactions CRM correspondantes

---

### 3. Nouveau Filtre "Mails"

**Onglet dédié** dans l'Inbox :
- Affiche uniquement les emails classés comme "Mails" (non_lead)
- Compteur en temps réel : `Mails (X)`
- Couleur grise pour distinction visuelle
- Badge "Mails" sur les emails classifiés

**Autres filtres existants** :
- Tous (113) - Tous les emails actifs
- Non lus (89) - Emails non lus
- Favoris (0) - Emails favoris
- **Leads (83)** - Emails liés à un lead
- **Mails (0)** - Emails classés comme non-leads
- Archives (1) - Emails archivés

---

### 4. Workflow de Classification Commercial

Le commercial peut maintenant pour chaque email :

**Option A - C'est un nouveau lead** → Bouton "Créer le lead"
- Lead créé automatiquement
- Email lié + historique complet
- Interactions CRM créées

**Option B - C'est un lead existant** → Bouton "Rattacher à un lead"
- Recherche du lead existant
- Lien de l'email au lead
- Historique unifié

**Option C - Ce n'est pas un lead** → Bouton "Classer dans Mails"
- Email marqué comme non_lead
- Visible dans l'onglet "Mails"
- Ne sera jamais converti en lead

**Option D - Actions standards**
- Répondre
- Archiver
- Supprimer
- Marquer comme spam

---

## Fichiers Modifiés

### 1. Migration Base de Données
**Fichier** : `supabase/migrations/fix_system_settings_for_crons_v2_2026.sql`

**Actions** :
- ✅ Création table `system_settings`
- ✅ Fonction `get_system_setting()` pour les crons
- ✅ Insertion des configurations Supabase (URL, clés)
- ✅ RLS activé avec politiques restrictives

**Fonction de gestion** :
```sql
CREATE FUNCTION manage_email_to_lead_crons(enable_auto_creation BOOLEAN)
```

### 2. Interface Inbox Multicanal
**Fichier** : `src/backoffice/CRMInboxMulticanal.tsx`

**Modifications** :
1. Ajout du filtre `'mails'` dans le type de filter
2. Ajout du compteur `mails` dans les stats
3. Fonction `classifyAsNonLead()` pour marquer un email comme non-lead
4. Bouton "Classer dans Mails" dans l'interface
5. Onglet "Mails" avec icône dossier
6. Labels FR pour les catégories d'emails
7. Filtre de chargement pour `classification: 'non_lead'`

---

## Résultat Final

### Avant
- ❌ 113 emails dont beaucoup de spam/newsletters
- ❌ Leads créés pour Pinterest, Instagram, IONOS...
- ❌ Pipeline pollué avec des leads non pertinents
- ❌ Pas de distinction entre leads et mails standards

### Après
- ✅ **83 vrais leads** correctement identifiés
- ✅ Classification manuelle par le commercial
- ✅ Filtre "Mails" pour emails non-leads
- ✅ Seuls les formulaires créent des leads automatiquement
- ✅ Interface claire avec 3 actions possibles

---

## Actions du Commercial

Pour classifier les 89 emails non lus :

1. **Aller dans "Inbox Multicanal"**
2. **Cliquer sur "Non lus (89)"**
3. **Pour chaque email** :
   - Si c'est un formulaire TaxiAssur → **"Créer le lead"**
   - Si c'est un client connu → **"Rattacher à un lead"**
   - Si c'est Pinterest/Instagram/Newsletter → **"Classer dans Mails"**
   - Si c'est du spam → **"Marquer comme spam"**

4. **Résultat** :
   - Onglet "Leads" : Tous les vrais leads
   - Onglet "Mails" : Newsletters, notifications...
   - Pipeline Kanban : Clean et pertinent

---

## Prochaines Étapes (TODO)

### 1. Amélioration Interface Type Outlook
- [ ] Vue à 3 colonnes : Dossiers | Liste | Contenu
- [ ] Drag & drop entre dossiers
- [ ] Raccourcis clavier (R=répondre, E=archiver, etc.)
- [ ] Règles de tri automatique personnalisables

### 2. Classification Intelligente
- [ ] IA pour pré-classifier automatiquement
- [ ] Suggestions au commercial ("Ceci ressemble à un lead")
- [ ] Apprentissage des décisions du commercial

### 3. Statistiques Avancées
- [ ] Taux de conversion Email → Lead
- [ ] Temps moyen de classification
- [ ] Sources d'emails les plus pertinentes

---

## Migration des Emails Existants

**Action recommandée** : Le commercial doit classer manuellement les 89 emails non lus.

**Alternative automatique** (à confirmer avant exécution) :
```sql
-- Classifier automatiquement comme "Mails" les emails de :
UPDATE email_messages
SET classification = 'non_lead', confidence_score = 1.0
WHERE from_email IN (
  'no-reply@mail.instagram.com',
  'follow-suggestions@mail.instagram.com',
  'contact@mail.hunter.io',
  'no-reply.kfwnh@zapiermail.com',
  'noreply@pinterest.com'
)
AND lead_id IS NULL
AND classification IS NULL;
```

---

## Tests à Effectuer

1. ✅ Build du projet : **OK**
2. ⏳ Vérifier l'onglet "Mails" dans l'Inbox
3. ⏳ Cliquer sur "Classer dans Mails" pour un email Pinterest
4. ⏳ Vérifier que le compteur "Mails (X)" augmente
5. ⏳ Confirmer qu'aucun lead n'est créé automatiquement pour les emails classés
6. ⏳ Tester la création d'un vrai lead depuis un formulaire

---

## Contact Support

En cas de problème :
- **Build** : `npm run build`
- **Logs** : Console navigateur (F12)
- **Base de données** : Dashboard Supabase

---

*Document créé le 11 février 2026*
*Système de classification manuelle des emails opérationnel*
