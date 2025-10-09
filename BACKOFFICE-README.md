# 📊 BACKOFFICE TAXIASSUR - GUIDE COMPLET

## ✅ CONFIRMATION : TOUT EST LÀ !

**AUCUNE fonctionnalité n'a été supprimée.** Tout le backoffice existant est intact.

---

## 🔑 ACCÈS AU BACKOFFICE

### URLs disponibles :

1. **URL principale (recommandée) :**
   ```
   https://taxiassur.com/backoffice
   ```

2. **Alias /admin (nouveau) :**
   ```
   https://taxiassur.com/admin
   → Redirige automatiquement vers /backoffice
   ```

3. **URL leads directe :**
   ```
   https://taxiassur.com/backoffice/leads
   https://taxiassur.com/admin/leads
   ```

### Mot de passe

**Par défaut :** `taxiassur2024`

**Configurable dans :** `env-config.js` → `VITE_ADMIN_PASSWORD`

---

## 📱 INTERFACE PRINCIPALE : MASTER DASHBOARD

### Ce qui s'affiche

Quand vous allez sur `/backoffice` ou `/admin`, vous arrivez sur le **Master Dashboard** qui affiche :

#### 1. Stats Temps Réel (Live)
- Sessions actives (5 min)
- Visiteurs aujourd'hui
- Conversions du jour
- Demandes de devis
- Devis en attente
- Taux de conversion en temps réel

#### 2. Contrôles Master
- **Bouton VERT** : Lancer toutes les automatisations
- **Bouton ROUGE** : Arrêter toutes les automatisations

#### 3. Menu de Navigation (NOUVEAU)

Un menu coloré avec **12 boutons** pour accéder à toutes les fonctionnalités :

| Bouton | Couleur | Fonction |
|--------|---------|----------|
| 🟡 **Leads** | Amber | Gestion des leads (VOTRE PRIORITÉ) |
| 🔵 **Dashboard** | Bleu | Dashboard classique avec stats détaillées |
| 🟣 **Contenu** | Violet | Gérer articles, FAQ, avis |
| 🟢 **SEO** | Vert | Outils SEO et optimisation |
| 🟦 **Backlinks** | Indigo | Gestion backlinks et partenaires |
| 🌸 **Analytics** | Rose | Analytics de conversion |
| 🔵 **Partenaires** | Cyan | Gestion partenaires |
| 🔴 **Sécurité** | Rouge | Dashboard sécurité |
| 🟠 **Actualités** | Orange | Gérer les news |
| 🟡 **Popups** | Jaune | Gérer les popups |
| 🟩 **Réseaux** | Teal | Réseaux sociaux |
| ⚫ **Voir le site** | Gris | Retour au site public |

#### 4. Dashboard Analytics Temps Réel
- Top pages visitées
- Sessions récentes avec détails (source, ville, device)
- Automatisations actives avec statut

---

## 🎯 GESTION DES LEADS

### Accès

```
/backoffice/leads
ou
/admin/leads
```

### Fonctionnalités disponibles

#### Vue principale
- ✅ Liste complète de tous les leads
- ✅ Recherche par nom, email, ville, téléphone
- ✅ Filtres par statut (nouveau, contacté, devis envoyé, etc.)
- ✅ Filtres par ville
- ✅ Tri par date, statut, prime

#### Actions par lead
- ✅ Voir détails complets
- ✅ Changer le statut
- ✅ Ajouter des notes
- ✅ Enregistrer prime réalisée
- ✅ Envoyer devis par email
- ✅ Envoyer contrat par email
- ✅ Demander avis client
- ✅ Exporter en CSV
- ✅ Supprimer

#### Statistiques
- ✅ Leads aujourd'hui
- ✅ Leads cette semaine
- ✅ Leads ce mois
- ✅ Total leads
- ✅ Top villes
- ✅ Taux de conversion
- ✅ Revenu estimé

---

## 📧 ENVOI D'EMAILS

Le système d'envoi d'emails est **intégré dans LeadManager** :

### Fonctions disponibles

1. **Envoyer Devis**
   - Joindre un fichier PDF
   - Email automatique avec template professionnel
   - Tracking d'envoi

2. **Envoyer Contrat**
   - Joindre le contrat signé
   - Template dédié
   - Confirmation client

3. **Demander Avis**
   - Email automatique après signature
   - Lien vers formulaire d'avis
   - Augmente les témoignages

### Configuration Email

**Fichiers concernés :**
- `src/lib/leads.ts` → Fonctions d'envoi
- `public/api/lead-manager.php` → API PHP backend
- `env-config.js` → Config SMTP

**Variables SMTP :**
```javascript
VITE_SMTP_HOST: 'smtp.ionos.fr'
VITE_SMTP_PORT: '587'
VITE_SMTP_USER: 'team@taxiassur.com'
VITE_SMTP_FROM: 'team@taxiassur.com'
```

---

## 🚀 AUTRES DASHBOARDS DISPONIBLES

### Dashboard Classique
```
/backoffice/old-dashboard
```
**Contient :**
- Stats globales (posts, FAQs, avis, partenaires)
- Ping search engines
- Régénération feeds
- Health check système

### Content Manager
```
/backoffice/content
```
**Fonctions :**
- Créer/modifier articles de blog
- Gérer FAQ
- Gérer avis clients
- Gérer offres

### SEO Tools
```
/backoffice/seo
```
**Fonctions :**
- Analyse SEO pages
- Génération sitemap
- Soumission moteurs de recherche
- Mots-clés et meta-descriptions

### Backlink Manager
```
/backoffice/backlinks
```
**Fonctions :**
- Suivi backlinks
- Prospection partenaires
- Outreach automatique

### Partner Manager
```
/backoffice/partners
```
**Fonctions :**
- Liste partenaires
- Ajouter/modifier partenaires
- Stats partenariats

### Security Dashboard
```
/backoffice/security
```
**Fonctions :**
- Logs sécurité
- Tentatives d'accès
- Firewall rules

### Analytics Dashboard
```
/backoffice/analytics
```
**Fonctions :**
- Taux de conversion détaillés
- Entonnoir de conversion
- A/B testing
- Heatmaps

---

## 🎨 COULEURS DU BACKOFFICE

Le nouveau Master Dashboard utilise un thème **sombre moderne** :

- **Fond** : Dégradé noir/gris foncé
- **Cartes** : Gris foncé avec bordures colorées
- **Boutons** : Dégradés colorés vibrants
- **Texte** : Blanc/gris clair
- **Accents** : Amber (leads), bleu, vert, violet, etc.

**Pourquoi ce thème ?**
- ✅ Moins fatigant pour les yeux (usage prolongé)
- ✅ Look moderne et professionnel
- ✅ Focus sur les données importantes
- ✅ Différenciation claire site public / backoffice

---

## 🔄 NAVIGATION ENTRE LES DASHBOARDS

### Depuis Master Dashboard
→ Utilisez le **menu de navigation** avec 12 boutons colorés

### Depuis n'importe quel dashboard
→ Utilisez l'URL directe : `/backoffice/[section]`

### Retour au Master Dashboard
→ Cliquez sur "Dashboard" dans le menu ou allez à `/backoffice`

---

## 📊 RÉCAPITULATIF : OÙ SONT MES LEADS ?

### Pour voir TOUS vos leads :

1. **Aller sur :** `https://taxiassur.com/admin` ou `/backoffice`
2. **Cliquer sur** le bouton **LEADS** (orange/amber, premier bouton)
3. **Ou aller directement :** `https://taxiassur.com/backoffice/leads`

### Vous verrez :
- ✅ Tableau complet avec tous les leads
- ✅ Nom, email, téléphone, ville, véhicule
- ✅ Statut de chaque lead
- ✅ Date de création
- ✅ Actions rapides (voir, modifier, envoyer email)

### Pour gérer un lead :
1. Cliquer sur l'œil 👁️ pour voir détails
2. Changer le statut (nouveau → contacté → devis → signé)
3. Ajouter notes
4. Envoyer devis ou contrat
5. Enregistrer prime

---

## 🛠️ FICHIERS SOURCES

Si vous voulez personnaliser l'interface :

### Master Dashboard
- **Fichier** : `src/backoffice/MasterDashboard.tsx`
- **Contient** : Stats temps réel, menu navigation, contrôles master

### Lead Manager
- **Fichier** : `src/backoffice/LeadManager.tsx`
- **Contient** : Gestion complète des leads
- **Fonctions** : Liste, filtres, édition, envoi emails

### Dashboard Classique
- **Fichier** : `src/backoffice/Dashboard.tsx`
- **Contient** : Stats globales, outils admin

### Routeur
- **Fichier** : `src/router.tsx`
- **Lignes 297-420** : Routes backoffice

---

## ❓ FAQ BACKOFFICE

### Je ne vois pas mes leads !
→ Vérifiez que vous êtes sur `/backoffice/leads` et non `/backoffice` (le Master Dashboard)

### Le mot de passe ne marche pas !
→ Vérifiez `VITE_ADMIN_PASSWORD` dans `env-config.js` (défaut : `taxiassur2024`)

### Les emails ne partent pas !
→ Vérifiez la config SMTP dans `env-config.js` et testez avec `/api/test-email.php`

### Je préfère l'ancien dashboard !
→ Allez sur `/backoffice/old-dashboard` ou cliquez "Dashboard" dans le menu

### Comment ajouter une section au menu ?
→ Éditez `src/backoffice/MasterDashboard.tsx` lignes 245-344

### Les stats temps réel ne s'affichent pas !
→ Vérifiez Supabase : tables `analytics_sessions` et fonction `get_realtime_stats()`

---

## 🎯 RÉSUMÉ : WORKFLOW LEADS

```
1. Lead arrive sur le site
   ↓
2. Remplit formulaire
   ↓
3. Sauvegardé dans Supabase (table: leads)
   ↓
4. Visible dans /backoffice/leads
   ↓
5. Vous recevez notification email
   ↓
6. Vous ouvrez le backoffice
   ↓
7. Cliquez bouton LEADS (amber)
   ↓
8. Voir détails lead
   ↓
9. Changer statut "contacté"
   ↓
10. Envoyer devis
   ↓
11. Changer statut "devis envoyé"
   ↓
12. Client accepte
   ↓
13. Changer statut "signé"
   ↓
14. Enregistrer prime
   ↓
15. Demander avis client
   ↓
16. Lead archivé ✅
```

---

## ✅ CONFIRMATION FINALE

**TOUT est accessible depuis le backoffice :**
- ✅ Leads (liste complète, filtres, actions)
- ✅ Envoi emails (devis, contrats, avis)
- ✅ Stats temps réel
- ✅ Analytics détaillées
- ✅ Gestion contenu
- ✅ SEO tools
- ✅ Backlinks
- ✅ Partenaires
- ✅ Sécurité
- ✅ Automatisations

**Rien n'a été supprimé. Tout a été amélioré et organisé.**

---

**Besoin d'aide ?**
- Email : team@taxiassur.com
- Tel : 01 80 85 57 86

**Documentation :**
- Ce fichier : `BACKOFFICE-README.md`
- Corrections : `CORRECTIONS-APPLIQUEES.md`
- Déploiement : `DEPLOIEMENT-FINAL-PRET.md`
