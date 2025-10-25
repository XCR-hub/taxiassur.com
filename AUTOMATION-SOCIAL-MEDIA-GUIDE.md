# 🚀 GUIDE COMPLET - AUTOMATISATION RÉSEAUX SOCIAUX

## Vue d'ensemble

Ce guide vous explique comment automatiser la publication sur **50+ réseaux sociaux** simultanément avec Make.com ou Zapier.

---

## 🎯 Objectif

**Publier automatiquement sur tous les réseaux sociaux dès qu'un nouveau contenu est créé** (article blog, offre, actualité, etc.)

### Avantages
- ✅ **Gain de temps :** Publier 1 fois = diffusion sur 50+ réseaux
- ✅ **Cohérence :** Message uniforme partout
- ✅ **SEO :** Backlinks massifs + signaux sociaux puissants
- ✅ **Portée :** Toucher tous les canaux simultanément
- ✅ **Tracking :** Analytics centralisées dans le backoffice

---

## 📊 RÉSEAUX DISPONIBLES (50+)

### Haute Autorité (DA 90+)
- **Facebook** (DA 100) - DoFollow
- **YouTube** (DA 100) - DoFollow
- **LinkedIn** (DA 99) - NoFollow
- **Google Business Profile** (DA 100) - DoFollow
- **Instagram** (DA 94)
- **X/Twitter** (DA 94)
- **Bing Places** (DA 95)
- **Quora** (DA 93)
- **Medium** (DA 95)
- **Pinterest** (DA 92) - DoFollow

### Autorité Moyenne (DA 80-89)
- **TikTok** (DA 93)
- **Trustpilot** (DA 92)
- **Yelp** (DA 93)
- **Tumblr** (DA 90) - DoFollow
- **Reddit** (DA 91)
- **Telegram** (DA 88)
- **WhatsApp Business** (DA 95)

### Tous les réseaux
Consultez la table `social_networks` dans le backoffice pour voir les 50+ réseaux disponibles.

---

## 🛠️ OPTION 1 : AUTOMATISATION AVEC MAKE.COM

### Étape 1 : Configuration Initiale

#### 1.1 Créer un compte Make.com
1. Allez sur https://www.make.com
2. Inscrivez-vous (essai gratuit)
3. Créez un nouveau scénario

#### 1.2 Ajouter le déclencheur Supabase
```
Module : Supabase > Watch Database Changes
Configuration :
  - Connection : Votre Supabase
  - Table : blog_posts (ou autre table de contenu)
  - Event : INSERT
  - Filter : status = "published"
```

### Étape 2 : Configuration des Actions

#### 2.1 Récupérer les réseaux actifs
```
Module : Supabase > Select Rows
Configuration :
  - Table : social_networks
  - Filter : is_active = true
  - Order by : priority DESC
```

#### 2.2 Itérer sur chaque réseau
```
Module : Iterator
Input : Résultats de l'étape 2.1
```

#### 2.3 Adapter le contenu par réseau
```
Module : Router (créer une branche par réseau)

Branche Facebook :
  - Filter : network.name = "Facebook"
  - Format : Texte complet + lien + image
  - Character limit : 63206

Branche Twitter/X :
  - Filter : network.name = "X (Twitter)"
  - Format : Texte court + hashtags + lien
  - Character limit : 280

Branche LinkedIn :
  - Filter : network.name = "LinkedIn"
  - Format : Texte professionnel + image + lien
  - Character limit : 3000

Branche Instagram :
  - Filter : network.name = "Instagram"
  - Format : Image + caption + hashtags
  - Character limit : 2200
```

#### 2.4 Publier sur chaque réseau

**Facebook :**
```
Module : Facebook > Create a Post
Configuration :
  - Access Token : Votre token Facebook
  - Message : {{content}}
  - Link : https://taxiassur.com/blog/{{slug}}
  - Image : {{media_url}}
```

**Twitter/X :**
```
Module : Twitter > Create a Tweet
Configuration :
  - Access Token : Votre token Twitter
  - Text : {{content_short}} #AssuranceTaxi #Taxi {{url}}
  - Media : {{media_url}}
```

**LinkedIn :**
```
Module : LinkedIn > Share an Update
Configuration :
  - Access Token : Votre token LinkedIn
  - Text : {{content}}
  - URL : {{url}}
  - Image : {{media_url}}
```

**Instagram :**
```
Module : Instagram > Create Media
Configuration :
  - Access Token : Votre token Instagram
  - Image URL : {{media_url}}
  - Caption : {{content}} + hashtags
```

#### 2.5 Enregistrer dans Supabase
```
Module : Supabase > Insert Row
Configuration :
  - Table : social_posts
  - Data :
    {
      "network_id": "{{network.id}}",
      "content": "{{content}}",
      "hashtags": {{hashtags_array}},
      "post_url": "{{post_url}}",
      "published_at": "{{now}}",
      "status": "published"
    }
```

### Étape 3 : Gestion des Erreurs

```
Module : Error Handler
Configuration :
  - On Error : Continue
  - Log : Enregistrer dans social_posts avec status = "failed"
  - Retry : 3 fois avec délai de 5 minutes
```

---

## 🔌 OPTION 2 : AUTOMATISATION AVEC ZAPIER

### Étape 1 : Configuration Initiale

#### 1.1 Créer un compte Zapier
1. Allez sur https://zapier.com
2. Inscrivez-vous (essai gratuit)
3. Créez un nouveau Zap

#### 1.2 Trigger : Nouveau contenu Supabase
```
App : Webhooks by Zapier
Event : Catch Hook
URL : https://hooks.zapier.com/hooks/catch/XXXXX/YYYYY/
```

#### 1.3 Configurer le webhook dans Supabase

Créez une fonction trigger PostgreSQL :
```sql
CREATE OR REPLACE FUNCTION notify_zapier_new_post()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://hooks.zapier.com/hooks/catch/XXXXX/YYYYY/',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_build_object(
      'id', NEW.id,
      'title', NEW.title,
      'content', NEW.content,
      'slug', NEW.slug,
      'media_url', NEW.media_url,
      'published_at', NEW.published_at
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_zapier
AFTER INSERT ON blog_posts
FOR EACH ROW
WHEN (NEW.status = 'published')
EXECUTE FUNCTION notify_zapier_new_post();
```

### Étape 2 : Actions Multi-Réseaux

#### 2.1 Publier sur Facebook
```
App : Facebook Pages
Action : Create Page Post
Fields :
  - Message : {{content}}
  - Link : https://taxiassur.com/blog/{{slug}}
  - Photo : {{media_url}}
```

#### 2.2 Publier sur Twitter
```
App : Twitter
Action : Create Tweet
Fields :
  - Text : {{content_short}} #AssuranceTaxi https://taxiassur.com/blog/{{slug}}
  - Media : {{media_url}}
```

#### 2.3 Publier sur LinkedIn
```
App : LinkedIn
Action : Share an Update
Fields :
  - Text : {{content}}
  - URL : https://taxiassur.com/blog/{{slug}}
```

#### 2.4 Publier sur Instagram
```
App : Instagram for Business
Action : Create Photo Post
Fields :
  - Image URL : {{media_url}}
  - Caption : {{content}} #AssuranceTaxi #Taxi #VTC
```

#### 2.5 Ajouter d'autres réseaux
Répétez pour chaque réseau social disponible dans Zapier :
- Pinterest
- YouTube (Community Post)
- TikTok
- Telegram
- WhatsApp Business
- etc.

---

## 📱 AUTOMATISATION WHATSAPP BUSINESS

### Configuration WhatsApp Business API

#### Option 1 : API Officielle Meta
```
1. Créer compte Meta Business : https://business.facebook.com
2. Configurer WhatsApp Business API
3. Obtenir le token d'accès
4. Configurer le webhook
```

#### Option 2 : Services tiers (plus simple)
- **Twilio** (https://www.twilio.com/whatsapp)
- **MessageBird** (https://messagebird.com)
- **Vonage** (https://www.vonage.com)
- **Wati.io** (https://www.wati.io)

### Scénario Make.com pour WhatsApp

```
Trigger : Nouveau post blog
↓
Action 1 : Récupérer groupes WhatsApp actifs
↓
Action 2 : Formater message
  Template :
  "🚖 Nouvelle actualité TaxiAssur !

  {{title}}

  {{excerpt}}

  Lire l'article : {{url}}

  #AssuranceTaxi #TaxiAssur"
↓
Action 3 : Envoyer à chaque groupe
  Module : WhatsApp > Send Message
  - Phone : {{group.phone_number}}
  - Message : {{formatted_message}}
  - Media : {{media_url}}
↓
Action 4 : Log dans Supabase
  Table : whatsapp_messages
```

### Groupes WhatsApp Recommandés

1. **Chauffeurs Taxi Paris** (haute priorité)
2. **Taxi France National**
3. **VTC & Taxi Professionnels**
4. **Artisans Taxi**
5. **Compagnies Taxi Partenaires**

---

## 🔄 TEMPLATES DE CONTENU PAR RÉSEAU

### Facebook (texte long)
```
🚖 {{title}}

{{content_full}}

💡 Points clés :
• {{key_point_1}}
• {{key_point_2}}
• {{key_point_3}}

En savoir plus : {{url}}

#AssuranceTaxi #Taxi #VTC #TaxiAssur
```

### Twitter/X (texte court)
```
🚖 {{title_short}}

{{excerpt_80_chars}}

👉 {{url}}

#AssuranceTaxi #Taxi
```

### LinkedIn (professionnel)
```
{{title}}

{{content_professional}}

Chez TaxiAssur, nous accompagnons les professionnels du taxi et VTC avec :
✅ Les meilleurs tarifs du marché
✅ Un service personnalisé
✅ Une expertise reconnue depuis 2015

Plus d'infos : {{url}}

#AssuranceProfessionnelle #Taxi #VTC
```

### Instagram (visuel + hashtags)
```
{{emoji}} {{title_short}}

{{content_150_chars}}

🔗 Lien en bio

#AssuranceTaxi #Taxi #VTC #TaxiParis #Chauffeur #AssurancePro #TaxiAssur #Transport #Mobilité #Business
```

### WhatsApp (direct + actionnable)
```
🚖 Bonjour,

{{title}}

{{excerpt_short}}

📖 Lire l'article complet :
{{url}}

📞 Besoin d'un devis ? Appelez-nous au 01 80 85 57 86

L'équipe TaxiAssur
```

---

## 📊 TRACKING & ANALYTICS

### Webhook de retour vers Supabase

Après chaque publication, enregistrer les données :

```javascript
// Make.com ou Zapier
await fetch('https://viuuznfqkauatkjcegcj.supabase.co/rest/v1/social_posts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': 'YOUR_SUPABASE_ANON_KEY',
    'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY'
  },
  body: JSON.stringify({
    network_id: networkId,
    content: content,
    hashtags: hashtags,
    post_url: postUrl,
    published_at: new Date().toISOString(),
    status: 'published',
    views: 0,
    likes: 0,
    shares: 0,
    clicks: 0
  })
});
```

### Mise à jour des statistiques

Utilisez les webhooks des réseaux sociaux pour mettre à jour les stats en temps réel :

```javascript
// Exemple Facebook Webhook
app.post('/webhook/facebook', async (req, res) => {
  const { post_id, likes, shares, comments } = req.body;

  await supabase
    .from('social_posts')
    .update({
      likes: likes,
      shares: shares,
      comments: comments,
      engagement_rate: (likes + shares + comments) / views * 100
    })
    .eq('post_url', `https://facebook.com/${post_id}`);

  res.status(200).send('OK');
});
```

---

## 🎯 HASHTAGS STRATÉGIQUES PAR RÉSEAU

### Hashtags Généraux (tous réseaux)
```
#AssuranceTaxi
#Taxi
#VTC
#TaxiAssur
#AssurancePro
#Chauffeur
#Transport
```

### Hashtags Géolocalisés
```
#TaxiParis
#TaxiLyon
#TaxiMarseille
#TaxiToulouse
#TaxiBordeaux
#TaxiNice
```

### Hashtags Niche
```
#AssuranceFlotte
#TaxiElectrique
#TeslaModele3
#VehiculeElectrique
#MobilitéVerte
#RCPro
#AssuranceObligatoire
```

### Hashtags Tendances
```
#EcoMobilité
#TransitionEcologique
#MobilitéDurable
#TransportPropre
#VilleIntelligente
```

---

## ⚡ FRÉQUENCES DE PUBLICATION RECOMMANDÉES

| Réseau | Fréquence | Meilleur moment |
|--------|-----------|-----------------|
| Facebook | 1-2x/jour | 13h - 16h |
| Instagram | 1-2x/jour | 11h - 13h, 19h - 21h |
| Twitter/X | 3-5x/jour | 8h, 12h, 17h, 20h |
| LinkedIn | 1x/jour | 7h - 9h, 17h - 18h |
| TikTok | 1-3x/jour | 18h - 22h |
| YouTube | 2-3x/semaine | 14h - 16h |
| Pinterest | 3-5x/jour | Tout moment |
| WhatsApp | 1x/semaine | 10h - 12h |

---

## 🚀 CHECKLIST ACTIVATION

### Étape 1 : Prérequis
- [ ] Compte Make.com ou Zapier créé
- [ ] Comptes réseaux sociaux créés et vérifiés
- [ ] API tokens obtenus pour chaque réseau
- [ ] Webhook Supabase configuré

### Étape 2 : Configuration Make.com/Zapier
- [ ] Scénario créé
- [ ] Trigger Supabase configuré
- [ ] Actions pour chaque réseau ajoutées
- [ ] Templates de contenu personnalisés
- [ ] Error handling configuré
- [ ] Logs Supabase activés

### Étape 3 : Tests
- [ ] Test publication Facebook
- [ ] Test publication Twitter
- [ ] Test publication LinkedIn
- [ ] Test publication Instagram
- [ ] Test publication WhatsApp
- [ ] Vérification logs Supabase
- [ ] Vérification backoffice analytics

### Étape 4 : Production
- [ ] Activer tous les réseaux dans le backoffice
- [ ] Activer le scénario Make.com/Zapier
- [ ] Publier un article test
- [ ] Vérifier diffusion sur tous les réseaux
- [ ] Monitorer les statistiques

---

## 📞 SUPPORT

**Questions ?**
- Email : tech@taxiassur.com
- Tél : 01 80 85 57 86
- Backoffice : https://taxiassur.com/backoffice/social-media

**Ressources :**
- Documentation Make.com : https://www.make.com/en/help
- Documentation Zapier : https://zapier.com/help
- APIs réseaux sociaux : Voir documentation officielle de chaque réseau

---

## 🎉 RÉSULTAT ATTENDU

Une fois configuré, **chaque nouveau contenu publié sur TaxiAssur sera automatiquement partagé sur 50+ réseaux sociaux en moins de 5 minutes**, générant :

✅ **Milliers de backlinks** vers votre site
✅ **Visibilité maximale** sur tous les canaux
✅ **Signaux sociaux puissants** pour le SEO
✅ **Trafic massif** vers votre site
✅ **Notoriété de marque** décuplée

**Vous économisez 10+ heures par semaine de publication manuelle !**
