# 🚀 Déployer les 2 Edge Functions Mises à Jour

## ✅ Fonction à Redéployer

### 1️⃣ blog-articles (CRITIQUE - MISE À JOUR)

Cette fonction a été corrigée pour correspondre au nouveau script SQL.

**Changements:**
- Suppression du paramètre `p_id` (plus nécessaire)
- Ajout du compteur `faq_extracted` dans la réponse
- Simplification de la validation

---

## 📋 Méthode 1: Via Supabase CLI (Recommandé)

### Prérequis
```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase
```

### Se Connecter
```bash
# Lier le projet
supabase link --project-ref drohhxrkoequjphvabvq

# Login si nécessaire
supabase login
```

### Déployer blog-articles
```bash
cd /chemin/vers/ton/projet

# Déployer uniquement blog-articles
supabase functions deploy blog-articles

# Vérifier le déploiement
supabase functions list
```

---

## 📋 Méthode 2: Via Supabase Dashboard (Alternative)

Si tu n'as pas la CLI installée:

### Étape 1: Copier le Code

1. Ouvre `/supabase/functions/blog-articles/index.ts`
2. Copie TOUT le contenu (Ctrl+A, Ctrl+C)

### Étape 2: Aller dans le Dashboard

1. Va sur https://supabase.com/dashboard
2. Sélectionne projet `drohhxrkoequjphvabvq`
3. Menu gauche → **Edge Functions**
4. Trouve `blog-articles` dans la liste
5. Clique dessus

### Étape 3: Mettre à Jour

1. Clique sur **Edit Function**
2. Supprime l'ancien code
3. Colle le nouveau code
4. Clique sur **Deploy**

---

## 🧪 Tester Après Déploiement

### Test 1: Vérifier que la fonction répond

```bash
curl https://drohhxrkoequjphvabvq.supabase.co/functions/v1/blog-articles \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.ORnrk5sPQpWMu9_I9K_9-0o0Tp0G6o_jxNgB20kSdPU"
```

**Réponse attendue:**
```json
{"error":"Method not allowed"}
```

✅ C'est NORMAL ! La fonction attend un POST.

### Test 2: Publier un article de test

```bash
curl -X POST https://drohhxrkoequjphvabvq.supabase.co/functions/v1/blog-articles \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.ORnrk5sPQpWMu9_I9K_9-0o0Tp0G6o_jxNgB20kSdPU" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "test-deploy-function",
    "title": "Test Déploiement Edge Function",
    "excerpt": "Test pour vérifier que la fonction fonctionne",
    "content": "<h2>Test</h2><p>Contenu de test</p>",
    "tags": ["test"],
    "faq": [
      {
        "question": "La fonction est déployée ?",
        "answer": "Oui, si tu vois cette FAQ !",
        "category": "test"
      }
    ]
  }'
```

**Réponse attendue:**
```json
{
  "success": true,
  "data": {
    "slug": "test-deploy-function",
    "title": "Test Déploiement Edge Function",
    "created_at": "2025-10-13T...",
    "updated_at": "2025-10-13T..."
  },
  "faq_extracted": 1
}
```

### Test 3: Vérifier dans Supabase

```sql
-- Dans Supabase SQL Editor
SELECT * FROM blog_posts WHERE slug = 'test-deploy-function';
SELECT * FROM faq_entries WHERE source_blog_slug = 'test-deploy-function';
```

Tu dois voir:
- 1 article dans `blog_posts`
- 1 FAQ dans `faq_entries`

---

## 🔍 Logs en Cas d'Erreur

### Voir les Logs

1. Supabase Dashboard → **Edge Functions**
2. Clique sur `blog-articles`
3. Onglet **Logs**
4. Regarde les dernières erreurs

### Erreurs Courantes

**"function upsert_blog_post does not exist"**
→ Tu n'as pas exécuté `SUPABASE-FINAL-SETUP.sql`
→ Solution: Exécute le script SQL

**"column faq does not exist"**
→ Tu n'as pas exécuté `SUPABASE-FINAL-SETUP.sql`
→ Solution: Exécute le script SQL

**"Missing required fields"**
→ Tu as oublié un champ dans le JSON
→ Champs obligatoires: `slug`, `title`, `excerpt`, `content`

---

## ✅ Checklist Déploiement

- [ ] `SUPABASE-FINAL-SETUP.sql` exécuté
- [ ] Fonction `blog-articles` redéployée
- [ ] Test GET fonctionne (erreur "Method not allowed" = OK)
- [ ] Test POST article fonctionne
- [ ] Article visible dans `blog_posts`
- [ ] FAQ extraite visible dans `faq_entries`
- [ ] Logs Edge Function sans erreurs

---

## 🎯 Résumé

**1 seule fonction à mettre à jour:** `blog-articles`

**Méthode rapide:**
1. Copie `/supabase/functions/blog-articles/index.ts`
2. Supabase Dashboard → Edge Functions → blog-articles → Edit
3. Colle le nouveau code
4. Deploy
5. Test avec curl

**Durée totale:** 2 minutes

---

## 🔥 Alternative: Redéployer Toutes les Functions

Si tu veux tout mettre à jour d'un coup:

```bash
cd /chemin/vers/ton/projet

# Déployer TOUTES les Edge Functions
supabase functions deploy --project-ref drohhxrkoequjphvabvq

# Ou une par une
supabase functions deploy blog-articles
supabase functions deploy chatbot
supabase functions deploy send-email
# ... etc
```

**Attention:** Cela peut prendre 5-10 minutes pour 21 fonctions.

---

## 📞 Support

En cas de problème:
1. Vérifie que `SUPABASE-FINAL-SETUP.sql` est exécuté
2. Regarde les logs de la fonction
3. Copie l'erreur exacte
4. Demande de l'aide avec l'erreur

**La fonction `blog-articles` est LA PLUS IMPORTANTE pour ton système automatique !**
