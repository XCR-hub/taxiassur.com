# 🎯 GUIDE COMPLET : RÉCUPÉRATION DES DONNÉES SUPABASE

## ✅ PROBLÈME RÉSOLU

### Erreur initiale :
```
ERROR: 42501: permission denied to set parameter "app.supabase_url"
```

### Solution :
Au lieu d'utiliser `ALTER DATABASE` (qui nécessite des permissions superuser), on utilise une **table de configuration** + **fonctions RPC** pour stocker et récupérer les données de manière sécurisée.

---

## 📦 CE QUI A ÉTÉ CRÉÉ

### 1. **Fichier SQL** : `FIX-PERMISSION-CRON-ET-RECUPERATION-DONNEES.sql`

Ce fichier contient :

#### A. Table de configuration pour pg_cron
```sql
CREATE TABLE public.cron_config (
  key text PRIMARY KEY,
  value text NOT NULL
);
```
Stocke votre URL Supabase et clé service_role de manière sécurisée.

#### B. 7 Fonctions RPC pour récupérer les données

1. **`get_blog_posts(limit, offset)`** - Articles de blog
2. **`get_news(limit, offset)`** - Actualités
3. **`get_faqs(category)`** - Questions fréquentes
4. **`get_leads(status, limit, offset)`** - Leads
5. **`get_dashboard_stats()`** - Statistiques complètes
6. **`search_content(query, type)`** - Recherche full-text
7. **`get_cron_config(key)`** - Configuration cron

#### C. Sécurité RLS
- Accès public pour contenu (blog, news, faq)
- Accès authentifié pour leads
- Accès service_role pour configuration

---

### 2. **Hook React** : `src/hooks/useSupabaseData.ts`

6 hooks personnalisés pour utiliser facilement les données :

```typescript
// Hook pour récupérer les articles de blog
const { data, loading, error } = useBlogPosts(20, 0);

// Hook pour récupérer les actualités
const { data, loading, error } = useNews(10, 0);

// Hook pour récupérer les FAQs
const { data, loading, error } = useFAQs('assurance-taxi');

// Hook pour récupérer les leads (authentifié)
const { data, loading, error } = useLeads('nouveau', 50, 0);

// Hook pour les statistiques
const { data, loading, error } = useDashboardStats();

// Hook pour rechercher
const { data, loading, error } = useContentSearch('assurance taxi paris');
```

---

### 3. **Composant Dashboard** : `src/components/DataDashboard.tsx`

Dashboard avec :
- ✅ Statistiques en temps réel
- ✅ Cartes colorées pour chaque métrique
- ✅ Leads par statut
- ✅ Articles récents
- ✅ Design moderne et responsive

---

### 4. **Page Administration** : `src/pages/AdminDashboard.tsx`

Interface complète avec :
- ✅ 5 onglets (Dashboard, Blog, News, FAQ, Leads)
- ✅ Barre de recherche en temps réel
- ✅ Tableaux détaillés pour chaque type de contenu
- ✅ Filtres par statut
- ✅ Design professionnel

---

## 🚀 INSTALLATION

### ÉTAPE 1 : Exécuter le SQL (2 minutes)

1. Ouvrez Supabase → **SQL Editor**
2. Cliquez sur **"New query"**
3. Copiez-collez tout le contenu de **`FIX-PERMISSION-CRON-ET-RECUPERATION-DONNEES.sql`**
4. Cliquez sur **"Run"**

**Résultat attendu :**
```
✓ Configuration cron | https://drohhxrkoequjphvabvq.supabase.co
✓ Blog posts         | 24
✓ FAQs               | 8
✓ Stats              | 24
```

### ÉTAPE 2 : Accéder au Dashboard

1. Lancez votre application : `npm run dev`
2. Connectez-vous au backoffice
3. Naviguez vers : **`/backoffice/data`**

Vous verrez :
- ✅ Tous vos articles de blog
- ✅ Toutes vos actualités
- ✅ Toutes vos FAQs
- ✅ Tous vos leads
- ✅ Statistiques en temps réel

---

## 💡 UTILISATION DANS VOS COMPOSANTS

### Exemple 1 : Afficher les articles de blog

```typescript
import { useBlogPosts } from '../hooks/useSupabaseData';

function BlogList() {
  const { data: posts, loading, error } = useBlogPosts(10, 0);

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur : {error}</div>;

  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
          <span>{post.views} vues</span>
        </article>
      ))}
    </div>
  );
}
```

### Exemple 2 : Afficher les statistiques

```typescript
import { useDashboardStats } from '../hooks/useSupabaseData';

function Stats() {
  const { data: stats, loading } = useDashboardStats();

  if (loading || !stats) return <div>Chargement...</div>;

  return (
    <div>
      <div>Total articles : {stats.total_blog_posts}</div>
      <div>Total leads : {stats.total_leads}</div>
      <div>Nouveaux leads (7j) : {stats.new_leads_week}</div>
    </div>
  );
}
```

### Exemple 3 : Rechercher dans le contenu

```typescript
import { useContentSearch } from '../hooks/useSupabaseData';
import { useState } from 'react';

function Search() {
  const [query, setQuery] = useState('');
  const { data: results, loading } = useContentSearch(query, 'all');

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher..."
      />
      {results.map(result => (
        <div key={result.id}>
          <span className="badge">{result.type}</span>
          <h3>{result.title}</h3>
          <p>{result.excerpt}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔥 FONCTIONNALITÉS AVANCÉES

### 1. Recherche Full-Text en Français
```typescript
// Recherche dans tout le contenu
const { data } = useContentSearch('assurance taxi paris', 'all');

// Recherche uniquement dans le blog
const { data } = useContentSearch('assurance taxi paris', 'blog');

// Recherche uniquement dans les news
const { data } = useContentSearch('assurance taxi paris', 'news');
```

### 2. Filtrage des Leads
```typescript
// Tous les leads
const { data } = useLeads();

// Uniquement les nouveaux leads
const { data } = useLeads('nouveau');

// Uniquement les leads convertis
const { data } = useLeads('converti');
```

### 3. FAQs par Catégorie
```typescript
// Toutes les FAQs
const { data } = useFAQs();

// FAQs d'une catégorie spécifique
const { data } = useFAQs('assurance-taxi');
```

---

## 📊 STRUCTURE DES DONNÉES

### Blog Post
```typescript
{
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  published: boolean
  published_at: string
  author: string
  category: string
  tags: string[]
  meta_title: string
  meta_description: string
  featured_image: string
  read_time: number
  views: number
  created_at: string
}
```

### Lead
```typescript
{
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  city: string
  vehicle_type: string
  contract_type: string
  status: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  created_at: string
  updated_at: string
}
```

### Dashboard Stats
```typescript
{
  total_blog_posts: number
  total_news: number
  total_faqs: number
  total_leads: number
  new_leads_today: number
  new_leads_week: number
  leads_by_status: {
    nouveau: number
    contacte: number
    converti: number
    perdu: number
  }
  recent_blog_posts: Array<{
    id: string
    title: string
    slug: string
    published_at: string
    views: number
  }>
}
```

---

## 🔒 SÉCURITÉ

### Niveaux d'accès :

1. **Anonyme** (public)
   - ✅ Lecture articles de blog
   - ✅ Lecture actualités
   - ✅ Lecture FAQs
   - ✅ Recherche de contenu
   - ❌ Accès aux leads

2. **Authentifié** (utilisateurs connectés)
   - ✅ Tout ce que "Anonyme" peut faire
   - ✅ Lecture des leads
   - ✅ Statistiques détaillées
   - ❌ Modification de la config cron

3. **Service Role** (automatisations)
   - ✅ Tout
   - ✅ Configuration cron
   - ✅ Appels des Edge Functions

### RLS (Row Level Security) :
Toutes les tables ont RLS activé avec des politiques restrictives.

---

## 🎉 AVANTAGES DE CETTE SOLUTION

### ✅ Pas de permissions superuser nécessaires
- Fonctionne avec les permissions normales Supabase
- Pas besoin de modifier les paramètres PostgreSQL

### ✅ Sécurisé par défaut
- RLS activé sur toutes les tables
- Politiques restrictives
- SECURITY DEFINER sur les fonctions

### ✅ Performant
- Index automatiques sur les colonnes fréquentes
- Recherche full-text optimisée
- Pagination intégrée

### ✅ Facile à utiliser
- Hooks React prêts à l'emploi
- Types TypeScript inclus
- Gestion automatique du loading/error

### ✅ Extensible
- Facile d'ajouter de nouvelles fonctions
- Architecture modulaire
- Compatible avec toutes les edge functions existantes

---

## 🆘 DÉPANNAGE

### Problème : "Function does not exist"
**Solution** : Exécutez le fichier SQL complet dans SQL Editor

### Problème : "Permission denied for table"
**Solution** : Vérifiez que RLS est activé et que les politiques sont créées

### Problème : "No data returned"
**Solution** : Vérifiez que vous avez des données dans les tables (blog_posts, news, faq, leads)

### Problème : "Unauthorized"
**Solution** : Pour les leads, vous devez être authentifié. Connectez-vous au backoffice d'abord.

---

## 📈 PROCHAINES ÉTAPES

1. ✅ **Explorez le dashboard** à `/backoffice/data`
2. ✅ **Testez la recherche** avec différentes requêtes
3. ✅ **Filtrez les leads** par statut
4. ✅ **Intégrez les hooks** dans vos composants existants
5. ✅ **Personnalisez l'interface** selon vos besoins

---

## 🎯 RÉSUMÉ

✅ **Erreur de permission résolue** avec une solution alternative
✅ **7 fonctions RPC créées** pour récupérer toutes les données
✅ **6 hooks React** prêts à l'emploi
✅ **Dashboard complet** avec interface moderne
✅ **Sécurité RLS** implémentée correctement
✅ **Recherche full-text** en français
✅ **Build production** testé et validé

**Tout est prêt pour utiliser vos données Supabase dans l'application ! 🚀**
