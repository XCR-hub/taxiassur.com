# Guide Complet LinkedIn Campaign Manager - TaxiAssur

## 🎯 Objectifs

1. Créer un compte Campaign Manager
2. Récupérer le LinkedIn Partner ID
3. Installer le pixel de conversion
4. Configurer le suivi des leads
5. Créer votre première campagne

---

## 📋 Prérequis

- ✅ Compte LinkedIn professionnel
- ✅ Accès admin à la page LinkedIn TaxiAssur
- ✅ Carte bancaire (pour campagnes payantes - optionnel)
- ✅ Accès au code source du site

---

## 🚀 Étape 1 : Accéder à Campaign Manager

### 1.1 Première Connexion

1. **Allez sur** : https://www.linkedin.com/campaignmanager
2. **Connectez-vous** avec votre compte LinkedIn
3. **Sélectionnez** :
   - Si vous avez déjà un compte publicitaire : Sélectionnez-le
   - Si c'est votre premier accès : Cliquez "Create an ad account"

### 1.2 Créer un Compte Publicitaire

Si vous créez un nouveau compte :

```
Nom du compte : TaxiAssur Marketing
Devise : EUR (€)
Société associée : TaxiAssur (ou votre nom)
```

**Cliquez "Create account"**

---

## 🔑 Étape 2 : Récupérer le Partner ID (Insight Tag)

### 2.1 Navigation

Une fois dans Campaign Manager :

1. **Menu de gauche** → Cliquez sur **"Account Assets"**
2. **Sous-menu** → Cliquez sur **"Insight Tag"**

### 2.2 Installer l'Insight Tag

#### Si le tag n'est pas encore créé :

1. **Cliquez** : "Install Insight Tag"
2. **Vous verrez** un code JavaScript qui ressemble à :

```javascript
<!-- LinkedIn Insight Tag -->
<script type="text/javascript">
_linkedin_partner_id = "1234567"; // ← C'EST VOTRE PARTNER ID !
window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);
</script>
<script type="text/javascript">
(function(l) {
  if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
  window.lintrk.q=[]}
  var s = document.getElementsByTagName("script")[0];
  var b = document.createElement("script");
  b.type = "text/javascript";b.async = true;
  b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
  s.parentNode.insertBefore(b, s);
})(window.lintrk);
</script>
<noscript>
<img height="1" width="1" style="display:none;" alt=""
     src="https://px.ads.linkedin.com/collect/?pid=1234567&fmt=gif" />
</noscript>
<!-- End LinkedIn Insight Tag -->
```

3. **Copiez** le numéro après `_linkedin_partner_id = "` → C'est votre **Partner ID**

#### Si le tag existe déjà :

1. Vous verrez **"Tag Status: Active"**
2. **Cliquez** : "View Tag" ou "See Tag"
3. **Copiez** le Partner ID (7-8 chiffres)

### 2.3 Ajouter le Partner ID dans Votre Site

**Fichier** : `index.html` (lignes 105 et 122)

**Remplacez** :
```javascript
_linkedin_partner_id = "YOUR_PARTNER_ID"; // ← ligne 105
```

**Par** :
```javascript
_linkedin_partner_id = "1234567"; // ← Votre vrai ID
```

**ET aussi ligne 122** :
```html
src="https://px.ads.linkedin.com/collect/?pid=YOUR_PARTNER_ID&fmt=gif"
```

**Par** :
```html
src="https://px.ads.linkedin.com/collect/?pid=1234567&fmt=gif"
```

### 2.4 Vérifier l'Installation

1. **Redéployez** votre site avec le nouveau Partner ID
2. **Attendez 24-48h** pour la validation
3. **Retournez** dans Campaign Manager → Insight Tag
4. **Vous devriez voir** : "Tag Status: **Active**"

---

## 📊 Étape 3 : Configurer les Conversions

### 3.1 Créer une Conversion "Lead Formulaire"

1. **Menu de gauche** → **"Account Assets"** → **"Conversions"**
2. **Cliquez** : "Create Conversion"
3. **Remplissez** :

```
Nom de la conversion : Lead Formulaire Devis
Type : Lead
Valeur : Manuel (optionnel - ex: 50€ par lead)
Fenêtre de conversion : 30 jours
```

4. **URL de conversion** : `https://taxiassur.com/merci*`
   - L'astérisque `*` capte toutes les variantes (merci?ref=linkedin, etc.)

5. **Cliquez** : "Create"

### 3.2 Créer une Conversion "Lead LinkedIn Form"

1. **Créez une 2e conversion** pour les leads du formulaire LinkedIn
2. **Remplissez** :

```
Nom : Lead LinkedIn Form
Type : Lead
Déclencheur : Lead Gen Form submission
```

3. **Associez** votre formulaire Lead Gen
4. **Cliquez** : "Create"

---

## 🎯 Étape 4 : Créer une Audience (Remarketing)

### 4.1 Audience Visiteurs du Site

1. **Menu** → **"Account Assets"** → **"Matched Audiences"**
2. **Cliquez** : "Create audience"
3. **Sélectionnez** : "Website audience"
4. **Remplissez** :

```
Nom : Visiteurs TaxiAssur 30 jours
Règles :
  - URL contains: taxiassur.com
  - Dans les 30 derniers jours
Taille minimale : 300 membres (requis par LinkedIn)
```

5. **Cliquez** : "Create"

### 4.2 Audience Abandons de Formulaire

```
Nom : Abandons Formulaire Devis
Règles :
  - URL contains: /devis
  - ET NOT URL contains: /merci
  - Dans les 7 derniers jours
```

### 4.3 Audience Conversions (Exclusion)

```
Nom : Leads Convertis (Exclusion)
Règles :
  - URL contains: /merci
  - Dans les 90 derniers jours
```

**Utilité** : Exclure ceux qui ont déjà converti

---

## 💰 Étape 5 : Créer Votre Première Campagne (Optionnel)

### 5.1 Type de Campagne Recommandé : Lead Gen Form

1. **Menu** → **"Campaign Manager"** → **"Create campaign"**
2. **Objectif** : Lead generation
3. **Format** : Sponsored Content (Single image ad)

### 5.2 Paramètres

```
Nom de la campagne : TaxiAssur - Leads Chauffeurs Taxi

Audience :
  - Localisation : France
  - Secteur d'activité : Transportation / Logistics
  - Fonction professionnelle : Chauffeur, Gérant de flotte
  - Taille d'entreprise : 1-10 employés, 11-50 employés
  - Langue : Français

Budget :
  - Journalier : 20€/jour (recommandé pour démarrer)
  - Ou Total : 500€ sur 30 jours

Enchère :
  - Type : Coût par clic (CPC)
  - Enchère max : 3-5€ (LinkedIn suggère automatiquement)

Calendrier :
  - Date de début : Aujourd'hui
  - Date de fin : Dans 30 jours
```

### 5.3 Créer le Contenu Publicitaire

#### Texte de l'Annonce

**Titre** (70 caractères max) :
```
Assurance taxi : Devis gratuit en 1 minute
```

**Description** (150 caractères max) :
```
Économisez jusqu'à 35% sur votre assurance taxi. RC Pro incluse. Réponse sous 24h. Courtier ORIAS agréé.
```

**CTA Button** :
```
Demander un devis
```

#### Image de l'Annonce

**Dimensions recommandées** : 1200x627px

**Éléments à inclure** :
- Photo d'un taxi professionnel
- Logo TaxiAssur
- Texte court : "Devis gratuit 1 min"
- Badge "ORIAS Agréé"

### 5.4 Associer le Formulaire Lead Gen

1. **LinkedIn Lead Gen Form** : Sélectionnez votre formulaire créé précédemment
2. **Vérifiez** que le formulaire contient :
   - Nom
   - Téléphone
   - Email
   - Immatriculation
3. **Confirmation** : Message de remerciement configuré

### 5.5 Lancer la Campagne

1. **Vérifiez** tout
2. **Cliquez** : "Launch campaign"
3. **Attendez** la validation LinkedIn (24-48h)

---

## 📈 Étape 6 : Suivre les Performances

### 6.1 Dashboard Principal

**Menu** → **"Campaign Manager"**

**Métriques clés à surveiller** :

| Métrique | Objectif | Bon Score |
|----------|----------|-----------|
| **Impressions** | Visibilité | 10,000+ / mois |
| **CTR** | Engagement | 0.5% - 1.5% |
| **Coût par clic** | Efficacité | 2€ - 5€ |
| **Coût par lead** | ROI | 30€ - 60€ |
| **Taux de conversion** | Qualité | 2% - 5% |

### 6.2 Rapport de Conversion

1. **Menu** → **"Analyze"** → **"Conversion tracking"**
2. **Période** : 30 derniers jours
3. **Comparez** :
   - Leads formulaire site vs LinkedIn Form
   - Coût par lead par campagne
   - ROI par canal

### 6.3 Optimisation Continue

**Après 7 jours** :

- ✅ Si CTR < 0.3% → Changer l'image ou le texte
- ✅ Si Coût/lead > 70€ → Réduire enchère ou affiner audience
- ✅ Si Conversions = 0 → Vérifier le formulaire et le tracking

**Après 30 jours** :

- ✅ Analyser les meilleures annonces → Créer des variantes
- ✅ Créer des audiences lookalike basées sur les convertis
- ✅ Tester différents CTA et offres

---

## 🔧 Étape 7 : Intégration Make.com (Rappel)

### 7.1 Connecter LinkedIn Lead Gen à Make.com

**Déjà expliqué dans** : `LINKEDIN-COMPLETE-GUIDE.md`

**Résumé rapide** :

1. Make.com → Nouveau scénario
2. Trigger : LinkedIn Lead Gen Form
3. Mapping : Champs LinkedIn → Variables
4. Action : HTTP POST vers Supabase Edge Function
5. Activation : Scénario ON

### 7.2 Vérifier le Flux

```
Lead remplit formulaire LinkedIn
         ↓
   Make.com (trigger)
         ↓
   Mapping des champs
         ↓
  POST /linkedin-lead-webhook
         ↓
   Supabase table `leads`
         ↓
   Email notification
```

---

## 🎓 Bonnes Pratiques LinkedIn Ads

### Ciblage

✅ **À FAIRE** :
- Cibler par fonction professionnelle (Chauffeur, Gérant)
- Utiliser plusieurs langues si besoin (Français + Arabe)
- Tester audiences de 50,000 - 300,000 personnes

❌ **À ÉVITER** :
- Audience trop large (> 1M personnes)
- Audience trop petite (< 10,000 personnes)
- Cibler uniquement par intérêt (peu précis)

### Budget

**Budget recommandé débutant** :
```
20€/jour × 30 jours = 600€/mois
↓
Estimation : 10-20 leads qualifiés/mois
Coût par lead : 30-60€
```

**Budget optimisé (après tests)** :
```
50€/jour × 30 jours = 1,500€/mois
↓
Estimation : 40-60 leads qualifiés/mois
Coût par lead : 25-40€
```

### Contenu Publicitaire

**Formule gagnante** :

```
[Problème] + [Solution] + [Preuve] + [CTA]

Exemple :
"Votre assurance taxi coûte trop cher ? [Problème]
Économisez jusqu'à 35% avec TaxiAssur. [Solution]
+2000 chauffeurs nous font confiance. [Preuve]
→ Devis gratuit en 1 min [CTA]"
```

### A/B Testing

**Testez** :
- 2-3 visuels différents
- 2 titres différents
- 2 audiences différentes
- 2 CTA différents

**Gardez** ce qui performe le mieux (CTR + Coût/lead)

---

## 🛠️ Outils Complémentaires

### 1. LinkedIn Sales Navigator (Optionnel)

**Prix** : ~80€/mois

**Utilité** :
- Identifier des prospects chauffeurs taxi
- Envoyer des InMails personnalisés
- Créer des listes de prospects

### 2. LinkedIn Elevate (Optionnel)

**Prix** : Sur devis

**Utilité** :
- Partage de contenu par employés/ambassadeurs
- Amplification de portée organique

### 3. LinkedIn Events (Gratuit)

**Utilité** :
- Organiser webinaires "Comment choisir son assurance taxi"
- Collecter des leads qualifiés
- Créer une communauté

---

## 📋 Checklist Campaign Manager

### Configuration Initiale

- [ ] Compte Campaign Manager créé
- [ ] Partner ID récupéré
- [ ] Partner ID ajouté dans `index.html` (2 endroits)
- [ ] Site redéployé avec le tag
- [ ] Tag vérifié "Active" après 24-48h

### Conversions & Audiences

- [ ] Conversion "Lead Formulaire" créée
- [ ] Conversion "Lead LinkedIn Form" créée
- [ ] Audience "Visiteurs 30 jours" créée
- [ ] Audience "Abandons formulaire" créée
- [ ] Audience "Convertis" créée (pour exclusion)

### Première Campagne (Optionnel)

- [ ] Campagne Lead Gen créée
- [ ] Audience ciblée (chauffeurs taxi France)
- [ ] Budget défini (20€/jour minimum)
- [ ] Contenu publicitaire créé
- [ ] Formulaire Lead Gen associé
- [ ] Campagne lancée
- [ ] Validation LinkedIn reçue

### Suivi & Optimisation

- [ ] Dashboard consulté quotidiennement
- [ ] Métriques suivies (CTR, CPC, Coût/lead)
- [ ] A/B tests lancés après 7 jours
- [ ] Rapports mensuels analysés
- [ ] Audiences affinées selon performances

---

## 🆘 Problèmes Fréquents

### Problème 1 : "Insight Tag not detected"

**Cause** : Le tag n'est pas encore actif

**Solution** :
1. Vérifiez que le Partner ID est correct dans `index.html`
2. Attendez 24-48h après déploiement
3. Testez sur une page publique (pas localhost)
4. Désactivez bloqueurs de publicités pour tester

### Problème 2 : "Audience too small"

**Cause** : Moins de 300 membres dans l'audience

**Solution** :
1. Élargissez les critères de ciblage
2. Ajoutez plus de pays (Belgique, Suisse, etc.)
3. Attendez quelques jours que l'audience se construise

### Problème 3 : "Lead form not delivering leads"

**Cause** : Make.com ou webhook non configuré

**Solution** :
1. Vérifiez scénario Make.com activé
2. Testez le webhook manuellement
3. Vérifiez les logs Supabase Edge Function
4. Confirmez que la table `leads` existe

### Problème 4 : "High cost per lead (>100€)"

**Cause** : Ciblage trop large ou contenu peu engageant

**Solution** :
1. Affinez l'audience (fonctions professionnelles précises)
2. Testez un nouveau visuel/texte
3. Réduisez l'enchère max
4. Utilisez le remarketing

### Problème 5 : "Campaign rejected"

**Causes courantes** :
- Image avec trop de texte (>20% de l'image)
- Promesses irréalistes ("Économisez 90%")
- Langue de la page différente du ciblage

**Solution** :
1. Réduisez le texte sur l'image
2. Modérez les promesses
3. Assurez-vous que la landing page est en français

---

## 📞 Support LinkedIn

### Centre d'Aide

**URL** : https://www.linkedin.com/help/lms

**Topics utiles** :
- Campaign Manager basics
- Insight Tag troubleshooting
- Lead Gen Forms best practices

### Contact Support

1. **Menu** Campaign Manager → **"?"** (en haut à droite)
2. **Cliquez** : "Contact us"
3. **Sélectionnez** : Type de problème
4. **Réponse** : Sous 24-48h généralement

---

## 🎯 KPIs à Suivre (Tableau de Bord)

### Semaine 1

| KPI | Objectif | Commentaire |
|-----|----------|-------------|
| Impressions | 5,000+ | Validation audience |
| CTR | 0.3%+ | Intérêt initial |
| Clics | 15+ | Trafic généré |
| Coût/clic | < 8€ | Efficacité budget |

### Mois 1

| KPI | Objectif | Commentaire |
|-----|----------|-------------|
| Impressions | 50,000+ | Bonne visibilité |
| CTR | 0.5%+ | Contenu engageant |
| Leads | 10-20 | Génération leads |
| Coût/lead | 30-60€ | ROI acceptable |
| Taux conversion | 2%+ | Qualité formulaire |

### Mois 3

| KPI | Objectif | Commentaire |
|-----|----------|-------------|
| Coût/lead | < 40€ | Optimisation réussie |
| ROI | 200%+ | Rentabilité confirmée |
| CAC | < 100€ | Coût acquisition client |
| LTV/CAC | 3:1+ | Valeur à long terme |

---

## 🚀 Next Steps

### Court Terme (7 jours)

1. ✅ Récupérer Partner ID
2. ✅ Mettre à jour `index.html`
3. ✅ Déployer le site
4. ✅ Vérifier tag actif

### Moyen Terme (30 jours)

1. ✅ Créer conversions
2. ✅ Créer audiences
3. ✅ Lancer 1ère campagne test (20€/jour)
4. ✅ Analyser résultats

### Long Terme (3 mois)

1. ✅ Optimiser campagnes
2. ✅ Scaler budget (50€/jour)
3. ✅ Créer lookalike audiences
4. ✅ Lancer campagnes remarketing

---

## 📚 Ressources Supplémentaires

### Documentation Officielle

- **LinkedIn Marketing Solutions** : https://business.linkedin.com/marketing-solutions
- **Campaign Manager Help** : https://www.linkedin.com/help/lms
- **Insight Tag Guide** : https://www.linkedin.com/help/lms/answer/a427660

### Formations Recommandées

- **LinkedIn Learning** : "LinkedIn Ads Fundamentals"
- **LinkedIn Marketing Labs** : Certification gratuite
- **YouTube** : Recherchez "LinkedIn Lead Gen Forms tutorial"

### Communautés

- **LinkedIn Ads Community** : Groupe Facebook
- **Reddit** : r/PPC et r/LinkedInMarketing
- **LinkedIn Marketing Solutions Blog** : Articles et études de cas

---

**Version** : 1.0
**Date** : 2025-10-09
**Auteur** : TaxiAssur Tech Team

**Aide supplémentaire ?** Consultez `LINKEDIN-COMPLETE-GUIDE.md` pour l'intégration complète.
