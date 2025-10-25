# ✅ Pinterest Configuré et Prêt !

## 🎉 Configuration Terminée

### ✅ Ce qui a été fait

1. **Vérification Domain Pinterest**
   - ✅ Balise META ajoutée dans `index.html`
   - ✅ Fichier `pinterest-9fa96.html` présent

2. **Clés API ajoutées dans `.env`**
   ```env
   VITE_PINTEREST_APP_ID=1534523
   VITE_PINTEREST_APP_SECRET=2aae5684dc5aa6efad09b6f48b7167d159b05b2d
   VITE_PINTEREST_ACCESS_TOKEN=pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA
   ```

3. **Edge Function Pinterest créée**
   - 📁 `supabase/functions/pinterest-publisher/index.ts`
   - ✅ Publication automatique d'épingles
   - ✅ Récupération automatique du board
   - ✅ Enregistrement dans `social_posts`

4. **SQL d'activation fourni**
   - 📄 `ACTIVER-PINTEREST-MAINTENANT.sql`

---

## 🚀 Actions à Faire MAINTENANT

### 1️⃣ Uploader le dossier `dist/` sur IONOS

Le build est prêt avec la vérification Pinterest.

### 2️⃣ Exécuter le SQL dans Supabase

1. Aller sur https://supabase.com/dashboard/project/drohhxrkoequjphvabvq
2. Cliquer sur **SQL Editor**
3. Copier-coller le contenu de **`ACTIVER-PINTEREST-MAINTENANT.sql`**
4. Cliquer sur **Run**

### 3️⃣ Ajouter les Secrets dans Supabase

1. Aller dans **Project Settings** → **Edge Functions** → **Secrets**
2. Ajouter ces 3 secrets :

```
PINTEREST_APP_ID = 1534523
PINTEREST_APP_SECRET = 2aae5684dc5aa6efad09b6f48b7167d159b05b2d
PINTEREST_ACCESS_TOKEN = pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA
```

### 4️⃣ Déployer l'Edge Function Pinterest

Dans le terminal Supabase :

```bash
supabase functions deploy pinterest-publisher
```

Ou via le Dashboard Supabase :
1. Aller dans **Edge Functions**
2. Cliquer sur **Deploy new function**
3. Uploader le fichier `supabase/functions/pinterest-publisher/index.ts`

---

## 📌 Comment Utiliser Pinterest Maintenant

### Depuis le Backoffice (Interface Web)

1. Aller sur `/backoffice/social-media`
2. Cocher **Pinterest**
3. Cliquer sur **"Générer avec IA"**
4. Cliquer sur **"Publier maintenant"**
5. ✅ L'épingle est publiée automatiquement !

### Via API (curl)

```bash
curl -X POST \
  https://drohhxrkoequjphvabvq.supabase.co/functions/v1/pinterest-publisher \
  -H "Authorization: Bearer VOTRE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Top 5 erreurs assurance taxi à éviter",
    "description": "Ne faites plus ces erreurs qui vous coûtent cher ! Découvrez nos conseils d'\''experts. #AssuranceTaxi #ConseilleurTaxi",
    "link": "https://taxiassur.com/blog/assurance-taxi-2024",
    "image_url": "https://images.pexels.com/photos/1234567/taxi.jpg"
  }'
```

### Via Code TypeScript

```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pinterest-publisher`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Top 5 erreurs assurance taxi",
      description: "Découvrez comment économiser 30% sur votre assurance taxi !",
      link: "https://taxiassur.com/blog/assurance-taxi-2024",
      image_url: "https://images.pexels.com/photos/1234567/taxi.jpg",
    }),
  }
);

const result = await response.json();
console.log("Pin publié:", result.pin_url);
```

---

## 📊 Ce que Pinterest Permet

### Publications Automatiques

✅ **Épingles avec :**
- Image Pexels automatique (haute qualité)
- Titre accrocheur (max 100 caractères)
- Description optimisée SEO (max 500 caractères)
- Lien vers votre site
- Alt text pour accessibilité

✅ **Boards automatiques :**
- Récupère automatiquement le premier board
- Ou créez plusieurs boards thématiques :
  - "Assurance Taxi - Conseils"
  - "Assurance Taxi - Actualités"
  - "Assurance Taxi - Guides Complets"

### Statistiques Disponibles

Une fois publié, vous pourrez récupérer :

📈 **Métriques Pinterest :**
- 👁️ **Impressions** : Combien de fois vue
- 💾 **Saves** : Nombre d'enregistrements
- 🖱️ **Pin clicks** : Clics sur l'épingle
- 🔗 **Outbound clicks** : Clics vers votre site
- 💬 **Commentaires** : Engagement

---

## 🎯 Exemples de Posts Pinterest Parfaits

### 1. Post éducatif
```json
{
  "title": "5 erreurs qui coûtent cher en assurance taxi",
  "description": "❌ Ne pas comparer les offres\n❌ Négliger la RC Pro\n❌ Mal déclarer son activité\n\n✅ Nos experts vous guident gratuitement ! #AssuranceTaxi #ConseilleurAssurance",
  "link": "https://taxiassur.com/blog/5-erreurs-assurance-taxi",
  "image_url": "https://images.pexels.com/photos/XXX/taxi-erreurs.jpg"
}
```

### 2. Post promotionnel
```json
{
  "title": "Économisez 30% sur votre assurance taxi",
  "description": "🎁 Offre spéciale : Devis gratuit en 2 min !\n💰 Jusqu'à 30% d'économie\n⚡ Réponse en 15 min\n\n👉 Profitez-en maintenant ! #AssuranceTaxi #BonPlan",
  "link": "https://taxiassur.com/devis-instantane",
  "image_url": "https://images.pexels.com/photos/XXX/taxi-promo.jpg"
}
```

### 3. Post guide complet
```json
{
  "title": "Guide Complet Assurance Taxi 2025",
  "description": "📘 Le guide ultime pour les chauffeurs de taxi :\n✅ Garanties obligatoires\n✅ Options recommandées\n✅ Comparatif assureurs\n\n🔥 Téléchargement gratuit ! #GuideTaxi",
  "link": "https://taxiassur.com/guide-assurance-taxi-2025",
  "image_url": "https://images.pexels.com/photos/XXX/guide-taxi.jpg"
}
```

---

## ⚙️ Configuration Avancée

### Créer Plusieurs Boards Thématiques

```bash
# Board 1 : Conseils
curl -X POST https://api.pinterest.com/v5/boards \
  -H "Authorization: Bearer pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Assurance Taxi - Conseils",
    "description": "Conseils d'\''experts pour optimiser votre assurance taxi",
    "privacy": "PUBLIC"
  }'

# Board 2 : Actualités
curl -X POST https://api.pinterest.com/v5/boards \
  -H "Authorization: Bearer pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Assurance Taxi - Actualités",
    "description": "Toutes les nouveautés du secteur taxi et assurance",
    "privacy": "PUBLIC"
  }'
```

### Récupérer les Boards Existants

```bash
curl -X GET https://api.pinterest.com/v5/boards \
  -H "Authorization: Bearer pina_AMATW2QXAABNSBAAGCAB4DLXSH5QRGQBQBIQDZDPWGOIQCVDF7UFOLF2NLTMGHYITC2ZKTYUPPFKBHXNR7P7H2OTAGWCTHYA"
```

---

## 📚 Limites Pinterest API

### Quotas Gratuits

- 📌 **200 requêtes/jour** par utilisateur
- 📌 **1 000 requêtes/jour** par app
- 📌 **10 épingles/minute** maximum

### Recommandations

✅ **Bonnes pratiques :**
- Publier 3-5 épingles/jour maximum
- Espacer de 2-3 heures
- Images haute qualité (min 600x900px)
- Descriptions riches avec hashtags
- Toujours ajouter un lien vers votre site

❌ **À éviter :**
- Spam (trop de publications)
- Images de mauvaise qualité
- Contenu dupliqué
- Liens cassés
- Descriptions vides

---

## 🎯 Checklist Finale

- [x] Clés API Pinterest récupérées
- [x] Variables ajoutées dans `.env`
- [x] Edge Function créée
- [x] SQL d'activation fourni
- [ ] Secrets ajoutés dans Supabase
- [ ] SQL exécuté dans Supabase
- [ ] Edge Function déployée
- [ ] Premier test de publication
- [ ] Boards thématiques créés (optionnel)
- [ ] Vérification des statistiques

---

## 🎉 Prochaines Étapes

### Automatisation Complète

Une fois Pinterest configuré, le système sera capable de :

1. ✅ Générer du contenu avec IA (OpenAI)
2. ✅ Récupérer une image Pexels automatiquement
3. ✅ Publier sur Pinterest automatiquement
4. ✅ Enregistrer dans `social_posts`
5. ✅ Récupérer les stats toutes les heures
6. ✅ Afficher dans le dashboard backoffice

### Autres Réseaux Sociaux

Voulez-vous aussi configurer :
- 🔵 **LinkedIn** (déjà en partie configuré)
- 🔵 **Facebook** (Meta Business API)
- 🐦 **Twitter/X** (Twitter API v2)
- 📸 **Instagram** (Meta Graph API)

---

## 💡 Support

Si vous avez des questions :

📖 **Documentation Pinterest** : https://developers.pinterest.com/docs/api/v5/
🔧 **Dashboard Pinterest** : https://developers.pinterest.com/apps/1534523/
💬 **Support Pinterest** : https://help.pinterest.com/

---

## 🚀 C'est Parti !

**Pinterest est prêt à être utilisé !**

1. Exécutez le SQL (`ACTIVER-PINTEREST-MAINTENANT.sql`)
2. Ajoutez les secrets dans Supabase
3. Déployez l'Edge Function
4. Testez depuis `/backoffice/social-media`

🎉 **Vos posts Pinterest vont générer du trafic qualifié vers TaxiAssur.com !**
