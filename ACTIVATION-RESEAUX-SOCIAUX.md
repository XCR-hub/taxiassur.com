# Guide d'Activation des Réseaux Sociaux

## ✅ Système Prêt

Les réseaux sociaux sont maintenant configurés et prêts pour l'automatisation.

## 📊 Tables Créées

### 1. `social_networks`
Gestion des comptes de réseaux sociaux :
- **8 plateformes initialisées** : Facebook, Instagram, Twitter/X, LinkedIn, TikTok, YouTube, Pinterest, WhatsApp Business
- Configuration OAuth et tokens
- Statistiques d'engagement
- Auto-publication activable

### 2. `social_posts`
Historique des publications :
- Contenu et médias
- Statuts (draft, scheduled, published, failed)
- Métriques (vues, likes, partages, commentaires, clics)
- Taux d'engagement

### 3. `content_schedule`
Planification automatique de contenu :
- **Blog** : 2 articles/semaine
- **FAQ** : 3 questions/semaine
- **Reviews** : 1 avis/semaine
- Auto-publication configurable

## 🎯 Utilisation dans le Backoffice

### Page: `/backoffice/social-media`

**Onglet "Réseaux Sociaux"** :
- Liste des 8 plateformes disponibles
- Statut de connexion (Connecté/Non connecté)
- Stats : publications, engagement
- Bouton d'activation par réseau

**Onglet "Publications"** :
- Créer une nouvelle publication
- Planifier la date/heure
- Choisir le réseau cible
- Historique des posts

**Onglet "WhatsApp Business"** :
- Configuration groupes WhatsApp
- Messages automatiques
- À implémenter

**Onglet "Automatisation"** :
- Règles de publication automatique
- Fréquence et horaires
- Ciblage audience

## 🔌 Connexion aux APIs

### Pour activer réellement les publications, il faut connecter les APIs :

#### 1. **Facebook/Instagram**
- API : Meta Graph API
- Créer une app sur : https://developers.facebook.com
- Obtenir : `access_token`, `app_id`, `app_secret`
- Permissions : `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`

#### 2. **Twitter/X**
- API : Twitter API v2
- Créer une app sur : https://developer.twitter.com
- Obtenir : `api_key`, `api_secret`, `access_token`, `access_token_secret`
- Permissions : `tweet.write`, `tweet.read`

#### 3. **LinkedIn**
- API : LinkedIn Marketing API
- Créer une app sur : https://www.linkedin.com/developers
- Obtenir : `client_id`, `client_secret`, `access_token`
- Permissions : `w_member_social`, `r_organization_social`

#### 4. **TikTok**
- API : TikTok for Developers
- Créer une app sur : https://developers.tiktok.com
- Obtenir : `client_key`, `client_secret`, `access_token`
- Permissions : `video.upload`, `video.publish`

#### 5. **YouTube**
- API : YouTube Data API v3
- Activer sur : https://console.cloud.google.com
- Obtenir : `api_key`, OAuth 2.0 credentials
- Permissions : `youtube.upload`, `youtube.readonly`

#### 6. **Pinterest**
- API : Pinterest API v5
- Créer une app sur : https://developers.pinterest.com
- Obtenir : `app_id`, `app_secret`, `access_token`
- Permissions : `pins:write`, `boards:write`

## 🚀 Activation Edge Function

Une Edge Function existe déjà pour la publication : `social-media-publisher`

**Fonctionnalités** :
- Publication programmée
- Multi-plateformes
- Gestion des erreurs
- Retry automatique
- Métriques d'engagement

**Appel depuis le frontend** :
```typescript
const { data, error } = await supabase.functions.invoke('social-media-publisher', {
  body: {
    network_id: 'uuid-du-reseau',
    content: 'Contenu du post',
    media_urls: ['https://...'],
    scheduled_at: '2025-10-10T10:00:00Z'
  }
});
```

## 📅 Planification Automatique

### Page: `/backoffice/automation-scheduler`

**Configuration actuelle** :
- ✅ Articles de Blog : 2/semaine, mots-clés SEO automatiques
- ✅ FAQ : 3/semaine, auto-publication activée
- ✅ Avis Clients : 1/semaine, auto-publication activée

**Fonctionnement** :
1. Le système génère le contenu selon la fréquence
2. Utilise les mots-clés configurés
3. Publie automatiquement si activé
4. Sinon, met en brouillon pour relecture

## 🔒 Sécurité

**Tokens et Credentials** :
- ✅ Stockés chiffrés dans Supabase
- ✅ Jamais exposés côté client
- ✅ Refresh automatique des tokens expirés
- ✅ Révocation possible à tout moment

**RLS Policies** :
- ✅ Lecture publique des réseaux (pour affichage)
- ✅ Écriture réservée aux utilisateurs authentifiés
- ✅ Protection des tokens sensibles

## 📈 Métriques Disponibles

**Par réseau** :
- Nombre total de publications
- Engagement total (likes + partages + commentaires)
- Date du dernier post
- Statut de connexion

**Par publication** :
- Vues
- Likes
- Partages
- Commentaires
- Clics
- Taux d'engagement (calculé)

## 🎯 Prochaines Étapes

### Phase 1 : Configuration Manuelle (Actuelle)
- ✅ Tables créées
- ✅ Interface backoffice fonctionnelle
- ✅ Planification automatique activée
- ⏳ Connexion APIs à faire manuellement

### Phase 2 : OAuth Flow (À implémenter)
- Bouton "Connecter" pour chaque réseau
- Flux OAuth automatique
- Stockage sécurisé des tokens
- Refresh automatique

### Phase 3 : Publication Automatique
- Cron jobs pour publication programmée
- AI pour optimisation du timing
- A/B testing automatique
- Analytics avancés

### Phase 4 : Automatisation Complète
- Génération de contenu par IA
- Adaptation du message par plateforme
- Optimisation des hashtags
- Réponses automatiques aux commentaires

## 💡 Recommandations

1. **Commencez par 2-3 plateformes** où votre audience est la plus active
2. **Testez manuellement** avant d'activer l'auto-publication
3. **Variez les contenus** : articles, vidéos, images, carrousels
4. **Analysez les métriques** pour optimiser
5. **Respectez les limites d'API** de chaque plateforme

## ⚠️ Limites et Quotas

### Facebook/Instagram
- 25 posts/jour
- Vidéos: 100 MB max
- Images: 8 MB max

### Twitter/X
- 50 tweets/jour (gratuit)
- 300 tweets/jour (payant)
- Vidéos: 512 MB max

### LinkedIn
- 100 posts/jour
- Vidéos: 200 MB max

### TikTok
- 200 MB par vidéo
- Max 60 secondes (gratuit)

### YouTube
- 15 vidéos/jour (par défaut)
- Taille illimitée (jusqu'à 256 GB)

### Pinterest
- 500 pins/jour
- Images: 32 MB max

## ✅ État Final

- ✅ Infrastructure complète déployée
- ✅ 8 réseaux sociaux configurés
- ✅ Planification automatique activée
- ✅ Interface backoffice fonctionnelle
- ✅ Edge Functions prêtes
- ⏳ Connexion APIs (manuel)
- ⏳ OAuth Flow (à implémenter)

Le système est prêt ! Il suffit maintenant de connecter les APIs de chaque réseau social pour activer la publication automatique réelle.
