# 🎯 FIX BACKLINKS - SYSTÈME COMPLET

## ✅ CORRECTIONS APPORTÉES

### 1. **Filtre Anti-Concurrents**
```typescript
// Bloque TOUS les sites d'assurance
const blockedKeywords = [
  'assurance', 'insurance', 'assureur', 'mutuelle',
  'axa', 'generali', 'allianz', 'maif', 'macif', 'matmut',
  'april', 'mfa', 'courtier', 'broker', 'groupama', 'maaf'
];
```

### 2. **Triple Méthode de Récupération d'Emails**

#### Méthode 1 : Scraping Page /contact (NOUVEAU ✨)
- Visite `https://domain.com/contact`
- Extrait tous les emails via regex
- Filtre les emails valides (contact@, info@, redac@)

#### Méthode 2 : Hunter.io Email Finder (NOUVEAU ✨)
- Cherche des noms communs : `contact@`, `redaction@`, `webmaster@`
- Score minimum : 50%
- API : `https://api.hunter.io/v2/email-finder`

#### Méthode 3 : Hunter.io Domain Search (Fallback)
- Récupère jusqu'à 5 emails du domaine
- Priorité aux emails génériques

---

## 📋 ACTIONS IMMÉDIATES

### ÉTAPE 1 : Nettoyer les concurrents existants
```sql
-- Exécuter sur Supabase SQL Editor
DELETE FROM backlink_opportunities
WHERE domain ILIKE '%assurance%'
   OR domain ILIKE '%insurance%'
   OR domain ILIKE '%courtier%'
   OR domain ILIKE '%broker%';

-- Vérifier ce qui reste
SELECT COUNT(*) as total, 
       COUNT(CASE WHEN contact_email IS NOT NULL THEN 1 END) as avec_email
FROM backlink_opportunities
WHERE status = 'pending';
```

### ÉTAPE 2 : Redéployer l'Edge Function
1. Allez sur Supabase Dashboard
2. Edge Functions → `scan-backlinks`
3. Copiez le code de `supabase/functions/scan-backlinks/index.ts`
4. Deploy

### ÉTAPE 3 : Tester le nouveau système
```sql
-- Déclencher un scan manuel
SELECT net.http_post(
  url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/scan-backlinks',
  headers := jsonb_build_object(
    'Authorization', 'Bearer eyJhbGc...',
    'Content-Type', 'application/json'
  ),
  body := '{}'::jsonb
);

-- Attendre 30 secondes puis vérifier
SELECT domain, contact_email, page_title
FROM backlink_opportunities
WHERE created_at > NOW() - INTERVAL '5 minutes'
  AND contact_email IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 SITES CIBLES LÉGITIMES

### ✅ Sites Autorisés
- **Médias auto** : auto-moto.com, largus.fr, caradisiac.com
- **Médias généralistes** : lefigaro.fr, lemonde.fr, bfmtv.com
- **Blogs taxi/VTC** : blogs spécialisés, forums
- **Annuaires pro** : pagesjaunes.fr, societe.com
- **Sites municipaux** : paris.fr, lyon.fr, etc.

### ❌ Sites Bloqués
- Tous les sites avec "assurance" dans le domaine
- Compagnies d'assurance (AXA, Allianz, etc.)
- Courtiers concurrents
- Sites de courtage

---

## 🔧 VÉRIFICATION FINALE

### Avant envoi d'emails
```sql
-- 1. Vérifier qu'on a des opportunités VALIDES
SELECT 
  domain,
  contact_email,
  page_title,
  domain_authority
FROM backlink_opportunities
WHERE status = 'pending'
  AND contact_email IS NOT NULL
  AND domain NOT ILIKE '%assurance%'
ORDER BY domain_authority DESC
LIMIT 10;

-- 2. Vérifier la campagne
SELECT id, name, status, sent_count, total_recipients
FROM backlink_campaigns
WHERE status = 'active';

-- 3. Vérifier SendGrid
-- Supabase Dashboard → Project Settings → Edge Functions → Secrets
-- Doit avoir : SENDGRID_API_KEY = SG.xxxxx
```

---

## 🚀 LANCER L'ENVOI

```sql
-- Test avec 1 email d'abord
SELECT net.http_post(
  url := 'https://drohhxrkoequjphvabvq.supabase.co/functions/v1/backlink-auto-outreach',
  headers := jsonb_build_object(
    'Authorization', 'Bearer eyJhbGc...',
    'Content-Type', 'application/json'
  ),
  body := jsonb_build_object(
    'maxEmailsPerRun', 1,
    'testMode', false
  )
);

-- Vérifier l'envoi
SELECT * FROM backlink_outreach_log
ORDER BY created_at DESC LIMIT 5;
```

---

## 📊 RÉSULTATS ATTENDUS

Avec ces corrections :
- ✅ **0 concurrent contacté**
- ✅ **Emails trouvés sur 60-80% des sites légitimes**
- ✅ **Taux de délivrabilité > 95%**
- ✅ **Pas de spam / blacklist**

---

## ⚠️ SI ÇA NE MARCHE TOUJOURS PAS

1. **Aucune opportunité avec email ?**
   → Scanner des sites spécifiques (liste de blogs auto connus)

2. **Emails trouvés mais pas envoyés ?**
   → Vérifier SendGrid API Key

3. **Emails bounced ?**
   → Activer la validation d'email dans le code

4. **Toujours des concurrents ?**
   → Ajouter plus de mots-clés dans `blockedKeywords`
