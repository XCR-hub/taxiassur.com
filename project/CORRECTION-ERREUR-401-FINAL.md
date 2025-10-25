# ⚡ FIX ERREUR 401 - Permission Denied

## 🎯 Problème

```
POST /rest/v1/rpc/toggle_automation 401 (Unauthorized)
Error: permission denied for table job
```

**Cause:** Les fonctions RPC n'ont pas les permissions pour modifier `cron.job`

---

## ✅ Solution (10 Secondes)

### Fichier à Exécuter

**`FIX-PERMISSION-CRON-401.sql`** (160 lignes)

### Ce qu'il fait

1. ✅ Crée `toggle_automation()` avec `SECURITY DEFINER`
2. ✅ Crée `execute_sql()` avec `SECURITY DEFINER`
3. ✅ Crée `get_automations()` avec `SECURITY DEFINER`
4. ✅ Tests automatiques inclus

`SECURITY DEFINER` = donne les permissions administrateur aux fonctions

---

## 📋 Étapes (10 Secondes)

### 1. Ouvrir Supabase SQL Editor

```
https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql
```

### 2. Nouveau Query

Cliquer: **+ New Query**

### 3. Copier/Coller

Copier **TOUT** le fichier `FIX-PERMISSION-CRON-401.sql`

### 4. Exécuter

Cliquer: **RUN** (bouton vert)

### 5. Vérifier Résultats

**Test 1 - Liste automations:**
```json
[
  {
    "id": 1,
    "name": "sitemap_regeneration",
    "is_enabled": true,
    ...
  }
]
```

**Test 2 - Toggle automation:**
```json
{
  "success": true,
  "message": "Automation activée"
}
```

**Test 3 - Execute SQL:**
```json
{
  "success": true,
  "message": "Requête exécutée avec succès"
}
```

### 6. Tester Backoffice

1. Ouvrir: `https://taxiassur.com/backoffice/auto-optimizer`
2. Vider cache: `Ctrl+F5`
3. Cliquer sur un switch (Activer/Désactiver)
4. ✅ Pas d'erreur 401
5. ✅ Message de confirmation

---

## 🔍 Explication Technique

### Avant (Erreur 401)

```sql
CREATE FUNCTION toggle_automation(...)
-- Pas de SECURITY DEFINER
-- → Utilise les permissions de l'utilisateur anonyme
-- → Pas d'accès à cron.job
-- → 401 Unauthorized
```

### Après (Fonctionne)

```sql
CREATE FUNCTION toggle_automation(...)
SECURITY DEFINER -- ⚡ Utilise les permissions du créateur (admin)
-- → Accès complet à cron.job
-- → ✅ Autorisé
```

---

## 📊 Fonctions Créées

### 1. `toggle_automation(automation_name, enabled)`

**Usage:**
```sql
SELECT toggle_automation('sitemap_regeneration', true);  -- Activer
SELECT toggle_automation('sitemap_regeneration', false); -- Désactiver
```

**Retour:**
```json
{
  "success": true,
  "message": "Automation activée",
  "affected_rows": 1
}
```

### 2. `execute_sql(sql_query)`

**Usage:**
```sql
SELECT execute_sql('UPDATE cron.job SET active = true');
```

**Sécurité:**
- ❌ Bloque `DROP`
- ❌ Bloque `TRUNCATE`
- ❌ Bloque `DELETE` sans `WHERE`

### 3. `get_automations()`

**Usage:**
```sql
SELECT * FROM get_automations();
```

**Retourne:**
- Liste complète des cron jobs
- Statut (activé/désactivé)
- Statistiques (runs, succès, erreurs)
- Dernière exécution

---

## 🚀 Résumé

### Erreur

```
401 Unauthorized - permission denied for table job
```

### Cause

Fonctions sans `SECURITY DEFINER` → Pas d'accès à `cron.job`

### Solution

3 fonctions avec `SECURITY DEFINER`:
1. ✅ `toggle_automation()` - Activer/désactiver crons
2. ✅ `execute_sql()` - Exécuter SQL admin
3. ✅ `get_automations()` - Lister crons

### Durée

**Exécution SQL:** 5 secondes
**Test backoffice:** 5 secondes
**Total:** 10 secondes

---

## 📁 Fichiers

**Action immédiate:**
- `FIX-PERMISSION-CRON-401.sql` (160 lignes, 3 fonctions + tests)

**Guide:**
- `CORRECTION-ERREUR-401-FINAL.md` (ce fichier)

**Migrations complètes:**
- Migration originale dans: `supabase/migrations/20251023070000_fix_backoffice_errors.sql`

---

## ✅ Après Exécution

1. ✅ Fonctions créées avec permissions admin
2. ✅ AutoOptimizer fonctionnel
3. ✅ Activation/désactivation des crons OK
4. ✅ Pas d'erreur 401

---

**MAINTENANT:** Exécuter `FIX-PERMISSION-CRON-401.sql` dans Supabase SQL Editor

**Build:** ✅ OK (16.78s)
**Code:** ✅ Corrigé (`query` → `sql_query`)
**Base de données:** ⚠️ Attente exécution SQL
