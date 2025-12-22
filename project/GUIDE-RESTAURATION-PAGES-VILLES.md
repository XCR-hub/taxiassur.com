# 🏙️ Guide : Restaurer le Contenu des Pages Villes

## 🎯 Problème

Les pages villes (ex: /ville/angers) affichent seulement le formulaire de devis, sans le contenu SEO riche (description de la ville, avantages locaux, tarifs, etc.).

**Cause probable :**
- Les données ne sont pas dans la table `city_pages` de Supabase
- Ou la structure de la table est incomplète
- Ou le contenu est vide/incomplet

---

## ✅ Solution en 2 Étapes

### Étape 1 : Restaurer la Structure Complète

**Fichier :** `RESTAURER-CONTENU-PAGES-VILLES.sql`

**Ce qu'il fait :**
1. ✅ Vérifie et ajoute toutes les colonnes manquantes :
   - `city` (nom ville)
   - `title` (titre SEO)
   - `slug` (URL)
   - `content` (contenu HTML riche)
   - `meta_description` (SEO)
   - `keywords` (mots-clés)
   - `status` (published/draft)
   - `dept` (département)
   - `region` (région)
   - `taxi_count` (nombre taxis)

2. ✅ Insère contenu complet pour :
   - Paris (18 000 taxis)
   - Angers (180 taxis)

**Comment l'utiliser :**
```sql
-- Dans Supabase SQL Editor
-- Copiez-collez RESTAURER-CONTENU-PAGES-VILLES.sql
-- Cliquez Run
```

**Résultat attendu :**
```
✅ Colonne city ajoutée (ou existe déjà)
✅ Colonne title ajoutée (ou existe déjà)
...
✅ 2 villes publiées avec contenu complet
💡 Testez : https://taxiassur.com/ville/angers
💡 Testez : https://taxiassur.com/ville/paris
```

---

### Étape 2 : Ajouter les 34 Villes Principales

**Fichier :** `INSERT-34-VILLES-CONTENU-COMPLET.sql`

**Ce qu'il fait :**
- Insère du contenu SEO optimisé pour 34 villes :
  - Paris, Lyon, Marseille, Toulouse, Nice
  - Nantes, Strasbourg, Montpellier, Bordeaux
  - Lille, Rennes, Reims, Saint-Étienne
  - Et 21 autres villes principales

**Chaque ville inclut :**
- 📝 Contenu HTML de 500+ mots
- 🎯 Mots-clés SEO locaux
- 📍 Zones couvertes spécifiques
- 💰 Tarifs indicatifs
- 📊 Statistiques (nombre de taxis, département, région)

**Comment l'utiliser :**
```sql
-- Dans Supabase SQL Editor
-- Copiez-collez INSERT-34-VILLES-CONTENU-COMPLET.sql
-- Cliquez Run
```

**Résultat attendu :**
```
✅ 34 villes publiées avec contenu complet
💡 Testez vos pages : https://taxiassur.com/ville/[slug]
```

---

## 🚀 Procédure Complète

### 1. Ouvrir Supabase SQL Editor

1. Aller sur https://supabase.com
2. Se connecter
3. Sélectionner votre projet TaxiAssur
4. Cliquer sur **SQL Editor** (menu gauche)

### 2. Exécuter le Script de Restauration

1. Ouvrir `RESTAURER-CONTENU-PAGES-VILLES.sql`
2. Copier TOUT le contenu (CTRL+A puis CTRL+C)
3. Coller dans Supabase SQL Editor (CTRL+V)
4. Cliquer **Run**
5. ⏳ Attendre 5-10 secondes
6. ✅ Vérifier le message de succès

### 3. Ajouter les 34 Villes

1. Ouvrir `INSERT-34-VILLES-CONTENU-COMPLET.sql`
2. Copier TOUT le contenu
3. Coller dans Supabase SQL Editor
4. Cliquer **Run**
5. ⏳ Attendre 10-15 secondes
6. ✅ Vérifier le message de succès

### 4. Tester les Pages

1. Ouvrir https://taxiassur.com/ville/angers
2. Vérifier que la page affiche :
   - ✅ Titre "Assurance Taxi Angers"
   - ✅ Contenu riche (avantages, zones, tarifs)
   - ✅ Formulaire de devis
   - ✅ Informations locales spécifiques

3. Tester d'autres villes :
   - https://taxiassur.com/ville/paris
   - https://taxiassur.com/ville/lyon
   - https://taxiassur.com/ville/marseille

---

## 📊 Résultat Avant / Après

### Avant ❌
```
Page /ville/angers :
- Seulement le formulaire de devis
- Aucune description de la ville
- Aucun avantage local
- Aucune information tarifaire
- Mauvais pour le SEO
```

### Après ✅
```
Page /ville/angers :
✅ Titre H1 optimisé SEO
✅ Description complète d'Angers
✅ Avantages TaxiAssur locaux
✅ Zones couvertes détaillées
✅ Tarifs indicatifs (à partir de 850€/an)
✅ Statistiques (180 taxis, Maine-et-Loire)
✅ Informations de contact locales
✅ Formulaire de devis
✅ Mots-clés SEO : "assurance taxi angers", "taxi 49"
```

---

## 🐛 Dépannage

### Erreur : "column does not exist"
**Solution :** Le script `RESTAURER-CONTENU-PAGES-VILLES.sql` ajoute automatiquement toutes les colonnes manquantes. Réexécutez-le.

### Erreur : "duplicate key value"
**Solution :** Normal si vous réexécutez le script. Les données sont mises à jour avec `ON CONFLICT ... DO UPDATE`.

### La page affiche toujours juste le formulaire
**Solutions :**
1. Vider le cache du navigateur : CTRL+SHIFT+R
2. Vérifier que status = 'published' :
```sql
SELECT city, status FROM city_pages WHERE slug = 'angers';
```
3. Vérifier que le content n'est pas vide :
```sql
SELECT city, LENGTH(content) FROM city_pages WHERE slug = 'angers';
```

### Le contenu ne s'affiche pas
**Solution :** Vérifier dans le code que le composant `CityPage.tsx` charge bien depuis Supabase :
```typescript
const { data, error } = await supabase
  .from('city_pages')
  .select('*')
  .eq('slug', city)
  .eq('status', 'published')
  .maybeSingle();
```

---

## 📝 Structure de Contenu par Ville

Chaque page ville contient :

### 1. Hero Section
- **Titre H1** : "Assurance Taxi [Ville] - [Accroche]"
- **Description** : Présentation de la ville et contexte taxi

### 2. Avantages Locaux
- **Liste à puces** avec icônes
- Points spécifiques à la ville
- Expertise locale mise en avant

### 3. Zones Couvertes
- **Liste détaillée** des quartiers/zones
- Aéroports, gares, zones commerciales
- Périmètre d'intervention

### 4. Tarifs Indicatifs
- **Prix de départ** : "À partir de XXX€/an"
- Détail des garanties incluses
- Comparaison avec concurrence

### 5. Cas d'Usage / Témoignages
- Exemples concrets de sinistres gérés
- Témoignages de chauffeurs locaux (futurs)

### 6. Contact Local
- **Téléphone** : 01 80 85 57 86
- **Email** : [ville]@taxiassur.com
- **Horaires** d'ouverture

### 7. Formulaire de Devis
- Intégré automatiquement par le composant

---

## 🎯 SEO : Mots-Clés par Ville

Chaque page est optimisée pour :

**Requêtes principales :**
- "assurance taxi [ville]"
- "assurance taxi [département]"
- "taxi [ville] assurance"

**Requêtes secondaires :**
- "devis assurance taxi [ville]"
- "tarif assurance taxi [ville]"
- "meilleure assurance taxi [ville]"

**Longue traîne :**
- "assurance taxi pas cher [ville]"
- "assurance taxi jeune conducteur [ville]"
- "comparateur assurance taxi [ville]"

---

## 📈 Impact SEO Attendu

### Court Terme (1 mois)
- ✅ 34 nouvelles pages indexées
- ✅ Positionnement sur requêtes locales
- ✅ +50% de trafic organique

### Moyen Terme (3 mois)
- ✅ Top 10 sur "assurance taxi [ville]" (villes moyennes)
- ✅ Top 20 sur grandes villes (Paris, Lyon, Marseille)
- ✅ +150% de trafic organique

### Long Terme (6 mois)
- ✅ Top 5 sur la plupart des villes
- ✅ 200+ pages villes indexées
- ✅ +300% de trafic organique
- ✅ 50+ leads/mois via pages villes

---

## ✨ Prochaines Étapes

### Après Restauration

1. **Tester toutes les pages** : Vérifier que les 34 villes s'affichent correctement

2. **Ajouter plus de villes** : Étendre à 100+ villes avec le générateur IA

3. **Enrichir le contenu** :
   - Ajouter photos locales (via Pexels API)
   - Ajouter témoignages de chauffeurs
   - Ajouter FAQ spécifiques par ville

4. **Optimiser SEO** :
   - Soumettre sitemaps à Google
   - Créer backlinks locaux
   - Optimiser vitesse de chargement

5. **Tracking** :
   - Configurer Google Analytics par ville
   - Suivre conversions par page
   - A/B testing sur CTA

---

## 📞 Support

**En cas de problème persistant :**

1. Vérifier les logs Supabase SQL Editor
2. Consulter ce guide section Dépannage
3. Vérifier la structure de la table :
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'city_pages'
ORDER BY ordinal_position;
```

---

**Fichiers créés :**
- ✅ `RESTAURER-CONTENU-PAGES-VILLES.sql` - Structure + 2 villes
- ✅ `INSERT-34-VILLES-CONTENU-COMPLET.sql` - 34 villes
- ✅ `GUIDE-RESTAURATION-PAGES-VILLES.md` - Ce guide

**Date :** 20 octobre 2025
**Status :** ✅ Prêt à l'emploi
