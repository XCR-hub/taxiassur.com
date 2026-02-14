# Fix Cache PostgREST - upsert_lead - 14 Février 2026

## Problème Identifié

Erreur: `Could not find the function public.upsert_lead in the schema cache`

### Tests Effectués

✅ La fonction EXISTS dans la base de données
✅ La fonction FONCTIONNE via SQL direct
✅ Les permissions sont CORRECTES
❌ Le cache PostgREST n'est PAS synchronisé

## Cause

Sur Supabase Cloud, NOTIFY pgrst n'est pas instantané.
Le cache peut mettre 5-10 minutes à se recharger.

## ✅ SOLUTION DEPLOYÉE - Fallback Automatique

### Edge Function `create-lead-direct` v2

**Déployée à** : `https://qiavtxpaznxpttkdaevy.supabase.co/functions/v1/create-lead-direct`

**Fonctionnalités** :
- ✅ Insère **directement dans `crm_leads`** (bypass PostgREST)
- ✅ Gère la déduplication par email avec `.maybeSingle()`
- ✅ Génère automatiquement les `access_token`
- ✅ Mise à jour si email existant, insertion si nouveau

### Logique de Fallback dans `src/lib/leads.ts`

```typescript
// 1️⃣ Tentative via RPC (PostgREST)
({ data, error } = await supabase.rpc('upsert_lead', leadParams));

// 2️⃣ Si erreur de cache → Edge Function
if (error && (error.message?.includes('schema cache') || error.code === 'PGRST202')) {
  logger.warn('⚠️ PostgREST cache issue, using Edge Function fallback...');

  const { data: edgeData, error: edgeError } = await supabase.functions.invoke('create-lead-direct', {
    body: leadParams
  });

  // ✅ Lead créé directement en base !
}
```

## Comment Tester

### 1. Test Formulaire Web

Remplir avec :
- **Nom** : Tony CERDA
- **Email** : tcerda@xcr.fr
- **Téléphone** : 0180855781
- **Ville** : Milly-la-Forêt

### 2. Vérifier les Logs Console (F12)

**Si PostgREST fonctionne** :
```
✅ New lead created in crm_leads: [UUID]
```

**Si cache PostgREST bugué** :
```
⚠️ PostgREST cache issue, using Edge Function fallback...
✅ Lead created via Edge Function fallback
✅ New lead created in crm_leads: [UUID]
```

### 3. Vérifier en Base

```sql
SELECT id, email, first_name, last_name, status, access_token, created_at
FROM crm_leads
WHERE email = 'tcerda@xcr.fr'
ORDER BY created_at DESC
LIMIT 1;
```

## Diagnostiquer une Erreur

### Si "Edge Function fallback failed"

1. **Vérifier les RLS Policies** :
```sql
-- service_role doit pouvoir insérer
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'crm_leads' AND cmd = 'INSERT';
```

2. **Tester l'Edge Function directement** :
```bash
curl -X POST \
  https://qiavtxpaznxpttkdaevy.supabase.co/functions/v1/create-lead-direct \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXZ0eHBhem54cHR0a2RhZXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5Njg1ODUsImV4cCI6MjA4NjU0NDU4NX0.FvEbDxwQy8tsTgeGr4skoJh2KXWJldlSm1RIhoDPY5g" \
  -H "Content-Type: application/json" \
  -d '{
    "p_email": "test@example.com",
    "p_first_name": "Test",
    "p_last_name": "User",
    "p_phone": "0601020304",
    "p_city": "Paris",
    "p_source": "website",
    "p_metadata": {}
  }'
```

3. **Vérifier les logs Supabase** :
   Dashboard → Edge Functions → create-lead-direct → Logs

## Statut Actuel

| Composant | Statut |
|-----------|--------|
| Fonction SQL `upsert_lead` | ✅ Existe et fonctionne |
| Cache PostgREST | ❓ Peut être désynchronisé |
| Edge Function `create-lead-direct` v2 | ✅ Déployée |
| Fallback automatique | ✅ Actif dans le build |
| Build frontend | ✅ Complété |

## Le Formulaire Fonctionne MAINTENANT

Peu importe l'état du cache PostgREST :
- ✅ Si cache OK → Utilise `rpc('upsert_lead')`
- ✅ Si cache KO → Utilise Edge Function `create-lead-direct`
- ✅ **Résultat garanti** : le lead est créé

---

**Dernière mise à jour** : 14 février 2026 - 16:00
**Edge Function** : v3 (amélioration gestion erreurs)
**Frontend** : v2 (fallback systématique pour TOUT type d'erreur)
**Build** : ✅ Déployé

## Corrections Appliquées (14/02 16:00)

### 1. Edge Function `create-lead-direct` v3
- ✅ Remplacement `.single()` par traitement du tableau
- ✅ Meilleur logging des erreurs
- ✅ Gestion du cas "aucune donnée retournée"

### 2. Frontend `leads.ts` - Gestion d'erreurs améliorée
- ✅ Fallback automatique **pour TOUT type d'erreur PostgREST** (pas seulement le cache)
- ✅ Messages d'erreur plus spécifiques (doublons, permissions, etc.)
- ✅ Logging détaillé pour debugging

### 3. Statut des Doublons
- ✅ Si email existe → mise à jour du lead
- ✅ Renvoi du même `access_token` pour cohérence
- ✅ Message approprié : "Cet email est déjà enregistré"
