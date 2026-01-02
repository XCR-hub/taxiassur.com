# 🧪 Guide Test Automatisations Réseaux Sociaux

## ✅ Fonctions Déployées

3 Edge Functions actives :
- `social-media-publisher` ✅
- `linkedin-publisher` ✅  
- `pinterest-publisher` ✅

## ⏰ Prochaines Publications Automatiques

Les crons vont s'exécuter automatiquement :

**Aujourd'hui :**
- 14h00 : Pinterest
- 15h00 : LinkedIn
- 19h00 : Pinterest

**Demain :**
- 9h00 : LinkedIn
- 10h00 : Pinterest
- 14h00 : Pinterest
- 15h00 : LinkedIn
- 19h00 : Pinterest

## 🔍 Vérifier que ça fonctionne

### 1. Attendre la prochaine publication (14h ou 15h)

### 2. Vérifier les posts créés

```sql
SELECT 
  platform,
  status,
  LEFT(content, 200) as apercu,
  created_at
FROM social_posts
ORDER BY created_at DESC
LIMIT 5;
```

### 3. Vérifier les logs

```sql
SELECT 
  automation_name,
  status,
  message,
  created_at
FROM automation_logs
WHERE automation_name LIKE '%social%'
ORDER BY created_at DESC
LIMIT 10;
```

### 4. Vérifier les compteurs

```sql
SELECT 
  platform,
  total_posts,
  last_post_at
FROM social_networks
WHERE platform IN ('linkedin', 'pinterest');
```

## 🚨 Si Ça Ne Marche Pas

### Problème : Pas de posts créés après 14h/15h

**Vérifier la clé OpenAI :**
1. Allez sur Supabase Dashboard
2. Settings > Secrets
3. Vérifiez que `OPENAI_API_KEY` existe
4. Si elle n'existe pas, ajoutez-la :
   - Name: `OPENAI_API_KEY`
   - Value: Votre clé OpenAI (sk-...)

**Vérifier les tokens OAuth :**
```sql
SELECT 
  platform,
  is_connected,
  access_token IS NOT NULL as a_un_token
FROM social_networks
WHERE platform IN ('linkedin', 'pinterest');
```

Si `a_un_token` = false :
- Reconnectez le compte via le backoffice

### Problème : Posts créés mais status = 'failed'

```sql
SELECT 
  platform,
  error_message,
  created_at
FROM social_posts
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 3;
```

Lire le `error_message` pour comprendre le problème.

**Causes fréquentes :**
- Token OAuth expiré → Reconnectez
- Rate limit API → Attendre
- Problème de permissions → Vérifier les scopes OAuth

## ✅ Test Manuel Immédiat

Si vous voulez tester MAINTENANT sans attendre :

```sql
-- Test LinkedIn
SELECT net.http_post(
  url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-publisher',
  headers := jsonb_build_object(
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
    'Content-Type', 'application/json'
  ),
  body := jsonb_build_object('platform', 'linkedin')
);
```

Attendre 10 secondes puis vérifier :

```sql
SELECT * FROM social_posts ORDER BY created_at DESC LIMIT 1;
```

## 📊 Dashboard Stats

Pour voir les performances :

```sql
SELECT * FROM get_social_media_stats();
```

Résultat attendu (après quelques jours) :
```
platform  | total_posts | posts_7d | posts_30d | last_post_at
----------|-------------|----------|-----------|------------------
linkedin  |      14     |    14    |    14     | 2026-01-02 15:00
pinterest |      21     |    21    |    21     | 2026-01-02 19:00
```

## ⚙️ Ajuster les Horaires

Si besoin de changer les heures de publication :

```sql
-- Exemple : LinkedIn matin à 8h au lieu de 9h
SELECT cron.unschedule('linkedin_morning_post');

SELECT cron.schedule(
  'linkedin_morning_post',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-publisher',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('platform', 'linkedin')
  );
  $$
);
```

## 🎯 Résumé

1. ✅ Les fonctions sont déployées
2. ⏰ Les crons sont programmés
3. 🔄 Les publications vont commencer automatiquement
4. 📊 Vérifiez après 14h/15h aujourd'hui
5. 🔍 Utilisez les requêtes SQL ci-dessus pour monitorer

**Tout est prêt ! Le système est autonome.**

---

Date : 2 Janvier 2026
