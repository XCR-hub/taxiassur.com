# DIAGNOSTIC GSC - Problèmes d'Indexation - 11 Mars 2026

## Problèmes Critiques Identifiés

D'après Google Search Console, **434 pages sur 520 ne sont PAS indexées** :

### 1. Erreurs Serveur (5xx) - 24 pages
**CRITIQUE** - Pages retournant des erreurs serveur

#### Causes Possibles :
- Routes lazy-loaded qui échouent
- Composants manquants ou mal importés
- Erreurs dans les migrations de fichiers
- Problèmes de permissions sur les fichiers statiques

#### Solution :
```bash
# 1. Vérifier que tous les composants existent
npm run build

# 2. Tester les routes localement
npm run preview

# 3. Vérifier les logs Apache sur IONOS
```

### 2. Détectées, actuellement non indexées - 179 pages
**IMPORTANT** - Pages découvertes mais ignorées par Google

#### Causes Possibles :
- Contenu dupliqué ou de faible qualité
- Temps de chargement trop lent
- Canonical pointant vers une autre URL
- robots.txt bloquant l'accès
- Sitemap contenant des URLs inexistantes

#### Solution :
1. **Audit du sitemap** : Vérifier que toutes les URLs existent réellement
2. **Canonical correct** : Chaque page doit avoir son propre canonical
3. **Contenu unique** : Améliorer le contenu des pages ville

### 3. Explorées, actuellement non indexées - 131 pages
**IMPORTANT** - Pages visitées mais rejetées

#### Causes Possibles :
- Contenu trop similaire (pages villes)
- Faible qualité perçue
- Manque de liens internes
- Temps de chargement > 3s

#### Solution :
1. **Différencier le contenu** : Chaque ville doit avoir du contenu unique
2. **Optimiser la vitesse** : Code splitting, lazy loading
3. **Maillage interne** : Créer des liens entre pages

### 4. Pages en double sans canonical - 44 pages
**URGENT** - Variations d'URL non canonicalisées

#### Exemples de doublons :
- https://taxiassur.com/page vs https://www.taxiassur.com/page
- /page vs /page/
- /Page vs /page (sensibilité à la casse)

#### Solution :
```apache
# .htaccess : Forcer version canonique
RewriteCond %{HTTP_HOST} ^www\.taxiassur\.com [NC]
RewriteRule ^(.*)$ https://taxiassur.com/$1 [L,R=301]

# Supprimer trailing slashes
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} (.+)/$
RewriteRule ^ %1 [L,R=301]
```

### 5. Pages avec redirection - 41 pages
**ATTENTION** - Redirections inutiles nuisant au SEO

#### Causes :
- Anciennes URLs redirigées
- Redirections www → non-www
- Redirections http → https

#### Solution :
- Mettre à jour le sitemap avec les URLs finales
- Éviter les chaînes de redirections
- Utiliser des redirections 301 permanentes

### 6. Soft 404 - 3 pages
**MINEUR** - Pages retournant 200 mais vides

#### Solution :
Identifier et corriger ou supprimer ces pages

### 7. Erreur liée à des redirections - 1 page
**MINEUR** - Boucle de redirection ou redirect cassée

## Plan d'Action Immédiat

### Phase 1 : Correction des erreurs critiques (24h)

1. **Identifier les 24 erreurs 5xx**
```bash
# Tester toutes les routes
node scripts/diagnostic-gsc-indexation.js
```

2. **Corriger les composants manquants**
- Vérifier que tous les lazy imports existent
- Corriger les chemins de fichiers

3. **Déployer les corrections**
```bash
npm run build
npm run deploy
```

### Phase 2 : Optimisation du sitemap (48h)

1. **Nettoyer le sitemap**
```bash
# Générer un sitemap propre avec seulement les URLs valides
npm run seo:sitemap
```

2. **Vérifier toutes les URLs**
- Tester chaque URL du sitemap
- Supprimer les URLs inexistantes
- Ajouter les URLs manquantes

3. **Soumettre à GSC**
```bash
# Ping Google pour reindexation
npm run seo:indexnow
```

### Phase 3 : Amélioration du contenu (1 semaine)

1. **Pages villes** (30 pages)
- Ajouter contenu unique par ville
- Statistiques locales
- Témoignages locaux
- Photos spécifiques

2. **Articles blog** (24 pages)
- Optimiser les méta
- Ajouter des images
- Liens internes

3. **Pages principales**
- Enrichir le contenu
- Optimiser la vitesse

## Métriques de Succès

| Métrique | Avant | Objectif |
|----------|-------|----------|
| Pages indexées | 86 | 400+ |
| Erreurs 5xx | 24 | 0 |
| Pages explorées non indexées | 131 | <20 |
| Pages détectées non indexées | 179 | <30 |
| Doublons sans canonical | 44 | 0 |

## Suivi Hebdomadaire

- **Semaine 1** : Corriger 5xx, doublons, redirections
- **Semaine 2** : Optimiser contenu pages villes
- **Semaine 3** : Améliorer vitesse et maillage
- **Semaine 4** : Analyser GSC et ajuster

## Outils de Monitoring

```javascript
// Fonction pour vérifier l'état d'indexation
async function checkIndexationStatus() {
  const { data } = await supabase.rpc('get_indexation_report');
  console.log('Rapport:', data);
}
```

## Checklist Technique

- [ ] Tous les composants lazy existent
- [ ] .htaccess présent dans dist/
- [ ] Sitemap à jour et validé
- [ ] Canonical sur toutes les pages
- [ ] Robots.txt correct
- [ ] Pas de contenu dupliqué
- [ ] Vitesse < 3s sur mobile
- [ ] Maillage interne optimisé
- [ ] URLs propres (pas de trailing slash)
- [ ] HTTPS forcé partout
- [ ] Version canonique (sans www)

## Contact Support

En cas de blocage :
- Google Search Console : https://search.google.com/search-console
- Supabase Dashboard : https://app.supabase.com
- IONOS Support : Panel d'administration
