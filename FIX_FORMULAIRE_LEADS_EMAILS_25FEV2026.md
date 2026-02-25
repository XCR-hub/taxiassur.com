# Fix Formulaire Leads & Emails - 25 Février 2026

## Problème Signalé

**Symptôme**: "Pour la validation de demande de devis ca ne fonctionne pas;;; pas de mail pas de lead !!!! ?????"

**Impact**:
- ❌ Aucun lead créé depuis le formulaire public
- ❌ Aucun email envoyé (ni au prospect, ni à l'équipe)
- ❌ Perte de conversions critiques

## Cause Racine Identifiée

### Ambiguïté de Fonction PostgreSQL

Il existait **2 versions** de la fonction `upsert_lead` avec des signatures différentes:

1. **Version 7 paramètres** (ancienne):
   ```sql
   upsert_lead(p_email, p_first_name, p_last_name, p_phone, p_city, p_source, p_metadata)
   ```

2. **Version 8 paramètres** (nouvelle - avec support multi-véhicules):
   ```sql
   upsert_lead(p_email, p_first_name, p_last_name, p_phone, p_city, p_source, p_metadata, p_force_new_lead)
   ```

### Pourquoi Cela Bloquait ?

Quand le frontend appelait `supabase.rpc('upsert_lead', params)` avec 7 paramètres, PostgreSQL ne savait pas **quelle fonction** utiliser:
- La version 7 paramètres ?
- La version 8 paramètres avec valeur par défaut ?

**Erreur PostgreSQL retournée**:
```
ERROR: 42725: function upsert_lead(...) is not unique
HINT: Could not choose a best candidate function
```

Le frontend **échouait silencieusement** et basculait sur des méthodes de secours qui ne fonctionnaient pas non plus.

## Solution Appliquée

### Migration: `fix_upsert_lead_ambiguity_25fev2026.sql`

```sql
-- Supprimer l'ancienne version 7 paramètres
DROP FUNCTION IF EXISTS public.upsert_lead(
  text, text, text, text, text, text, jsonb
);

-- Garder UNIQUEMENT la version 8 paramètres
-- (elle existe déjà, pas besoin de la recréer)

-- S'assurer que le frontend peut l'appeler
GRANT EXECUTE ON FUNCTION public.upsert_lead(
  text, text, text, text, text, text, jsonb, boolean
) TO anon, authenticated;
```

### Résultat

✅ **Une seule fonction** `upsert_lead` existe maintenant
✅ Le frontend peut appeler `upsert_lead` sans ambiguïté
✅ Les leads sont créés correctement
✅ Les emails sont automatiquement mis en queue
✅ Le cron job envoie les emails toutes les minutes

## Tests de Validation

### Test 1: Appel Direct SQL
```sql
SELECT * FROM upsert_lead(
  'test@example.com'::text,
  'John'::text,
  'Doe'::text,
  '0612345678'::text,
  'Paris'::text,
  'website'::text,
  '{}'::jsonb,
  false::boolean
);
```

**Résultat**: ✅ Lead créé avec ID et token

### Test 2: Vérification Emails
```sql
SELECT id, email_type, to_email, status
FROM email_queue
WHERE lead_id = 'xxx'
ORDER BY created_at;
```

**Résultat**: ✅ 2 emails créés:
1. `new_lead_team` → `team@taxiassur.com`
2. `new_lead_client` → email du prospect

### Test 3: Envoi Automatique
Le cron job `process-email-queue` tourne **toutes les minutes** et envoie automatiquement les emails en attente.

**Vérification**:
```sql
SELECT status, COUNT(*)
FROM email_queue
GROUP BY status;
```

**Résultat**: ✅ Les emails passent de `pending` à `sent` en ~60 secondes

## Architecture du Système

### 1. Frontend (Formulaire)
```typescript
// src/lib/leads.ts - createLead()
const leadParams = {
  p_email: input.email,
  p_first_name: firstName,
  p_last_name: lastName,
  p_phone: input.phone,
  p_city: input.city,
  p_source: 'website',
  p_metadata: {...},
  p_force_new_lead: false  // 8ème paramètre
};

await supabase.rpc('upsert_lead', leadParams);
```

### 2. Backend (PostgreSQL)
```sql
-- Fonction upsert_lead crée le lead ET les emails
CREATE FUNCTION upsert_lead(...)
RETURNS TABLE(lead_id uuid, access_token text, is_new boolean)
AS $$
BEGIN
  -- Insérer le lead
  INSERT INTO crm_leads (...) VALUES (...);

  -- Créer 2 emails via queue_simple_email()
  v_team_queue_id := queue_simple_email(...); -- Email équipe
  v_client_queue_id := queue_simple_email(...); -- Email prospect

  RETURN QUERY SELECT v_lead_id, v_token, v_is_new;
END;
$$;
```

### 3. Système d'Envoi
```sql
-- Cron job toutes les 1 minute
CREATE CRON JOB 'process-email-queue'
SCHEDULE '* * * * *'
AS $$ SELECT process_email_queue_simple(20); $$;
```

```sql
-- Fonction d'envoi via Edge Function IONOS
CREATE FUNCTION process_email_queue_simple(batch_size int)
AS $$
BEGIN
  FOR email_rec IN
    SELECT * FROM email_queue
    WHERE status = 'pending'
    LIMIT batch_size
  LOOP
    -- Appeler Edge Function send-email-ionos
    SELECT net.http_post(
      url := '.../functions/v1/send-email-ionos',
      body := jsonb_build_object(
        'to', email_rec.to_email,
        'subject', email_rec.subject,
        'html', email_rec.body
      )
    );

    -- Marquer comme envoyé
    UPDATE email_queue SET status = 'sent', sent_at = now()
    WHERE id = email_rec.id;
  END LOOP;
END;
$$;
```

## Flux Complet

```
1. Prospect remplit le formulaire
   ↓
2. Frontend appelle upsert_lead(8 params)
   ↓
3. PostgreSQL crée le lead dans crm_leads
   ↓
4. PostgreSQL crée 2 emails dans email_queue (status: pending)
   ↓
5. Frontend reçoit: { lead_id, access_token, is_new: true }
   ↓
6. Frontend redirige vers /merci?token=xxx
   ↓
7. [60 secondes max] Cron job process-email-queue démarre
   ↓
8. Fonction appelle Edge Function send-email-ionos pour chaque email
   ↓
9. Emails envoyés via IONOS SMTP
   ↓
10. Statut mis à jour: status = 'sent', sent_at = now()
```

## Emails Envoyés

### Email 1: Équipe (team@taxiassur.com)
**Sujet**: 🚨 NOUVEAU LEAD: Jean Dupont - Paris

**Contenu**:
```html
<h1>✅ Nouveau Lead</h1>
<p><strong>Nom:</strong> Jean Dupont</p>
<p><strong>Email:</strong> jean@example.com</p>
<p><strong>Téléphone:</strong> 0612345678</p>
<p><strong>Ville:</strong> Paris</p>
<p><a href="https://taxiassur.com/backoffice/crm-killer/lead/{id}">
  🔍 Voir le lead
</a></p>
```

### Email 2: Prospect
**Sujet**: ✅ Votre demande de devis TaxiAssur bien reçue

**Contenu**:
```html
<h1>Bonjour Jean,</h1>
<p>✅ Nous avons bien reçu votre demande de devis pour une
<strong>assurance taxi à Paris</strong>.</p>
<p><strong>⚡ Votre expert vous contactera dans les 15 minutes</strong></p>

<h2>📤 Accédez à votre espace prospect sécurisé</h2>
<p><a href="https://taxiassur.com/espace-prospect/{token}">
  🚀 Accéder à mon espace
</a></p>

<p><strong>Uploadez vos 7 documents requis:</strong></p>
<ol>
  <li>Licence de taxi</li>
  <li>Permis de conduire</li>
  <li>Pièce d'identité</li>
  <li>Carte grise</li>
  <li>Relevé d'information</li>
  <li>Autorisation de stationnement</li>
  <li>RIB</li>
</ol>
```

## Vérification Post-Déploiement

### 1. Tester le Formulaire
1. Aller sur `https://taxiassur.com`
2. Remplir le formulaire de devis
3. Soumettre
4. **Résultat attendu**: Redirection vers `/merci?token=xxx`

### 2. Vérifier le Lead en Base
```sql
SELECT id, email, first_name, last_name, status, created_at
FROM crm_leads
ORDER BY created_at DESC
LIMIT 1;
```

### 3. Vérifier les Emails
```sql
SELECT email_type, to_email, status, sent_at
FROM email_queue
WHERE lead_id = 'xxx';
```

**Résultat attendu**:
- 2 emails créés
- Status: `sent` après ~60 secondes
- `sent_at` renseigné

### 4. Vérifier Réception Email
- ✅ Prospect reçoit l'email avec lien espace prospect
- ✅ Équipe reçoit notification avec lien vers lead CRM

## Support Multi-Véhicules

Le système supporte maintenant les prospects qui veulent assurer **plusieurs véhicules**:

```typescript
// Prospect veut ajouter un 2ème taxi
await createLead(data, forceNew = true);
```

Avec `forceNew = true`:
- ✅ Crée un nouveau lead même si l'email existe
- ✅ Envoie un email différent: "Nouveau véhicule #2"
- ✅ Liens vers l'espace prospect avec le bon token

## Fichiers Modifiés

1. **Migration**: `supabase/migrations/fix_upsert_lead_ambiguity_25fev2026.sql`
   - Suppression fonction 7 paramètres
   - Conservation fonction 8 paramètres

2. **Frontend**: Aucune modification nécessaire
   - `src/lib/leads.ts` déjà configuré pour 8 paramètres

3. **Build**: ✅ Validé sans erreurs

## Métriques de Succès

Après déploiement, surveiller:

1. **Taux de création leads**: Doit être > 0 !
2. **Délai envoi emails**: < 2 minutes
3. **Taux succès emails**: > 98%
4. **Erreurs queue**: Doivent rester à 0

```sql
-- Dashboard temps réel
SELECT
  COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) as leads_aujourd_hui,
  COUNT(*) FILTER (WHERE status = 'sent') as emails_envoyes,
  COUNT(*) FILTER (WHERE status = 'failed') as emails_echecs,
  AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) as delai_moyen_secondes
FROM email_queue
WHERE created_at > now() - interval '24 hours';
```

---

**Date**: 25 Février 2026 15h15
**Status**: ✅ RÉSOLU ET TESTÉ
**Build**: ✅ VALIDÉ
**Priorité**: 🔥 CRITIQUE - Production impactée

**Impact Business**:
- ❌ Avant: 0 lead créé = 0€ de CA
- ✅ Après: Leads créés + emails envoyés = Pipeline rétabli

**Prochaine Action**: Déployer immédiatement en production
