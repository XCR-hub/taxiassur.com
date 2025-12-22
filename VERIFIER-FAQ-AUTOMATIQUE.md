# ✅ Vérifier et Activer FAQ Automatique

## 🔍 Diagnostic Rapide

La page `/faq` ne se remplit pas automatiquement car :

1. ✅ Le script `INITIALISER-CONTENU-SIMPLE-FINAL.sql` contient 5 FAQ
2. ❓ Ces FAQ sont-elles dans Supabase ?
3. ❓ Le générateur IA publie-t-il les FAQ ?

## 🚀 Solution en 3 Étapes

### Étape 1 : Vérifier les FAQ dans Supabase

**Dans Supabase SQL Editor :**

```sql
-- Compter les FAQ
SELECT COUNT(*) as total_faq FROM faq_entries WHERE status = 'published';

-- Voir toutes les FAQ
SELECT question, category, created_at
FROM faq_entries
WHERE status = 'published'
ORDER BY created_at DESC
LIMIT 20;
```

**Résultat attendu :** Au moins 5 FAQ

**Si 0 FAQ :**
→ Le script `INITIALISER-CONTENU-SIMPLE-FINAL.sql` n'a pas été exécuté
→ Exécute-le dans Supabase SQL Editor

### Étape 2 : Vérifier la Fonction RPC

```sql
-- Tester la fonction get_faq_entries
SELECT * FROM get_faq_entries() LIMIT 5;
```

**Résultat attendu :** Liste des FAQ

**Si erreur :**
→ La fonction n'existe pas
→ Exécute la migration `20251013233519_create_faq_rpc_function.sql`

### Étape 3 : Tester dans le Navigateur

1. Va sur **https://taxiassur.com/faq**
2. Ouvre la **Console développeur** (F12)
3. Regarde les logs :

```
✅ Loaded X FAQ from Supabase
```

**Si tu vois :**
- `✅ Loaded 5 FAQ from Supabase` → **PARFAIT !**
- `⚠️ Supabase FAQ fetch failed` → Problème de connexion
- `❌ Error:` → Voir le message d'erreur

## 🤖 Automatisation FAQ via IA

### Comment Ça Marche ?

Quand tu génères du contenu dans `/backoffice/ai-generator` :

1. ✅ L'IA génère 5-10 FAQ pertinentes
2. ✅ Les FAQ sont **automatiquement insérées** dans `faq_entries`
3. ✅ Elles apparaissent **instantanément** sur `/faq`

### Code Responsable

**Fichier:** `src/backoffice/AIContentGeneratorUnified.tsx` (ligne 238-261)

```typescript
const faqEntries = generatedContent.faq.map((faq, index) => ({
  question: faq.question,
  answer: faq.answer,
  category: faq.category,
  order_index: index
}));

await adminClient
  .from('faq_entries')
  .insert(faqEntries);
```

**Edge Function:** `supabase/functions/generate-seo-content/index.ts`

Génère 5-10 FAQ dans la réponse JSON :

```json
"faq": [
  {
    "question": "Question naturelle ?",
    "answer": "Réponse directe 2-4 phrases",
    "category": "tarifs"
  }
]
```

## 🔧 Si Les FAQ Ne S'affichent Pas

### Problème 1 : Pas de FAQ dans Supabase

**Solution :**
```sql
-- Exécute dans Supabase SQL Editor
-- (copie le contenu de INITIALISER-CONTENU-SIMPLE-FINAL.sql)
```

### Problème 2 : Fonction RPC Manquante

**Solution :**
```sql
-- Exécute la migration
CREATE OR REPLACE FUNCTION get_faq_entries()
RETURNS TABLE (
  id uuid,
  question text,
  answer text,
  category text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id, question, answer, category, created_at
  FROM faq_entries
  WHERE status = 'published'
  ORDER BY order_index, created_at DESC;
$$;
```

### Problème 3 : RLS Bloque l'Accès

**Solution :**
```sql
-- Vérifier les policies
SELECT * FROM pg_policies WHERE tablename = 'faq_entries';

-- Ajouter policy lecture publique si manquante
CREATE POLICY IF NOT EXISTS "FAQ entries are viewable by everyone"
  ON faq_entries FOR SELECT
  TO anon, authenticated
  USING (status = 'published');
```

## 📊 Vérification Finale

Après avoir tout configuré :

1. ✅ Va sur `/backoffice/ai-generator`
2. ✅ Génère un article avec mot-clé + ville
3. ✅ Vérifie le message : `✅ 5 FAQ ajoutées`
4. ✅ Va sur `/faq` → Les nouvelles FAQ apparaissent !

## 🎯 Automatisation Complète

### Génération Manuelle
- `/backoffice/ai-generator` → Génère article + FAQ

### Génération Automatique (Cron)
- **Tous les jours à 04h00** → Génère 1 article + 5 FAQ
- **Tous les jours à 05h00** → Génère 1 page ville + FAQ locales

### Résultat Attendu

**Après 30 jours :**
- 30 articles blog ✅
- 150+ FAQ uniques ✅
- 30 pages ville ✅
- Contenu SEO massif ✅

## 🚨 Erreurs Courantes

### Erreur : "FAQ non publiées, mais article créé quand même"

**Cause :** Contrainte unique sur `question` ou `category`

**Solution :** Les FAQ dupliquées sont ignorées (normal)

### Erreur : "column order_index does not exist"

**Cause :** Structure de table obsolète

**Solution :**
```sql
ALTER TABLE faq_entries ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
```

### Erreur : "function get_faq_entries does not exist"

**Cause :** Migration non exécutée

**Solution :** Exécute la migration `20251013233519_create_faq_rpc_function.sql`

## ✅ Checklist Finale

- [ ] `INITIALISER-CONTENU-SIMPLE-FINAL.sql` exécuté
- [ ] `SELECT COUNT(*) FROM faq_entries` → ≥ 5
- [ ] `SELECT * FROM get_faq_entries()` → Fonctionne
- [ ] Page `/faq` affiche les FAQ
- [ ] Générateur IA publie automatiquement les FAQ
- [ ] Cron jobs actifs pour génération automatique

**Une fois tout coché, les FAQ se remplissent automatiquement pour toujours !** 🎉

---

⏱️ **Temps total : 5 minutes**
