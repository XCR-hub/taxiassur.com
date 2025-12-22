# 🎯 GUIDE FINAL - 3 ÉTAPES POUR ACTIVER LES AUTOMATISATIONS

## 📊 Situation Actuelle

| Composant | Statut |
|-----------|--------|
| Frontend (code TypeScript) | ✅ Corrigé |
| Build (fichiers dist/) | ✅ Uploadé sur IONOS |
| Base de données SQL | ❌ À corriger |

**Erreur actuelle:** `permission denied for table job`

---

## 🚀 ÉTAPE 1: Exécuter Migration SQL (2 min)

### 1.1 Ouvrir Supabase SQL Editor

1. Aller sur: https://supabase.com/dashboard/project/drohhxrkoequjphvabvq
2. Cliquer **"SQL Editor"** dans le menu gauche
3. Cliquer **"+ New query"** en haut

### 1.2 Copier le SQL

Ouvrir le fichier:
```
supabase/migrations/20251023080000_fix_toggle_automation_final.sql
```

**OU** copier directement ce SQL:

```sql
-- 1. Supprimer anciennes versions
DROP FUNCTION IF EXISTS toggle_automation(bigint, boolean) CASCADE;
DROP FUNCTION IF EXISTS toggle_automation(p_job_id bigint, p_enabled boolean) CASCADE;

-- 2. Créer la bonne version
CREATE OR REPLACE FUNCTION toggle_automation(
  automation_name text,
  enabled boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  v_rows_affected integer;
BEGIN
  UPDATE cron.job
  SET active = enabled
  WHERE jobname = automation_name;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  IF v_rows_affected > 0 THEN
    PERFORM log_automation_run(
      automation_name,
      'success',
      CASE WHEN enabled THEN 'Activée via dashboard' ELSE 'Désactivée' END,
      jsonb_build_object('action', 'toggle', 'enabled', enabled),
      0
    );
    RETURN true;
  ELSE
    RETURN false;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM log_automation_run(
      automation_name, 'error', 'Erreur: ' || SQLERRM,
      jsonb_build_object('error', SQLERRM), 0
    );
    RETURN false;
END;
$$;

-- 3. Accorder permissions
GRANT EXECUTE ON FUNCTION toggle_automation(text, boolean) 
  TO anon, authenticated, service_role;

GRANT USAGE ON SCHEMA cron TO postgres, authenticated, anon;
```

### 1.3 Exécuter

1. Coller le SQL dans l'éditeur
2. Cliquer **"Run"** (ou Ctrl+Enter)
3. Attendre le message: ✅ **FIX TOGGLE_AUTOMATION APPLIQUÉ**

---

## ✅ ÉTAPE 2: Vérifier (30 sec)

### 2.1 Vérifier qu'une seule fonction existe

Dans le même SQL Editor, exécuter:

```sql
SELECT 
  proname as fonction,
  pg_get_function_arguments(oid) as parametres
FROM pg_proc 
WHERE proname = 'toggle_automation';
```

**Résultat attendu:**
```
fonction            | parametres
--------------------|----------------------------------
toggle_automation   | automation_name text, enabled boolean
```

**✅ Si 1 ligne:** Parfait!  
**❌ Si 0 ligne:** Réexécuter la migration  
**❌ Si 2+ lignes:** Certaines anciennes versions existent encore

---

## 🎯 ÉTAPE 3: Tester Dashboard (1 min)

### 3.1 Vider Cache Navigateur

**Option A (Rapide):**
1. Ouvrir fenêtre privée: **Ctrl+Shift+N** (Chrome) ou **Ctrl+Shift+P** (Firefox)
2. Aller sur: https://taxiassur.com/backoffice/auto-optimizer

**Option B (Complet):**
1. **Ctrl+Shift+Delete**
2. Cocher "Images et fichiers en cache"
3. Cliquer "Effacer"
4. Aller sur: https://taxiassur.com/backoffice/auto-optimizer

### 3.2 Tester Toggle

1. Ouvrir Console (F12)
2. Cliquer sur un switch pour activer/désactiver
3. Vérifier console:
   - ✅ **Plus d'erreur 401**
   - ✅ **Plus d'erreur "permission denied"**
   - ✅ Alert: "L'automatisation est maintenant ✅ activée"

---

## 🎊 SUCCÈS - Système Opérationnel

Une fois les 3 étapes complétées:

### ✅ Dashboard Fonctionnel
- Toggle activé/désactivé fonctionne
- Stats en temps réel visibles
- Logs d'exécution affichés

### ✅ Prochaines Actions

1. **Configurer clés API** (optionnel pour l'instant):
   - Settings > Edge Functions > Secrets
   - OPENAI_API_KEY, PEXELS_API_KEY, etc.

2. **Activer automatisations de test** (safe, sans clé API):
   - `seo-daily-refresh`
   - `trend-analyzer-daily`

3. **Activer Top 10 automatisations** (nécessite clés API):
   - Voir liste dans `SYSTEME-ORCHESTRATION-AUTOMATISATIONS.md`

---

## 📊 Récapitulatif Technique

### Ce qui a été corrigé

**Frontend (`AutoOptimizer.tsx`):**
```typescript
// ❌ Avant
supabase.rpc('toggle_automation', {
  p_job_id: parseInt(automation.id),
  p_enabled: newStatus
})

// ✅ Après
supabase.rpc('toggle_automation', {
  automation_name: automation.name,
  enabled: newStatus
})
```

**Base de données (Migration SQL):**
```sql
-- ❌ Avant: 4 versions avec (bigint, boolean)
-- ✅ Après: 1 version avec (text, boolean)
-- ✅ + SECURITY DEFINER
-- ✅ + GRANT à anon
```

---

## 🆘 Dépannage

### Erreur persiste après migration?

**1. Vérifier que la migration a bien été exécutée:**
```sql
SELECT COUNT(*) as nombre_versions
FROM pg_proc 
WHERE proname = 'toggle_automation';
-- Doit retourner: 1
```

**2. Vérifier les permissions:**
```sql
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'toggle_automation';
-- Doit inclure: anon, authenticated, service_role
```

**3. Vider VRAIMENT le cache:**
- Fermer TOUS les onglets taxiassur.com
- Redémarrer le navigateur
- Réessayer

---

## 📞 Support

Si problème persiste:

1. **Copier les erreurs console** (F12)
2. **Copier résultat de ce SQL:**
   ```sql
   SELECT proname, pg_get_function_arguments(oid)
   FROM pg_proc WHERE proname = 'toggle_automation';
   ```
3. Me les envoyer pour diagnostic

---

## 🎯 Objectif Final

**Système d'automatisations 100% opérationnel:**
- ✅ 53 cron jobs configurés
- ✅ 45 edge functions déployées
- ✅ Dashboard de contrôle fonctionnel
- ✅ 3 chaînes d'automatisation prêtes
- ✅ Monitoring en temps réel actif

**Il suffit d'exécuter la migration SQL!**
