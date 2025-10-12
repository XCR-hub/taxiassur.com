# 🔑 CONFIGURATION URGENTE - CLÉ OPENAI

## ⚠️ IMPORTANT

**Sans cette configuration, les articles NE SERONT PAS générés automatiquement !**

---

## 📋 ÉTAPES (5 MINUTES)

### 1. Obtenez votre clé OpenAI

Si vous n'avez pas encore de clé :

1. Allez sur https://platform.openai.com/signup
2. Créez un compte (ou connectez-vous)
3. Allez dans **API Keys** : https://platform.openai.com/api-keys
4. Cliquez sur **Create new secret key**
5. Copiez la clé (format : `sk-proj-xxxxx...`)

**⚠️ ATTENTION** : La clé ne s'affiche qu'une seule fois. Sauvegardez-la !

### 2. Configurez la clé dans Supabase

1. Allez sur **Supabase Dashboard** : https://supabase.com/dashboard
2. Sélectionnez votre projet **drohhxrkoequjphvabvq**
3. Dans le menu de gauche : **Project Settings** ⚙️
4. Cliquez sur **Edge Functions** dans le sous-menu
5. Allez dans l'onglet **Secrets**
6. Cliquez sur **Add new secret**

Ajoutez :
```
Name: OPENAI_API_KEY
Value: sk-proj-xxxxx... (votre clé)
```

7. Cliquez sur **Save**

---

## ✅ VÉRIFICATION

### Test manuel immédiat

Connectez-vous à votre Supabase SQL Editor et exécutez :

```sql
-- Test de génération d'article
SELECT net.http_post(
  url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content',
  headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc4Mzc2MCwiZXhwIjoyMDc1MzU5NzYwfQ.4VThS4e4E2YaSrRhuHxvrWICcYSn5su6UpQNJ0Ds4ik", "Content-Type": "application/json"}'::jsonb,
  body := '{"keyword": "assurance taxi électrique 2025", "type": "blog"}'::jsonb
) AS request_id;

-- Attendre 30 secondes puis vérifier
SELECT id, title, created_at FROM blog_posts ORDER BY created_at DESC LIMIT 3;
```

**Si vous voyez un nouvel article** → ✅ Tout fonctionne !

---

## 💰 COÛTS OPENAI

### Tarification GPT-4o

- **Input** : $2.50 / 1M tokens
- **Output** : $10.00 / 1M tokens

### Coût par article

Un article de 1800-2200 mots utilise environ :
- **1500 tokens** en entrée (prompt)
- **2500 tokens** en sortie (article)

**Coût par article** : ~$0.028 (environ 0.026€)

### Budget mensuel estimé

Si génération de **5 articles/jour** :
- **150 articles/mois**
- **Coût** : ~$4.20/mois (environ 3.90€/mois)

**C'est très abordable !**

---

## 🔒 SÉCURITÉ

### Bonnes pratiques

1. ✅ **Ne partagez JAMAIS votre clé OpenAI**
2. ✅ **La clé est stockée en secret Supabase** (sécurisée)
3. ✅ **Utilisez des limites de dépenses** sur OpenAI

### Configurer une limite

Sur OpenAI Dashboard :
1. **Settings** > **Billing** > **Usage limits**
2. Définissez une limite mensuelle (ex: $10)
3. Activez les alertes email

---

## 🚀 APRÈS CONFIGURATION

### Ce qui se passera automatiquement

Chaque jour à **04h00** :
- 5 nouveaux articles générés
- Sauvegardés dans `blog_posts`
- Publiés automatiquement
- Visibles sur https://taxiassur.com/blog

### Vérification quotidienne

Chaque matin, connectez-vous au SQL Editor :

```sql
-- Articles créés aujourd'hui
SELECT id, title, created_at
FROM blog_posts
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;
```

---

## ❓ FAQ

### "Je n'ai pas de carte bancaire pour OpenAI"

**Solution** : Vous pouvez utiliser :
- Une carte prépayée
- Une carte virtuelle (Revolut, N26)
- PayPal (accepté par OpenAI)

### "Les articles ne sont toujours pas générés"

**Checklist** :
1. ✅ Clé OpenAI configurée dans Supabase ?
2. ✅ Extension `pg_cron` activée ? (`SELECT * FROM pg_extension WHERE extname = 'pg_cron'`)
3. ✅ Extension `pg_net` activée ? (`SELECT * FROM pg_extension WHERE extname = 'pg_net'`)
4. ✅ CRON job actif ? (`SELECT * FROM cron.job WHERE jobname = 'daily-content-generation'`)

### "Erreur : OpenAI API key not configured"

**Solution** : La clé n'est pas correctement configurée. Recommencez l'étape 2.

### "Je veux changer la fréquence de génération"

**Modifier le CRON** :
```sql
-- Passer à 3 articles par jour au lieu de 5
-- Éditer le fichier cron-orchestrator/index.ts ligne 75-81
-- Ou modifier le CRON pour qu'il tourne 3 fois par jour :

SELECT cron.unschedule('daily-content-generation');

SELECT cron.schedule(
  'morning-content',
  '0 4 * * *',  -- 04h
  $$ ... $$
);

SELECT cron.schedule(
  'afternoon-content',
  '0 14 * * *',  -- 14h
  $$ ... $$
);

SELECT cron.schedule(
  'evening-content',
  '0 20 * * *',  -- 20h
  $$ ... $$
);
```

---

## 📞 SUPPORT

Si vous rencontrez des problèmes :

1. Vérifiez les logs Supabase : **Database** > **Logs**
2. Vérifiez les logs Edge Functions : **Edge Functions** > **Logs**
3. Testez manuellement avec le SQL ci-dessus

---

## ✅ CHECKLIST FINALE

- [ ] Clé OpenAI obtenue
- [ ] Clé configurée dans Supabase Secrets
- [ ] Test manuel effectué (SQL)
- [ ] Nouvel article visible dans `blog_posts`
- [ ] Budget OpenAI configuré (optionnel mais recommandé)

🎉 **Configuration terminée ! Les articles seront générés automatiquement dès demain 04h00.**
