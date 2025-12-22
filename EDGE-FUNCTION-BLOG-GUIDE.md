# Guide Edge Function blog-articles - Publication Automatique

## ✅ Edge Function Déjà Déployée

La fonction `blog-articles` est **DÉJÀ DÉPLOYÉE** sur ton instance Supabase `drohhxrkoequjphvabvq`.

**URL de la fonction:**
```
https://drohhxrkoequjphvabvq.supabase.co/functions/v1/blog-articles
```

---

## 🎯 Fonctionnement

### 1. Publication d'un Article

**Endpoint:** `POST /functions/v1/blog-articles`

**Headers requis:**
```json
{
  "Authorization": "Bearer VOTRE_SUPABASE_ANON_KEY",
  "Content-Type": "application/json"
}
```

**Body (exemple):**
```json
{
  "slug": "assurance-taxi-paris-2025",
  "title": "Assurance Taxi à Paris : Guide Complet 2025",
  "excerpt": "Tout ce qu'il faut savoir sur l'assurance taxi à Paris en 2025",
  "content": "<h2>Introduction</h2><p>Contenu de l'article...</p>",
  "tags": ["assurance", "taxi", "paris"],
  "faq": [
    {
      "question": "Combien coûte une assurance taxi à Paris ?",
      "answer": "Entre 2000€ et 4000€ par an selon le véhicule.",
      "category": "tarifs"
    },
    {
      "question": "Quelles sont les garanties obligatoires ?",
      "answer": "RC Pro, protection juridique, et garantie du conducteur.",
      "category": "garanties"
    }
  ]
}
```

**Réponse attendue:**
```json
{
  "success": true,
  "data": {
    "slug": "assurance-taxi-paris-2025",
    "title": "Assurance Taxi à Paris : Guide Complet 2025",
    "created_at": "2025-10-13T10:30:00Z",
    "updated_at": "2025-10-13T10:30:00Z"
  },
  "faq_extracted": 2
}
```

---

## 🔥 Magie Automatique

Quand tu publies un article avec la fonction:

1. ✅ Article inséré dans `blog_posts`
2. ✅ FAQ automatiquement extraites et insérées dans `faq_entries`
3. ✅ Visible immédiatement sur `/blog` et `/faq`
4. ✅ Pas besoin de toucher aux fichiers JSON !

---

## 📝 Exemple Complet avec curl

```bash
curl -X POST https://drohhxrkoequjphvabvq.supabase.co/functions/v1/blog-articles \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.ORnrk5sPQpWMu9_I9K_9-0o0Tp0G6o_jxNgB20kSdPU" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "test-article",
    "title": "Article de Test",
    "excerpt": "Un article de test",
    "content": "<p>Contenu test</p>",
    "tags": ["test"],
    "faq": [
      {
        "question": "Question test ?",
        "answer": "Réponse test",
        "category": "test"
      }
    ]
  }'
```

---

## 🎨 Utilisation depuis le Backoffice (futur)

Tu pourras créer une interface dans le backoffice pour:

1. Remplir un formulaire (titre, contenu, tags, FAQ)
2. Cliquer sur "Publier"
3. L'interface appelle l'Edge Function
4. Article publié + FAQ remplie automatiquement !

**Code React exemple:**
```typescript
const publishArticle = async (article) => {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blog-articles`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(article)
    }
  );

  const result = await response.json();
  console.log('Article publié:', result);
};
```

---

## 🔍 Vérifier que ça Fonctionne

Après avoir exécuté `SUPABASE-FINAL-SETUP.sql`, teste:

### Test 1: Lister les articles
```sql
SELECT * FROM get_blog_posts();
```
**Attendu:** 2 articles

### Test 2: Lister les FAQ
```sql
SELECT * FROM get_faq_entries();
```
**Attendu:** 4 questions FAQ

### Test 3: Appeler l'Edge Function
```bash
curl https://drohhxrkoequjphvabvq.supabase.co/functions/v1/blog-articles \
  -H "Authorization: Bearer ANON_KEY"
```
**Attendu:** `{"error":"Method not allowed"}` (normal, il faut POST)

---

## ✅ Checklist Finale

- [ ] Exécuter `SUPABASE-FINAL-SETUP.sql` dans Supabase SQL Editor
- [ ] Vérifier que 2 articles sont créés
- [ ] Vérifier que 4 FAQ sont extraites automatiquement
- [ ] Tester l'Edge Function avec curl
- [ ] Vider cache navigateur (Ctrl+Shift+R)
- [ ] Aller sur https://taxiassur.com/blog
- [ ] Voir les articles depuis Supabase
- [ ] Aller sur https://taxiassur.com/faq
- [ ] Voir les FAQ auto-remplies

---

## 🚀 C'est Prêt !

Tout est configuré pour que:
- Tu publies un article via l'Edge Function
- Les FAQ soient automatiquement extraites
- Tout apparaisse sur le site instantanément

**Plus besoin de toucher aux fichiers JSON manuellement !**
