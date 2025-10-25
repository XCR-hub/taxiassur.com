# 🚨 INSTRUCTIONS URGENTES - SUPABASE

## Problème Actuel

Le site affiche "0 Articles" car **Supabase est vide**.

Les articles sont stockés en JSON local mais pas dans la base de données.

---

## ✅ SOLUTION EN 3 ÉTAPES (5 MINUTES)

### ÉTAPE 1: Créer les Tables (1 min)

1. Ouvre **Supabase Dashboard**: https://drohhxrkoequjphvabvq.supabase.co
2. Va dans **SQL Editor** → **New query**
3. Ouvre le fichier `SUPABASE-REPAIR-FINAL.sql` du projet
4. **Copie TOUT** le contenu (Ctrl+A, Ctrl+C)
5. **Colle** dans SQL Editor (Ctrl+V)
6. Clique **RUN**
7. Vérifie en bas : "Success" ✅

**Résultat :**
- Table `blog_posts` créée
- Table `faq_entries` créée
- RLS configuré
- 2 articles de test insérés

---

### ÉTAPE 2: Utiliser le Script Node.js (2 min)

Le script `insert-blog-posts-supabase.cjs` existe déjà !

**Dans le terminal du projet :**

```bash
# 1. Vérifie que dotenv est installé
npm list dotenv

# 2. Vérifie ton .env
cat .env | grep SUPABASE

# 3. Exécute le script
node scripts/insert-blog-posts-supabase.cjs
```

**Tu devrais voir :**
```
✅ assurance-taxi-2024.json → assurance-taxi-2024
✅ assurance-taxi-jeune-conducteur.json → assurance-taxi-jeune-conducteur
...
✅ Insérés/Mis à jour: 24
📊 Total articles dans Supabase: 24
```

---

### ÉTAPE 3: Rebuild & Upload (2 min)

```bash
# 1. Rebuild
npm run build

# 2. Upload dist/ sur IONOS via FTP
```

**Test :**
- https://taxiassur.com/blog → Devrait afficher 24 articles
- https://taxiassur.com/faq → Devrait afficher les FAQ

---

## 🔍 SI LE SCRIPT ÉCHOUE (Alternative Manuelle)

Si le script Node.js ne marche pas, tu as 2 options :

### Option A: Fichier JSON Généré

J'ai créé `scripts/generate-sql-insert.cjs` qui génère un fichier SQL avec TOUS les articles.

```bash
node scripts/generate-sql-insert.cjs > INSERT-24-ARTICLES.sql
```

Puis exécute `INSERT-24-ARTICLES.sql` dans Supabase SQL Editor.

### Option B: Import CSV Supabase

1. Dashboard Supabase → Table `blog_posts`
2. Click **Insert** → **CSV**
3. Upload le CSV généré

---

## ⚠️ POURQUOI LE SCRIPT A ÉCHOUÉ ?

Erreur: "Invalid API key"

**Cause possible:**
- Les tables n'existent pas encore (d'où étape 1)
- Ou la clé API n'a pas les droits

**Solution:**
Exécute **d'abord** `SUPABASE-REPAIR-FINAL.sql` (étape 1), **puis** le script Node.js (étape 2).

---

## 📊 VÉRIFICATION FINALE

Après insertion, vérifie dans Supabase:

```sql
-- Dans SQL Editor
SELECT COUNT(*) FROM blog_posts;
-- Devrait retourner: 24

SELECT COUNT(*) FROM faq_entries;
-- Devrait retourner: 0 (FAQ sont dans blog_posts.faq en JSON)

SELECT id, title, array_length(faq, 1) as nb_faq
FROM blog_posts
WHERE published = true
ORDER BY created_at DESC;
-- Liste tous les articles avec nombre de FAQ
```

---

## 🎯 RÉCAPITULATIF

| Étape | Action | Durée | Statut |
|-------|--------|-------|--------|
| 1 | Exécuter SUPABASE-REPAIR-FINAL.sql | 1 min | ⏳ |
| 2 | node scripts/insert-blog-posts-supabase.cjs | 2 min | ⏳ |
| 3 | npm run build + upload | 2 min | ⏳ |

**Total: 5 minutes**

---

## 🆘 BESOIN D'AIDE ?

Si bloqué:
1. Vérifie console Supabase pour erreurs
2. Essaie l'option manuelle SQL
3. Vérifie que les clés .env sont correctes

---

Créé: 13/10/2025
Dernière maj: 13/10/2025
