# 🚀 ACTIVER L'IA AUTONOME MAINTENANT (30 MINUTES)

## ✅ CE QUI SERA ACTIVÉ

Une fois configuré, l'IA fera **AUTOMATIQUEMENT** :
- 📝 **5 articles/jour** + FAQ + actualités (1825 articles/an)
- 🏙️ **1 page ville/jour** (365 pages/an)
- 📱 **3 posts réseaux sociaux/jour** (1095 posts/an)
- 🔗 **Prospection backlinks hebdo** (52 emails/an)
- 🤝 **Prospection partenariats hebdo** (52 emails/an)
- 📧 **Suivi automatique leads** (relances J+1, J+3, J+7, J+14)
- 🧠 **Auto-apprentissage** (amélioration continue)

**TOUT fonctionne 24/7 sans intervention humaine.**

---

## 🔑 2 CLÉS CRITIQUES À CONFIGURER

### **1. PEXELS_API_KEY** (2 minutes) - CRITIQUE

**Pourquoi ?** Sans image, articles = 0 trafic.

**Comment l'obtenir :**

1. Allez sur : **https://www.pexels.com/api/**
2. Cliquez **"Get Started"**
3. Remplissez le formulaire :
   - First name
   - Last name
   - Email
   - How will you use the API? → **"Blog content images"**
4. Acceptez les termes
5. Validez votre email
6. Une fois connecté, allez dans **"API Keys"**
7. Copiez votre clé (48 caractères)

**Comment la configurer :**

1. Allez sur **Supabase Dashboard** : https://supabase.com/dashboard
2. Sélectionnez votre projet TaxiAssur
3. Menu → **Settings** (⚙️) → **Edge Functions**
4. Section **"Secrets"** → **"Add a new secret"**
5. Remplissez :
   - Name: `PEXELS_API_KEY`
   - Value: [Collez votre clé]
6. Cliquez **"Add secret"**

✅ **C'est fait ! Les images seront automatiquement générées.**

---

### **2. SENDGRID_API_KEY** (10 minutes) - IMPORTANT

**Pourquoi ?** Pour envoyer emails backlinks, partenariats, follow-up leads.

**Comment l'obtenir :**

1. Allez sur : **https://sendgrid.com/**
2. Cliquez **"Start for Free"**
3. Créez un compte (email + mot de passe)
4. Confirmez votre email
5. Une fois connecté :
   - Menu → **Settings** → **API Keys**
   - Cliquez **"Create API Key"**
   - Nom : `TaxiAssur Production`
   - Permissions : **"Full Access"**
   - Cliquez **"Create & View"**
   - **COPIEZ LA CLÉ** (vous ne pourrez plus la revoir)

6. **Vérifier votre domaine** (IMPORTANT) :
   - Menu → **Settings** → **Sender Authentication**
   - Cliquez **"Authenticate Your Domain"**
   - Domaine : `taxiassur.com`
   - Suivez les instructions (ajouter DNS records)
   - Attendez validation (1-24h)

**Comment la configurer :**

1. Allez sur **Supabase Dashboard**
2. Settings → Edge Functions → Secrets
3. Add secret :
   - Name: `SENDGRID_API_KEY`
   - Value: [Collez votre clé SendGrid]
4. Add secret :
   - Name: `SENDGRID_FROM_EMAIL`
   - Value: `contact@taxiassur.com` (ou votre email vérifié)

✅ **C'est fait ! Les emails automatiques fonctionnent.**

---

## 📱 3 CLÉS OPTIONNELLES (RÉSEAUX SOCIAUX)

### **Twitter API** (10 minutes)

1. https://developer.twitter.com/
2. Create App → TaxiAssur Bot
3. Keys and Tokens → Generate
4. Supabase Secrets :
   - `TWITTER_API_KEY`
   - `TWITTER_API_SECRET`
   - `TWITTER_ACCESS_TOKEN`
   - `TWITTER_ACCESS_SECRET`

### **LinkedIn API** (10 minutes)

1. https://www.linkedin.com/developers/
2. Create App → TaxiAssur Bot
3. Auth → Client ID & Secret
4. Supabase Secrets :
   - `LINKEDIN_CLIENT_ID`
   - `LINKEDIN_CLIENT_SECRET`
   - `LINKEDIN_ACCESS_TOKEN`

### **Facebook Page Token** (10 minutes)

1. https://developers.facebook.com/
2. Create App → TaxiAssur Bot
3. Settings → Page Access Token
4. Supabase Secrets :
   - `FACEBOOK_PAGE_ID`
   - `FACEBOOK_ACCESS_TOKEN`

---

## ✅ VÉRIFIER QUE ÇA MARCHE

### **Test 1 : Vérifier les crons actifs**

Exécutez dans Supabase SQL Editor :

```sql
SELECT
  jobname,
  schedule,
  active,
  nodename
FROM cron.job
WHERE active = true
ORDER BY jobname;
```

**Résultat attendu :** Vous devriez voir 13+ crons actifs :
- `ai-master-health-check` (*/5 * * * *)
- `ai-social-daily` (0 6 * * *)
- `auto-followup-leads` (0 10 * * *)
- `backlink-weekly` (0 8 * * 1)
- `daily-blog-generation` (0 4 * * *)
- `daily-city-generation` (0 5 * * *)
- `generate-seo-daily` (0 4 * * *)
- `partner-scraper-weekly` (0 3 * * 3)
- `scan-backlinks-daily` (0 2 * * *)
- `send-outreach-daily` (0 14 * * *)
- `seo-notifier-daily` (0 12 * * *)
- `serp-optimizer-daily` (0 7 * * *)
- `social-morning` (0 9 * * *)
- `social-afternoon` (0 15 * * *)
- `social-evening` (0 19 * * *)

**Si `active = false` pour certains :**

```sql
-- Les réactiver
SELECT cron.schedule(
  'nom-du-cron',
  'schedule',
  $$SELECT 1;$$
);
```

---

### **Test 2 : Forcer une génération manuelle**

Testez si l'edge function `generate-seo-content` fonctionne :

1. Allez sur : `https://drohhxrkoequjphvabvq.supabase.co/functions/v1/generate-seo-content`
2. Ou utilisez le backoffice → Générateur Unifié

**Logs attendus dans la console :**
```
🖼️ Génération image Pexels...
✅ Image générée: https://images.pexels.com/...
✅ Article publié
✅ FAQ publiées
✅ Actualité publiée
```

---

### **Test 3 : Vérifier les articles générés automatiquement**

**Demain à 05h00** (après le premier cron), exécutez :

```sql
SELECT
  title,
  featured_image IS NOT NULL as a_image,
  created_at
FROM blog_posts
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

**Résultat attendu :** 5 nouveaux articles créés automatiquement !

---

### **Test 4 : Vérifier les posts réseaux sociaux**

```sql
SELECT
  platform,
  content,
  published_at
FROM social_posts
WHERE published_at > NOW() - INTERVAL '24 hours'
ORDER BY published_at DESC;
```

**Résultat attendu :** 3 posts/jour automatiquement publiés !

---

### **Test 5 : Vérifier les emails envoyés**

```sql
SELECT
  type,
  recipient_email,
  subject,
  sent_at,
  status
FROM email_logs
WHERE sent_at > NOW() - INTERVAL '7 days'
ORDER BY sent_at DESC;
```

**Résultat attendu :** Emails backlinks/partenariats/follow-up envoyés !

---

## 📊 RÉSULTATS APRÈS 24H

**Ce que vous devriez voir automatiquement :**

- ✅ 5 nouveaux articles blog (04h00)
- ✅ 1 nouvelle page ville (05h00)
- ✅ 3 posts réseaux sociaux (09h, 15h, 19h)
- ✅ Emails follow-up leads (10h00)
- ✅ Dashboard IA Maître mis à jour

**Ce que vous devriez voir après 1 semaine :**

- ✅ 35 articles blog
- ✅ 7 pages ville
- ✅ 21 posts réseaux sociaux
- ✅ 1 email backlinks envoyé (lundi 08h)
- ✅ 1 email partenariat envoyé (mercredi 03h)

---

## 🐛 TROUBLESHOOTING

### **Problème : Aucun article généré automatiquement**

**Solution :**

1. Vérifiez que `OPENAI_API_KEY` est configurée :
```sql
SELECT * FROM pg_settings WHERE name = 'openai.api_key';
```

2. Vérifiez que le cron est actif :
```sql
SELECT * FROM cron.job WHERE jobname = 'daily-blog-generation';
```

3. Forcez l'exécution manuelle :
```sql
SELECT cron.unschedule('daily-blog-generation');
SELECT cron.schedule(
  'daily-blog-generation',
  '0 4 * * *',
  $$
  WITH blog_keywords AS (...)
  -- Voir migration 20251012124757
  $$
);
```

---

### **Problème : Images toujours NULL**

**Solution :** Vérifiez que `PEXELS_API_KEY` est bien configurée :

```
Supabase → Settings → Edge Functions → Secrets → PEXELS_API_KEY
```

Testez manuellement dans le backoffice.

---

### **Problème : Aucun email envoyé**

**Solution :**

1. Vérifiez `SENDGRID_API_KEY` :
```
Supabase → Settings → Edge Functions → Secrets
```

2. Vérifiez que votre domaine est vérifié dans SendGrid

3. Testez l'envoi manuel :
```typescript
// Dans backoffice ou edge function
const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SENDGRID_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: { email: 'contact@taxiassur.com' },
    personalizations: [{
      to: [{ email: 'votre@email.com' }],
      subject: 'Test TaxiAssur'
    }],
    content: [{
      type: 'text/plain',
      value: 'Test automatisation emails'
    }]
  })
});
```

---

### **Problème : Réseaux sociaux ne publient pas**

**Solution :** Les clés API réseaux sociaux sont **optionnelles**.

Si vous ne les configurez pas, les posts sont **stockés en BDD** mais pas publiés sur les plateformes.

Vous pouvez les publier manuellement depuis `social_posts`.

---

## ✅ CHECKLIST FINALE

Avant de dire "C'est activé", vérifiez :

- [ ] `PEXELS_API_KEY` configurée dans Supabase
- [ ] `SENDGRID_API_KEY` configurée dans Supabase
- [ ] Domaine vérifié dans SendGrid
- [ ] 13+ crons actifs dans Supabase
- [ ] Test génération manuelle OK (images + FAQ)
- [ ] Attendu 24h et vérifié nouveaux articles

---

## 🎉 FÉLICITATIONS !

**Votre IA autonome 24/7 est ACTIVE !**

Elle génère et publie automatiquement :
- 📝 1825 articles/an
- 🏙️ 365 pages ville/an
- 📱 1095 posts sociaux/an
- 🔗 52 emails backlinks/an
- 🤝 52 emails partenariats/an
- 📧 Relances automatiques leads

**Vous n'avez PLUS RIEN À FAIRE !**

Juste à récolter les leads et les convertir en clients. 💰

---

## 📞 SUPPORT

Si problème, vérifiez :
1. `AUDIT-COMPLET-ET-CORRECTIONS.md`
2. `SYSTEME-IA-AUTONOME-COMPLET.md`
3. `CONFIGURATION-PEXELS-MAINTENANT.md`
4. Logs Supabase Edge Functions

**L'IA autonome est prête. Il ne manque que 2 clés API !** 🚀
