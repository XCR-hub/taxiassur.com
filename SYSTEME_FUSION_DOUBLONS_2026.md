# Système de Fusion des Leads Dupliqués - 14 Février 2026

## Vue d'ensemble

Système complet de détection et fusion automatique intelligente des leads ayant la même adresse email. Le système garde automatiquement le lead avec le plus d'informations remplies et consolide tous les documents et interactions.

---

## Fonctionnalités

### 1. Détection Automatique des Doublons
- Identifie tous les emails ayant plusieurs leads actifs (non archivés)
- Affiche le nombre de doublons par email
- Montre la période de création (premier/dernier)
- Interface visuelle claire avec compteurs

### 2. Fusion Intelligente
**Automatique et intelligente** :
- Sélectionne automatiquement le lead avec le plus de champs remplis comme "master"
- Compte 12 champs importants : nom, prénom, email, téléphone, ville, code postal, véhicule, immatriculation, SIRET, société, notes, statut
- Fusionne les notes en ajoutant une section "Fusionné"
- Transfère TOUS les éléments liés vers le lead master

### 3. Consolidation Complète
Le système transfère automatiquement :
- **Documents** : `crm_lead_documents`
- **Interactions** : `crm_interactions`
- **Emails** : `email_messages`
- **Devis** : `lead_company_quotes`
- **Contrats** : `lead_contracts`
- **Paiements** : `monetico_payment_tracking`

### 4. Archivage Sécurisé
- Les doublons fusionnés sont marqués `status = 'archived'`
- Une note explicative est ajoutée avec l'ID du master et la date
- Les données sont conservées pour l'audit

### 5. Audit Trail Complet
Table `lead_merge_log` conserve :
- ID du lead master
- Liste des IDs fusionnés
- Données complètes des leads fusionnés (JSONB)
- Compteurs de documents et interactions transférés
- Date et utilisateur ayant lancé la fusion

---

## Base de Données

### Migration : `create_lead_deduplication_system_2026.sql`

#### Tables

**lead_merge_log**
```sql
- id (uuid, PK)
- master_lead_id (uuid, FK vers crm_leads)
- merged_lead_ids (uuid[], array des IDs fusionnés)
- merged_leads_data (jsonb, données complètes)
- merge_reason (text, défaut: 'duplicate_email')
- fields_merged (jsonb, liste des champs fusionnés)
- documents_count (integer)
- interactions_count (integer)
- merged_by (uuid, FK vers auth.users)
- merged_at (timestamptz, défaut: now())
```

#### Fonctions RPC

**1. find_duplicate_leads()**
```sql
RETURNS TABLE (
  email text,
  lead_count bigint,
  lead_ids uuid[],
  oldest_created_at timestamptz,
  newest_created_at timestamptz
)
```
Trouve tous les emails avec doublons actifs.

**2. count_filled_fields(lead_record crm_leads)**
```sql
RETURNS integer
```
Compte le nombre de champs non-vides d'un lead (0-12).

**3. merge_two_leads(p_lead1_id uuid, p_lead2_id uuid)**
```sql
RETURNS jsonb {
  success: boolean,
  master_id: uuid,
  merged_id: uuid,
  documents_moved: integer,
  interactions_moved: integer
}
```
Fusionne 2 leads intelligemment :
- Détermine automatiquement le master (le plus complet)
- Fusionne tous les champs (garde les valeurs non-nulles)
- Transfère tous les éléments liés
- Archive le duplicate
- Crée un log d'audit

**4. merge_all_duplicates_for_email(p_email text)**
```sql
RETURNS jsonb {
  success: boolean,
  master_id: uuid,
  leads_merged: integer,
  total_documents: integer,
  total_interactions: integer
}
```
Fusionne tous les doublons d'un email donné.
- Prend le lead le plus ancien comme base
- Fusionne tous les autres dedans
- Retourne les statistiques

**5. auto_merge_all_duplicates()**
```sql
RETURNS jsonb {
  success: boolean,
  emails_processed: integer,
  total_leads_merged: integer,
  details: jsonb[]
}
```
Fusion globale automatique de TOUS les doublons dans la base.
- Traite chaque email en doublon
- Fusionne automatiquement
- Retourne un rapport complet

---

## Interface Utilisateur

### Composant : `DuplicateLeadsManager.tsx`

**Accès** : Réservé au Master Admin uniquement

**Route** : `/backoffice/crm-killer/duplicates`

#### Fonctionnalités Interface

1. **Dashboard Principal**
   - Compteur : Emails en doublon
   - Compteur : Total leads dupliqués
   - Bouton : "Fusionner Tous les Doublons" (action globale)

2. **Liste des Doublons**
   - Email avec compteur de doublons
   - Période de création (premier → dernier)
   - Boutons d'action par email

3. **Détails d'un Email**
   - Liste de tous les leads avec cet email
   - Pour chaque lead :
     - Statut et badges visuels
     - Compteurs d'activité (interactions, documents, emails, devis)
     - Toutes les informations du lead
     - Bouton "Supprimer" individuel

4. **Fusion Automatique**
   - Bouton "Fusionner maintenant" par email
   - Bouton "Fusionner Tous les Doublons" global
   - Confirmations avec détails de l'opération
   - Messages de succès avec statistiques

#### Sécurité

- Vérification du rôle "master" admin
- RLS activé sur `lead_merge_log`
- Confirmations explicites avant fusion
- Audit complet de toutes les opérations

---

## Utilisation

### Cas 1 : Fusionner un Email Spécifique

1. Aller dans **Backoffice → CRM Killer → Gestion des Doublons**
2. Cliquer sur un email pour voir les détails
3. Examiner les leads dupliqués
4. Cliquer sur "Fusionner maintenant"
5. Confirmer l'opération
6. Le système fusionne automatiquement

**Résultat** :
```
✅ Fusion réussie !

2 lead(s) fusionné(s)
5 document(s) transféré(s)
12 interaction(s) transférée(s)
```

### Cas 2 : Fusion Globale

1. Aller dans **Backoffice → CRM Killer → Gestion des Doublons**
2. Cliquer sur "Fusionner Tous les Doublons" en haut à droite
3. Confirmer la fusion globale
4. Le système traite tous les emails automatiquement

**Résultat** :
```
✅ Fusion globale terminée !

15 email(s) traité(s)
32 lead(s) fusionné(s)

Tous les doublons ont été fusionnés avec succès.
```

### Cas 3 : Vérification de l'Historique

1. Accéder à la table `lead_merge_log` via SQL
2. Voir tous les détails des fusions passées

```sql
SELECT
  master_lead_id,
  merged_lead_ids,
  documents_count,
  interactions_count,
  merged_at
FROM lead_merge_log
ORDER BY merged_at DESC
LIMIT 20;
```

---

## Logique de Fusion Intelligente

### Sélection du Lead Master

Le système compte les champs remplis pour chaque lead :

```javascript
// Exemple de scoring
Lead A:
- first_name: "Jean" ✓
- last_name: "Dupont" ✓
- email: "jean@example.com" ✓
- phone: "0601020304" ✓
- city: "Paris" ✓
- postal_code: "75001" ✓
- vehicle_type: "Taxi" ✓
- immatriculation: "AB-123-CD" ✓
→ Score: 8/12

Lead B:
- first_name: "Jean" ✓
- email: "jean@example.com" ✓
- phone: "0601020304" ✓
→ Score: 3/12

→ Lead A devient le MASTER (score le plus élevé)
```

### Fusion des Champs

```sql
UPDATE crm_leads SET
  first_name = COALESCE(NULLIF(first_name, ''), v_lead2.first_name, first_name),
  -- Garde la valeur existante si non-vide, sinon prend celle du duplicate
```

### Notes Consolidées

```
Note originale du master

--- Fusionné ---
Note du lead dupliqué
```

---

## Tests

### Test 1 : Créer des Doublons de Test

```sql
-- Insérer 3 leads avec le même email
INSERT INTO crm_leads (email, first_name, last_name, phone) VALUES
('test@example.com', 'Jean', 'Dupont', '0601020304'),
('test@example.com', 'Jean', NULL, NULL),
('test@example.com', NULL, 'Dupont', '0601020304');
```

### Test 2 : Détecter les Doublons

```sql
SELECT * FROM find_duplicate_leads();
```

Résultat attendu :
```
email               | lead_count | lead_ids
--------------------|------------|----------
test@example.com    | 3          | {uuid1, uuid2, uuid3}
```

### Test 3 : Fusionner

```sql
SELECT * FROM merge_all_duplicates_for_email('test@example.com');
```

Résultat attendu :
```json
{
  "success": true,
  "master_id": "uuid1",
  "leads_merged": 2,
  "total_documents": 0,
  "total_interactions": 0
}
```

### Test 4 : Vérifier la Fusion

```sql
-- Le master contient toutes les infos
SELECT * FROM crm_leads WHERE id = 'master_uuid';

-- Les duplicates sont archivés
SELECT status FROM crm_leads WHERE email = 'test@example.com' AND status = 'archived';

-- Log créé
SELECT * FROM lead_merge_log WHERE master_lead_id = 'master_uuid';
```

---

## Sécurité et Permissions

### RLS Policies

```sql
-- lead_merge_log accessible aux utilisateurs authentifiés
CREATE POLICY "Authenticated users can view merge logs"
  ON lead_merge_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create merge logs"
  ON lead_merge_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

### Permissions des Fonctions

```sql
GRANT EXECUTE ON FUNCTION find_duplicate_leads() TO authenticated;
GRANT EXECUTE ON FUNCTION merge_two_leads(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION merge_all_duplicates_for_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_merge_all_duplicates() TO authenticated;
```

---

## Avantages du Système

### 1. Automatisation Complète
- Pas de sélection manuelle nécessaire
- Le système choisit intelligemment le meilleur lead
- Fusion en un clic

### 2. Sécurité Maximale
- Audit trail complet
- Données conservées en JSONB
- Confirmations explicites
- Réservé au Master Admin

### 3. Intégrité des Données
- Aucune perte d'information
- Tous les documents et interactions conservés
- Notes consolidées
- Archivage traçable

### 4. Performance
- Optimisé avec des indexes
- Traitement par lot possible
- Requêtes efficaces

### 5. Flexibilité
- Fusion par email individuel
- Fusion globale automatique
- Fonction de comptage réutilisable

---

## Maintenance

### Nettoyer les Logs Anciens

```sql
-- Supprimer les logs de fusion > 1 an
DELETE FROM lead_merge_log
WHERE merged_at < now() - interval '1 year';
```

### Statistiques

```sql
-- Nombre de fusions par mois
SELECT
  date_trunc('month', merged_at) as mois,
  COUNT(*) as nb_fusions,
  SUM(array_length(merged_lead_ids, 1)) as nb_leads_fusionnes
FROM lead_merge_log
GROUP BY mois
ORDER BY mois DESC;
```

### Emails avec Plus de Doublons

```sql
SELECT
  email,
  lead_count,
  lead_count - 1 as nb_doublons
FROM find_duplicate_leads()
ORDER BY lead_count DESC
LIMIT 10;
```

---

## Support

Pour toute question sur le système de fusion :
- **Téléphone** : 01 80 85 57 86
- **Email** : team@taxiassur.com

---

**Date** : 14 Février 2026
**Version** : v1.0
**Status** : ✅ Système déployé et opérationnel
