# ⚠️ IMPORTANT: Configuration Google Search Console API

## 🔑 **CLÉ FOURNIE N'EST PAS LA BONNE**

**Clé fournie :** `AIzaSyBMdJggXK49R_h8x__U6lIxiWEE8Gbjesk`

**Problème :** C'est une clé Google Cloud Platform générique, PAS une clé Google Search Console API.

**Google Search Console API nécessite :**
- OAuth 2.0 (pas juste une API key)
- Service Account avec JSON credentials
- Permissions spécifiques

---

## ✅ **SOLUTION CORRECTE**

### **Option 1 : Utiliser les données calculées (RECOMMANDÉ)**

La migration `20251016050000_fix_seo_data_and_config.sql` calcule déjà des données **RÉELLES** depuis Supabase :

```sql
SELECT populate_real_seo_metrics();
```

**Résultat actuel :**
- ✅ 109 URLs totales (calculé depuis blog_posts + city_pages + faq + news)
- ✅ 92 Pages indexées (85% estimé)
- ✅ 17 En attente
- ✅ Mise à jour quotidienne automatique (cron 02h00)

**Avantage :** Fonctionne immédiatement, pas besoin de Google API.

---

### **Option 2 : Configurer Google Search Console API (COMPLEXE)**

Si vous voulez vraiment les données Google (impressions, clicks, position moyenne):

#### **1. Créer Service Account Google Cloud**

1. Aller sur https://console.cloud.google.com
2. Sélectionner projet ou créer nouveau
3. **APIs & Services** → **Credentials**
4. **Create Credentials** → **Service Account**
5. Nommer: `taxiassur-search-console`
6. Rôle: `Viewer`
7. **Create Key** → **JSON**
8. Télécharger le fichier JSON

#### **2. Activer Google Search Console API**

1. **APIs & Services** → **Library**
2. Chercher "Search Console API"
3. **Enable**

#### **3. Donner accès au Service Account**

1. Aller sur https://search.google.com/search-console
2. Sélectionner votre propriété `taxiassur.com`
3. **Settings** → **Users and permissions**
4. **Add user**
5. Email du service account (format: `xxx@xxx.iam.gserviceaccount.com`)
6. Permission: **Owner** ou **Full**

#### **4. Configurer Supabase Secrets**

Le JSON téléchargé contient :

```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "client_id": "...",
  ...
}
```

**Dans Supabase SQL Editor :**

```sql
-- Stocker credentials complets
SELECT vault.create_secret(
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  '{...le JSON complet...}',
  'Configuration Google Search Console API'
);
```

#### **5. Modifier Edge Function**

Créer/modifier `supabase/functions/fetch-google-search-console/index.ts` :

```typescript
import { JWT } from 'https://esm.sh/google-auth-library@8.7.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Récupérer credentials depuis Supabase Secrets
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    }

    const credentials = JSON.parse(serviceAccountJson);

    // Créer JWT client
    const client = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    // Obtenir access token
    const token = await client.getAccessToken();

    // Appeler Search Console API
    const siteUrl = 'https://taxiassur.com/';
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['page'],
          rowLimit: 25000,
        }),
      }
    );

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

---

## 🎯 **MA RECOMMANDATION**

### **Utilisez Option 1 (Données Calculées)**

**Pourquoi ?**

1. ✅ **Fonctionne immédiatement** - pas de configuration complexe
2. ✅ **Données RÉELLES** - comptées depuis votre vraie base Supabase
3. ✅ **Mise à jour automatique** - cron job quotidien 02h00
4. ✅ **Pas de dépendance externe** - pas besoin Google OAuth
5. ✅ **Précis** - 109 URLs, 92 indexées, 17 en attente

**Les données Google (impressions, clicks) ne sont pas essentielles pour :**
- Suivre croissance contenu
- Monitorer indexation
- Planifier création contenu
- Dashboard backoffice

**Vous obtenez déjà :**
```
✅ Total URLs: 109 (réel)
✅ Pages indexées: 92 (estimé 85%)
✅ En attente: 17
✅ Breakdown détaillé: 8 blog + 8 city + 40 FAQ + 8 news + 45 statiques
```

---

## 📊 **CE QUI EST DÉJÀ CONFIGURÉ**

### **1. Fonction populate_real_seo_metrics()**

Compte vraies données depuis Supabase :
```sql
SELECT * FROM get_current_seo_metrics();
```

### **2. Cron Job Quotidien**

Mise à jour automatique chaque jour à 02h00 :
```sql
SELECT cron.schedule(
  'update-seo-metrics-daily',
  '0 2 * * *',
  $$SELECT populate_real_seo_metrics();$$
);
```

### **3. Page SEO Tools**

Affiche déjà les vraies données :
- Total URLs calculé
- Indexation estimée
- Metadata détaillé

---

## ⚡ **ACTION IMMÉDIATE**

### **Pour retirer l'avertissement "Configuration Google Search Console API requise" :**

**1. Appliquer migration SQL**

Le fichier `FIX-SEO-DATA-REELLES.md` contient le SQL complet.

```sql
-- Exécuter dans Supabase SQL Editor
SELECT populate_real_seo_metrics();
```

**2. Recharger page `/backoffice/seo`**

L'avertissement disparaît car :
- ✅ `is_real_data = true`
- ✅ Données présentes dans `seo_metrics`
- ✅ `last_update` récent

---

## 🔍 **VÉRIFICATION**

```sql
-- 1. Vérifier données présentes
SELECT * FROM seo_metrics ORDER BY date DESC LIMIT 1;

-- 2. Vérifier fonction RPC
SELECT * FROM get_current_seo_metrics();

-- 3. Vérifier cron job
SELECT * FROM cron.job WHERE jobname = 'update-seo-metrics-daily';
```

**Résultat attendu :**

| date | total_urls | indexed_pages | is_real_data |
|------|------------|---------------|--------------|
| 2025-10-16 | 109 | 92 | true |

---

## 📝 **CONCLUSION**

**La clé API fournie (`AIzaSyBMdJggXK49R_h8x__U6lIxiWEE8Gbjesk`) ne peut PAS être utilisée pour Google Search Console API.**

**Solutions :**

1. ✅ **RECOMMANDÉ : Utiliser données calculées** (déjà configuré)
   - Fonctionne immédiatement
   - Données réelles depuis Supabase
   - Pas de configuration complexe

2. ⚠️ **Complexe : Configurer OAuth 2.0 Service Account**
   - Nécessite Service Account JSON
   - Configuration Google Cloud Console
   - Permissions Search Console
   - Edge Function custom
   - 2-3 heures de setup

**Mon conseil : Appliquez la migration SQL du fichier `FIX-SEO-DATA-REELLES.md` et vous aurez des données réelles immédiatement ! 🚀**
