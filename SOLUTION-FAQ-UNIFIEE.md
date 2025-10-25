# ✅ Solution FAQ Unifiée - 2 Minutes

## 🔍 Problème Identifié

Tu as **deux tables FAQ différentes** dans Supabase :

| Table | Nombre | Source | Affichée ? |
|-------|--------|--------|-----------|
| **`faq`** | 5 FAQ | Anciennes (statiques) | ❌ NON |
| **`faq_entries`** | 60 FAQ | Générées par IA | ✅ OUI |

**Résultat :** La page `/faq` affiche seulement les 60 FAQ de `faq_entries`, mais ignore les 5 FAQ de `faq`.

## ✅ Solution Simple

### Étape 1 : Migrer les FAQ (30 secondes)

**Dans Supabase SQL Editor**, exécute ce script :

```sql
-- Migrer les 5 FAQ de 'faq' vers 'faq_entries'
INSERT INTO faq_entries (question, answer, category, status, created_at, updated_at, order_index)
SELECT
  question,
  answer,
  category,
  'published' as status,
  NOW() as created_at,
  NOW() as updated_at,
  0 as order_index
FROM faq
WHERE NOT EXISTS (
  SELECT 1 FROM faq_entries
  WHERE faq_entries.question = faq.question
);

-- Vérifier le résultat
SELECT COUNT(*) as total_faq FROM faq_entries WHERE status = 'published';
```

**Résultat attendu :** `65 FAQ` (60 + 5 migrées)

### Étape 2 : Supprimer l'Ancienne Table (OPTIONNEL)

Si tu veux nettoyer complètement :

```sql
DROP TABLE IF EXISTS faq CASCADE;
```

⚠️ **Attention :** Une fois supprimée, impossible de récupérer. Les FAQ sont déjà migrées, donc c'est safe.

### Étape 3 : Vérifier la Page

1. Va sur **https://taxiassur.com/faq**
2. Rafraîchis la page (Ctrl+F5)
3. Vérifie le compteur : **65+ Questions** (au lieu de 60)

## 🎯 Pourquoi Ça Marche ?

### Code Frontend (DÉJÀ CORRECT)

**Fichier:** `src/lib/content.ts` (ligne 220)

```typescript
const { data, error } = await supabase.rpc('get_faq_entries');
```

→ Charge depuis `faq_entries` ✅

### Générateur IA (DÉJÀ CORRECT)

**Fichier:** `src/backoffice/AIContentGeneratorUnified.tsx` (ligne 246)

```typescript
await adminClient
  .from('faq_entries')  // ✅ Bonne table
  .insert(faqEntries);
```

→ Publie dans `faq_entries` ✅

### Fonction Supabase (DÉJÀ CORRECTE)

```sql
CREATE FUNCTION get_faq_entries()
RETURNS TABLE (...)
AS $$
  SELECT * FROM faq_entries  -- ✅ Bonne table
  WHERE status = 'published'
$$;
```

## 📊 Avant / Après

### AVANT (État Actuel)

```
Table 'faq':          5 FAQ ❌ (ignorées)
Table 'faq_entries': 60 FAQ ✅ (affichées)
-------------------------------------
Page /faq affiche:   60 FAQ
```

### APRÈS (Après Migration)

```
Table 'faq':          5 FAQ → MIGRÉES → 0 FAQ
Table 'faq_entries': 60 FAQ + 5 FAQ = 65 FAQ ✅
-------------------------------------
Page /faq affiche:   65 FAQ
```

## 🚀 Automatisation Future

**Maintenant que tout est unifié :**

✅ Génération manuelle (`/backoffice/ai-generator`) → `faq_entries`
✅ Génération automatique (Cron 04h00) → `faq_entries`
✅ Page `/faq` → Charge depuis `faq_entries`
✅ Fonction `get_faq_entries()` → Lit depuis `faq_entries`

**Une seule table, zéro confusion !** 🎉

## 🔧 Vérification Complète

```sql
-- 1. Compter les FAQ
SELECT COUNT(*) FROM faq_entries WHERE status = 'published';
-- Attendu: 65+

-- 2. Tester la fonction RPC
SELECT COUNT(*) FROM get_faq_entries();
-- Attendu: 65+

-- 3. Voir les dernières FAQ ajoutées
SELECT question, category, created_at
FROM faq_entries
ORDER BY created_at DESC
LIMIT 10;

-- 4. Vérifier les catégories
SELECT category, COUNT(*) as count
FROM faq_entries
WHERE status = 'published'
GROUP BY category
ORDER BY count DESC;
```

## ✅ Checklist Finale

- [ ] Exécuter le script de migration
- [ ] Vérifier : `SELECT COUNT(*) FROM faq_entries` → ≥ 65
- [ ] Tester : `SELECT * FROM get_faq_entries()` → Fonctionne
- [ ] Page `/faq` affiche 65+ FAQ
- [ ] (OPTIONNEL) Supprimer table `faq`

**Temps total : 2 minutes** ⏱️

## 📁 Fichiers Créés

- **`UNIFIER-FAQ-TABLES.sql`** → Script SQL complet de migration
- **`SOLUTION-FAQ-UNIFIEE.md`** → Ce guide

---

**Une fois fait, toutes les FAQ (anciennes + IA) s'affichent sur /faq !** 🚀
