# Fix Accès Refusé Espace Prospect & Erreur config_value (14/02/2026)

## 🔴 Problème 1: Accès Refusé Espace Prospect

### Symptôme
```
Accès refusé
Impossible de charger vos informations. Le lien a peut-être expiré.
```

**URL problématique:**
```
https://taxiassur.com/espace-prospect/f644fa70075c0f71e9ec52f216bb4d0984d98c581468abac22410111401a6c94
```

### Cause
Le token `f644fa70075c0f71e9ec52f216bb4d0984d98c581468abac22410111401a6c94` n'existe pas dans la table `crm_leads`.

**Diagnostic SQL:**
```sql
SELECT id, email, access_token FROM crm_leads
WHERE access_token = 'f644fa70075c0f71e9ec52f216bb4d0984d98c581468abac22410111401a6c94';
-- Résultat: 0 ligne
```

**Leads actuels:**
```sql
SELECT id, first_name, last_name, email, access_token FROM crm_leads WHERE deleted_at IS NULL;
-- Résultat:
-- 1. Prospect TEST: 7ba8aa998cf3223e02ffba5ea4877bc7e0564f97078886a2bda95222320216a3
-- 2. Tony CERDA: 6d39cf022087bfd2a59ca5eefbb414012d1e206d89051b6b326ce4c77d112099
```

### Solutions Appliquées

#### 1. Message d'Erreur Amélioré
**Avant:**
```
Lien invalide ou expiré. Vérifiez que le lien est correct.
```

**Après:**
```
Ce lien d'accès n'est plus valide. Il a peut-être expiré ou été régénéré.
Contactez-nous au 01 80 85 57 86 ou par email à team@taxiassur.com
pour obtenir un nouveau lien d'accès à votre espace.
```

#### 2. Vérification des Tokens
```sql
-- S'assurer que tous les leads ont un access_token
UPDATE crm_leads
SET access_token = encode(digest(gen_random_uuid()::text || now()::text || random()::text, 'sha256'), 'hex')
WHERE access_token IS NULL AND deleted_at IS NULL;
```

### Action Requise pour le Commercial

Pour donner accès à un prospect avec un ancien lien:

1. **Trouver le lead dans le CRM**
   - Rechercher par email ou nom

2. **Copier le nouveau lien d'accès**
   - Bouton "Copier lien espace prospect"
   - Ou "Envoyer accès espace prospect" (envoie un email automatique)

3. **Envoyer le nouveau lien au prospect**
   - Par email
   - Par SMS/WhatsApp

**Lien d'accès format:**
```
https://taxiassur.com/espace-prospect/{ACCESS_TOKEN}
```

---

## 🔴 Problème 2: Erreur config_value - Étape 6

### Symptôme
```
Erreur de mise à jour: column "config_value" does not exist
```

**Quand:** Passage de l'étape 5 (Signature Devis) à l'étape 6 (Paiement RIB)

### Cause

La fonction `send_rib_request_email()` tente de lire:
```sql
SELECT
  config_value->>'supabase_url',
  config_value->>'supabase_anon_key'
FROM system_config
WHERE config_key = 'supabase_credentials'
```

**Problème:** La table `system_config` n'existe pas ! ❌

### Solution Appliquée

**Migration:** `fix_config_value_error_and_access_tokens_2026.sql`

#### 1. Fonction Corrigée

**Avant (CASSÉ):**
```sql
-- Récupérer depuis system_config (table inexistante)
SELECT config_value->>'supabase_url' ...
FROM system_config ...
```

**Après (FONCTIONNEL):**
```sql
-- Utiliser directement les environment settings avec fallback
BEGIN
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_anon_key := current_setting('app.settings.supabase_anon_key', true);
EXCEPTION
  WHEN OTHERS THEN
    v_supabase_url := 'https://drohhxrkoequjphvabvq.supabase.co';
    v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
END;
```

#### 2. Fonctions Helper Créées

```sql
-- Fonction utilitaire pour obtenir l'URL Supabase
CREATE FUNCTION get_supabase_url() RETURNS text;

-- Fonction utilitaire pour obtenir la clé anon
CREATE FUNCTION get_supabase_anon_key() RETURNS text;
```

Ces fonctions:
- ✅ Essaient d'abord de lire `current_setting()`
- ✅ Utilisent des valeurs par défaut en fallback
- ✅ Ne dépendent pas de tables inexistantes

#### 3. Fonctions Corrigées

- ✅ `send_rib_request_email()` - Demande de RIB à l'étape 6
- ✅ `send_client_activation_email()` - Email d'activation client

---

## ✅ Résumé des Corrections

### Migration Appliquée
**Fichier:** `fix_config_value_error_and_access_tokens_2026.sql`

### Changements Base de Données

1. **Fonctions Corrigées:**
   - `send_rib_request_email()` - Plus de dépendance à system_config
   - `send_client_activation_email()` - Plus de dépendance à system_config

2. **Nouvelles Fonctions:**
   - `get_supabase_url()` - Helper avec fallback
   - `get_supabase_anon_key()` - Helper avec fallback

3. **Données:**
   - Tous les leads ont maintenant un `access_token` valide

### Changements Frontend

**Fichier:** `src/pages/EspaceProspect.tsx`

- ✅ Message d'erreur plus clair pour tokens invalides
- ✅ Instructions pour obtenir un nouveau lien

---

## 🧪 Tests de Validation

### Test 1: Passage à l'étape 6 (Paiement RIB)

```sql
-- Simuler le passage à l'étape 6
UPDATE crm_leads
SET pipeline_stage = 'paiement_rib'
WHERE id = 'LEAD_UUID'
  AND pipeline_stage = 'signature_devis';

-- ✅ Doit fonctionner sans erreur "config_value"
-- ✅ Email de demande de RIB doit être envoyé
```

### Test 2: Accès Espace Prospect avec Token Valide

```sql
-- Obtenir un token valide
SELECT access_token FROM crm_leads
WHERE email = 'prospect.test@example.com';
-- Résultat: 7ba8aa998cf3223e02ffba5ea4877bc7e0564f97078886a2bda95222320216a3

-- URL à tester:
-- https://taxiassur.com/espace-prospect/7ba8aa998cf3223e02ffba5ea4877bc7e0564f97078886a2bda95222320216a3

-- ✅ Doit afficher l'espace prospect correctement
```

### Test 3: Accès avec Token Invalide

```
URL: https://taxiassur.com/espace-prospect/TOKEN_INVALIDE

Résultat attendu:
✅ Message clair avec instructions pour obtenir un nouveau lien
✅ Pas de crash, pas d'erreur technique affichée
```

---

## 📋 Workflow Complet - Étapes 5 → 6

### Étape 5: Signature Devis
```
pipeline_stage = 'signature_devis'
```

**Actions:**
- Prospect peut uploader le devis signé
- Prospect peut accepter électroniquement
- Commercial valide la signature

### Passage à Étape 6: Paiement RIB

**Trigger automatique:**
```sql
-- OLD.pipeline_stage = 'signature_devis'
-- NEW.pipeline_stage = 'paiement_rib'
-- → Trigger send_rib_request_email()
```

**Ce qui se passe:**
1. ✅ Vérification: Le lead n'est pas perdu
2. ✅ Vérification: Pas de RIB déjà présent
3. ✅ Récupération des infos du lead
4. ✅ Récupération de l'URL Supabase (via helper)
5. ✅ Appel de l'edge function `send-intelligent-document-request`
6. ✅ Email envoyé au prospect avec lien pour uploader le RIB

### Étape 6: Paiement RIB
```
pipeline_stage = 'paiement_rib'
```

**Actions:**
- Email automatique de demande de RIB envoyé ✅
- Prospect peut uploader son RIB via l'espace
- Commercial vérifie le RIB
- Si valide → Passage à l'étape 7

---

## 🔧 Commandes SQL Utiles

### Vérifier tous les access_tokens
```sql
SELECT
  id,
  first_name,
  last_name,
  email,
  access_token,
  created_at
FROM crm_leads
WHERE deleted_at IS NULL
ORDER BY created_at DESC;
```

### Régénérer un access_token pour un lead spécifique
```sql
UPDATE crm_leads
SET access_token = encode(digest(gen_random_uuid()::text || now()::text || random()::text, 'sha256'), 'hex')
WHERE email = 'prospect@example.com'
RETURNING access_token;
```

### Obtenir le lien d'accès pour un lead
```sql
SELECT
  email,
  'https://taxiassur.com/espace-prospect/' || access_token as lien_acces
FROM crm_leads
WHERE email = 'prospect@example.com';
```

### Tester le trigger de l'étape 6
```sql
-- Préparer un lead à l'étape 5
UPDATE crm_leads
SET pipeline_stage = 'signature_devis',
    status = 'QUALIFIED'
WHERE email = 'prospect.test@example.com';

-- Passer à l'étape 6 (déclenche le trigger)
UPDATE crm_leads
SET pipeline_stage = 'paiement_rib'
WHERE email = 'prospect.test@example.com';

-- Vérifier les logs
SELECT * FROM pg_stat_activity
WHERE query LIKE '%send_rib_request_email%'
ORDER BY query_start DESC
LIMIT 1;
```

---

## 📊 Statut Final

✅ **Migration appliquée avec succès**
✅ **Build réussi (1m 5s)**
✅ **Erreur config_value corrigée**
✅ **Message d'erreur amélioré pour tokens invalides**
✅ **Tous les leads ont un access_token**
✅ **Système opérationnel**

---

## 🚨 Important pour les Commerciaux

### Ancien Lien ne Fonctionne Plus

Si un prospect vous dit que son lien ne fonctionne pas:

1. **Dans le CRM, trouver le lead**
2. **Copier le nouveau lien** (bouton dans Vue d'ensemble)
3. **Envoyer par email ou SMS**

**OU**

Utiliser le bouton **"Envoyer accès espace prospect"** qui envoie automatiquement un email avec le nouveau lien.

### Génération Automatique

- ✅ Chaque nouveau lead reçoit automatiquement un access_token unique
- ✅ Le token ne change jamais (sauf régénération manuelle)
- ✅ Le token ne peut pas être deviné (SHA256, 64 caractères)

---

*Document créé le 14 février 2026*
*Migration: fix_config_value_error_and_access_tokens_2026*
