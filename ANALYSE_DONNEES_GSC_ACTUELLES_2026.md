# 📊 Analyse Google Search Console - TaxiAssur.com
**Période:** 03 Décembre 2025 - 02 Mars 2026
**Date d'analyse:** 04 Mars 2026

---

## 🚨 Problèmes Critiques Identifiés

### 1. DUPLICATION WWW / NON-WWW (URGENT!)

Google indexe **LES DEUX VERSIONS** du site:

**Version WWW (à supprimer):**
- `https://www.taxiassur.com/` - 7 clics, 677 impressions
- `https://www.taxiassur.com/prix-assurance-taxi` - 0 clics, 20 impressions
- `https://www.taxiassur.com/ville/besancon` - 1 clic, 1 impression
- `https://www.taxiassur.com/ville/strasbourg` - 0 clics, 3 impressions
- `https://www.taxiassur.com/ville/montpellier` - 0 clics, 2 impressions
- Et 5+ autres pages www indexées

**Version CANONICAL (à conserver):**
- `https://taxiassur.com/` - 34 clics, 579 impressions

**Impact:**
- Dilution de l'autorité SEO (split entre 2 URLs)
- Perte de 7 clics potentiels sur la version www
- Confusion pour Google (quelle version indexer?)
- 677 impressions perdues sur la mauvaise URL

**☑️ Solution appliquée:**
- ✅ Code corrigé (59 remplacements www → non-www)
- ✅ Sitemap régénéré sans www
- ⏳ **À faire:** Déployer + demander suppression www dans GSC

---

## 📈 Performances Actuelles (3 mois)

```
Clics totaux:        69
Impressions totales: 3,020
CTR moyen:          2.29%
Position moyenne:   ~30-40
```

### Par Appareil
```
Mobile:     55 clics / 1,170 impressions (CTR: 4.7%)
Desktop:    14 clics / 1,829 impressions (CTR: 0.76%) ⚠️
Tablette:    0 clic  / 21 impressions
```

**PROBLÈME CRITIQUE:** CTR desktop 6x inférieur au mobile!

---

## 🔍 Top Requêtes avec 0 Clics (OPPORTUNITÉS)

```
"devis assurance taxi"                    156 impressions ⚡
"courtier professionnel taxi"             109 impressions ⚡
"assurance vaux le penil"                  81 impressions
"taxis sinistrés"                          74 impressions
"taxi assurance"                           67 impressions
"assurance des taxis"                      57 impressions
"responsabilité civile professionnelle"    34 impressions
"comparateur assurance taxi"               21 impressions
```

**Impact potentiel:** +156 clics/mois minimum

---

## 📄 Pages à CTR Catastrophique

```
/assurance-taxi           4 clics / 403 impressions (CTR: 1.0%)  ⚠️
/prix-assurance-taxi      2 clics / 346 impressions (CTR: 0.6%)  ⚠️
/contact                  1 clic  / 98 impressions  (CTR: 1.0%)  ⚠️
/rc-professionnelle       1 clic  / 97 impressions  (CTR: 1.0%)  ⚠️
```

**vs Pages avec BON CTR:**
```
/assurance-taxi-nice      3 clics / 21 impressions  (CTR: 14.3%) ✅
/assurance-taxi-lyon      2 clics / 14 impressions  (CTR: 14.3%) ✅
Homepage (/)             34 clics / 579 impressions (CTR: 5.9%)  ✅
```

---

## 🎯 Plan d'Action GSC

### URGENT (Aujourd'hui)
1. ✅ Déployer corrections SEO
2. ⏳ GSC: Demander suppression `www.taxiassur.com/*`
3. ⏳ GSC: Soumettre sitemap propre
4. ⏳ GSC: Définir version préférée SANS www
5. ⏳ GSC: Demander ré-indexation top 10 pages

### Semaine 1 (Optimisation CTR)
Optimiser titles/descriptions de ces pages:
- `/assurance-taxi` - Target CTR: 1% → 5%
- `/prix-assurance-taxi` - Target CTR: 0.6% → 5%
- `/contact` - Target CTR: 1% → 4%
- `/rc-professionnelle` - Target CTR: 1% → 5%

**Méthode:**
- Ajouter émojis 🚖 💰 ☎️
- Année 2026
- Chiffres concrets (-30%, 2 min, etc.)
- Bénéfices clairs

### Semaine 2-3 (Nouveau Contenu)
Créer pages pour requêtes 0 clics:
1. `/devis-assurance-taxi` → 156 impressions
2. `/courtier-assurance-taxi` → 109 impressions
3. `/rc-pro-taxi-prix` → 11 impressions
4. `/assurance-taxi-sinistre` → 74 impressions

---

## 📊 Objectifs 30 Jours

```
Métrique          Actuel → Objectif

Clics:               69 → 200
Impressions:      3,020 → 5,000
CTR:              2.29% → 4%
Position:          ~35 → ~20
CTR Desktop:     0.76% → 3%
```

---

**Créé le:** 04 Mars 2026
**Source:** Google Search Console (Dec 2025 - Mar 2026)
**Prochaine analyse:** 11 Mars 2026 (J+7 post-déploiement)
