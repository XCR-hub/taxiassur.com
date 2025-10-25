# 🎯 Solution Google Search Console SANS Webhook

## ❌ Le Problème

Tu n'as pas "Paramètres → Autres paramètres → Notifications → Ajouter un webhook" dans ton Google Search Console.

**Pourquoi ?**
- Cette fonctionnalité est récente et pas disponible pour tous les comptes
- Elle nécessite parfois un compte Google Workspace ou un niveau d'accès spécifique
- L'interface peut varier selon la version de GSC que tu utilises

**Pas de problème !** Il existe une meilleure solution : **Utiliser l'API Google Search Console directement** 🚀

---

## ✅ Solution Alternative : API Google Search Console

Au lieu d'attendre les webhooks, on va **interroger l'API directement** pour récupérer :
- Pages indexées
- Erreurs d'indexation
- Performances (impressions, clics, CTR)
- Position moyenne

**Avantages** :
- ✅ Plus fiable qu'un webhook
- ✅ Contrôle total sur les données
- ✅ Fonctionne pour TOUS les comptes GSC
- ✅ Données en temps réel sur demande

---

## 🔑 Étape 1 : Créer une Clé API Google Search Console

### 1.1 Activer l'API

1. Va sur : https://console.cloud.google.com/apis/library
2. Cherche **"Google Search Console API"**
3. Clique sur **"Activer"** (Enable)

### 1.2 Créer une Clé API

1. Va sur : https://console.cloud.google.com/apis/credentials
2. Clique **"Créer des identifiants"** → **"Clé API"**
3. **Copie la clé** générée (ex: `AIzaSyB1234...`)
4. Clique **"Restreindre la clé"** (recommandé)
5. Dans **"Restrictions relatives aux API"** :
   - Sélectionne **"Restreindre la clé"**
   - Coche **"Google Search Console API"**
6. Clique **"Enregistrer"**

### 1.3 Ajouter la Clé dans Supabase

1. Va sur : https://drohhxrkoequjphvabvq.supabase.co
2. Menu **"Project Settings"** → **"Edge Functions"** → **"Secrets"**
3. Ajoute un nouveau secret :
   - Nom : `GOOGLE_SEARCH_CONSOLE_API_KEY`
   - Valeur : Ta clé API (celle copiée à l'étape 1.2)
4. Clique **"Save"**

---

## 🔧 Étape 2 : Configuration dans ton Projet

### 2.1 Ajouter la Clé dans .env

Ouvre ton fichier `.env` et ajoute :

```env
VITE_GOOGLE_SEARCH_CONSOLE_API_KEY=AIzaSyB1234... # Ta clé API
```

### 2.2 Vérifier dans Supabase

Ta clé doit aussi être dans **Supabase Secrets** :
- Nom : `GOOGLE_SEARCH_CONSOLE_API_KEY`
- Valeur : Ta clé API

---

## 🚀 Étape 3 : Tester la Configuration

### Dans le Backoffice

1. Va sur : https://taxiassur.fr/backoffice/seo
2. Clique sur le bouton **"🔄 Rafraîchir Données SEO"**
3. Patiente 3-5 secondes
4. Les données se mettent à jour automatiquement !

**Tu devrais voir** :
- ✅ Nombre de pages indexées (données réelles)
- ✅ Pages en attente
- ✅ Position moyenne
- ✅ Badge "✅ Données réelles depuis Google Search Console"

### Via SQL (Pour débugger)

Dans Supabase SQL Editor :

```sql
-- Déclencher un rafraîchissement
SELECT trigger_seo_refresh();

-- Voir les métriques
SELECT * FROM seo_metrics
ORDER BY last_update DESC
LIMIT 1;
```

---

## 🤖 Automatisation

L'Edge Function `seo-daily-refresh` va automatiquement :
- Se déclencher **toutes les 2 heures**
- Interroger l'API Google Search Console
- Récupérer les métriques
- Mettre à jour la base de données

Tu n'as **rien à faire** ! Les données sont rafraîchies automatiquement.

---

## 📊 Ce Que Tu Obtiens

Avec cette solution, tu obtiens AUTOMATIQUEMENT :

### Données Indexation
- Nombre total d'URLs sur le site
- Pages indexées par Google
- Pages en attente d'indexation
- Erreurs d'indexation (404, 500, etc.)

### Données Performances
- Impressions (30 derniers jours)
- Clics (30 derniers jours)
- CTR (taux de clic)
- Position moyenne dans les résultats

### Automatisations Déclenchées
- Alerte si baisse significative de pages indexées
- Notification si erreurs d'indexation détectées
- Rapport hebdomadaire automatique

---

## 🔍 Vérification

### Dans le Backoffice SEO

1. Va sur : https://taxiassur.fr/backoffice/seo
2. Tu devrais voir :
   - **Badge vert** : "✅ Données réelles depuis Google Search Console"
   - **Dernière mise à jour** : Date/heure du dernier refresh
   - **Métriques réelles** : Pages indexées, position moyenne, etc.

### Dans Supabase

```sql
-- Voir les logs de synchronisation
SELECT
  last_update,
  total_urls,
  indexed_pages,
  impressions_30d,
  clicks_30d,
  average_position
FROM seo_metrics
ORDER BY last_update DESC
LIMIT 10;
```

---

## ⚙️ Configuration Avancée

### Changer la Fréquence de Rafraîchissement

Par défaut : **Toutes les 2 heures**

Pour changer :

1. Va dans Supabase SQL Editor
2. Exécute :

```sql
-- Passer à toutes les heures
SELECT cron.schedule(
  'seo-hourly-refresh',
  '0 * * * *', -- Chaque heure à minute 0
  $$SELECT trigger_seo_refresh()$$
);

-- Ou toutes les 6 heures
SELECT cron.schedule(
  'seo-6hourly-refresh',
  '0 */6 * * *', -- Toutes les 6 heures
  $$SELECT trigger_seo_refresh()$$
);
```

### Ajouter des Alertes Email

Tu peux configurer des alertes automatiques :

```sql
-- Alerte si moins de 50 pages indexées
CREATE OR REPLACE FUNCTION check_seo_alerts()
RETURNS void AS $$
DECLARE
  indexed_count INTEGER;
BEGIN
  SELECT indexed_pages INTO indexed_count
  FROM seo_metrics
  ORDER BY last_update DESC
  LIMIT 1;

  IF indexed_count < 50 THEN
    -- Envoyer email d'alerte
    PERFORM net.http_post(
      url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/send-email',
      body := jsonb_build_object(
        'to', 'contact@taxiassur.com',
        'subject', '⚠️ Alerte SEO : Baisse indexation',
        'text', 'Attention ! Seulement ' || indexed_count || ' pages indexées.'
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## 🆚 Comparaison Webhook vs API

| Critère | Webhook | API (Notre solution) |
|---------|---------|---------------------|
| **Disponibilité** | ❌ Pas tous comptes | ✅ Tous comptes |
| **Configuration** | ❌ Complexe | ✅ Simple |
| **Fiabilité** | ⚠️ Moyenne | ✅ Excellente |
| **Données** | ⚠️ Événements uniquement | ✅ Toutes métriques |
| **Temps réel** | ✅ Oui | ⚠️ Toutes les 2h |
| **Contrôle** | ❌ Limité | ✅ Total |

**Verdict** : L'API est la meilleure solution ! 🏆

---

## 🐛 Dépannage

### Erreur "API Key Invalid"

**Solution** :
1. Vérifie que la clé est correcte dans `.env`
2. Vérifie que la clé est dans Supabase Secrets
3. Vérifie que l'API Google Search Console est bien activée
4. Vérifie que la clé n'est pas restreinte trop fortement

### Aucune Donnée Récupérée

**Solution** :
1. Vérifie que ton site est bien vérifié dans Google Search Console
2. Attends 24-48h après ajout du site (Google a besoin de temps)
3. Vérifie les logs dans Supabase :
   ```sql
   SELECT * FROM seo_webhook_logs
   ORDER BY received_at DESC
   LIMIT 10;
   ```

### Données Toujours "Estimées"

**Solution** :
1. Clique manuellement sur "🔄 Rafraîchir Données SEO"
2. Patiente 5 secondes
3. Recharge la page
4. Si toujours estimées, vérifie les logs Supabase

---

## 📚 Ressources

- [Google Search Console API Documentation](https://developers.google.com/webmaster-tools/search-console-api-original)
- [Google Cloud Console](https://console.cloud.google.com)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## 🎯 Résumé Express

**3 étapes pour remplacer le webhook** :

1. **Activer l'API** Google Search Console dans Google Cloud Console
2. **Créer une clé API** et l'ajouter dans Supabase Secrets
3. **Tester** avec le bouton "🔄 Rafraîchir Données SEO" dans le backoffice

**Résultat** :
- ✅ Données Google Search Console récupérées automatiquement toutes les 2h
- ✅ Bouton manuel pour refresh immédiat
- ✅ Métriques réelles affichées dans le backoffice
- ✅ Pas besoin de webhook !

**C'est même MIEUX qu'un webhook !** 🚀

---

## ✅ Checklist

Avant de terminer, vérifie :

- [ ] API Google Search Console activée dans Google Cloud Console
- [ ] Clé API créée et copiée
- [ ] Clé ajoutée dans Supabase Secrets (`GOOGLE_SEARCH_CONSOLE_API_KEY`)
- [ ] Clé ajoutée dans `.env` (`VITE_GOOGLE_SEARCH_CONSOLE_API_KEY`)
- [ ] Test effectué avec le bouton "Rafraîchir Données SEO"
- [ ] Données réelles affichées dans le backoffice ✅

**Si tous les points sont cochés → PARFAIT ! 🎉**
