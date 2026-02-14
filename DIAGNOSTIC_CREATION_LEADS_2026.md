# Guide Diagnostic - Création de Leads - 14 Février 2026

## Résumé de la Fix

L'erreur "Erreur lors de la création du lead (PostgREST et Edge Function)" venait de 2 problèmes :

1. **PostgREST** : Cache désynchronisé ou problème de fonction RPC
2. **Edge Function** : Utilisation de `.single()` qui échouait si la réponse n'était pas une seule ligne

**Solution appliquée** :
- ✅ Fallback automatique : PostgREST → Edge Function
- ✅ Edge Function robuste : traitement du tableau au lieu de `.single()`
- ✅ Messages d'erreur plus spécifiques

---

## Test Rapide (30 secondes)

### Étape 1 : Ouvrir la console navigateur
```
Windows/Linux : F12
Mac : Cmd + Option + I
```

### Étape 2 : Aller dans l'onglet "Console"

### Étape 3 : Remplir le formulaire
- **Nom** : Tony CERDA
- **Email** : tcerda@xcr.fr
- **Téléphone** : 0180855781
- **Ville** : Milly-la-Forêt
- **Cliquer** : "OBTENIR MON DEVIS GRATUIT"

### Étape 4 : Vérifier la console

#### ✅ Succès (vous verrez)
```
🚀 Starting lead creation: {name: 'Tony CERDA', ...}
✅ New lead created in crm_leads: [UUID]
```

#### ⚠️ Fallback utilisé (correct aussi)
```
🚀 Starting lead creation: {name: 'Tony CERDA', ...}
⚠️ PostgREST error (or cache issue), using Edge Function fallback...
✅ Lead created via Edge Function fallback
✅ New lead created in crm_leads: [UUID]
```

#### ❌ Erreur complète (à diagnostiquer)
```
❌ Edge Function fallback failed: [message d'erreur]
```

---

## Diagnostic Détaillé

### Cas 1 : "Cet email est déjà enregistré"

**C'est NORMAL !** C'est une sécurité contre les doublons.

Si vous testez plusieurs fois avec le même email, le système :
1. Détecte que l'email existe
2. Met à jour les données du lead
3. Renvoi le même `access_token`

**Solution** : Testez avec un email différent

---

### Cas 2 : Erreur de Permission

**Message console** :
```
❌ Edge Function fallback failed: permission denied
```

**Cause** : RLS policy manquante ou incorrecte

**Vérifier** :
```sql
SELECT tablename, policyname, permissive, roles
FROM pg_policies
WHERE tablename = 'crm_leads'
AND cmd = 'INSERT';

-- Résultat attendu : min 1 policy PERMISSIVE pour service_role
```

**Fix si manquant** :
```sql
CREATE POLICY "Service role can create leads"
ON crm_leads
FOR INSERT
TO service_role
WITH CHECK (true);

GRANT INSERT ON crm_leads TO service_role;
```

---

### Cas 3 : "Aucune donnée retournée"

**Message console** :
```
❌ Insertion réussie mais aucune donnée retournée
```

**Cause** : `.select()` ne retourne rien

**Vérifier** : L'Edge Function a été redeployée ?

```bash
# Vérifier la date du déploiement
# Dashboard Supabase → Edge Functions → create-lead-direct
# Vous devez voir une version récente (14/02/2026)
```

**Fix** : Redeploy manuellement
```bash
# À faire depuis le terminal du projet
npm run deploy  # Si vous avez un script

# Ou via le Dashboard :
# 1. Copier le contenu de supabase/functions/create-lead-direct/index.ts
# 2. Dashboard → Edge Functions → create-lead-direct → Edit
# 3. Coller et sauvegarder
```

---

### Cas 4 : Erreur du Cache PostgREST

**Message console** :
```
⚠️ PostgREST cache issue, using Edge Function fallback...
✅ Lead created via Edge Function fallback
```

**C'est OK** ! Le fallback fonctionne correctement.

Pour forcer le rechargement du cache PostgREST :

**Option 1** (rapide) :
```
Dashboard Supabase → Settings → API → Restart API
```

**Option 2** (attendre) :
```
Attendre 5-10 minutes (rechargement automatique)
```

---

## Diagnostic via Logs Supabase

### Voir les Logs de l'Edge Function

1. Dashboard Supabase
2. **Edge Functions**
3. Cliquer sur **create-lead-direct**
4. Onglet **Logs**

**Vous verrez** :
```
[create-lead-direct] Creating lead: { email: 'tcerda@xcr.fr', ... }
[create-lead-direct] Updating existing lead: [UUID]
# ou
[create-lead-direct] Creating new lead
[create-lead-direct] Lead saved: { lead_id: '[UUID]', is_new: true }
```

### Voir les Logs PostgREST

```sql
-- Vérifier que les données sont bien en base
SELECT id, email, first_name, last_name, status, access_token, created_at
FROM crm_leads
WHERE email ILIKE 'tcerda%'
ORDER BY created_at DESC
LIMIT 5;
```

---

## Checklist Avant de Signaler un Bug

- [ ] Console navigateur consultée (F12)
- [ ] Test avec un email différent (pas de doublons)
- [ ] Logs Supabase consultés (Edge Functions)
- [ ] Vérification des RLS policies (INSERT autorisé ?)
- [ ] Cache PostgREST redémarré (Settings → API)
- [ ] Page reloadée après les modifications

---

## Test Complet (via cURL)

Si vous êtes technicien et voulez tester directement :

```bash
curl -X POST \
  https://qiavtxpaznxpttkdaevy.supabase.co/functions/v1/create-lead-direct \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXZ0eHBhem54cHR0a2RhZXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5Njg1ODUsImV4cCI6MjA4NjU0NDU4NX0.FvEbDxwQy8tsTgeGr4skoJh2KXWJldlSm1RIhoDPY5g" \
  -H "Content-Type: application/json" \
  -d '{
    "p_email": "test.curl@example.com",
    "p_first_name": "Test",
    "p_last_name": "Curl",
    "p_phone": "0601020304",
    "p_city": "Paris",
    "p_source": "website",
    "p_metadata": {}
  }' | jq
```

**Résultat attendu** :
```json
{
  "success": true,
  "lead_id": "uuid...",
  "access_token": "token...",
  "is_new": true
}
```

---

## Prochaines Actions

### ✅ Déjà Déployé
- Edge Function v3 (fix .single())
- Frontend v2 (fallback robuste)
- Build complété

### ⏳ À Tester
- Soumettre le formulaire avec les données d'exemple
- Vérifier la création en base de données
- Consulter les logs

### 🐛 Si Encore une Erreur
1. Copier le message complet de la console (F12)
2. Copier les logs Supabase (Edge Functions → Logs)
3. Vérifier les RLS policies
4. Signaler avec tous ces détails

---

## Version Historique

| Date | Composant | Fix |
|------|-----------|-----|
| 14/02 16:00 | Edge Function v3 | Remplacement .single() par boucle |
| 14/02 16:00 | Frontend v2 | Fallback pour TOUT type d'erreur |
| 14/02 15:45 | Edge Function v2 | Ajout `.maybeSingle()` |
| 14/02 15:30 | Edge Function v1 | Création initiale |

---

**Besoin d'aide ?** Consultez ce guide et les logs avant de signaler un problème.
