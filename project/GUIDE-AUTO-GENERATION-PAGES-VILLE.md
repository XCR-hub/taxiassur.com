# 🤖 Guide Complet - Auto-Génération Pages Ville par IA

## 🎯 Vue d'ensemble

Système complet permettant de **générer automatiquement des pages ville SEO** via l'interface backoffice avec intelligence artificielle OpenAI. Chaque page est unique, optimisée SEO, et publiée instantanément.

---

## 🏗️ Architecture Complète

```
┌─────────────────────────────────────────┐
│  Backoffice /generate-cities            │
│  Interface utilisateur                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Edge Function                           │
│  generate-city-pages-ai                  │
│  ├─ OpenAI GPT-4 (génération contenu)   │
│  ├─ Template fallback (si OpenAI fail)  │
│  └─ Insertion Supabase                   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Base Supabase : city_pages              │
│  ├─ city (nom)                           │
│  ├─ slug (URL)                           │
│  ├─ dept (département)                   │
│  ├─ region (région)                      │
│  ├─ taxi_count (stats)                   │
│  ├─ content (HTML généré par IA)         │
│  └─ status = 'published'                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Site Public                             │
│  https://taxiassur.com/ville/{slug}      │
│  Page accessible immédiatement           │
└─────────────────────────────────────────┘
```

---

## 📦 Composants créés

### 1. Migration Supabase
**Fichier** : `supabase/migrations/20251020000000_add_city_pages_missing_columns.sql`

**Colonnes ajoutées** :
- `dept` (text) : Département (ex: "75", "13")
- `region` (text) : Région (ex: "Île-de-France")
- `taxi_count` (integer) : Nombre estimé de taxis

**Index créés** :
- `city_pages_dept_idx` : Recherche par département
- `city_pages_region_idx` : Filtre par région
- `city_pages_taxi_count_idx` : Tri par popularité

### 2. Edge Function
**Fichier** : `supabase/functions/generate-city-pages-ai/index.ts`

**Fonctionnalités** :
- ✅ Génération contenu via OpenAI GPT-4
- ✅ Fallback template si OpenAI indisponible
- ✅ Validation anti-doublons (vérifie si slug existe)
- ✅ Publication automatique (`status = 'published'`)
- ✅ Génération slug automatique (URL-friendly)
- ✅ Keywords SEO automatiques

**Endpoint** :
```
POST {SUPABASE_URL}/functions/v1/generate-city-pages-ai

Body:
{
  "city_name": "Toulouse",
  "dept": "31",
  "region": "Occitanie",
  "taxi_count": 2800
}
```

### 3. Interface Backoffice
**Fichier** : `src/backoffice/CityPageGenerator.tsx`

**URL** : `https://taxiassur.com/backoffice/generate-cities`

**Fonctionnalités** :
- Formulaire convivial avec validation
- Sélecteur région (dropdown)
- Feedback visuel temps réel
- Lien direct vers page générée
- Conseils de génération intégrés

---

## 🚀 Installation & Configuration

### Étape 1 : Appliquer la migration Supabase

```bash
# Via Supabase CLI (si disponible)
supabase db push

# OU via Supabase Dashboard :
# 1. Ouvrir https://supabase.com/dashboard/project/YOUR_PROJECT/sql
# 2. Copier le contenu de supabase/migrations/20251020000000_add_city_pages_missing_columns.sql
# 3. Exécuter
```

### Étape 2 : Déployer l'Edge Function

```bash
# Via le MCP Tool (recommandé)
# L'Edge Function sera déployée automatiquement

# OU manuellement via Supabase CLI
supabase functions deploy generate-city-pages-ai
```

### Étape 3 : Configuration OpenAI

Dans Supabase Dashboard → Project Settings → Edge Functions → Secrets :

```
OPENAI_API_KEY=sk-...votre_clé_openai...
```

**Note** : Si OpenAI n'est pas configuré, le système utilise automatiquement un template générique.

### Étape 4 : Peupler les 34 villes par défaut

```bash
npm run populate-cities
```

Cela insère 34 villes françaises principales dans `city_pages`.

---

## 📝 Utilisation

### 1. Via l'interface Backoffice

1. Se connecter au backoffice : `https://taxiassur.com/backoffice`
2. Cliquer sur **"Pages Ville IA"** dans la section "Contenu & Génération IA"
3. Remplir le formulaire :
   - **Nom de ville** : Ex "Roubaix"
   - **Département** : Ex "59"
   - **Région** : Sélectionner "Hauts-de-France"
   - **Nombre de taxis** : Ex 350 (optionnel)
4. Cliquer **"Générer la page ville"**
5. Attendre 5-10 secondes (génération IA)
6. Succès → Lien direct vers `/ville/roubaix`

### 2. Via API directe (pour automatisation)

```javascript
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseKey = 'your-anon-key';

const response = await fetch(
  `${supabaseUrl}/functions/v1/generate-city-pages-ai`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      city_name: 'Roubaix',
      dept: '59',
      region: 'Hauts-de-France',
      taxi_count: 350,
    }),
  }
);

const data = await response.json();
console.log(data);
// {
//   success: true,
//   message: "Page créée pour Roubaix",
//   city_id: "uuid...",
//   slug: "roubaix",
//   url: "/ville/roubaix"
// }
```

### 3. Génération en masse (script)

Créer un fichier `scripts/generate-cities-bulk.js` :

```javascript
const cities = [
  { name: 'Roubaix', dept: '59', region: 'Hauts-de-France', count: 350 },
  { name: 'Tourcoing', dept: '59', region: 'Hauts-de-France', count: 280 },
  { name: 'Dunkerque', dept: '59', region: 'Hauts-de-France', count: 220 },
  // ... plus de villes
];

for (const city of cities) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-city-pages-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({
      city_name: city.name,
      dept: city.dept,
      region: city.region,
      taxi_count: city.count,
    }),
  });

  await new Promise(r => setTimeout(r, 2000)); // Pause 2s entre chaque
}
```

---

## 🎨 Template de Contenu Généré

### Avec OpenAI (GPT-4)

L'IA génère un contenu **unique et naturel** de 600+ mots incluant :

- Titre H1 optimisé SEO
- Introduction accrocheuse (200 mots)
- Avantages locaux spécifiques
- Liste des garanties
- Statistiques marché local
- CTA personnalisé

### Sans OpenAI (Template Fallback)

Structure HTML standard incluant :

```html
<h1>Assurance Taxi à {Ville} ({Dept})</h1>
<p>Introduction professionnelle...</p>

<h2>Pourquoi choisir TaxiAssur à {Ville} ?</h2>
<ul>
  <li>Expertise locale</li>
  <li>Tarifs négociés</li>
  <li>Service rapide</li>
  <li>Accompagnement personnalisé</li>
</ul>

<h2>Nos garanties pour les taxis de {Ville}</h2>
<ul>
  <li>RC Pro obligatoire</li>
  <li>Dommages tous accidents</li>
  <li>Vol et incendie</li>
  <li>...</li>
</ul>

<h2>Les taxis de {Ville} nous font confiance</h2>
<p>Stats et chiffres locaux...</p>

<h2>Demandez votre devis gratuit</h2>
<p>CTA final...</p>
```

---

## 🔍 SEO Automatique

### Métadonnées générées

Pour chaque page ville :

**Title** :
```
Assurance Taxi {Ville} ({Dept}) - Devis Gratuit & Rapide
```

**Meta Description** :
```
Trouvez la meilleure assurance taxi à {Ville} ({Dept}).
Devis gratuit en 2 min, tarifs négociés, service professionnel.
Expert taxi {Région}.
```

**Keywords** (array) :
```javascript
[
  "assurance taxi {ville}",
  "assurance taxi {dept}",
  "devis assurance taxi {ville}",
  "tarif assurance taxi {ville}",
  "courtier assurance taxi {ville}"
]
```

### URL générée

```
https://taxiassur.com/ville/{slug}
```

Le slug est généré automatiquement :
- Minuscules
- Sans accents
- Tirets pour espaces
- URL-friendly

**Exemples** :
- "Saint-Étienne" → `/ville/saint-etienne`
- "Aix-en-Provence" → `/ville/aix-en-provence`
- "Boulogne-Billancourt" → `/ville/boulogne-billancourt`

---

## 🛡️ Sécurité & Validation

### Protection anti-doublons

```typescript
// Vérifie si slug existe déjà
const {data: existing} = await supabase
  .from('city_pages')
  .select('id')
  .eq('slug', slug)
  .maybeSingle();

if (existing) {
  return {
    success: false,
    message: `La ville ${city_name} existe déjà`,
    city_id: existing.id
  };
}
```

### Validation des champs

- `city_name` : Requis, non vide
- `dept` : Requis, 2-3 caractères
- `region` : Requis, sélectionné dans liste
- `taxi_count` : Optionnel, entier positif

### RLS (Row Level Security)

```sql
-- Lecture publique des pages publiées
CREATE POLICY "Allow public read published cities"
  ON city_pages FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Écriture réservée (via service role)
-- L'Edge Function utilise SERVICE_ROLE_KEY
```

---

## 📊 Statistiques & Monitoring

### Compter les pages ville

```sql
SELECT COUNT(*) FROM city_pages WHERE status = 'published';
```

### Pages par région

```sql
SELECT
  region,
  COUNT(*) as nb_villes,
  SUM(taxi_count) as total_taxis
FROM city_pages
WHERE status = 'published'
GROUP BY region
ORDER BY nb_villes DESC;
```

### Top 10 villes par taxis

```sql
SELECT city, dept, taxi_count
FROM city_pages
WHERE status = 'published'
ORDER BY taxi_count DESC
LIMIT 10;
```

---

## 🐛 Dépannage

### Problème : Edge Function timeout

**Cause** : OpenAI prend trop de temps (> 30s)

**Solution** :
1. Vérifier clé OpenAI valide
2. Réduire `max_tokens` dans l'Edge Function
3. Utiliser template fallback temporairement

### Problème : Erreur 409 "Ville existe déjà"

**Cause** : Slug déjà dans la base

**Solution** :
1. Vérifier dans Supabase Dashboard si ville existe
2. Si besoin, modifier ou supprimer l'ancienne entrée
3. Régénérer

### Problème : Contenu générique au lieu d'IA

**Cause** : OpenAI non configuré ou erreur API

**Solution** :
```bash
# Vérifier dans Supabase Dashboard → Edge Functions → Secrets
OPENAI_API_KEY=sk-...

# Tester manuellement
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer sk-..." \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4-turbo-preview", "messages": [{"role": "user", "content": "Test"}]}'
```

### Problème : Page ville affiche 404

**Cause** : Status = 'draft' ou RLS bloque

**Solution** :
```sql
-- Vérifier le status
SELECT id, city, slug, status FROM city_pages WHERE slug = 'votre-slug';

-- Publier manuellement si besoin
UPDATE city_pages SET status = 'published' WHERE slug = 'votre-slug';
```

---

## 📈 Performance & Scalabilité

### Limites actuelles

- **Génération IA** : ~5-10s par page
- **OpenAI quotas** : Selon votre plan (GPT-4)
- **Supabase RLS** : Aucune limite pratique

### Optimisations recommandées

1. **Génération en masse** :
   ```bash
   # Espacer les appels de 2s minimum
   await new Promise(r => setTimeout(r, 2000));
   ```

2. **Cache CDN** :
   ```
   # Cloudflare ou similaire
   Cache-Control: public, max-age=86400
   ```

3. **Pre-rendering** :
   ```bash
   # Générer toutes les villes françaises (500+)
   # En avance, pas en production
   ```

---

## 🎯 Cas d'usage

### 1. Expansion géographique rapide

Générer 50 nouvelles villes en 10 minutes :

```bash
# Script batch
npm run generate-cities-batch -- --region "Grand Est" --limit 50
```

### 2. Test A/B contenu

Générer 2 versions pour même ville :

```javascript
// Version A : Template standard
{ use_ai: false }

// Version B : IA creative
{ use_ai: true, temperature: 0.9 }
```

### 3. SEO longue traîne

Cibler des villes de < 50k habitants :

```sql
-- 200 villes moyennes
SELECT name FROM french_cities
WHERE population BETWEEN 10000 AND 50000
ORDER BY population DESC
LIMIT 200;
```

---

## ✅ Checklist de déploiement

### Supabase

- [ ] Migration `20251020000000_add_city_pages_missing_columns.sql` appliquée
- [ ] Colonnes `dept`, `region`, `taxi_count` présentes
- [ ] Edge Function `generate-city-pages-ai` déployée
- [ ] Secret `OPENAI_API_KEY` configuré (optionnel)

### Frontend

- [ ] Build réussi : `npm run build`
- [ ] Route `/backoffice/generate-cities` accessible
- [ ] Composant `CityPageGenerator` chargé
- [ ] Lien dans NavigationMenu visible

### Test

- [ ] Génération test via backoffice réussie
- [ ] Page `/ville/test-city` accessible
- [ ] Contenu HTML correct et SEO optimisé
- [ ] Pas d'erreur console

---

## 📞 Support

Pour toute question :
- Email : team@taxiassur.com
- Tél : 01 80 85 57 86

---

**Version** : 1.0
**Dernière mise à jour** : 20 Octobre 2025
**Statut** : ✅ Production Ready
**Technologies** : React, TypeScript, Supabase Edge Functions, OpenAI GPT-4
