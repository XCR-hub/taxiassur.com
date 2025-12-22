# ✅ Erreur SQL ON CONFLICT - Corrigée

## Problème Rencontré

Lors de l'exécution de `FIX-GENERATEUR-IA-SOCIAL-MEDIA.sql` :

```
ERROR: 42P10: there is no unique or exclusion constraint
matching the ON CONFLICT specification
```

## Cause

Le script utilisait `ON CONFLICT (name) DO UPDATE` pour éviter les doublons, mais la table `viral_templates` n'a **pas de contrainte UNIQUE** sur la colonne `name`.

### Structure de la Table

```sql
CREATE TABLE viral_templates (
  id uuid PRIMARY KEY,
  name text NOT NULL,  -- ❌ PAS de UNIQUE
  category text NOT NULL,
  ...
);
```

Le `ON CONFLICT` nécessite une contrainte UNIQUE, PRIMARY KEY, ou EXCLUSION.

## Solution

### Option 1 : Version V2 (Recommandé) ✅

**Fichier :** `FIX-GENERATEUR-IA-SOCIAL-MEDIA-V2.sql`

Utilise `WHERE NOT EXISTS` au lieu de `ON CONFLICT` :

```sql
INSERT INTO viral_templates (...)
SELECT
  'Question Choc - Assurance',
  'assurance',
  ...
WHERE NOT EXISTS (
  SELECT 1 FROM viral_templates
  WHERE name = 'Question Choc - Assurance'
);
```

**Avantages :**
- ✅ Pas d'erreur
- ✅ Évite les doublons
- ✅ Peut être réexécuté sans problème
- ✅ Plus verbeux mais plus sûr

### Option 2 : Ajouter Contrainte UNIQUE (Alternative)

Si vous voulez utiliser `ON CONFLICT`, ajoutez d'abord une contrainte :

```sql
-- Ajouter contrainte UNIQUE
ALTER TABLE viral_templates
ADD CONSTRAINT viral_templates_name_unique UNIQUE (name);

-- Puis le INSERT avec ON CONFLICT fonctionnera
INSERT INTO viral_templates (...)
VALUES (...)
ON CONFLICT (name) DO UPDATE SET ...;
```

**Note :** Pas recommandé car nécessite modification du schéma.

### Option 3 : Supprimer ON CONFLICT (Simple)

Version minimale du fichier original :

```sql
-- Supprimer les anciens templates avant insert
DELETE FROM viral_templates WHERE category = 'assurance';

-- Puis insert normal sans ON CONFLICT
INSERT INTO viral_templates (...) VALUES (...);
```

**Inconvénient :** Supprime tous les templates existants.

## Quelle Version Utiliser ?

### 🎯 Recommandation : Version V2

**Utilisez :** `FIX-GENERATEUR-IA-SOCIAL-MEDIA-V2.sql`

**Pourquoi :**
1. ✅ Aucune erreur possible
2. ✅ Respecte les templates existants
3. ✅ Peut être réexécuté sans danger
4. ✅ Compatible avec la structure actuelle

## Instructions d'Utilisation

### Étape 1 : Ouvrir Supabase SQL Editor

```
https://supabase.com/dashboard → Votre projet → SQL Editor
```

### Étape 2 : Copier/Coller V2

```sql
-- Copier TOUT le contenu de :
FIX-GENERATEUR-IA-SOCIAL-MEDIA-V2.sql
```

### Étape 3 : Exécuter

**Cliquer :** RUN (ou Ctrl+Enter)

### Étape 4 : Vérifier le Résultat

Vous devriez voir :

```
📊 Total templates actifs : 5
📈 Vues moyennes : 7.1M
⭐ Score moyen : 95/100

📝 Question Choc - Assurance | 7.2M vues | 95/100
📝 Top 5 Erreurs - Liste Virale | 8.5M vues | 98/100
📝 Mythe VS Réalité - Éducation | 7.8M vues | 96/100
📝 Transformation Avant/Après | 6.4M vues | 94/100
📝 Histoire Personnelle - Témoignage | 5.8M vues | 92/100

✅ Fonction get_viral_template() fonctionne: 5 templates trouvés
```

## Que Faire en Cas d'Erreur ?

### Erreur : "relation viral_templates does not exist"

**Cause :** La table n'existe pas dans votre base.

**Solution :**
1. Vérifier que la migration `20251020100000_create_viral_templates_system.sql` a été appliquée
2. Ou créer la table manuellement (voir la migration)

### Erreur : Templates déjà insérés

**Pas une erreur !** Les templates existent déjà, c'est normal.

**Vérification :**
```sql
SELECT COUNT(*) FROM viral_templates WHERE is_active = true;
-- Doit retourner au moins 1
```

### Erreur : "column X does not exist"

**Cause :** Structure de table différente.

**Solution :** Mettre à jour la structure ou modifier le script pour matcher votre schéma.

## Fichiers Mis à Jour

1. **FIX-GENERATEUR-IA-SOCIAL-MEDIA-V2.sql** ⭐ NOUVEAU
   - Version sans erreur
   - Utilise `WHERE NOT EXISTS`

2. **FIX-GENERATEUR-IA-SOCIAL-MEDIA.sql** (Original)
   - Peut causer erreur `ON CONFLICT`
   - Gardé pour référence

3. **DEMARRAGE-RAPIDE-IA-SOCIAL.md** ✏️ MODIFIÉ
   - Pointe maintenant vers V2
   - Instructions mises à jour

## Résumé

| Version | Fichier | Status | Erreur ON CONFLICT | Recommandé |
|---------|---------|--------|-------------------|------------|
| V2 | FIX-...-V2.sql | ✅ OK | ❌ Non | ⭐ OUI |
| V1 | FIX-...sql | ⚠️ Erreur | ✅ Oui | ❌ Non |

**Action :** Utilisez toujours la **V2** !

## Prochaines Étapes

Une fois les templates insérés :

1. ✅ Configurer `OPENAI_API_KEY` dans Supabase Secrets
2. ✅ Tester `/backoffice/social-media` → "Générer avec IA"
3. ✅ Le générateur devrait fonctionner !

Documentation complète : `DEMARRAGE-RAPIDE-IA-SOCIAL.md`

---

**Date :** 21 Octobre 2025
**Status :** ✅ Corrigé
**Version recommandée :** V2
