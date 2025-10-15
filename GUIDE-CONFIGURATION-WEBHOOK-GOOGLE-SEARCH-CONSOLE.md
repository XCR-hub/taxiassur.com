# 📍 Guide Configuration Webhook Google Search Console

## 🎯 Objectif

Configurer le webhook pour recevoir automatiquement les notifications de Google Search Console (indexation, erreurs, performances) directement dans ton système.

---

## 📋 Prérequis

1. ✅ Compte Google Search Console avec ton site vérifié
2. ✅ Accès aux paramètres avancés de Google Search Console
3. ✅ L'URL de ton webhook Supabase (voir ci-dessous)

---

## 🔗 URL du Webhook à Configurer

Ton URL webhook Supabase est :

```
https://drohhxrkoequjphvabvq.supabase.co/functions/v1/seo-webhook-receiver
```

**⚠️ IMPORTANT** : Copie cette URL exactement, elle est déjà configurée et prête à recevoir les notifications.

---

## 📝 Étapes de Configuration dans Google Search Console

### Étape 1 : Accès à Google Search Console

1. Va sur : https://search.google.com/search-console
2. Sélectionne ta propriété : `taxiassur.fr`
3. Connecte-toi si nécessaire

### Étape 2 : Accès aux Paramètres

Dans le menu latéral gauche :
1. Clique sur **Paramètres** (icône engrenage ⚙️ en bas)
2. Le panneau de paramètres s'ouvre

### Étape 3 : Configuration des Notifications

Dans les paramètres :
1. Clique sur l'onglet **"Autres paramètres"**
2. Cherche la section **"Notifications"**
3. Clique sur **"Gérer les notifications"**

### Étape 4 : Ajouter le Webhook

1. Clique sur **"Ajouter un webhook"**
2. Dans le champ **"URL du webhook"**, colle :
   ```
   https://drohhxrkoequjphvabvq.supabase.co/functions/v1/seo-webhook-receiver
   ```
3. Sélectionne les types d'événements à recevoir :
   - ✅ **Erreurs d'indexation** (recommandé)
   - ✅ **Changements de statut** (recommandé)
   - ✅ **Problèmes de sécurité** (recommandé)
   - ⬜ **Performances** (optionnel, peut générer beaucoup de notifications)

4. Clique sur **"Envoyer un test"** pour vérifier que ça fonctionne
5. Si le test réussit ✅, clique sur **"Enregistrer"**

---

## 🔍 Vérification de la Configuration

### Test Immédiat

1. Dans Google Search Console, clique sur **"Envoyer un test"**
2. Tu devrais recevoir une confirmation que le webhook a bien reçu la notification

### Vérification dans Supabase

1. Va sur : https://drohhxrkoequjphvabvq.supabase.co
2. Menu **"Table Editor"** → Table **`seo_webhook_logs`**
3. Tu devrais voir les notifications reçues avec :
   - `event_type` : Type d'événement (test, indexation, erreur)
   - `payload` : Données JSON de la notification
   - `received_at` : Date/heure de réception

### Vérification dans le Backoffice

1. Va dans ton backoffice : https://taxiassur.fr/backoffice/seo
2. Section **"Actions SEO"**
3. Le message **"⚠️ Webhook non configuré"** devrait disparaître après la première notification reçue
4. Tu verras apparaître les événements reçus en temps réel

---

## 📊 Ce Que le Webhook Reçoit

Le webhook reçoit automatiquement :

### 1. Erreurs d'Indexation
- Pages bloquées par robots.txt
- Erreurs 404 (pages non trouvées)
- Erreurs serveur (500, 503)
- Problèmes de redirections

### 2. Changements de Statut
- Pages nouvellement indexées
- Pages supprimées de l'index
- Changements de canoniques

### 3. Problèmes de Sécurité
- Malware détecté
- Phishing détecté
- Hacking détecté

### 4. Performances (si activé)
- Changements significatifs de trafic
- Nouvelles requêtes top
- Baisse/hausse de positions

---

## 🛠️ Que Fait le Webhook ?

Quand une notification arrive, le système :

1. ✅ **Reçoit** la notification de Google
2. ✅ **Enregistre** dans la table `seo_webhook_logs`
3. ✅ **Analyse** le type d'événement
4. ✅ **Déclenche** des actions automatiques si nécessaire :
   - Erreur 404 → Crée une redirection automatique
   - Nouvelle page indexée → Met à jour les métriques
   - Problème de sécurité → Alerte immédiate par email

5. ✅ **Affiche** dans le backoffice SEO pour monitoring

---

## 🔧 Configuration Avancée (Optionnel)

### Personnaliser les Actions Automatiques

Modifie le fichier :
```
supabase/functions/seo-webhook-receiver/index.ts
```

Exemples de personnalisations :
- Envoyer un email pour certains événements
- Créer un ticket automatique dans ton CRM
- Déclencher un re-crawl automatique
- Envoyer une notification Slack/Discord

### Ajouter des Filtres

Tu peux filtrer les événements reçus :
```typescript
// Dans seo-webhook-receiver/index.ts
if (eventType === 'INDEXATION_ERROR' && errorCode === '404') {
  // Action spécifique pour les 404
  await createAutoRedirect(pageUrl);
}
```

---

## 📈 Monitoring et Statistiques

### Dans le Backoffice

Va sur : https://taxiassur.fr/backoffice/seo

Tu verras :
- **Nombre de notifications reçues** (dernières 24h)
- **Types d'événements** reçus
- **Pages concernées**
- **Actions automatiques** déclenchées

### Dans Supabase

Requête pour voir toutes les notifications :
```sql
SELECT
  event_type,
  COUNT(*) as total,
  MAX(received_at) as last_received
FROM seo_webhook_logs
GROUP BY event_type
ORDER BY total DESC;
```

### Notifications par Jour

```sql
SELECT
  DATE(received_at) as date,
  COUNT(*) as notifications
FROM seo_webhook_logs
GROUP BY DATE(received_at)
ORDER BY date DESC
LIMIT 30;
```

---

## ❌ Dépannage

### Le test de webhook échoue

**Causes possibles** :
1. URL webhook incorrecte → Vérifie qu'elle est bien copiée
2. Edge Function non déployée → Vérifie dans Supabase Edge Functions
3. Problème de CORS → Vérifie les headers CORS dans l'edge function

**Solution** :
```bash
# Redéployer l'edge function
cd supabase/functions/seo-webhook-receiver
# Vérifier qu'elle existe et fonctionne
```

### Aucune notification reçue

**Vérifications** :
1. Le webhook est bien configuré dans Google Search Console
2. Les types d'événements sont bien sélectionnés
3. Ton site a des événements à notifier (erreurs, nouvelles pages)

**Forcer un test** :
- Dans Google Search Console → Inspection d'URL
- Demande une indexation → Ça devrait déclencher une notification

### Trop de notifications

**Réduire le volume** :
1. Désactive les notifications de performance
2. Configure des filtres dans l'edge function
3. Active uniquement les événements critiques

---

## 🎯 Résumé Rapide

**3 étapes simples** :

1. **Google Search Console** → Paramètres → Notifications
2. **Ajouter webhook** : `https://drohhxrkoequjphvabvq.supabase.co/functions/v1/seo-webhook-receiver`
3. **Envoyer test** → Enregistrer

**C'est tout !** Ton système reçoit maintenant les notifications de Google automatiquement.

---

## 📚 Ressources

- [Documentation Google Search Console Webhooks](https://developers.google.com/search/docs/advanced/crawling/webhooks)
- [Documentation Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- Guide interne : `GUIDE-SOUMISSION-SITEMAPS-AUTO.md`

---

## 💡 Conseils Pro

1. **Active d'abord uniquement les erreurs d'indexation** pour tester
2. **Surveille les 7 premiers jours** pour voir le volume de notifications
3. **Ajuste les filtres** en fonction de tes besoins réels
4. **Configure des alertes email** pour les événements critiques (sécurité)
5. **Archive les anciennes notifications** (> 90 jours) pour garder la base propre

---

## ✅ Checklist Finale

Avant de valider, vérifie :

- [ ] URL webhook copiée correctement
- [ ] Webhook ajouté dans Google Search Console
- [ ] Test webhook envoyé et réussi ✅
- [ ] Première notification reçue dans Supabase
- [ ] Événements sélectionnés selon tes besoins
- [ ] Webhook enregistré et actif

**Si tous les points sont cochés → C'EST BON ! 🎉**

Ton système reçoit maintenant automatiquement les notifications de Google Search Console !
