# 🚨 ERREUR 400 DÉTECTÉE - CORRECTION EN 30 SECONDES

## ❌ Erreur Actuelle
```
POST /rest/v1/blog_posts 400 (Bad Request)
COALESCE types uuid and integer cannot be matched
```

**Cause** : La colonne `author` est en UUID mais l'app envoie du TEXT.

---

## ✅ CORRECTION (3 étapes, 30 secondes)

### 1️⃣ Ouvrir Supabase SQL Editor
https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/sql

### 2️⃣ Copier/Coller ce SQL
```sql
-- Convertir author en TEXT
ALTER TABLE blog_posts
ALTER COLUMN author TYPE TEXT USING COALESCE(author::TEXT, 'TaxiAssur');

-- Valeur par défaut
ALTER TABLE blog_posts
ALTER COLUMN author SET DEFAULT 'TaxiAssur';

-- Autoriser NULL
ALTER TABLE blog_posts
ALTER COLUMN author DROP NOT NULL;
```

### 3️⃣ Cliquer "Run"
Résultat attendu : `SUCCESS`

---

## 🧪 TESTER MAINTENANT

1. **Vider cache navigateur** : Ctrl+Shift+R (ou Cmd+Shift+R sur Mac)
2. **Ouvrir** : https://taxiassur.com/backoffice/ai-generator
3. **Remplir** :
   - Mot-clé : `assurance taxi pas cher`
   - Ville : `Paris`
4. **Cliquer** : "Générer TOUT le Contenu"
5. **Attendre** : 30-60 secondes
6. **Cliquer** : "Publier TOUT"

**Résultat attendu** :
```
✅ Publication réussie !

📝 Article de blog publié ✅ avec image
🏙️ Page ville créée/mise à jour
❓ ✅ 5-10 FAQ ajoutées
📰 Actualité publiée

Total: 4000+ mots générés
```

---

## 🔍 Vérifier en Base (optionnel)

```sql
SELECT
  title,
  author,
  LENGTH(content) AS content_length,
  featured_image IS NOT NULL AS has_image,
  created_at
FROM blog_posts
ORDER BY created_at DESC
LIMIT 1;
```

**Valeurs attendues** :
- `author` = `TaxiAssur` (TEXT)
- `content_length` > 2000
- `has_image` = `true`

---

## 📋 Checklist

- [ ] SQL exécuté dans Supabase ✅
- [ ] Cache navigateur vidé ✅
- [ ] Page ai-generator rechargée ✅
- [ ] Génération testée ✅
- [ ] Publication réussie ✅

---

## 🎯 Fichiers Disponibles

Si besoin de plus de détails :
- `CORRIGER-ERREUR-AUTHOR-30-SECONDES.sql` - Script complet avec tests
- `SOLUTION-ERREUR-400-AUTHOR.md` - Guide détaillé
- `FIX-AUTHOR-COLUMN-MAINTENANT.sql` - Script avec diagnostic

---

**⏱️ Temps total : 30 secondes de correction + 3 minutes de test = Système opérationnel !**
