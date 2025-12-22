# ⚡ APPLIQUER MIGRATION SEO - 2 MINUTES

## 🎯 MIGRATION À APPLIQUER

**Fichier** : `supabase/migrations/20251024000000_fix_seo_real_data_only.sql`

---

## ⚠️ ERREUR RÉSOLUE

### Erreur Initiale
```
ERROR: 42P13: cannot change return type of existing function
HINT: Use DROP FUNCTION get_current_seo_metrics() first.
```

### ✅ Solution Appliquée
La migration inclut maintenant :
```sql
-- Drop fonction existante (signature différente)
DROP FUNCTION IF EXISTS get_current_seo_metrics();

-- Puis recréer avec nouvelle signature
CREATE OR REPLACE FUNCTION get_current_seo_metrics()
RETURNS TABLE (...) -- Nouvelle signature
```

---

## 🚀 APPLIQUER MAINTENANT

### Option 1 : Via Supabase Dashboard (RECOMMANDÉ)

1. **Ouvrir Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/[VOTRE_PROJECT_ID]
   ```

2. **Aller dans SQL Editor**
   - Menu gauche → SQL Editor
   - Ou URL directe : `/project/[PROJECT_ID]/sql`

3. **Copier-Coller le SQL**
   - Ouvrir : `supabase/migrations/20251024000000_fix_seo_real_data_only.sql`
   - Tout sélectionner (Ctrl+A)
   - Copier (Ctrl+C)
   - Coller dans SQL Editor

4. **Exécuter**
   - Cliquer **"Run"** (en bas à droite)
   - Attendre message : **"Success. No rows returned"**

5. **Vérifier**
   ```sql
   -- Tester nouvelle fonction
   SELECT * FROM get_current_seo_metrics();

   -- Devrait retourner 1 ligne avec toutes colonnes à 0 si pas de données
   ```

---

### Option 2 : Via Supabase CLI (Si Installé)

```bash
# Depuis la racine du projet
supabase db push

# Ou appliquer migration spécifique
supabase migration up
```

---

### Option 3 : Via MCP Supabase Tool

```typescript
mcp__supabase__apply_migration({
  filename: "fix_seo_real_data_only",
  content: `
    -- Contenu du fichier SQL ici
  `
})
```

---

## ✅ VÉRIFICATION

### 1. Fonction Recréée
```sql
-- Dans SQL Editor
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'get_current_seo_metrics';

-- Devrait retourner 1 ligne
```

### 2. Test Appel Fonction
```sql
-- Tester l'appel
SELECT * FROM get_current_seo_metrics();

-- Résultat attendu (si pas de données) :
-- date: 2025-10-24
-- total_urls: 0
-- indexed_pages: 0
-- pending_pages: 0
-- impressions_30d: 0
-- clicks_30d: 0
-- average_position: 0
-- last_update: NULL
```

### 3. Permissions OK
```sql
-- Vérifier permissions
SELECT grantor, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'get_current_seo_metrics';

-- Devrait montrer :
-- authenticated: EXECUTE
-- anon: EXECUTE
```

---

## 🔥 SI ERREUR PERSISTE

### Erreur : "function does not exist"

**Cause** : Ancienne fonction pas droppée

**Solution** :
```sql
-- Drop toutes les variantes possibles
DROP FUNCTION IF EXISTS get_current_seo_metrics();
DROP FUNCTION IF EXISTS get_current_seo_metrics(text);
DROP FUNCTION IF EXISTS get_current_seo_metrics(integer);

-- Puis ré-exécuter la migration complète
```

---

### Erreur : "permission denied"

**Cause** : Pas de droits super admin

**Solution** :
1. Vérifier que vous êtes bien connecté en tant que owner
2. Ou utiliser le SQL Editor du dashboard (auto en super user)

---

## 📊 APRÈS MIGRATION

### Frontend Automatiquement Mis à Jour

Une fois migration appliquée, le frontend (déjà buildé) va :

1. **Appeler nouvelle fonction**
   ```typescript
   const { data } = await supabase.rpc('get_current_seo_metrics');
   // Retourne maintenant une TABLE au lieu de JSONB
   ```

2. **Afficher données réelles**
   - Si `seo_metrics` vide → Tout à 0 + Warning rouge
   - Si `seo_metrics` rempli → Vraies métriques + Badge vert

3. **Pas de fallback simulé**
   - Fini les "79 pages indexées" inventés
   - Uniquement vraies données ou 0

---

## 🎯 ORDRE COMPLET DÉPLOIEMENT

### ✅ Étape 1 : Migration SQL (VOUS ÊTES ICI)
```
Appliquer : 20251024000000_fix_seo_real_data_only.sql
Status : ⏳ EN ATTENTE
```

### ⏳ Étape 2 : Upload Frontend
```
Upload : /dist sur IONOS
Status : En attente de Étape 1
```

### ⏳ Étape 3 : Test Production
```
URL : https://taxiassur.com/backoffice/seo
Action : Cliquer "Sync Google Search Console"
Status : En attente de Étape 2
```

---

## 📝 RÉSUMÉ MIGRATION

### Ce que ça change :

**Avant** :
```sql
CREATE FUNCTION get_current_seo_metrics()
RETURNS jsonb  -- ❌ Retournait objet JSON avec données hardcodées
```

**Après** :
```sql
DROP FUNCTION IF EXISTS get_current_seo_metrics();
CREATE FUNCTION get_current_seo_metrics()
RETURNS TABLE (  -- ✅ Retourne lignes de vraies données
  date date,
  total_urls integer,
  indexed_pages integer,
  ...
)
```

### Résultat :
- ✅ Pas de données simulées
- ✅ Tout à 0 si `seo_metrics` vide
- ✅ Vraies métriques si données GSC
- ✅ Warning clair sur état

---

## ⏱️ TEMPS ESTIMÉ

- **Copier-coller SQL** : 30 secondes
- **Exécution** : 2 secondes
- **Vérification** : 30 secondes

**TOTAL** : ⚡ **1 minute**

---

## ✅ CHECKLIST

- [ ] Ouvrir Supabase Dashboard
- [ ] Aller dans SQL Editor
- [ ] Copier contenu de `20251024000000_fix_seo_real_data_only.sql`
- [ ] Coller dans éditeur
- [ ] Cliquer "Run"
- [ ] Vérifier message "Success"
- [ ] Tester : `SELECT * FROM get_current_seo_metrics();`
- [ ] Passer à l'upload frontend

---

**Next Step** : Une fois migration OK → Upload `/dist` sur IONOS

**Documentation complète** : `FIX-SEO-TOOLS-DONNEES-REELLES-UNIQUEMENT.md`
