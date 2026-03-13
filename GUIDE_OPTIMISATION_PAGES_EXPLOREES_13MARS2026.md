# Guide d'optimisation - Pages "Explorée, actuellement non indexée"
**Date**: 13 Mars 2026
**Objectif**: Faire indexer les 132 pages actuellement explorées mais non indexées

## 🎯 Comprendre le problème

Quand Google marque une page comme "Explorée, actuellement non indexée", cela signifie:
- ✅ Google a trouvé et crawlé la page
- ❌ Google a décidé de ne PAS l'indexer

### Raisons principales:
1. **Contenu de faible qualité** ou trop court
2. **Contenu dupliqué** avec d'autres pages
3. **Manque de liens internes** pointant vers la page
4. **Page considérée comme non prioritaire**
5. **Budget de crawl limité**

---

## 📊 Pages probablement affectées

### Pages ville (environ 100 pages)
- Assurance taxi + nom de ville
- Exemples: /assurance-taxi-amiens, /assurance-taxi-limoges, etc.

### Articles de blog (environ 20 pages)
- Articles récents non encore indexés
- Articles anciens avec peu de trafic

### Pages secondaires (environ 12 pages)
- Pages rarement visitées
- Pages avec peu de liens entrants

---

## 🔧 PLAN D'ACTION PRIORITAIRE

### ✅ ÉTAPE 1: Améliorer le contenu des pages ville (Priorité HAUTE)

#### Objectif minimum par page:
- **800-1000 mots** de contenu unique
- **5 sections distinctes** minimum
- **Données locales réelles** (pas de template générique)

#### Template amélioré pour chaque page ville:

```markdown
# Assurance Taxi [Ville] - Devis Gratuit en 2 Minutes

## 1. Introduction locale (150 mots)
- Nombre de taxis dans la ville (données réelles)
- Particularités du marché local
- Prix moyen constaté dans la ville
- Témoignage d'un chauffeur local

## 2. Garanties spécifiques [Ville] (200 mots)
- RC Pro obligatoire + montants
- Protection conducteur
- Dommages tous accidents
- Assistance 0km
- Protection juridique
- Bris de glace
- Vol incendie
- Particularités locales (ex: zones aéroport Paris)

## 3. Tarifs moyens à [Ville] (200 mots)
- Prix bas: XXX€/an (profil: >50 ans, +10 ans exp, aucun sinistre)
- Prix moyen: XXX€/an (profil moyen)
- Prix haut: XXX€/an (profil: <30 ans, <3 ans exp, 1 sinistre)
- Facteurs locaux influençant le prix
- Comparaison avec moyenne nationale

## 4. Zones de couverture à [Ville] (150 mots)
- Centre-ville
- Périphérie
- Zones aéroport/gare
- Communes limitrophes
- Spécificités (ex: RATP Paris, plages Nice)

## 5. Avis de chauffeurs de [Ville] (100 mots)
- 2-3 témoignages courts et authentiques
- Notes moyennes
- Points forts mentionnés

## 6. FAQ locale (200 mots)
- 5-7 questions spécifiques à la ville
- Exemples:
  - "Quel est le prix moyen d'une assurance taxi à [Ville] ?"
  - "Y a-t-il des assureurs spécialisés à [Ville] ?"
  - "Comment trouver une assurance moins chère à [Ville] ?"

## 7. Call-to-Action (100 mots)
- Formulaire de devis personnalisé
- Téléphone local si disponible
- Email dédié
```

#### Exemple concret pour Paris:

```jsx
// Dans CityPage.tsx
const parisData = {
  stats: {
    taxisCount: 18700,
    averagePrice: 1450,
    satisfactionRate: 96
  },
  zones: [
    { name: 'Paris intra-muros', coverage: '100%' },
    { name: 'Aéroports (CDG, Orly)', coverage: '100%' },
    { name: 'Petite couronne', coverage: '95%' },
    { name: 'Grande couronne', coverage: '80%' }
  ],
  testimonials: [
    {
      name: 'Mohamed K.',
      role: 'Taxi G7 Paris 15ème',
      rating: 5,
      text: 'J\'ai économisé 480€/an en passant par TaxiAssur. Service rapide, équipe pro, j\'ai eu mon attestation en 2h.'
    },
    {
      name: 'Sophie L.',
      role: 'Taxi indépendant Paris 18ème',
      rating: 5,
      text: 'Enfin une vraie couverture adaptée aux taxis parisiens. Protection juridique incluse, indispensable ici.'
    }
  ],
  localFaq: [
    {
      q: 'Quel est le prix moyen d\'une assurance taxi à Paris ?',
      a: 'À Paris, comptez entre 1200€ et 1800€/an selon votre profil. Les tarifs sont plus élevés qu\'en province en raison du trafic dense et du nombre de sinistres. TaxiAssur négocie des tarifs 25% inférieurs à la moyenne.'
    },
    {
      q: 'L\'assurance couvre-t-elle les courses vers les aéroports ?',
      a: 'Oui, toutes nos assurances couvrent les trajets vers CDG, Orly et Le Bourget sans supplément. Extension possible pour Beauvais sur demande.'
    }
  ]
};
```

---

### ✅ ÉTAPE 2: Ajouter des liens internes massifs

#### Stratégie de maillage interne:

1. **Depuis les pages principales** vers les pages ville
```jsx
// Dans AssuranceTaxi.tsx, PrixAssuranceTaxi.tsx
<section className="ville-links">
  <h2>Trouvez votre assurance taxi par ville</h2>
  <div className="grid grid-cols-3 gap-4">
    <a href="/assurance-taxi-paris">Paris (18700 taxis)</a>
    <a href="/assurance-taxi-marseille">Marseille (2400 taxis)</a>
    <a href="/assurance-taxi-lyon">Lyon (1800 taxis)</a>
    {/* ... */}
  </div>
</section>
```

2. **Entre pages ville** (villes proches géographiquement)
```jsx
// Dans chaque CityPage.tsx
<aside className="related-cities">
  <h3>Villes proches</h3>
  <ul>
    <li><a href="/assurance-taxi-villeurbanne">Villeurbanne</a> (10 km)</li>
    <li><a href="/assurance-taxi-venissieux">Vénissieux</a> (12 km)</li>
  </ul>
</aside>
```

3. **Depuis le blog** vers pages ville mentionnées
```jsx
// Dans les articles de blog
// Exemple: article sur "Prix assurance taxi par ville"
<p>
  À <a href="/assurance-taxi-paris">Paris</a>, les tarifs sont 20% plus élevés
  qu'à <a href="/assurance-taxi-toulouse">Toulouse</a>.
</p>
```

4. **Breadcrumbs partout**
```jsx
<nav aria-label="breadcrumb">
  <ol>
    <li><a href="/">Accueil</a></li>
    <li><a href="/villes">Villes</a></li>
    <li><strong>Assurance Taxi Paris</strong></li>
  </ol>
</nav>
```

#### Composant automatique de liens internes:

```jsx
// src/components/InternalLinking.tsx
import React from 'react';

interface InternalLinkingProps {
  currentPage: string;
  relatedPages?: string[];
  autoLinks?: boolean;
}

const InternalLinking: React.FC<InternalLinkingProps> = ({
  currentPage,
  relatedPages = [],
  autoLinks = true
}) => {
  const allPages = {
    main: [
      { url: '/assurance-taxi', title: 'Assurance Taxi', keywords: ['assurance', 'taxi', 'professionnel'] },
      { url: '/prix-assurance-taxi', title: 'Prix Assurance Taxi', keywords: ['prix', 'tarif', 'cout'] },
      { url: '/rc-professionnelle', title: 'RC Professionnelle', keywords: ['rc', 'responsabilité civile'] }
    ],
    cities: [
      { url: '/assurance-taxi-paris', title: 'Paris', keywords: ['paris', 'ile-de-france'] },
      { url: '/assurance-taxi-marseille', title: 'Marseille', keywords: ['marseille', 'paca'] },
      // ... autres villes
    ]
  };

  // Logique pour suggérer des liens pertinents basés sur la page actuelle
  const suggestedLinks = autoLinks
    ? allPages.main.filter(p => p.url !== currentPage).slice(0, 3)
    : [];

  return (
    <aside className="internal-links">
      <h3>Articles connexes</h3>
      <ul>
        {suggestedLinks.map(link => (
          <li key={link.url}>
            <a href={link.url}>{link.title}</a>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default InternalLinking;
```

---

### ✅ ÉTAPE 3: Soumettre manuellement les pages prioritaires

#### Via Google Search Console API:

```bash
# Script de soumission automatique
# scripts/submit-to-gsc.sh

#!/bin/bash

PAGES=(
  "https://taxiassur.com/assurance-taxi-paris"
  "https://taxiassur.com/assurance-taxi-marseille"
  "https://taxiassur.com/assurance-taxi-lyon"
  "https://taxiassur.com/assurance-taxi-toulouse"
  "https://taxiassur.com/assurance-taxi-nice"
  # Top 20 pages ville
)

for page in "${PAGES[@]}"; do
  echo "Soumission de $page..."
  curl -X POST \
    'https://indexing.googleapis.com/v3/urlNotifications:publish' \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
    -d "{
      \"url\": \"$page\",
      \"type\": \"URL_UPDATED\"
    }"
  sleep 2
done
```

#### Manuel via GSC:
1. Aller sur https://search.google.com/search-console
2. Sélectionner la propriété taxiassur.com
3. Inspection d'URL > Entrer l'URL
4. "Demander l'indexation"
5. Répéter pour les 20 pages prioritaires

---

### ✅ ÉTAPE 4: Créer une page hub "Villes"

```jsx
// src/pages/CityIndex.tsx
import React from 'react';

const CityIndex: React.FC = () => {
  const regions = {
    'Île-de-France': [
      { city: 'Paris', url: '/assurance-taxi-paris', taxis: 18700 },
      { city: 'Villeurbanne', url: '/assurance-taxi-villeurbanne', taxis: 150 }
    ],
    'Provence-Alpes-Côte d\'Azur': [
      { city: 'Marseille', url: '/assurance-taxi-marseille', taxis: 2400 },
      { city: 'Nice', url: '/assurance-taxi-nice', taxis: 800 }
    ],
    // ... autres régions
  };

  return (
    <div className="city-index">
      <h1>Assurance Taxi par Ville - Toute la France</h1>
      <p>
        Découvrez nos offres d'assurance taxi adaptées à votre ville.
        Plus de 300 villes couvertes partout en France.
      </p>

      {Object.entries(regions).map(([region, cities]) => (
        <section key={region} className="region-section">
          <h2>{region}</h2>
          <div className="grid grid-cols-4 gap-4">
            {cities.map(city => (
              <a
                key={city.url}
                href={city.url}
                className="city-card"
              >
                <strong>{city.city}</strong>
                <span>{city.taxis} taxis</span>
              </a>
            ))}
          </div>
        </section>
      ))}

      <section className="why-choose-us">
        <h2>Pourquoi choisir TaxiAssur dans votre ville ?</h2>
        <ul>
          <li>✅ Couverture nationale - Toutes les villes de France</li>
          <li>✅ Tarifs locaux négociés - Économisez jusqu'à 35%</li>
          <li>✅ Experts locaux - Connaissance du marché</li>
          <li>✅ Attestation immédiate - 2 minutes chrono</li>
        </ul>
      </section>
    </div>
  );
};

export default CityIndex;
```

---

## 📈 MÉTRIQUES DE SUCCÈS

### À surveiller chaque semaine:

1. **Couverture GSC**
   - Objectif: Réduire "Explorée non indexée" de 132 à <50 en 30 jours
   - Suivi hebdomadaire dans GSC > Couverture

2. **Liens internes**
   - Objectif: Minimum 5 liens internes par page ville
   - Vérifier avec Screaming Frog

3. **Contenu**
   - Objectif: 100% des pages > 800 mots
   - Checker manuellement ou avec outil

4. **Trafic organique**
   - Objectif: +20% de trafic sur pages ville
   - Google Analytics > Acquisition > Organic Search

---

## 🎯 CALENDRIER D'EXÉCUTION

### Semaine 1 (13-20 Mars)
- [ ] Enrichir 10 pages ville prioritaires (Paris, Marseille, Lyon, Toulouse, Nice, Bordeaux, Nantes, Strasbourg, Lille, Montpellier)
- [ ] Ajouter composant InternalLinking
- [ ] Créer page hub /villes
- [ ] Soumettre 10 pages à GSC manuellement

### Semaine 2 (21-27 Mars)
- [ ] Enrichir 10 autres pages ville
- [ ] Ajouter liens depuis blog vers pages ville
- [ ] Créer 2 nouveaux articles mentionnant les villes
- [ ] Soumettre 10 nouvelles pages à GSC

### Semaine 3 (28 Mars - 3 Avril)
- [ ] Enrichir 10 autres pages ville
- [ ] Optimiser breadcrumbs sur toutes les pages
- [ ] Ajouter section "Villes proches" sur chaque page
- [ ] Analyse des résultats GSC

### Semaine 4 (4-10 Avril)
- [ ] Finaliser toutes les pages restantes
- [ ] Vérification qualité complète
- [ ] Monitoring et ajustements
- [ ] Rapport final

---

## 🔧 OUTILS RECOMMANDÉS

1. **Screaming Frog SEO Spider**
   - Crawler le site complet
   - Vérifier liens internes
   - Compteur de mots par page

2. **Google Search Console**
   - Rapport de couverture
   - Inspection d'URL
   - Soumission manuelle

3. **Ahrefs/SEMrush**
   - Analyser concurrence locale
   - Trouver keywords locaux
   - Opportunités de liens

4. **Google Analytics**
   - Suivre trafic par page
   - Identifier pages performantes
   - Taux de rebond par page ville

---

## 💡 CONSEILS BONUS

### 1. Créer du contenu vraiment unique
Éviter:
```
"TaxiAssur propose la meilleure assurance taxi à [VILLE]"
```

Préférer:
```
"À [VILLE], les chauffeurs de taxi font face à [PARTICULARITÉ LOCALE].
Nos assurances sont adaptées avec [GARANTIE SPÉCIFIQUE]."
```

### 2. Utiliser des données locales réelles
- Prix moyens véhicules dans la ville
- Nombre de taxis (source: registre préfecture)
- Taux de sinistralité local
- Réglementations spécifiques

### 3. Témoignages authentiques
- Vraies photos de chauffeurs (avec autorisation)
- Vraies histoires de sinistres gérés
- Économies réelles constatées

### 4. Mise à jour régulière
- Réviser les prix tous les 6 mois
- Mettre à jour les stats annuellement
- Ajouter nouveaux témoignages mensuellement

---

**Dernière mise à jour**: 13 Mars 2026
**Statut**: Plan d'action prêt à être déployé
**Prochaine révision**: 20 Mars 2026 (après semaine 1)
