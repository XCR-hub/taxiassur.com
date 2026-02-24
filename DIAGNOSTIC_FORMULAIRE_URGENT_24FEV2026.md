# DIAGNOSTIC URGENT : FORMULAIRE NE CRÉE PAS DE LEADS
## 24 FÉVRIER 2026 - PROBLÈME CRITIQUE

---

## 🚨 SYMPTÔMES

1. Le formulaire ne crée pas de leads dans `crm_leads`
2. Le prospect ne reçoit PAS d'email
3. L'équipe (team@taxiassur.com) ne reçoit PAS d'email non plus
4. Aucune erreur visible côté utilisateur

---

## 🔍 CAUSES POSSIBLES

### 1. Fonction `upsert_lead` qui échoue silencieusement

**Diagnostic** :
```sql
-- Test de la fonction directement
SELECT * FROM upsert_lead(
  'test@example.com',
  'Jean',
  'Test',
  '0612345678',
  'Paris',
  'website',
  '{"vehicle_type": "Taxi"}'::jsonb
);
```

**Problème potentiel** :
- La fonction retourne un tableau vide `[]`
- Erreur de permissions (RLS bloque)
- Erreur de format des données

### 2. Trigger email désactivé ou cassé

**Diagnostic** :
```sql
-- Vérifier que le trigger existe
SELECT
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name,
  t.tgenabled as enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'crm_leads'
AND t.tgname LIKE '%email%';
```

**Résultat attendu** :
```
trigger_name              : trg_send_lead_email_brevo
table_name                : crm_leads
function_name             : send_lead_email_via_brevo
enabled                   : O (pour Origine/Enabled)
```

### 3. Edge Function `send-lead-email-brevo` défaillante

**Diagnostic** :
```bash
# Test direct de l'Edge Function
curl -X POST https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-lead-email-brevo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "type": "INSERT",
    "record": {
      "id": "test-id",
      "email": "test@example.com",
      "first_name": "Jean",
      "phone": "0612345678",
      "access_token": "testtoken123"
    }
  }'
```

**Problème potentiel** :
- Edge Function retourne 500
- Secrets IONOS manquants/incorrects
- URL incorrecte

### 4. RLS bloque les insertions anonymes

**Diagnostic** :
```sql
-- Vérifier les policies sur crm_leads
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'crm_leads'
AND cmd = 'INSERT';
```

**Problème potentiel** :
- Aucune policy pour `anon` (anonymous) sur INSERT
- Policy trop restrictive

---

## ✅ SOLUTION IMMÉDIATE

### ÉTAPE 1 : Créer un script de test complet

Créer `test-formulaire-complet.sql` :

```sql
-- ============================================
-- TEST COMPLET DU SYSTÈME DE FORMULAIRE
-- ============================================

-- 1. TEST INSERTION DIRECTE (Bypass RPC)
-- ============================================
DO $$
DECLARE
  v_lead_id uuid;
  v_token text;
BEGIN
  RAISE NOTICE '🧪 Test 1: Insertion directe dans crm_leads';

  v_lead_id := gen_random_uuid();
  v_token := replace(gen_random_uuid()::text, '-', '');

  INSERT INTO crm_leads (
    id,
    email,
    first_name,
    last_name,
    phone,
    city,
    source,
    status,
    current_stage_key,
    pipeline_stage,
    access_token,
    created_at
  ) VALUES (
    v_lead_id,
    'test-direct@example.com',
    'Test',
    'Direct',
    '0600000001',
    'Paris',
    'test',
    'NOUVEAU_LEAD',
    'nouveau_lead',
    'nouveau_lead',
    v_token,
    now()
  );

  RAISE NOTICE '✅ Insertion réussie - Lead ID: %', v_lead_id;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Erreur insertion directe: % %', SQLERRM, SQLSTATE;
END $$;

-- 2. TEST FONCTION UPSERT_LEAD
-- ============================================
DO $$
DECLARE
  result record;
BEGIN
  RAISE NOTICE '🧪 Test 2: Fonction upsert_lead';

  SELECT * INTO result FROM upsert_lead(
    p_email := 'test-upsert@example.com',
    p_first_name := 'Test',
    p_last_name := 'Upsert',
    p_phone := '0600000002',
    p_city := 'Lyon',
    p_source := 'test',
    p_metadata := '{"vehicle_type": "Taxi"}'::jsonb
  );

  RAISE NOTICE '✅ upsert_lead réussi';
  RAISE NOTICE 'Lead ID: %', result.lead_id;
  RAISE NOTICE 'Access Token: %', result.access_token;
  RAISE NOTICE 'Is New: %', result.is_new;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Erreur upsert_lead: % %', SQLERRM, SQLSTATE;
END $$;

-- 3. TEST TRIGGER EMAIL
-- ============================================
DO $$
DECLARE
  v_lead_id uuid;
  v_token text;
BEGIN
  RAISE NOTICE '🧪 Test 3: Trigger email automatique';

  -- Créer un lead (devrait déclencher le trigger)
  SELECT * INTO v_lead_id, v_token FROM upsert_lead(
    p_email := 'test-trigger@example.com',
    p_first_name := 'Test',
    p_last_name := 'Trigger',
    p_phone := '0600000003',
    p_city := 'Marseille',
    p_source := 'test',
    p_metadata := '{"vehicle_type": "Taxi"}'::jsonb
  );

  RAISE NOTICE '✅ Lead créé - Vérifiez les logs pour le trigger email';
  RAISE NOTICE 'Lead ID: %', v_lead_id;

  -- Attendre 2 secondes pour le trigger
  PERFORM pg_sleep(2);

  -- Vérifier si l'email a été envoyé
  IF EXISTS (
    SELECT 1 FROM email_queue
    WHERE metadata->>'lead_id' = v_lead_id::text
    OR to_email = 'test-trigger@example.com'
  ) THEN
    RAISE NOTICE '✅ Email ajouté à la queue';
  ELSE
    RAISE NOTICE '❌ Aucun email dans la queue';
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Erreur test trigger: % %', SQLERRM, SQLSTATE;
END $$;

-- 4. VÉRIFICATION FINALE
-- ============================================
SELECT
  'Leads créés' as test,
  COUNT(*) as count
FROM crm_leads
WHERE email LIKE 'test-%@example.com'
AND created_at > now() - interval '5 minutes'

UNION ALL

SELECT
  'Emails en queue' as test,
  COUNT(*) as count
FROM email_queue
WHERE created_at > now() - interval '5 minutes';

-- 5. NETTOYER LES TESTS
-- ============================================
DELETE FROM crm_leads WHERE email LIKE 'test-%@example.com';
DELETE FROM email_queue WHERE to_email LIKE 'test-%@example.com';

RAISE NOTICE '🧹 Tests nettoyés';
```

### ÉTAPE 2 : Vérifier les permissions RLS

```sql
-- Vérifier et corriger les permissions INSERT pour anon
SELECT * FROM pg_policies WHERE tablename = 'crm_leads' AND cmd = 'INSERT';

-- Si aucune policy pour anon, créer une policy permissive
CREATE POLICY IF NOT EXISTS "Allow anonymous insert via upsert_lead"
ON crm_leads
FOR INSERT
TO anon
WITH CHECK (true);

-- Ou plus sécurisé : autoriser uniquement via la fonction
CREATE POLICY IF NOT EXISTS "Allow service_role insert"
ON crm_leads
FOR INSERT
TO service_role
WITH CHECK (true);
```

### ÉTAPE 3 : Réactiver le trigger si désactivé

```sql
-- Vérifier l'état du trigger
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'crm_leads'::regclass
AND tgname = 'trg_send_lead_email_brevo';

-- Si désactivé (tgenabled != 'O'), réactiver
ALTER TABLE crm_leads ENABLE TRIGGER trg_send_lead_email_brevo;

-- Vérifier à nouveau
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgrelid = 'crm_leads'::regclass
AND tgname = 'trg_send_lead_email_brevo';
```

### ÉTAPE 4 : Tester le formulaire frontend

1. Ouvrir la console du navigateur (F12)
2. Aller sur https://taxiassur.com
3. Remplir le formulaire
4. Observer les logs dans la console

**Logs attendus** :
```
🚀 [FORM] === DÉBUT CRÉATION LEAD ===
🚀 [FORM] Input: { name: "...", email: "...", ... }
🔧 [FORM] Supabase URL: https://drohhxrkoequjphvabvq.supabase.co
🔧 [FORM] Supabase Key présente: OUI
📦 [FORM] Lead params: { p_email: "...", ... }
📞 [FORM] Méthode 1: Tentative RPC via Supabase client...
📞 [FORM] RPC Response: { data: [...], error: null }
✅ [FORM] Lead créé via RPC Supabase client!
```

**Si erreur** :
```
❌ [FORM] RPC failed: [code] [message]
🌐 [FORM] Méthode 2: Tentative Edge Function...
```

---

## 🛠️ CORRECTION DÉFINITIVE

### Créer une migration de correction complète

Créer `20260224_fix_formulaire_leads_emails.sql` :

```sql
/*
  # Fix complet formulaire + emails

  1. Vérifier et corriger la fonction upsert_lead
  2. Vérifier et réactiver le trigger email
  3. Vérifier les permissions RLS
  4. Tester le système complet
*/

-- ============================================
-- 1. FONCTION UPSERT_LEAD CORRIGÉE
-- ============================================

CREATE OR REPLACE FUNCTION public.upsert_lead(
  p_email text,
  p_first_name text,
  p_last_name text DEFAULT '',
  p_phone text DEFAULT '',
  p_city text DEFAULT '',
  p_source text DEFAULT 'website',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  lead_id uuid,
  access_token text,
  is_new boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
  v_token text;
  v_is_new boolean := false;
  v_existing_id uuid;
  v_existing_token text;
BEGIN
  RAISE LOG '[UPSERT_LEAD] Début - Email: %', p_email;

  -- Vérifier si le lead existe
  SELECT id, access_token
  INTO v_existing_id, v_existing_token
  FROM crm_leads
  WHERE email = p_email
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Lead existant : mise à jour
    RAISE LOG '[UPSERT_LEAD] Lead existant trouvé: %', v_existing_id;
    v_lead_id := v_existing_id;
    v_is_new := false;

    -- Générer un nouveau token si vide
    IF v_existing_token IS NULL OR v_existing_token = '' THEN
      v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    ELSE
      v_token := v_existing_token;
    END IF;

    -- Mettre à jour
    UPDATE crm_leads SET
      first_name = COALESCE(p_first_name, first_name),
      last_name = COALESCE(NULLIF(p_last_name, ''), last_name),
      phone = COALESCE(NULLIF(p_phone, ''), phone),
      city = COALESCE(NULLIF(p_city, ''), city),
      source = COALESCE(NULLIF(p_source, ''), source),
      metadata = COALESCE(p_metadata, metadata),
      access_token = v_token,
      updated_at = now()
    WHERE id = v_lead_id;

    RAISE LOG '[UPSERT_LEAD] Lead mis à jour';

  ELSE
    -- Nouveau lead : création
    RAISE LOG '[UPSERT_LEAD] Création d''un nouveau lead';
    v_is_new := true;
    v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    v_lead_id := gen_random_uuid();

    INSERT INTO crm_leads (
      id,
      email,
      first_name,
      last_name,
      phone,
      city,
      source,
      status,
      current_stage_key,
      pipeline_stage,
      metadata,
      access_token,
      created_at,
      updated_at,
      stage_entered_at
    ) VALUES (
      v_lead_id,
      p_email,
      p_first_name,
      COALESCE(p_last_name, ''),
      COALESCE(p_phone, ''),
      COALESCE(p_city, ''),
      COALESCE(p_source, 'website'),
      'NOUVEAU_LEAD'::lead_status,
      'nouveau_lead',
      'nouveau_lead',
      COALESCE(p_metadata, '{}'::jsonb),
      v_token,
      now(),
      now(),
      now()
    );

    RAISE LOG '[UPSERT_LEAD] Nouveau lead créé: %', v_lead_id;
  END IF;

  -- Retourner les résultats
  RAISE LOG '[UPSERT_LEAD] Fin - Lead ID: %, Token: %, Is New: %', v_lead_id, v_token, v_is_new;
  RETURN QUERY SELECT v_lead_id, v_token, v_is_new;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[UPSERT_LEAD] ❌ ERREUR: % %', SQLERRM, SQLSTATE;
  RAISE;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION upsert_lead TO anon;
GRANT EXECUTE ON FUNCTION upsert_lead TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_lead TO service_role;

RAISE NOTICE '✅ Fonction upsert_lead corrigée';

-- ============================================
-- 2. RLS PERMISSIONS
-- ============================================

-- Autoriser les insertions via la fonction
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'crm_leads'
    AND policyname = 'Allow service_role all operations'
  ) THEN
    CREATE POLICY "Allow service_role all operations"
    ON crm_leads
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

    RAISE NOTICE '✅ Policy service_role créée';
  ELSE
    RAISE NOTICE 'ℹ️  Policy service_role existe déjà';
  END IF;
END $$;

-- ============================================
-- 3. TRIGGER EMAIL
-- ============================================

-- Réactiver le trigger s'il est désactivé
DO $$
DECLARE
  trigger_status char(1);
BEGIN
  SELECT tgenabled INTO trigger_status
  FROM pg_trigger
  WHERE tgrelid = 'crm_leads'::regclass
  AND tgname = 'trg_send_lead_email_brevo';

  IF trigger_status IS NULL THEN
    RAISE NOTICE '❌ Trigger trg_send_lead_email_brevo n''existe pas!';
  ELSIF trigger_status != 'O' THEN
    RAISE NOTICE 'ℹ️  Trigger désactivé, réactivation...';
    ALTER TABLE crm_leads ENABLE TRIGGER trg_send_lead_email_brevo;
    RAISE NOTICE '✅ Trigger réactivé';
  ELSE
    RAISE NOTICE '✅ Trigger déjà actif';
  END IF;
END $$;

-- ============================================
-- 4. TEST AUTOMATIQUE
-- ============================================

DO $$
DECLARE
  test_result record;
  email_count int;
BEGIN
  RAISE NOTICE '🧪 === TEST AUTOMATIQUE ===';

  -- Test upsert_lead
  SELECT * INTO test_result FROM upsert_lead(
    'test-auto@taxiassur.com',
    'Test',
    'Auto',
    '0600000000',
    'TestVille',
    'test',
    '{"test": true}'::jsonb
  );

  IF test_result.lead_id IS NOT NULL THEN
    RAISE NOTICE '✅ Lead créé: %', test_result.lead_id;

    -- Attendre le trigger
    PERFORM pg_sleep(2);

    -- Vérifier les emails
    SELECT COUNT(*) INTO email_count
    FROM email_queue
    WHERE to_email = 'test-auto@taxiassur.com'
    OR to_email = 'team@taxiassur.com';

    IF email_count > 0 THEN
      RAISE NOTICE '✅ % email(s) dans la queue', email_count;
    ELSE
      RAISE NOTICE '❌ Aucun email dans la queue - vérifier le trigger!';
    END IF;

    -- Nettoyer
    DELETE FROM crm_leads WHERE id = test_result.lead_id;
    DELETE FROM email_queue WHERE to_email = 'test-auto@taxiassur.com';
    RAISE NOTICE '🧹 Test nettoyé';
  ELSE
    RAISE NOTICE '❌ Échec création lead';
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Erreur test: % %', SQLERRM, SQLSTATE;
END $$;

RAISE NOTICE '🎉 Correction terminée!';
```

---

## 📊 VÉRIFICATIONS POST-CORRECTION

### Test 1 : Lead créé ?

```sql
SELECT
  id,
  email,
  first_name,
  created_at,
  access_token
FROM crm_leads
WHERE created_at > now() - interval '10 minutes'
ORDER BY created_at DESC
LIMIT 5;
```

### Test 2 : Emails envoyés ?

```sql
SELECT
  id,
  to_email,
  email_type,
  status,
  created_at,
  sent_at,
  error_message
FROM email_queue
WHERE created_at > now() - interval '10 minutes'
ORDER BY created_at DESC;
```

### Test 3 : Trigger actif ?

```sql
SELECT
  tgname,
  tgenabled,
  CASE tgenabled
    WHEN 'O' THEN 'Actif'
    WHEN 'D' THEN 'Désactivé'
    WHEN 'R' THEN 'Replica'
    WHEN 'A' THEN 'Always'
    ELSE 'Inconnu'
  END as status
FROM pg_trigger
WHERE tgrelid = 'crm_leads'::regclass
AND tgname = 'trg_send_lead_email_brevo';
```

---

## 🎯 CHECKLIST FINALE

- [ ] Fonction `upsert_lead` testée et opérationnelle
- [ ] RLS permissions correctes (policy pour service_role)
- [ ] Trigger `trg_send_lead_email_brevo` actif (status = 'O')
- [ ] Test formulaire : lead créé dans `crm_leads`
- [ ] Test emails : 2 emails dans `email_queue`
- [ ] Console navigateur : aucune erreur JavaScript
- [ ] Email prospect reçu
- [ ] Email team@taxiassur.com reçu

---

**PRIORITÉ ABSOLUE : APPLIQUER LA MIGRATION DE CORRECTION !**
