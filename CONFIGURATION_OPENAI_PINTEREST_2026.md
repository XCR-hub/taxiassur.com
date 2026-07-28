# Configuration OpenAI pour Pinterest/LinkedIn - 20 Février 2026

## ✅ Corrections Appliquées

1. **URLs Supabase corrigées** pour tous les crons Pinterest et LinkedIn
2. **Crons actifs vérifiés** :
   - Pinterest : 3 publications/jour (10h, 14h, 19h)
   - LinkedIn : 2 publications/jour en semaine (9h, 15h)

## 🔑 Configuration Requise : Clé OpenAI

Pour activer les publications automatiques, il faut configurer la clé `OPENAI_API_KEY` dans Supabase.

### Méthode 1 : Via Dashboard Supabase (RECOMMANDÉ)

1. Allez sur : https://supabase.com/dashboard/project/drohhxrkoequjphvabvq/settings/vault

2. Cliquez sur **"New secret"**

3. Remplissez :
   - **Name** : `OPENAI_API_KEY`
   - **Value** : `sk-proj_REDACTED`

4. Cliquez sur **"Add secret"**

### Méthode 2 : Via Supabase CLI

```bash
npx supabase secrets set OPENAI_API_KEY="sk-proj_REDACTED" --project-ref drohhxrkoequjphvabvq
```

## 🧪 Test Manuel

Une fois le secret configuré, testez avec cette requête SQL :

```sql
-- Test publication Pinterest
SELECT net.http_post(
  url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/social-media-publisher',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg"}'::jsonb,
  body := '{"platform": "pinterest", "action": "auto_post"}'::jsonb
);
```

Vérifiez ensuite :

```sql
-- Voir les posts créés
SELECT platform, content, status, created_at
FROM social_posts
WHERE platform = 'pinterest'
ORDER BY created_at DESC
LIMIT 5;
```

## 📅 Calendrier de Publication

### Pinterest (3x/jour, 7j/7)
- 🕙 **10h00** - Pin du matin (infographie/guide)
- 🕑 **14h00** - Pin d'après-midi (conseils/stats)
- 🕖 **19h00** - Pin du soir (témoignage/promo)

### LinkedIn (2x/jour, Lun-Ven)
- 🕘 **09h00** - Post éducatif/informatif
- 🕒 **15h00** - Post engagement/discussion

## ✨ Fonctionnement Automatique

Une fois configuré :
1. Les crons déclenchent `social-media-publisher`
2. OpenAI génère du contenu optimisé
3. Le contenu est publié automatiquement
4. Les statistiques sont trackées dans `social_posts`

## 🔍 Vérification

```sql
-- Voir le statut de connexion
SELECT
  platform,
  is_connected,
  auto_publish,
  total_posts,
  last_post_at
FROM social_networks
WHERE platform IN ('pinterest', 'linkedin');
```

## 🚀 Prochaines Publications

Après configuration, les prochaines publications auront lieu :
- **Pinterest** : Aujourd'hui à 19h00 (si après 14h)
- **LinkedIn** : Demain à 09h00 (si lundi-vendredi)
