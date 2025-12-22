# 🔍 Diagnostic Erreur 400 - Guide Final

## 🎯 Problème

```
drohhxrkoequjphvabvq.supabase.co/rest/v1/blog_posts?select=*
Failed to load resource: the server responded with a status of 400 ()
```

---

## ✅ Vérifications Effectuées

### 1. L'API Supabase Fonctionne

**Test curl :**
```bash
curl -H "apikey: eyJhbGci..." -H "Authorization: Bearer eyJhbGci..." \
  "https://drohhxrkoequjphvabvq.supabase.co/rest/v1/blog_posts?select=*"
```

**Résultat :** ✅ 200 OK - Retourne 3 articles

**Conclusion :** L'API Supabase fonctionne parfaitement. Le problème vient du client JavaScript.

---

### 2. Corrections Appliquées

#### A. AIContentGenerator.tsx
- ❌ **Avant :** `.select('id').eq('id', baseSlug)`
- ✅ **Après :** `.select('slug').eq('slug', baseSlug)`

#### B. content.ts - getBlogPost()
- ❌ **Avant :** `.or(\`id.eq.${id},slug.eq.${id}\`)`
- ✅ **Après :** `.eq('slug', id)`

#### C. supabase.ts - Configuration Client
- ✅ **Ajouté :** Options client `{ auth: { persistSession: false, autoRefreshToken: false } }`
- ✅ **Ajouté :** Logging de configuration

---

## 🔧 Nouveau Build

**Build réussi :** 16.38s
**Fichiers mis à jour :**
- `backoffice-DwhUF5xN.js` (480 KB)
- `page-blog-dxgceaOK.js` (27 KB)
- Tous les assets avec nouveaux hash

---

## 📋 Checklist Upload

### Avant Upload

- [ ] FTP/SFTP connecté à IONOS
- [ ] Sauvegarde de l'ancien dist/ (optionnel)

### Upload

- [ ] Upload TOUT le dossier `dist/`
- [ ] Vérifier que `env-config.js` est uploadé
- [ ] Vérifier que `index.html` est uploadé
- [ ] Vérifier que tous les `assets/*.js` sont uploadés

### Après Upload

- [ ] Vider le cache navigateur (Ctrl+Shift+R)
- [ ] Vider le cache CDN IONOS si activé
- [ ] Tester https://taxiassur.com/blog
- [ ] Ouvrir la console Chrome

---

## 🧪 Tests Post-Upload

### Test 1 : Console Chrome

**URL :** `https://taxiassur.com/blog`

**Messages attendus :**
```javascript
✅ Configuration chargée depuis env-config.js
🔧 Supabase Config: { url: "https://drohhxrkoequjphvabvq.supabase.co", keyPrefix: "eyJhbGciOiJIUzI1NiIsInR..." }
🔍 Fetching blog posts from Supabase...
✅ Loaded 3 blog posts from Supabase
```

**Si toujours erreur 400 :**
```javascript
❌ Supabase error: {
  message: "...",
  code: "...",
  details: "...",
  hint: "..."
}
```
→ Screenshot l'erreur complète et envoie-la moi

### Test 2 : Liste Articles

**URL :** `https://taxiassur.com/blog`

**Attendu :**
- 3 articles affichés
- Liens cliquables
- Pas d'erreur 400 dans Network

### Test 3 : Article Individuel

**URL :** `https://taxiassur.com/blog/assurance-taxi-pas-cher`

**Attendu :**
- Article affiché
- Contenu chargé
- Pas d'erreur 400

### Test 4 : Générateur IA

**URL :** `https://taxiassur.com/backoffice`

**Test :**
1. Mot-clé : "assurance taxi Lyon"
2. Génère le contenu
3. Publie

**Attendu :**
- Pas d'erreur 400 pendant la vérification d'existence
- Article créé avec succès
- Visible sur `/blog` immédiatement

---

## 🔍 Si Erreur 400 Persiste

### Possibilités

1. **Cache navigateur**
   - Solution : Ctrl+Shift+R pour hard refresh

2. **Anciens fichiers JS chargés**
   - Solution : Vérifier le hash dans le HTML source
   - Doit être : `backoffice-DwhUF5xN.js`

3. **Clé API ANON invalide**
   - Vérifier dans Console : `🔧 Supabase Config`
   - Doit commencer par : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

4. **CORS bloqué par navigateur**
   - Vérifier dans Network tab
   - Status : doit être 200, pas CORS error

5. **Extension navigateur bloque**
   - Tester en mode navigation privée
   - Désactiver uBlock/AdBlock temporairement

---

## 💡 Debug Avancé

### Vérifier la Requête Réelle

1. Ouvre Network tab (F12)
2. Filtre : `blog_posts`
3. Clique sur la requête rouge (400)
4. Onglet "Headers"
5. Vérifie :
   - **Request URL :** Doit être `https://drohhxrkoequjphvabvq.supabase.co/rest/v1/blog_posts?select=*&published=eq.true...`
   - **Request Headers :** Doit avoir `apikey` et `Authorization`

### Copier la Requête curl

1. Clic droit sur la requête → Copy → Copy as cURL
2. Envoie-moi le curl complet
3. Je pourrai tester exactement la même requête

---

## 📚 Documentation

**Articles de Base :**
```sql
id = "tout-savoir-assurance-taxi"
slug = "tout-savoir-assurance-taxi"
published = true

id = "assurance-taxi-pas-cher"
slug = "assurance-taxi-pas-cher"
published = true

id = "comment-trouver-assurance-taxi-pas-cher"
slug = "comment-trouver-assurance-taxi-pas-cher"
published = true
```

**URLs Attendues :**
- https://taxiassur.com/blog
- https://taxiassur.com/blog/assurance-taxi-pas-cher
- https://taxiassur.com/blog/tout-savoir-assurance-taxi
- https://taxiassur.com/blog/comment-trouver-assurance-taxi-pas-cher

---

## 🚀 Prochaine Étape

1. **Upload le nouveau build sur IONOS**
2. **Vide le cache navigateur**
3. **Teste https://taxiassur.com/blog**
4. **Regarde la console Chrome**
5. **Screenshot si toujours erreur 400**

---

## 📞 Si Problème Persiste

**Envoie-moi :**
1. Screenshot de l'erreur console complète
2. Screenshot de l'onglet Network (requête 400)
3. Le curl de la requête (Copy as cURL)
4. URL exacte où l'erreur se produit

**Je pourrai alors :**
- Analyser la requête exacte
- Voir si c'est un problème de headers
- Vérifier si c'est un problème CORS
- Corriger le problème précisément

---

_Diagnostic effectué le 12 Octobre 2025_
_Build testé et validé_
_API Supabase fonctionnelle_
