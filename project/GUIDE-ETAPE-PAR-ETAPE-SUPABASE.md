# 🎯 Guide Étape par Étape - Supabase SQL

## ❌ Problème Actuel

```
POST /rpc/toggle_automation 401 (Unauthorized)
Error: permission denied for table job
```

**Compteur:** 0/53 automations actives

**Cause:** Les 3 fonctions SQL ne sont **pas créées** dans Supabase

---

## ✅ Solution en 3 Étapes (2 Minutes)

### 📋 ÉTAPE 1 - Diagnostic (Optionnel)

**Fichier:** `DIAGNOSTIC-FONCTIONS-MANQUANTES.sql`

1. Ouvrir: https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql
2. Cliquer: **+ New Query**
3. Copier/Coller: `DIAGNOSTIC-FONCTIONS-MANQUANTES.sql`
4. Cliquer: **RUN**

**Résultat attendu si fonctions manquantes:**
```
(Aucun résultat)
```

**Résultat attendu si fonctions OK:**
```
┌────────────────────┬──────────┬──────────┐
│ Fonction           │ Type     │ Sécurité │
├────────────────────┼──────────┼──────────┤
│ execute_sql        │ FUNCTION │ DEFINER  │
│ get_automations    │ FUNCTION │ DEFINER  │
│ toggle_automation  │ FUNCTION │ DEFINER  │
└────────────────────┴──────────┴──────────┘
```

---

### ⚡ ÉTAPE 2 - Créer les Fonctions (OBLIGATOIRE)

**Fichier:** `FIX-PERMISSION-CRON-401.sql`

#### 2.1 Ouvrir SQL Editor

```
https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql
```

#### 2.2 Nouveau Query

En haut à gauche, cliquer: **+ New Query**

#### 2.3 Copier le Fichier

Ouvrir `FIX-PERMISSION-CRON-401.sql` et:
- Windows: `Ctrl+A` puis `Ctrl+C`
- Mac: `Cmd+A` puis `Cmd+C`

**IMPORTANT:** Copier **TOUT** le fichier (160 lignes)

#### 2.4 Coller dans Supabase

Dans l'éditeur SQL Supabase:
- Windows: `Ctrl+V`
- Mac: `Cmd+V`

Vous devez voir:
```sql
/*
  ⚡ FIX ERREUR 401 - Permission denied for table job
  ...
*/

-- ============================================
-- 1. FONCTION toggle_automation (avec permissions)
-- ============================================

DROP FUNCTION IF EXISTS toggle_automation(text, boolean) CASCADE;
...
```

#### 2.5 Exécuter

En bas à droite, cliquer le gros bouton vert: **RUN**

#### 2.6 Vérifier les Résultats

Vous devez voir **3 résultats de tests** en bas:

**Test 1 - Liste automations:**
```
┌────┬─────────────────────────┬──────────┐
│ id │ name                    │ active   │
├────┼─────────────────────────┼──────────┤
│ 1  │ sitemap_regeneration    │ true     │
│ 2  │ indexnow_submission     │ false    │
│ 3  │ google_bing_ping        │ true     │
└────┴─────────────────────────┴──────────┘
```

**Test 2 - Toggle automation:**
```json
{
  "success": true,
  "message": "Automation activée",
  "affected_rows": 1
}
```

**Test 3 - Execute SQL:**
```json
{
  "success": true,
  "affected_rows": 0,
  "message": "Requête exécutée avec succès"
}
```

**Si vous voyez ces 3 résultats:** ✅ **C'EST BON !**

**Si vous voyez des erreurs:** ❌ Copier l'erreur et demander de l'aide

---

### 🌐 ÉTAPE 3 - Tester le Backoffice

#### 3.1 Ouvrir AutoOptimizer

```
https://taxiassur.com/backoffice/auto-optimizer
```

#### 3.2 Vider le Cache

**IMPORTANT:** Le navigateur a mis en cache l'ancien build

- Windows: `Ctrl+Shift+R` ou `Ctrl+F5`
- Mac: `Cmd+Shift+R`

#### 3.3 Vérifier le Compteur

En haut de la page, vous devez voir:

```
Automatisations Actives: X/53
```

**Si X > 0:** ✅ **ÇA MARCHE !**

**Si X = 0:** Continuer...

#### 3.4 Activer Individuellement

Cliquer sur **un seul switch** (n'importe lequel)

**Résultat attendu:**
- ✅ Pas d'erreur dans la console
- ✅ Switch passe à "ON"
- ✅ Compteur augmente: `1/53`

**Si erreur 401:** ❌ Les fonctions ne sont pas créées → Refaire ÉTAPE 2

#### 3.5 Activer Toutes

Cliquer sur le bouton: **ACTIVER TOUTES LES AUTOMATISATIONS**

**Popup de confirmation:**
```
⚠️ Êtes-vous sûr de vouloir activer TOUTES les automatisations ?

Cela va lancer tous les processus automatiques immédiatement.

[Annuler] [OK]
```

Cliquer: **OK**

**Résultat attendu:**
```
✅ Toutes les automatisations sont maintenant actives !

Les processus vont démarrer selon leur fréquence configurée.

[OK]
```

**Compteur:** `53/53` 🎉

---

## 🔍 Dépannage

### Problème 1: "Aucun résultat" au test

**Cause:** Les fonctions n'existent toujours pas

**Solution:**
1. Vérifier que vous avez copié **TOUT** le fichier
2. Vérifier que vous avez cliqué **RUN**
3. Vérifier qu'il n'y a pas d'erreur SQL affichée

### Problème 2: Erreur SQL "already exists"

**Cause:** Les fonctions existent déjà mais sans `SECURITY DEFINER`

**Solution:**
Le fichier contient `DROP FUNCTION IF EXISTS` donc ça devrait supprimer et recréer.
Si erreur persiste, exécuter d'abord:
```sql
DROP FUNCTION IF EXISTS toggle_automation(text, boolean) CASCADE;
DROP FUNCTION IF EXISTS execute_sql(text) CASCADE;
DROP FUNCTION IF EXISTS get_automations() CASCADE;
```
Puis réexécuter `FIX-PERMISSION-CRON-401.sql`

### Problème 3: Toujours "0/53" après activation

**Cause:** Cache navigateur ou fonctions pas créées

**Solutions:**
1. Vider cache: `Ctrl+Shift+R` (Windows) ou `Cmd+Shift+R` (Mac)
2. Ouvrir console (F12) et vérifier s'il y a des erreurs
3. Si erreur 401 persiste: Refaire ÉTAPE 2 (créer fonctions)

### Problème 4: "Multiple GoTrueClient instances"

**Cause:** Supabase client initialisé plusieurs fois

**Solution:** Ce n'est **pas une erreur bloquante**, ignorez ce warning

### Problème 5: Compteur ne bouge pas en cliquant switch

**Cause:** La fonction `loadAutomations()` ne rafraîchit pas

**Solution:**
1. Vérifier console (F12) pour erreurs
2. Rafraîchir page manuellement après activation
3. Si erreur 401 persiste: Les fonctions ne sont **toujours pas créées**

---

## 📊 Checklist Complète

### Avant

- [ ] Erreur 401 dans console
- [ ] Compteur: 0/53
- [ ] Switch ne s'active pas
- [ ] Message d'erreur: "permission denied for table job"

### Après (Si tout OK)

- [ ] ✅ Aucune erreur 401
- [ ] ✅ Compteur: 53/53
- [ ] ✅ Switches fonctionnent
- [ ] ✅ Message: "Automation activée/désactivée"

---

## 🎯 Résumé Ultra-Court

### Le Problème

Fonctions SQL manquantes → 401 Unauthorized

### La Solution

1. **Ouvrir:** https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql
2. **+ New Query**
3. **Copier/Coller:** `FIX-PERMISSION-CRON-401.sql` (TOUT le fichier)
4. **RUN**
5. **Vérifier:** 3 tests doivent passer ✅
6. **Tester:** https://taxiassur.com/backoffice/auto-optimizer
7. **Vider cache:** Ctrl+Shift+R
8. **Cliquer switch:** ✅ Doit fonctionner

### Durée

- **ÉTAPE 1 (Diagnostic):** 30 secondes (optionnel)
- **ÉTAPE 2 (Créer fonctions):** 1 minute
- **ÉTAPE 3 (Tester):** 30 secondes
- **Total:** 2 minutes

---

## 📁 Fichiers

### À Exécuter (OBLIGATOIRE)

- `FIX-PERMISSION-CRON-401.sql` (160 lignes)

### Diagnostic (Optionnel)

- `DIAGNOSTIC-FONCTIONS-MANQUANTES.sql` (30 lignes)

### Documentation

- `GUIDE-ETAPE-PAR-ETAPE-SUPABASE.md` (ce fichier)
- `CORRECTION-ERREUR-401-FINAL.md` (technique)

---

## ❓ Questions Fréquentes

### Q: Pourquoi "0/53" ne change pas après "Activer toutes" ?

**R:** Deux possibilités:
1. Les fonctions SQL ne sont **pas créées** → Erreur 401 en console
2. Cache navigateur → Faire Ctrl+Shift+R

### Q: Comment savoir si les fonctions sont créées ?

**R:** Exécuter `DIAGNOSTIC-FONCTIONS-MANQUANTES.sql`
- **Aucun résultat** = Pas créées ❌
- **3 lignes** = Créées ✅

### Q: J'ai exécuté le SQL mais erreur 401 persiste

**R:**
1. Vérifier que les 3 tests ont passé
2. Vider cache navigateur (Ctrl+Shift+R)
3. Vérifier console pour nouvelle erreur
4. Si toujours 401: Les fonctions ne sont **pas créées correctement**

### Q: Combien de temps avant que les crons se lancent ?

**R:** **Immédiat** après activation (selon fréquence configurée)
- Certains: Toutes les 5 minutes
- Autres: Toutes les heures
- Autres: Quotidien

---

**MAINTENANT:** Aller à l'ÉTAPE 2 et exécuter `FIX-PERMISSION-CRON-401.sql`
