# 🚀 Migration FAQ - Guide Ultra-Simple

## ❌ L'Erreur Que Tu As Eue

```
ERROR: 42601: syntax error at or near "faq_entries"
```

**Cause :** SQL mal formaté ou copié/collé avec caractères invisibles.

## ✅ Solution en 3 Étapes

### Étape 1 : Diagnostic (30 secondes)

**Copie et exécute dans Supabase SQL Editor :**

```sql
-- Vérifier que les deux tables existent
SELECT 'faq' as table_name, COUNT(*) as count FROM faq
UNION ALL
SELECT 'faq_entries' as table_name, COUNT(*) as count FROM faq_entries;
```

**Résultat attendu :**
```
faq          | 5
faq_entries  | 60
```

### Étape 2 : Migration Simple (1 minute)

**Méthode A - Migration Automatique (RECOMMANDÉE)**

```sql
INSERT INTO faq_entries (question, answer, category, status)
SELECT
  question,
  answer,
  COALESCE(category, 'general'),
  'published'
FROM faq
WHERE NOT EXISTS (
  SELECT 1 FROM faq_entries fe
  WHERE fe.question = faq.question
);
```

**Méthode B - Si l'erreur persiste (MANUELLE)**

```sql
INSERT INTO faq_entries (question, answer, category, status) VALUES
(
  'Quel est le prix moyen d''une assurance taxi ?',
  'Le prix moyen d''une assurance taxi se situe entre 1 500€ et 3 000€ par an selon plusieurs critères : votre ville d''exercice, votre expérience, votre historique de sinistres, et les garanties choisies.',
  'tarifs',
  'published'
),
(
  'Quelles garanties sont obligatoires pour un taxi ?',
  'Les garanties obligatoires incluent : la Responsabilité Civile (RC) qui couvre les dommages causés aux tiers, la RC Professionnelle pour les dommages liés à votre activité professionnelle, et l''assurance du véhicule.',
  'garanties',
  'published'
),
(
  'Que faire en cas de sinistre avec mon taxi ?',
  'Contactez-nous immédiatement au 01 80 85 57 86. Nous vous guiderons dans les démarches : déclaration du sinistre, constitution du dossier, suivi de l''indemnisation.',
  'sinistre',
  'published'
),
(
  'Quels documents fournir pour obtenir un devis ?',
  'Pour un devis gratuit : carte grise du véhicule, permis de conduire, carte professionnelle de taxi, relevé d''information, justificatif de domicile.',
  'procedure',
  'published'
),
(
  'Y a-t-il des frais cachés chez TaxiAssur ?',
  'NON ! Chez TaxiAssur, le prix affiché est le prix final. Pas de frais de dossier, pas de surprise. Transparence totale garantie.',
  'tarifs',
  'published'
);
```

### Étape 3 : Vérification (10 secondes)

```sql
-- Compter toutes les FAQ
SELECT COUNT(*) as total_faq FROM faq_entries WHERE status = 'published';
```

**Résultat attendu :** `65+` (au lieu de 60)

```sql
-- Tester la fonction RPC
SELECT COUNT(*) FROM get_faq_entries();
```

**Résultat attendu :** `65+`

## 🎯 Résultat Final

1. ✅ Va sur **https://taxiassur.com/faq**
2. ✅ Rafraîchis (Ctrl+F5)
3. ✅ Le compteur affiche maintenant **65+ Questions**

## 🔧 Si Ça Ne Marche Toujours Pas

### Problème 1 : "column does not exist"

**Solution :**
```sql
-- Voir les colonnes de faq_entries
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'faq_entries'
  AND table_schema = 'public';
```

Puis adapte l'INSERT selon les colonnes disponibles.

### Problème 2 : "duplicate key value"

**Solution :** La FAQ existe déjà, c'est normal ! Continue.

### Problème 3 : La table 'faq' n'existe pas

**Solution :** Pas grave ! Les 60 FAQ de `faq_entries` sont déjà là. Tu n'as rien à migrer.

```sql
-- Vérifier simplement que tout fonctionne
SELECT COUNT(*) FROM faq_entries WHERE status = 'published';
SELECT * FROM get_faq_entries() LIMIT 5;
```

Si ces requêtes fonctionnent, c'est que **tout est OK** ! 🎉

## 📁 Fichiers Créés

1. **`FIX-FAQ-MIGRATION-SIMPLE.sql`** → Diagnostic
2. **`MIGRATION-FAQ-VERSION-1.sql`** → Migration basique
3. **`MIGRATION-FAQ-VERSION-2.sql`** → Migration complète
4. **`MIGRATION-FAQ-VERSION-3-MANUELLE.sql`** → Insertion manuelle
5. **`GUIDE-MIGRATION-FAQ-FACILE.md`** → Ce guide

## ✅ Checklist

- [ ] Exécuté **Étape 1** (Diagnostic)
- [ ] Exécuté **Étape 2** (Migration - Méthode A ou B)
- [ ] Exécuté **Étape 3** (Vérification)
- [ ] Page `/faq` affiche 65+ FAQ
- [ ] Fonction `get_faq_entries()` retourne 65+ FAQ

**Une fois tout coché, c'est terminé !** 🚀

---

⏱️ **Temps total : 2 minutes max**
