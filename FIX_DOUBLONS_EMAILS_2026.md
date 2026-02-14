# Fix Doublons d'Emails - 14 Février 2026

## Problème Résolu

Il ne faut pas avoir plusieurs leads pour le même email. Avant cette correction, si un prospect remplissait le formulaire plusieurs fois, plusieurs leads étaient créés avec le même email.

## Solution Implémentée

### 1. Contrainte d'Unicité sur l'Email

**Index unique case-insensitive** :
```sql
CREATE UNIQUE INDEX idx_crm_leads_email_unique_active
ON crm_leads (LOWER(email))
WHERE deleted_at IS NULL;
```

Cet index garantit qu'il ne peut y avoir qu'un seul lead actif par email (insensible à la casse).

### 2. Fonction UPSERT Intelligente

Nouvelle fonction `upsert_lead()` qui :

**Si l'email existe déjà** :
- ✅ Met à jour les informations du lead existant
- ✅ Régénère un nouveau token d'accès
- ✅ Réactive le lead s'il était marqué comme "perdu"
- ✅ Supprime l'archivage s'il était archivé
- ✅ Retourne `is_new = false`

**Si l'email est nouveau** :
- ✅ Crée un nouveau lead
- ✅ Génère un token d'accès unique
- ✅ Retourne `is_new = true`

### 3. Intégration Frontend

Le code frontend a été modifié pour utiliser `upsert_lead()` au lieu d'un simple INSERT :

```typescript
// AVANT (pouvait créer des doublons)
const { data } = await supabase
  .from('crm_leads')
  .insert({ ... })

// APRÈS (évite les doublons)
const { data } = await supabase
  .rpc('upsert_lead', {
    p_email: email,
    p_first_name: firstName,
    ...
  })
```

## Comportement Détaillé

### Scénario 1 : Nouveau Prospect

1. **Jean Dupont** remplit le formulaire avec `jean@example.com`
2. Un nouveau lead est créé avec un token d'accès
3. Jean reçoit l'email avec le lien vers son espace
4. Retour : `{ lead_id: xxx, access_token: abc123, is_new: true }`

### Scénario 2 : Prospect Existant

1. **Jean Dupont** remplit à nouveau le formulaire avec `jean@example.com`
2. Le lead existant est mis à jour avec les nouvelles informations
3. Un **nouveau token** est généré (l'ancien est invalidé)
4. Jean reçoit un nouvel email avec le nouveau lien
5. Retour : `{ lead_id: xxx, access_token: def456, is_new: false }`

### Scénario 3 : Lead Perdu Réactivé

1. Un lead était marqué comme "perdu"
2. Il remplit à nouveau le formulaire
3. Son statut passe automatiquement à "NOUVEAU_LEAD"
4. Il reçoit un nouvel email d'accès

## Tests Automatiques

Des tests automatiques vérifient le bon fonctionnement :

```sql
✅ TEST 1 PASSED: Nouveau lead créé
   Lead ID: 12345
   Token: abc123...

✅ TEST 2 PASSED: Lead existant mis à jour
   Token changé: true
```

## Avantages

### Pour les Prospects
- ✅ Peuvent redemander un accès sans créer de doublon
- ✅ Reçoivent toujours un token valide même après plusieurs demandes
- ✅ Leurs informations sont mises à jour automatiquement

### Pour l'Équipe Commerciale
- ✅ Plus de doublons dans le CRM
- ✅ Historique complet sur un seul lead
- ✅ Pas besoin de fusionner manuellement les leads
- ✅ Statistiques plus précises

### Pour le Système
- ✅ Intégrité des données garantie
- ✅ Performance optimisée (index unique)
- ✅ Sécurité renforcée (un token par email actif)

## Vérifications en Base de Données

### Voir tous les leads avec leur statut
```sql
SELECT
  email,
  first_name,
  last_name,
  status,
  created_at,
  updated_at
FROM crm_leads
WHERE deleted_at IS NULL
ORDER BY email, created_at;
```

### Vérifier qu'il n'y a plus de doublons
```sql
SELECT email, COUNT(*) as count
FROM crm_leads
WHERE deleted_at IS NULL
GROUP BY email
HAVING COUNT(*) > 1;
```

Cette requête devrait retourner **0 résultats** maintenant.

### Tester la fonction manuellement
```sql
-- Créer un lead
SELECT * FROM upsert_lead(
  'test@example.com',
  'Test',
  'User',
  '0123456789',
  'Paris',
  'test'
);

-- Mettre à jour le même lead
SELECT * FROM upsert_lead(
  'test@example.com',
  'Test Updated',
  'User Updated',
  '0987654321',
  'Lyon',
  'test'
);
```

## Points d'Attention

### Token d'Accès Renouvelé

⚠️ **Important** : Quand un prospect redemande un accès :
- Son ancien token est **invalide**
- Un nouveau token est généré
- Il doit utiliser le **dernier email** reçu

### Emails en Lowercase

Les emails sont automatiquement normalisés en lowercase :
- `Jean@Example.COM` → `jean@example.com`
- `JEAN@EXAMPLE.COM` → `jean@example.com`

Cela garantit que les doublons avec différentes casses sont détectés.

## Migration Appliquée

Fichier : `add_unique_email_correct_columns_2026.sql`

Cette migration :
- ✅ Crée l'index unique sur les emails
- ✅ Crée la fonction `upsert_lead()`
- ✅ Ajoute les permissions nécessaires
- ✅ Exécute des tests automatiques
- ✅ Est rétrocompatible avec les leads existants

## Support

Pour toute question sur cette fonctionnalité :
- 📞 **01 80 85 57 86**
- 📧 **team@taxiassur.com**
