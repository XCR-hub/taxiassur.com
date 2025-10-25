# 🔧 Guide : Synchroniser Google Search Console Data

## 🎯 Problème

Vous obtenez cette erreur SQL :
```
ERROR: 42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

Cette erreur signifie que la table `seo_metrics` n'a pas la bonne structure pour utiliser `ON CONFLICT`.

---

## ✅ Solution : 3 Options

### Option 1 : Fix Complet (Recommandé) ⭐

Utilisez ce fichier pour corriger la structure ET synchroniser les données :

**Fichier :** `FIX-SEO-METRICS-CONSTRAINT-AND-SYNC.sql`

**Ce qu'il fait :**
- ✅ Ajoute la colonne `url` si manquante
- ✅ Ajoute la colonne `updated_at` si manquante
- ✅ Supprime les anciennes contraintes UNIQUE problématiques
- ✅ Ajoute la contrainte UNIQUE correcte sur `(date, url)`
- ✅ Synchronise les vraies données GSC (72 pages indexées)

**Comment l'utiliser :**
1. Ouvrir **Supabase SQL Editor**
2. Copier-coller le contenu de `FIX-SEO-METRICS-CONSTRAINT-AND-SYNC.sql`
3. Cliquer sur **Run**
4. ✅ Vérifier que le message "Synchronisation réussie" s'affiche

---

### Option 2 : Version Simple (Si Option 1 Échoue)

Utilisez ce fichier si vous voulez juste synchroniser les données SANS modifier la structure :

**Fichier :** `SYNC-GSC-SIMPLE-SANS-CONFLICT.sql`

**Ce qu'il fait :**
- ✅ Supprime les anciennes données
- ✅ Insère les nouvelles données GSC
- ✅ N'utilise PAS de `ON CONFLICT` (évite l'erreur)

**Comment l'utiliser :**
1. Ouvrir **Supabase SQL Editor**
2. Copier-coller le contenu de `SYNC-GSC-SIMPLE-SANS-CONFLICT.sql`
3. Cliquer sur **Run**
4. ✅ Vérifier que les données sont affichées

---

### Option 3 : Version Originale (Si Structure OK)

Utilisez ce fichier si votre table a déjà la bonne structure :

**Fichier :** `SYNC-GOOGLE-SEARCH-CONSOLE-DATA.sql`

**Quand l'utiliser :**
- Si la table a déjà une contrainte UNIQUE sur `(date, url)`
- Si vous voulez utiliser `ON CONFLICT` pour les mises à jour

---

## 📊 Résultat Attendu

Après exécution, vous devriez voir dans Supabase SQL Editor :

```
Date       | Pages Indexées | URLs Totales | En Attente
-----------+----------------+--------------+------------
2025-10-20 |      72        |     150      |    141
```

Et dans le backoffice `/seo` :
- **72 pages indexées** (au lieu de 9) ✅
- **150 URLs totales**
- **141 pages en attente**
- **51 impressions (30j)**
- **1 clic (30j)**
- **1.96% CTR**
- **Position moyenne : 13.5**

---

## 🔍 Diagnostic : Quelle Structure Ai-Je ?

Pour savoir quelle structure vous avez, exécutez ce SQL :

```sql
-- Vérifier les colonnes de seo_metrics
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'seo_metrics'
ORDER BY ordinal_position;

-- Vérifier les contraintes UNIQUE
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'seo_metrics'::regclass
  AND contype IN ('u', 'p');
```

### Résultats Possibles :

**Cas A : Table a colonne `url` + contrainte UNIQUE (date, url)**
→ Utilisez **Option 3** (version originale)

**Cas B : Table a colonne `url` MAIS PAS de contrainte UNIQUE (date, url)**
→ Utilisez **Option 1** (fix complet)

**Cas C : Table N'A PAS de colonne `url`**
→ Utilisez **Option 1** (fix complet)

**Cas D : Erreur "table doesn't exist"**
→ Créez d'abord la table avec une migration complète

---

## 🚀 Actions Recommandées

### 1. Diagnostic Rapide (30 secondes)
```sql
-- Exécutez cette requête dans Supabase SQL Editor
SELECT
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='seo_metrics' AND column_name='url') as has_url_column,
  EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='seo_metrics'::regclass AND conname LIKE '%date%url%') as has_date_url_constraint;
```

### 2. Choisir la Bonne Option

| `has_url_column` | `has_date_url_constraint` | Option à Utiliser |
|------------------|---------------------------|-------------------|
| `true` | `true` | **Option 3** (original) |
| `true` | `false` | **Option 1** (fix complet) |
| `false` | `false` | **Option 1** (fix complet) |

### 3. Exécuter le SQL

1. Copier le contenu du fichier choisi
2. Ouvrir **Supabase Dashboard** → **SQL Editor**
3. Coller le SQL
4. Cliquer sur **Run**
5. Vérifier les messages de confirmation

### 4. Vérifier le Résultat

1. Aller sur `/backoffice/seo`
2. Vérifier que vous voyez **72 pages indexées**
3. ✅ Si oui : Succès !
4. ❌ Si non : Rafraîchir la page avec CTRL+F5

---

## 🐛 Dépannage

### Erreur : "column url does not exist"
**Solution :** Utilisez **Option 1** (fix complet)

### Erreur : "constraint already exists"
**Solution :** Utilisez **Option 2** (version simple)

### Erreur : "duplicate key value violates unique constraint"
**Solution :**
```sql
DELETE FROM seo_metrics WHERE date = CURRENT_DATE;
-- Puis réessayez
```

### Les données ne s'affichent pas dans le backoffice
**Solution :**
1. Vider le cache : CTRL+F5
2. Vérifier que les données sont dans Supabase :
```sql
SELECT * FROM seo_metrics ORDER BY date DESC LIMIT 1;
```

---

## 📁 Fichiers Créés

1. ✅ `FIX-SEO-METRICS-CONSTRAINT-AND-SYNC.sql` - **Fix complet (recommandé)**
2. ✅ `SYNC-GSC-SIMPLE-SANS-CONFLICT.sql` - Version simple sans ON CONFLICT
3. ✅ `SYNC-GOOGLE-SEARCH-CONSOLE-DATA.sql` - Version originale
4. ✅ `GUIDE-SYNC-GOOGLE-SEARCH-CONSOLE.md` - Ce guide

---

## ✨ Conclusion

**La solution la plus simple** :

Exécutez `FIX-SEO-METRICS-CONSTRAINT-AND-SYNC.sql` dans Supabase SQL Editor.

Ce fichier corrige automatiquement tous les problèmes de structure ET synchronise les vraies données de Google Search Console.

**Résultat :** Vous verrez **72 pages indexées** au lieu de 9 dans `/backoffice/seo` ! 🎉

---

**Besoin d'aide ?** Vérifiez les messages d'erreur dans Supabase SQL Editor et utilisez la section Dépannage ci-dessus.
