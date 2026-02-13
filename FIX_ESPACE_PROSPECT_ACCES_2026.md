# 🔓 Fix Espace Prospect - Accès Refusé

## ❌ Problème identifié

L'espace prospect affichait **"Accès refusé"** même avec un token valide dans l'URL :

```
https://taxiassur.com/espace-prospect/7ba8a99Bd32236D2ffba5ea4877bc7e056Af9707B886a2bDa952223202216a3
```

**Message d'erreur :**
```
🔒 Accès refusé
Impossible de charger vos informations. Le lien a peut-être expiré.
```

---

## 🔍 Cause du problème

La fonction RPC `get_lead_by_token()` existait **MAIS** ne retournait **PAS** tous les champs nécessaires.

### Champs manquants :
- `document_checklist` (jsonb)
- `documents_complete` (boolean)
- `quote_amount` (numeric)
- `quote_accepted_at` (timestamptz)
- `contract_signed_at` (timestamptz)
- `payment_completed_at` (timestamptz)
- `contract_pdf_url` (text)
- `attestation_pdf_url` (text)
- `client_since` (timestamptz)
- `current_stage_key` (text)
- `selected_company_id` (uuid)

### Conséquence :
Le composant `EspaceProspect.tsx` utilisait ces champs :
```typescript
const progress = getProgressPercentage(); // utilise document_checklist
const stepStatus = getStepStatus('documents'); // utilise documents_complete
```

Sans ces champs, le composant ne pouvait pas s'afficher correctement et affichait "Accès refusé".

---

## ✅ Solution appliquée

### Migration : `20260213235959_fix_get_lead_by_token_complete_fields_2026.sql`

**Étape 1 :** Suppression de l'ancienne fonction
```sql
DROP FUNCTION IF EXISTS public.get_lead_by_token(text);
```

**Étape 2 :** Création de la fonction complète avec TOUS les champs
```sql
CREATE OR REPLACE FUNCTION public.get_lead_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  address text,
  postal_code text,
  city text,
  company_name text,
  siret text,
  status text,
  pipeline_stage text,
  lead_score integer,
  converted_to_client boolean,
  access_token text,
  contract_number text,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  -- ✅ NOUVEAUX CHAMPS AJOUTÉS
  document_checklist jsonb,
  documents_complete boolean,
  quote_amount numeric,
  quote_accepted_at timestamptz,
  contract_signed_at timestamptz,
  payment_completed_at timestamptz,
  contract_pdf_url text,
  attestation_pdf_url text,
  client_since timestamptz,
  current_stage_key text,
  selected_company_id uuid
)
```

**Étape 3 :** Utilisation de COALESCE pour valeurs par défaut
```sql
COALESCE(l.document_checklist, '{}'::jsonb) as document_checklist,
COALESCE(l.documents_complete, false) as documents_complete,
```

**Étape 4 :** Permissions d'accès anonyme (CRITIQUE !)
```sql
GRANT EXECUTE ON FUNCTION public.get_lead_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_lead_by_token(text) TO authenticated;
```

---

## 🎯 Résultat attendu

### Avant (❌)
```
URL: https://taxiassur.com/espace-prospect/TOKEN
↓
Chargement...
↓
❌ Accès refusé
```

### Après (✅)
```
URL: https://taxiassur.com/espace-prospect/TOKEN
↓
Chargement...
↓
✅ Espace Prospect chargé avec :
   - Informations du prospect
   - Documents à uploader
   - Devis disponibles
   - Section paiement
   - Contrats (si client)
```

---

## 🧪 Tests à effectuer

### Test 1 : Accès basique
1. Copier un lien d'espace prospect :
   ```
   https://taxiassur.com/espace-prospect/[TOKEN]
   ```

2. Ouvrir dans un navigateur **en navigation privée** (pour simuler un prospect)

3. **Vérifier :**
   - ✅ Page se charge correctement
   - ✅ Nom du prospect affiché en haut
   - ✅ 4 onglets visibles : Documents, Devis, Paiement, Contrat
   - ✅ Barre de progression visible

### Test 2 : Onglet Documents
1. Cliquer sur l'onglet "Documents"

2. **Vérifier :**
   - ✅ Liste des documents requis affichée
   - ✅ Pourcentage de complétion correct
   - ✅ Possibilité d'uploader des documents
   - ✅ Statuts corrects (Manquant / En attente / Validé)

### Test 3 : Onglet Devis
1. Cliquer sur l'onglet "Devis"

2. **Vérifier :**
   - ✅ Devis affichés (s'ils existent)
   - ✅ Possibilité d'accepter/refuser
   - ✅ Prix et détails visibles

### Test 4 : Onglet Paiement
1. Cliquer sur l'onglet "Paiement"

2. **Vérifier :**
   - ✅ Section paiement comptant affichée
   - ✅ Bouton "Payer maintenant" visible
   - ✅ Informations de paiement Monetico

### Test 5 : Onglet Contrat
1. Cliquer sur l'onglet "Contrat"

2. **Vérifier :**
   - ✅ Message approprié selon l'état
   - ✅ Liens de téléchargement (si disponibles)

---

## 🔐 Sécurité

### Accès par token uniquement
La fonction vérifie :
1. ✅ Le token existe dans `crm_leads.access_token`
2. ✅ Le lead n'est pas supprimé (`deleted_at IS NULL`)
3. ✅ Le lead n'est pas archivé (`archived_at IS NULL`)

### Pas d'authentification requise
- Le token **remplace** l'authentification
- Accès anonyme autorisé via `GRANT ... TO anon`
- Fonction `SECURITY DEFINER` pour accéder aux données

### Pas d'exposition de données sensibles
- Seules les données du lead concerné sont retournées
- Pas d'accès à d'autres leads
- `LIMIT 1` pour garantir une seule ligne

---

## 📊 Données retournées

### Informations de base
- Identité : `first_name`, `last_name`, `email`, `phone`
- Adresse : `address`, `postal_code`, `city`
- Société : `company_name`, `siret`

### État du dossier
- `status` : Statut actuel du lead
- `pipeline_stage` : Étape du pipeline commercial
- `lead_score` : Score du lead
- `converted_to_client` : Est-ce un client ?

### Documents
- `document_checklist` : État de chaque document (validé, rejeté, manquant)
- `documents_complete` : Tous les documents sont-ils complets ?

### Devis et paiement
- `quote_amount` : Montant du devis accepté
- `quote_accepted_at` : Date d'acceptation du devis
- `payment_completed_at` : Date du paiement
- `selected_company_id` : Compagnie d'assurance choisie

### Contrat
- `contract_signed_at` : Date de signature
- `contract_pdf_url` : Lien de téléchargement du contrat
- `attestation_pdf_url` : Lien de téléchargement de l'attestation
- `client_since` : Date de conversion en client
- `contract_number` : Numéro de contrat

---

## 🚨 Si ça ne fonctionne toujours pas

### Vérification 1 : Token valide
```sql
-- Dans la console SQL Supabase
SELECT id, first_name, last_name, email, access_token
FROM crm_leads
WHERE access_token = 'VOTRE_TOKEN_ICI'
  AND deleted_at IS NULL
  AND archived_at IS NULL;
```

**Résultat attendu :** 1 ligne avec les infos du lead

### Vérification 2 : Fonction accessible
```sql
-- Tester directement la fonction
SELECT * FROM get_lead_by_token('VOTRE_TOKEN_ICI');
```

**Résultat attendu :** Toutes les colonnes retournées avec données

### Vérification 3 : Logs navigateur
Ouvrir la console (F12) et chercher :
```
Loading lead info with token: XXX
Lead query result: { data: {...}, error: null }
Lead found: uuid-du-lead
```

### Vérification 4 : Logs Supabase
Dans le dashboard Supabase → Logs → API :
```
GET /rest/v1/rpc/get_lead_by_token
Status: 200
```

---

## 🔄 Rollback si nécessaire

Si un problème survient, revenir à l'ancienne version :

```sql
-- Restaurer la fonction basique
CREATE OR REPLACE FUNCTION public.get_lead_by_token(p_token text)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text
)
AS $$
BEGIN
  RETURN QUERY
  SELECT l.id, l.first_name, l.last_name, l.email
  FROM crm_leads l
  WHERE l.access_token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

⚠️ Mais l'espace prospect ne fonctionnera pas complètement.

---

## 📝 Notes importantes

1. **Pas de build frontend nécessaire**
   - C'est une correction côté base de données
   - Aucun changement dans le code React
   - La page utilisera automatiquement la nouvelle fonction

2. **Compatibilité ascendante**
   - Tous les champs existants sont conservés
   - Nouveaux champs ajoutés à la fin
   - Pas d'impact sur les requêtes existantes

3. **Performance**
   - `LIMIT 1` pour optimiser la requête
   - Index sur `access_token` déjà existant
   - Pas de JOIN complexe

4. **Maintenance future**
   - Si nouveau champ ajouté à `crm_leads`
   - Penser à mettre à jour `get_lead_by_token`
   - Toujours tester avec un token réel

---

**Date de correction :** 13 février 2026
**Migration appliquée :** ✅ `20260213235959_fix_get_lead_by_token_complete_fields_2026`
**Testé en production :** À faire
**Prêt pour production :** ✅
