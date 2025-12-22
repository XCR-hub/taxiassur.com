# 🗺️ Guide Complet - Pages Ville TaxiAssur

## 📋 Vue d'ensemble

Le système de pages ville permet de générer automatiquement des pages SEO optimisées pour chaque ville française, avec fallback intelligent vers des pages statiques.

---

## 🏗️ Architecture

### 1. **Mode hybride intelligent**

```
┌─────────────────────────────────────┐
│  Page Ville Demandée                │
│  (ex: /ville/paris)                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  1. Essayer Supabase                │
│     ↓                                │
│  2. Si échec → Fallback statique    │
│     ↓                                │
│  3. Si ville inconnue → 404         │
└─────────────────────────────────────┘
```

### 2. **Composants clés**

- **`CityPage.tsx`** : Page individuelle d'une ville
- **`CityIndex.tsx`** : Index de toutes les villes
- **`lib/content.ts`** : Logique de chargement (Supabase + fallback)
- **`lib/ping.ts`** : Données statiques de secours

---

## 🚀 Installation et Configuration

### Étape 1 : Peupler la base Supabase

```bash
npm run populate-cities
```

Ce script insère 34 villes françaises dans la table `city_pages` avec :
- Nom, slug, département, région
- Titre et meta description SEO
- Contenu HTML optimisé
- Nombre de taxis (estimé)
- Keywords pour le référencement

### Étape 2 : Vérifier l'activation

Dans `src/lib/content.ts`, vérifiez que :

```typescript
const USE_STATIC_CITIES = false;  // ✅ Supabase activé
```

### Étape 3 : Build et déploiement

```bash
npm run build
```

---

## 📊 Structure de la table `city_pages`

```sql
CREATE TABLE city_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,              -- Ex: "Paris"
  slug TEXT UNIQUE NOT NULL,       -- Ex: "paris"
  dept TEXT,                       -- Ex: "75"
  region TEXT,                     -- Ex: "Île-de-France"
  title TEXT,                      -- SEO Title
  meta_description TEXT,           -- SEO Description
  keywords TEXT[],                 -- Array de mots-clés
  taxi_count INTEGER DEFAULT 0,   -- Nombre de taxis (pour stats)
  content TEXT,                    -- Contenu HTML de la page
  status TEXT DEFAULT 'draft',     -- 'draft' | 'published'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎯 Fonctionnalités

### 1. **Pages ville dynamiques**

Chaque ville dispose de :
- URL unique : `/ville/{slug}`
- Titre SEO personnalisé
- Contenu adapté à la région
- Stats locales (nombre de taxis, clients, etc.)
- Formulaire de devis intégré

### 2. **Index des villes**

Page `/villes` listant :
- Toutes les villes par région
- Recherche rapide (8 premières villes)
- Stats globales (nombre de villes, clients, économies)

### 3. **Fallback intelligent**

Si Supabase ne répond pas :
- Utilisation automatique des 34 villes statiques
- Aucune interruption du service
- Logs clairs pour diagnostic

---

## 📝 Villes incluses (34)

**Île-de-France** : Paris, Boulogne-Billancourt

**Auvergne-Rhône-Alpes** : Lyon, Saint-Étienne, Grenoble, Clermont-Ferrand, Annecy, Villeurbanne

**Provence-Alpes-Côte d'Azur** : Marseille, Nice, Toulon, Aix-en-Provence

**Occitanie** : Toulouse, Montpellier, Nîmes, Perpignan

**Nouvelle-Aquitaine** : Bordeaux, Limoges

**Hauts-de-France** : Lille, Amiens

**Grand Est** : Strasbourg, Reims, Metz, Mulhouse

**Pays de la Loire** : Nantes, Angers, Le Mans

**Bretagne** : Rennes, Brest

**Normandie** : Le Havre

**Bourgogne-Franche-Comté** : Dijon, Besançon

**Centre-Val de Loire** : Tours, Orléans

---

## 🔧 Maintenance

### Ajouter une nouvelle ville

**Option 1 : Via Supabase directement**

```sql
INSERT INTO city_pages (city, slug, dept, region, title, meta_description, taxi_count, content, status)
VALUES (
  'Roubaix',
  'roubaix',
  '59',
  'Hauts-de-France',
  'Assurance Taxi Roubaix (59) - Devis Gratuit',
  'Trouvez votre assurance taxi à Roubaix. Devis gratuit en 2 min...',
  350,
  '<h1>Assurance Taxi à Roubaix</h1><p>...</p>',
  'published'
);
```

**Option 2 : Modifier le script `populate-city-pages.js`**

Ajoutez la ville dans le tableau `cities` et relancez :

```bash
npm run populate-cities
```

### Modifier une ville existante

```sql
UPDATE city_pages
SET
  title = 'Nouveau titre',
  meta_description = 'Nouvelle description',
  content = '<h1>Nouveau contenu</h1>',
  updated_at = NOW()
WHERE slug = 'paris';
```

### Désactiver Supabase (mode statique uniquement)

Dans `src/lib/content.ts` :

```typescript
const USE_STATIC_CITIES = true;  // ⚠️ Mode statique forcé
```

---

## 🐛 Dépannage

### Problème : Pages ville affichent 404

**Diagnostic** :
1. Vérifier que Supabase répond : `npm run populate-cities`
2. Vérifier `USE_STATIC_CITIES = false` dans `content.ts`
3. Vérifier les logs navigateur (F12)

**Solution** :
```bash
# Rebuilder le projet
npm run build

# Vider le cache navigateur
Ctrl + Shift + R
```

### Problème : Écran noir sur les pages ville

**Diagnostic** :
- Erreur JavaScript dans la console
- Problème de chargement des composants

**Solution** :
1. Activer le mode statique temporairement :
   ```typescript
   const USE_STATIC_CITIES = true;
   ```
2. Rebuilder : `npm run build`
3. Investiguer l'erreur Supabase

### Problème : Données ville incorrectes

**Solution** :
```bash
# Repeupler la base
npm run populate-cities

# Forcer le refresh des données
# Dans Supabase Dashboard : Truncate city_pages puis repopulate
```

---

## ✅ Checklist de déploiement

- [ ] Table `city_pages` créée dans Supabase
- [ ] Script `populate-cities` exécuté avec succès
- [ ] `USE_STATIC_CITIES = false` dans `content.ts`
- [ ] Build réussi : `npm run build`
- [ ] Test local : `npm run preview`
- [ ] Test page index : `http://localhost:4173/villes`
- [ ] Test page ville : `http://localhost:4173/ville/paris`
- [ ] Upload sur serveur IONOS
- [ ] Test production : `https://taxiassur.com/villes`
- [ ] Test ville production : `https://taxiassur.com/ville/paris`

---

## 📈 SEO et Performance

### URLs générées

```
https://taxiassur.com/villes
https://taxiassur.com/ville/paris
https://taxiassur.com/ville/lyon
https://taxiassur.com/ville/marseille
...
```

### Balises meta optimisées

Chaque page ville génère automatiquement :
- `<title>` unique et descriptif
- `<meta name="description">` personnalisée
- `<meta name="keywords">` ciblés
- Schema.org breadcrumb
- OpenGraph tags

### Performance

- Lazy loading des pages ville
- Fallback rapide (< 100ms) vers statique
- Images optimisées via Pexels
- Cache browser 7 jours

---

## 🎨 Personnalisation

### Modifier le template de contenu

Éditez `scripts/populate-city-pages.js` section `content` :

```javascript
content: `
  <h1>Votre titre personnalisé pour ${city.name}</h1>
  <p>Votre contenu personnalisé...</p>
`
```

### Ajouter des stats personnalisées

Dans `CityPage.tsx`, modifiez :

```typescript
const cityStats = {
  taxis: cityPageData.taxi_count || 0,
  savings: '35%',
  clients: Math.floor(cityPageData.taxi_count * 0.8),
  satisfaction: '4.8/5'
};
```

---

## 📞 Support

Pour toute question :
- Email : team@taxiassur.com
- Tél : 01 80 85 57 86

---

**Version** : 1.0
**Dernière mise à jour** : Octobre 2025
**Statut** : ✅ Production Ready
