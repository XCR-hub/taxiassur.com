# Système de Tracking d'Emails IONOS Complet

## Vue d'ensemble

Ce système remplace **complètement** les fonctionnalités de tracking de Brevo, **GRATUITEMENT** !

### Ce que vous gagnez vs Brevo

✅ **0€/mois** au lieu de 25-50€
✅ **Illimité** : Pas de limite d'emails
✅ **Vos données** : Tout dans votre base Supabase
✅ **Contrôle total** : Personnalisable à 100%

---

## Architecture du système

### 1. Tables de base de données

#### `email_sends`
Enregistre tous les emails envoyés avec leur tracking_id unique.

**Colonnes importantes :**
- `tracking_id` : UUID unique pour tracker cet email
- `status` : sent → opened → clicked → replied
- `lead_id` : Référence vers le lead
- `email_to` / `email_from`
- `subject` / `body_html`

#### `email_opens`
Enregistre chaque ouverture d'email avec IP et user-agent.

#### `email_clicks`
Enregistre chaque clic sur un lien avec l'URL destination.

#### `email_replies`
Enregistre les réponses reçues avec analyse de sentiment.

---

## Fonctionnalités

### 1. 📊 Tracking des ouvertures

**Comment ça marche :**
Un pixel invisible 1x1 est inséré dans chaque email :
```html
<img src="https://votre-projet.supabase.co/functions/v1/track-email-open?id={tracking_id}" />
```

Quand l'email est ouvert, le pixel est chargé et enregistre l'ouverture.

**Edge Function :** `track-email-open`

**Données collectées :**
- Date et heure d'ouverture
- Adresse IP
- User-Agent (appareil/navigateur)
- Nombre d'ouvertures

---

### 2. 🖱️ Tracking des clics

**Comment ça marche :**
Tous les liens dans les emails sont automatiquement transformés :

**Avant :**
```html
<a href="https://taxiassur.com/page">Cliquez ici</a>
```

**Après :**
```html
<a href="https://votre-projet.supabase.co/functions/v1/track-email-click?id={tracking_id}&url=https%3A%2F%2Ftaxiassur.com%2Fpage">Cliquez ici</a>
```

Quand le prospect clique :
1. Le clic est enregistré
2. Il est redirigé vers l'URL originale

**Edge Function :** `track-email-click`

**Données collectées :**
- URL cliquée
- Date et heure du clic
- Adresse IP
- User-Agent

---

### 3. 📧 Récupération des réponses

**Comment ça marche :**
Un système IMAP se connecte à votre boîte email IONOS et récupère les réponses.

**Edge Function :** `fetch-email-replies`

**Traitement automatique :**
1. Connexion IMAP à `imap.ionos.fr`
2. Récupération des emails non lus
3. Association avec le lead correspondant
4. Analyse de sentiment (positif/négatif/neutre)
5. Notification de l'équipe

**Planification :**
- Automatique toutes les heures via cron job
- Manuel via bouton dans le dashboard

**Analyse de sentiment :**
```typescript
// Positif si contient :
'intéressé', 'merci', 'parfait', 'super', 'oui'

// Négatif si contient :
'non', 'pas intéressé', 'stop', 'désabonner'
```

---

### 4. 📈 Dashboard de statistiques

**Accès :** `/backoffice/email-tracking`

**Métriques affichées :**
- Taux d'ouverture global
- Taux de clic global
- Taux de réponse global
- Liste des emails récents avec leur statut
- Liste des réponses reçues avec sentiment

**Fonctionnalités :**
- Actualisation automatique toutes les 30 secondes
- Bouton manuel pour récupérer les réponses
- Filtrage par statut
- Vue détaillée par email

---

## Configuration requise

### Variables d'environnement

Déjà configurées dans Supabase :
```bash
IONOS_EMAIL_USER=team@taxiassur.com
IONOS_EMAIL_PASSWORD=votre_mot_de_passe
IONOS_IMAP_HOST=imap.ionos.fr
SUPABASE_URL=votre_url
SUPABASE_SERVICE_ROLE_KEY=votre_clé
```

---

## Edge Functions déployées

### 1. `track-email-open`
- **Public** (pas de JWT requis)
- Retourne un pixel 1x1 transparent
- Enregistre l'ouverture dans `email_opens`
- Met à jour le statut de l'email

### 2. `track-email-click`
- **Public** (pas de JWT requis)
- Enregistre le clic dans `email_clicks`
- Redirige vers l'URL cible
- Met à jour le statut de l'email

### 3. `fetch-email-replies`
- **Authentifié** (JWT requis)
- Se connecte via IMAP à IONOS
- Parse les emails reçus
- Enregistre dans `email_replies`
- Marque les emails comme lus

### 4. `send-email-ionos` (modifié)
- Enregistre l'email dans `email_sends`
- Ajoute le pixel de tracking
- Transforme tous les liens en liens trackés
- Envoie via SMTP IONOS

---

## Flux de données complet

### Envoi d'email
```
1. Nouveau lead créé
   ↓
2. send-email-ionos déclenché
   ↓
3. Création du tracking_id
   ↓
4. Insertion dans email_sends
   ↓
5. Ajout pixel + transformation liens
   ↓
6. Envoi SMTP via IONOS
```

### Ouverture d'email
```
1. Client ouvre l'email
   ↓
2. Pixel chargé automatiquement
   ↓
3. GET /track-email-open?id={tracking_id}
   ↓
4. Insertion dans email_opens
   ↓
5. Trigger → update email_sends.status = 'opened'
```

### Clic sur lien
```
1. Client clique sur un lien
   ↓
2. GET /track-email-click?id={tracking_id}&url={url}
   ↓
3. Insertion dans email_clicks
   ↓
4. Trigger → update email_sends.status = 'clicked'
   ↓
5. Redirection vers l'URL cible
```

### Réception de réponse
```
1. Client répond à l'email
   ↓
2. Email reçu sur team@taxiassur.com
   ↓
3. Cron job horaire déclenche fetch-email-replies
   ↓
4. Connexion IMAP
   ↓
5. Parse de l'email
   ↓
6. Association avec le lead
   ↓
7. Analyse de sentiment
   ↓
8. Insertion dans email_replies
   ↓
9. Trigger → update email_sends.status = 'replied'
   ↓
10. Email marqué comme lu
```

---

## Avantages par rapport à Brevo

| Fonctionnalité | Brevo | Notre système |
|---------------|-------|---------------|
| Coût mensuel | 25-50€ | 0€ |
| Tracking ouvertures | ✅ | ✅ |
| Tracking clics | ✅ | ✅ |
| Récupération réponses | ✅ (webhook payant) | ✅ (IMAP gratuit) |
| Analyse sentiment | ❌ | ✅ |
| Données dans notre DB | ❌ | ✅ |
| Personnalisable | Limité | 100% |
| Limite d'envois | Oui | Non |

---

## Utilisation

### Envoi automatique
Les emails sont automatiquement trackés quand un lead est créé.

### Consultation des stats
1. Allez sur `/backoffice/email-tracking`
2. Visualisez les statistiques en temps réel
3. Cliquez sur "Récupérer les réponses" pour forcer une synchronisation

### Traitement des réponses
1. Les réponses apparaissent dans le dashboard
2. Sentiment automatiquement analysé
3. Cliquez sur une réponse pour la marquer comme traitée
4. Le lead est automatiquement mis à jour

---

## Maintenance

### Logs
Tous les logs sont dans Supabase Edge Functions :
```bash
# Voir les logs d'une fonction
supabase functions logs track-email-open
supabase functions logs track-email-click
supabase functions logs fetch-email-replies
```

### Monitoring
- Dashboard Supabase pour voir l'activité
- Vérifier régulièrement `email_replies.is_processed = false`
- Surveiller les taux d'ouverture/clic

### Troubleshooting

**Problème : Les ouvertures ne sont pas trackées**
- Vérifier que le pixel est bien dans l'email
- Certains clients email bloquent les images par défaut
- Normal si le client lit en mode texte

**Problème : Les clics ne sont pas trackés**
- Vérifier la transformation des liens
- Tester manuellement l'URL de tracking

**Problème : Les réponses ne sont pas récupérées**
- Vérifier les credentials IMAP IONOS
- Tester manuellement la fonction `fetch-email-replies`
- Vérifier les logs de la fonction

---

## Évolutions futures possibles

1. **Géolocalisation des ouvertures** : Utiliser l'IP pour détecter la localisation
2. **A/B Testing** : Tester différents sujets/contenus
3. **Notifications push** : Alertes temps réel quand un email important est ouvert
4. **Score d'engagement** : Calculer un score par lead basé sur les interactions
5. **Templates intelligents** : Adapter le contenu selon l'engagement

---

## Conclusion

Vous avez maintenant un système de tracking d'emails **professionnel**, **gratuit** et **illimité** qui remplace Brevo !

Toutes les données sont dans votre base Supabase, vous avez un contrôle total et c'est 100% personnalisable.

**Prochaine étape :** Tester l'envoi d'un email et vérifier le tracking !
